/**
 * AWS Bedrock Agent Service
 * Handles AI outfit planning requests through Bedrock Agents
 */

import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand
} from '@aws-sdk/client-bedrock-agent-runtime';
import knowledgeBaseService from './knowledgeBaseService';

class BedrockAgentService {
    constructor() {
        // Initialize AWS Bedrock Agent Runtime client
        this.client = new BedrockAgentRuntimeClient({
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
            }
        });

        // Agent configuration
        this.agentId = process.env.REACT_APP_BEDROCK_AGENT_ID;
        this.agentAliasId = process.env.REACT_APP_BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID';

        // Session management
        this.sessionId = null;
        this.sessionAttributes = {};
    }

    /**
     * Initialize a new conversation session
     */
    initializeSession() {
        this.sessionId = `outfit-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.sessionAttributes = {
            conversationType: 'outfit-planning',
            startTime: new Date().toISOString()
        };
        return this.sessionId;
    }

    /**
     * Process outfit planning request through Bedrock Agent
     */
    async processOutfitRequest(userMessage, sessionId = null) {
        try {
            // Use existing session or create new one
            const currentSessionId = sessionId || this.sessionId || this.initializeSession();

            if (!this.agentId) {
                throw new Error('Bedrock Agent ID not configured. Please set REACT_APP_BEDROCK_AGENT_ID environment variable.');
            }

            const command = new InvokeAgentCommand({
                agentId: this.agentId,
                agentAliasId: this.agentAliasId,
                sessionId: currentSessionId,
                inputText: userMessage,
                sessionState: {
                    sessionAttributes: this.sessionAttributes
                }
            });

            const response = await this.client.send(command);

            // Process the streaming response
            const responseText = await this.processAgentResponse(response);

            return {
                success: true,
                data: {
                    response: responseText,
                    sessionId: currentSessionId,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Bedrock Agent service error:', error);

            // Handle specific error cases
            if (error.name === 'ResourceNotFoundException') {
                return {
                    success: false,
                    error: {
                        code: 'AGENT_NOT_FOUND',
                        message: 'The AI outfit assistant is currently unavailable. Please check the configuration.'
                    }
                };
            }

            if (error.name === 'AccessDeniedException') {
                return {
                    success: false,
                    error: {
                        code: 'ACCESS_DENIED',
                        message: 'Access denied to the AI outfit assistant. Please check your permissions.'
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'AGENT_ERROR',
                    message: 'I had trouble processing your outfit request. Please try again.'
                }
            };
        }
    }

    /**
     * Process the streaming response from Bedrock Agent
     */
    async processAgentResponse(response) {
        let responseText = '';

        try {
            // Handle the async iterator for streaming response
            for await (const chunk of response.completion) {
                if (chunk.chunk && chunk.chunk.bytes) {
                    const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
                    responseText += chunkText;
                }
            }
        } catch (error) {
            console.error('Error processing agent response:', error);
            throw new Error('Failed to process agent response');
        }

        return responseText || 'I received your request but had trouble generating a response. Please try again.';
    }

    /**
     * Get current session information
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            sessionAttributes: this.sessionAttributes,
            agentId: this.agentId,
            agentAliasId: this.agentAliasId
        };
    }

    /**
     * End current session
     */
    endSession() {
        this.sessionId = null;
        this.sessionAttributes = {};
    }

    /**
     * Test agent connection and configuration
     */
    async testAgentConnection() {
        try {
            const testMessage = "Hello, I'd like to test the outfit planning assistant.";
            const result = await this.processOutfitRequest(testMessage);

            if (result.success) {
                return {
                    success: true,
                    data: {
                        message: 'Bedrock Agent connection successful',
                        agentId: this.agentId,
                        agentAliasId: this.agentAliasId,
                        response: result.data.response
                    }
                };
            } else {
                return result;
            }

        } catch (error) {
            console.error('Bedrock Agent connection test failed:', error);
            return {
                success: false,
                error: {
                    code: 'CONNECTION_ERROR',
                    message: error.message
                }
            };
        }
    }

    /**
     * Update session attributes (for maintaining context)
     */
    updateSessionAttributes(attributes) {
        this.sessionAttributes = {
            ...this.sessionAttributes,
            ...attributes,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Query knowledge base directly for style information
     */
    async queryStylesKnowledgeBase(query) {
        try {
            const result = await knowledgeBaseService.queryStyles(query);

            if (result.success && result.data.results.length > 0) {
                const formattedResults = knowledgeBaseService.formatResults(result.data.results);
                return {
                    success: true,
                    data: {
                        response: `Based on the styles database:\n\n${formattedResults}`,
                        rawResults: result.data.results,
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                return {
                    success: true,
                    data: {
                        response: "I'm having trouble accessing the styles database right now. This could be because:\n\n1. The knowledge base is still being set up\n2. The data is still being indexed\n3. There might be a configuration issue\n\nIn the meantime, I can help with weather information! Try asking 'What's the weather in [city]?'",
                        timestamp: new Date().toISOString()
                    }
                };
            }
        } catch (error) {
            console.error('Knowledge base query error:', error);

            if (error.message.includes('does not exist')) {
                return {
                    success: true,
                    data: {
                        response: "The styles database isn't accessible right now. This might be because:\n\n1. The knowledge base is still being created\n2. There's a configuration issue with the knowledge base ID\n3. The knowledge base might be in a different AWS region\n\nI can still help with weather information! Try asking about the weather in any city.",
                        timestamp: new Date().toISOString()
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'KB_QUERY_ERROR',
                    message: 'Failed to query the styles database. Please try again.'
                }
            };
        }
    }

    /**
     * Get agent configuration status
     */
    getConfigurationStatus() {
        const kbStatus = knowledgeBaseService.getConfigurationStatus();

        return {
            agentConfigured: !!this.agentId,
            agentId: this.agentId,
            agentAliasId: this.agentAliasId,
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            credentialsConfigured: !!(process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY),
            knowledgeBase: kbStatus
        };
    }
}

const bedrockAgentService = new BedrockAgentService();
export default bedrockAgentService;