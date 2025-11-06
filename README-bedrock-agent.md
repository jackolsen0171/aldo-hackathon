# AWS Bedrock Agent Setup for AI Outfit Assistant

This document provides a complete guide for setting up the AWS Bedrock Agent infrastructure for the AI Outfit Assistant feature.

## Overview

The AI Outfit Assistant uses AWS Bedrock Agents to provide intelligent outfit planning and packing recommendations. The system integrates multiple components:

- **Bedrock Agent**: Orchestrates conversations and tool execution
- **Claude 3 Haiku Model**: Provides cost-effective AI responses
- **Tool Functions**: Handle weather lookup, clothing search, and optimization
- **Knowledge Bases**: Store clothing data and style rules
- **Session Management**: Maintains conversation context

## Quick Start

### 1. Install Dependencies

The required AWS SDK packages are already installed:
```bash
npm install @aws-sdk/client-bedrock-agent @aws-sdk/client-bedrock-agent-runtime
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# AWS Configuration
REACT_APP_AWS_ACCESS_KEY_ID=your_access_key_here
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key_here
REACT_APP_AWS_REGION=us-east-1

# Bedrock Agent Configuration (set after agent creation)
REACT_APP_BEDROCK_AGENT_ID=
REACT_APP_BEDROCK_AGENT_ALIAS_ID=TSTALIASID
REACT_APP_BEDROCK_AGENT_ROLE_ARN=arn:aws:iam::your-account:role/BedrockAgentRole
```

### 3. Create IAM Role

Create an IAM role for the Bedrock Agent with the following trust policy:

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

Attach this policy to the role:

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
    }
  ]
}
```

### 4. Create Bedrock Agent

#### Option A: Using Setup Script

```bash
node src/scripts/setupBedrockAgent.js create
```

#### Option B: Manual Creation

1. Go to AWS Bedrock Console → Agents
2. Click "Create Agent"
3. Configure:
   - **Name**: OutfitPlannerAgent
   - **Description**: AI-powered outfit planning and packing assistant
   - **Model**: Claude 3 Haiku
   - **Instructions**: Copy from `src/config/bedrockAgentConfig.js`
   - **IAM Role**: Select the role created above

### 5. Update Environment Variables

After creating the agent, update your `.env` file:

```bash
REACT_APP_BEDROCK_AGENT_ID=your_agent_id_from_console
REACT_APP_BEDROCK_AGENT_ALIAS_ID=your_alias_id_from_console
```

## Architecture

### Service Structure

```
src/
├── services/
│   ├── bedrockAgentService.js     # Main agent integration
│   ├── chatService.js             # Updated with agent support
│   └── bedrockService.js          # Legacy direct model calls
├── config/
│   └── bedrockAgentConfig.js      # Agent configuration
├── scripts/
│   └── setupBedrockAgent.js       # Setup automation
└── hooks/
    └── useChat.js                 # Updated with session management
```

### Key Features

1. **Intelligent Message Routing**: Automatically routes outfit planning requests to the agent and weather requests to direct model calls
2. **Session Management**: Maintains conversation context across multiple interactions
3. **Error Handling**: Graceful degradation when services are unavailable
4. **Configuration Validation**: Built-in status checking and validation

## Usage

### Basic Integration

```javascript
import bedrockAgentService from './src/services/bedrockAgentService';

// Process outfit planning request
const result = await bedrockAgentService.processOutfitRequest(
  "I need outfits for a 3-day business conference in Chicago next week"
);

if (result.success) {
  console.log(result.data.response);
  console.log('Session ID:', result.data.sessionId);
}
```

### Chat Service Integration

The chat service automatically determines whether to use the agent or direct model:

```javascript
import chatService from './src/services/chatService';

// This will use the Bedrock Agent
await chatService.sendMessage("Plan outfits for my vacation");

// This will use direct Bedrock model
await chatService.sendMessage("What's the weather in Paris?");
```

### Session Management

```javascript
// Initialize new session
const sessionId = bedrockAgentService.initializeSession();

// Update session context
bedrockAgentService.updateSessionAttributes({
  eventType: 'conference',
  location: 'New York',
  budget: 500
});

// Get session info
const sessionInfo = bedrockAgentService.getSessionInfo();
```

## Tool Functions (To Be Implemented)

The agent is configured to use these tool functions:

1. **get_weather_forecast**: Retrieve weather data for outfit planning
2. **search_clothing_catalog**: Query clothing database with filters
3. **generate_outfit_combinations**: Create optimized outfit combinations
4. **optimize_packing_list**: Generate consolidated packing lists

## Testing

Run the integration tests:

```bash
npm test -- --testPathPattern=bedrockAgentIntegration.test.js --watchAll=false
```

## Troubleshooting

### Common Issues

1. **Agent Not Found Error**
   - Verify `REACT_APP_BEDROCK_AGENT_ID` is set correctly
   - Check that the agent exists in the specified region

2. **Access Denied**
   - Verify AWS credentials have necessary permissions
   - Check IAM role is properly configured

3. **Configuration Issues**
   - Run validation: `node src/scripts/setupBedrockAgent.js validate`
   - Check configuration status in the app

### Validation Commands

```bash
# Validate configuration
node src/scripts/setupBedrockAgent.js validate

# Test agent connection
import bedrockAgentService from './src/services/bedrockAgentService';
const result = await bedrockAgentService.testAgentConnection();
```

## Next Steps

1. **Implement Tool Functions**: Create the actual tool functions for weather, clothing search, etc.
2. **Set up Knowledge Bases**: Configure clothing data and style rules
3. **Add Frontend Components**: Create outfit display and packing list components
4. **Testing**: Add comprehensive integration tests

## Cost Optimization

- Uses Claude 3 Haiku for cost efficiency
- Implements session management to reduce redundant calls
- Includes caching strategies for frequent requests
- Monitors token usage and optimizes prompts

## Security

- Uses IAM roles with minimal required permissions
- Implements proper error handling without exposing sensitive information
- Supports secure credential management through environment variables
- Includes audit logging capabilities

For detailed setup instructions, see `docs/bedrock-agent-setup.md`.