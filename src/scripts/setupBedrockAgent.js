/**
 * Bedrock Agent Setup Script
 * Creates and configures the AWS Bedrock Agent for outfit planning
 */

import {
    BedrockAgentClient,
    CreateAgentCommand,
    CreateAgentAliasCommand,
    UpdateAgentCommand,
    GetAgentCommand
} from '@aws-sdk/client-bedrock-agent';

import { AGENT_CONFIG, TOOL_SCHEMAS, IAM_POLICY_TEMPLATE } from '../config/bedrockAgentConfig.js';

class BedrockAgentSetup {
    constructor() {
        this.client = new BedrockAgentClient({
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
            }
        });
    }

    /**
     * Create a new Bedrock Agent
     */
    async createAgent() {
        try {
            console.log('Creating Bedrock Agent...');

            const createAgentCommand = new CreateAgentCommand({
                agentName: AGENT_CONFIG.agentName,
                description: AGENT_CONFIG.description,
                foundationModel: AGENT_CONFIG.foundationModel,
                instruction: AGENT_CONFIG.instruction,
                idleSessionTTLInSeconds: AGENT_CONFIG.idleSessionTTLInSeconds,
                agentResourceRoleArn: process.env.REACT_APP_BEDROCK_AGENT_ROLE_ARN
            });

            const response = await this.client.send(createAgentCommand);

            console.log('Agent created successfully:', {
                agentId: response.agent.agentId,
                agentName: response.agent.agentName,
                agentStatus: response.agent.agentStatus
            });

            return response.agent;

        } catch (error) {
            console.error('Error creating agent:', error);
            throw error;
        }
    }

    /**
     * Update existing agent configuration
     */
    async updateAgent(agentId) {
        try {
            console.log(`Updating agent ${agentId}...`);

            const updateAgentCommand = new UpdateAgentCommand({
                agentId: agentId,
                agentName: AGENT_CONFIG.agentName,
                description: AGENT_CONFIG.description,
                foundationModel: AGENT_CONFIG.foundationModel,
                instruction: AGENT_CONFIG.instruction,
                idleSessionTTLInSeconds: AGENT_CONFIG.idleSessionTTLInSeconds,
                agentResourceRoleArn: process.env.REACT_APP_BEDROCK_AGENT_ROLE_ARN
            });

            const response = await this.client.send(updateAgentCommand);

            console.log('Agent updated successfully:', {
                agentId: response.agent.agentId,
                agentStatus: response.agent.agentStatus
            });

            return response.agent;

        } catch (error) {
            console.error('Error updating agent:', error);
            throw error;
        }
    }

    /**
     * Create agent alias for deployment
     */
    async createAgentAlias(agentId, aliasName = 'production') {
        try {
            console.log(`Creating agent alias '${aliasName}' for agent ${agentId}...`);

            const createAliasCommand = new CreateAgentAliasCommand({
                agentId: agentId,
                agentAliasName: aliasName,
                description: `${aliasName} deployment of the outfit planning agent`
            });

            const response = await this.client.send(createAliasCommand);

            console.log('Agent alias created successfully:', {
                agentId: response.agentAlias.agentId,
                agentAliasId: response.agentAlias.agentAliasId,
                agentAliasName: response.agentAlias.agentAliasName,
                agentAliasStatus: response.agentAlias.agentAliasStatus
            });

            return response.agentAlias;

        } catch (error) {
            console.error('Error creating agent alias:', error);
            throw error;
        }
    }

    /**
     * Get agent information
     */
    async getAgent(agentId) {
        try {
            const getAgentCommand = new GetAgentCommand({
                agentId: agentId
            });

            const response = await this.client.send(getAgentCommand);
            return response.agent;

        } catch (error) {
            console.error('Error getting agent:', error);
            throw error;
        }
    }

    /**
     * Setup complete agent infrastructure
     */
    async setupComplete() {
        try {
            console.log('Starting complete Bedrock Agent setup...');

            // Step 1: Create the agent
            const agent = await this.createAgent();
            const agentId = agent.agentId;

            // Step 2: Create production alias
            const alias = await this.createAgentAlias(agentId, 'production');

            // Step 3: Display configuration information
            console.log('\n=== Setup Complete ===');
            console.log('Add these environment variables to your .env file:');
            console.log(`REACT_APP_BEDROCK_AGENT_ID=${agentId}`);
            console.log(`REACT_APP_BEDROCK_AGENT_ALIAS_ID=${alias.agentAliasId}`);

            console.log('\n=== IAM Policy Required ===');
            console.log('Attach this policy to your IAM user/role:');
            console.log(JSON.stringify(IAM_POLICY_TEMPLATE, null, 2));

            console.log('\n=== Tool Functions to Implement ===');
            Object.entries(TOOL_SCHEMAS).forEach(([key, tool]) => {
                console.log(`- ${tool.name}: ${tool.description}`);
            });

            return {
                agentId: agentId,
                agentAliasId: alias.agentAliasId,
                agentName: agent.agentName,
                status: 'setup_complete'
            };

        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    }

    /**
     * Validate current configuration
     */
    async validateConfiguration() {
        const config = {
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            hasCredentials: !!(process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY),
            agentId: process.env.REACT_APP_BEDROCK_AGENT_ID,
            agentAliasId: process.env.REACT_APP_BEDROCK_AGENT_ALIAS_ID,
            agentRoleArn: process.env.REACT_APP_BEDROCK_AGENT_ROLE_ARN
        };

        console.log('Current Configuration:', config);

        const issues = [];
        if (!config.hasCredentials) {
            issues.push('AWS credentials not configured');
        }
        if (!config.agentId) {
            issues.push('REACT_APP_BEDROCK_AGENT_ID not set');
        }
        if (!config.agentRoleArn) {
            issues.push('REACT_APP_BEDROCK_AGENT_ROLE_ARN not set');
        }

        if (issues.length > 0) {
            console.log('Configuration Issues:', issues);
            return { valid: false, issues };
        }

        // Test agent connection if configured
        if (config.agentId) {
            try {
                const agent = await this.getAgent(config.agentId);
                console.log('Agent Status:', agent.agentStatus);
                return { valid: true, agent };
            } catch (error) {
                console.log('Agent connection failed:', error.message);
                return { valid: false, issues: ['Agent connection failed'] };
            }
        }

        return { valid: true };
    }
}

// Export for use in other modules
export default BedrockAgentSetup;

// CLI usage when run directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
    const setup = new BedrockAgentSetup();

    const command = process.argv[2];

    switch (command) {
        case 'create':
            setup.setupComplete().catch(console.error);
            break;
        case 'validate':
            setup.validateConfiguration().catch(console.error);
            break;
        case 'update':
            const agentId = process.argv[3];
            if (!agentId) {
                console.error('Usage: node setupBedrockAgent.js update <agentId>');
                process.exit(1);
            }
            setup.updateAgent(agentId).catch(console.error);
            break;
        default:
            console.log('Usage:');
            console.log('  node setupBedrockAgent.js create    - Create new agent');
            console.log('  node setupBedrockAgent.js validate  - Validate configuration');
            console.log('  node setupBedrockAgent.js update <agentId> - Update existing agent');
    }
}