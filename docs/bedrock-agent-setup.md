# AWS Bedrock Agent Setup Guide

This guide explains how to set up the AWS Bedrock Agent infrastructure for the AI Outfit Assistant.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured or environment variables set
3. Node.js and npm installed

## Step 1: IAM Role Setup

### Create Bedrock Agent Execution Role

Create an IAM role that the Bedrock Agent will use to access other AWS services:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Attach Required Policies

Attach the following policy to the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:Retrieve",
        "bedrock:Query"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:*:*:knowledge-base/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Step 2: User/Application IAM Permissions

Your application needs permissions to interact with the Bedrock Agent:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent",
        "bedrock:GetAgent",
        "bedrock:GetAgentAlias",
        "bedrock:CreateAgent",
        "bedrock:UpdateAgent",
        "bedrock:CreateAgentAlias"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:agent/*",
        "arn:aws:bedrock:*:*:agent-alias/*"
      ]
    }
  ]
}
```

## Step 3: Environment Configuration

Update your `.env` file with the required variables:

```bash
# AWS Configuration
REACT_APP_AWS_ACCESS_KEY_ID=your_access_key_here
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key_here
REACT_APP_AWS_REGION=us-east-1

# Bedrock Agent Configuration (will be set after agent creation)
REACT_APP_BEDROCK_AGENT_ID=
REACT_APP_BEDROCK_AGENT_ALIAS_ID=
REACT_APP_BEDROCK_AGENT_ROLE_ARN=arn:aws:iam::your-account:role/BedrockAgentRole
```

## Step 4: Create the Bedrock Agent

### Option A: Using the Setup Script

```bash
# Install dependencies
npm install

# Run the setup script
node src/scripts/setupBedrockAgent.js create
```

### Option B: Manual Creation via AWS Console

1. Go to AWS Bedrock Console
2. Navigate to "Agents" section
3. Click "Create Agent"
4. Configure:
   - **Agent Name**: OutfitPlannerAgent
   - **Description**: AI-powered outfit planning and packing assistant
   - **Foundation Model**: Claude 3 Haiku
   - **Instructions**: Copy from `src/config/bedrockAgentConfig.js`
   - **IAM Role**: Select the role created in Step 1

## Step 5: Configure Agent Tools

The agent requires the following tool functions to be implemented:

### 1. Weather Lookup Tool
- **Function Name**: `get_weather_forecast`
- **Purpose**: Retrieve weather data for outfit planning
- **Integration**: OpenWeatherMap API or AWS Weather Service

### 2. Clothing Catalog Search Tool
- **Function Name**: `search_clothing_catalog`
- **Purpose**: Query clothing database with filters
- **Integration**: Bedrock Knowledge Base

### 3. Outfit Generation Tool
- **Function Name**: `generate_outfit_combinations`
- **Purpose**: Create optimized outfit combinations
- **Integration**: Custom algorithm with constraint satisfaction

### 4. Packing Optimization Tool
- **Function Name**: `optimize_packing_list`
- **Purpose**: Generate consolidated packing lists
- **Integration**: Item consolidation logic

## Step 6: Knowledge Base Setup

### Clothing Dataset Knowledge Base
1. Prepare Kaggle clothing dataset in compatible format
2. Create Bedrock Knowledge Base
3. Configure vector embeddings
4. Set up data source sync

### Style Rules Knowledge Base
1. Create style rule documents
2. Define dress code guidelines
3. Configure searchable metadata
4. Set up retrieval optimization

## Step 7: Testing and Validation

### Test Agent Connection
```javascript
import bedrockAgentService from './src/services/bedrockAgentService.js';

// Test basic connection
const result = await bedrockAgentService.testAgentConnection();
console.log(result);
```

### Validate Configuration
```bash
node src/scripts/setupBedrockAgent.js validate
```

## Step 8: Deployment Aliases

Create deployment aliases for different environments:

```bash
# Development alias
aws bedrock-agent create-agent-alias \
  --agent-id YOUR_AGENT_ID \
  --agent-alias-name development

# Production alias
aws bedrock-agent create-agent-alias \
  --agent-id YOUR_AGENT_ID \
  --agent-alias-name production
```

## Troubleshooting

### Common Issues

1. **Access Denied Errors**
   - Verify IAM permissions are correctly configured
   - Check that the agent role has necessary policies attached

2. **Agent Not Found**
   - Ensure `REACT_APP_BEDROCK_AGENT_ID` is correctly set
   - Verify the agent exists in the specified region

3. **Tool Execution Failures**
   - Check that tool functions are properly implemented
   - Verify Knowledge Base connections are active

4. **Session Management Issues**
   - Ensure session IDs are properly generated and maintained
   - Check session timeout configurations

### Monitoring and Logging

Enable CloudWatch logging for the Bedrock Agent:
1. Go to CloudWatch Console
2. Create log group: `/aws/bedrock/agents/outfit-planner`
3. Configure log retention policy
4. Monitor agent invocations and tool executions

## Cost Optimization

- Use Claude 3 Haiku for cost efficiency
- Implement response caching where appropriate
- Monitor token usage and optimize prompts
- Set up billing alerts for Bedrock usage

## Security Best Practices

1. Use IAM roles with minimal required permissions
2. Enable CloudTrail logging for audit trails
3. Implement request rate limiting
4. Use VPC endpoints for private connectivity
5. Regularly rotate access keys and credentials