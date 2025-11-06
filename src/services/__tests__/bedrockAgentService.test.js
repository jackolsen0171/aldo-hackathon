/**
 * Tests for Bedrock Agent Service
 */

import bedrockAgentService from '../bedrockAgentService';

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-agent-runtime', () => ({
    BedrockAgentRuntimeClient: jest.fn().mockImplementation(() => ({
        send: jest.fn()
    })),
    InvokeAgentCommand: jest.fn()
}));

describe('BedrockAgentService', () => {
    beforeEach(() => {
        // Reset environment variables
        process.env.REACT_APP_BEDROCK_AGENT_ID = 'test-agent-id';
        process.env.REACT_APP_BEDROCK_AGENT_ALIAS_ID = 'test-alias-id';
        process.env.REACT_APP_AWS_REGION = 'us-east-1';
        process.env.REACT_APP_AWS_ACCESS_KEY_ID = 'test-key';
        process.env.REACT_APP_AWS_SECRET_ACCESS_KEY = 'test-secret';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Configuration', () => {
        test('should initialize with correct configuration', () => {
            const config = bedrockAgentService.getConfigurationStatus();

            expect(config.agentConfigured).toBe(true);
            expect(config.agentId).toBe('test-agent-id');
            expect(config.agentAliasId).toBe('test-alias-id');
            expect(config.credentialsConfigured).toBe(true);
        });

        test('should detect missing agent configuration', () => {
            delete process.env.REACT_APP_BEDROCK_AGENT_ID;

            // Create new instance to test configuration
            const { BedrockAgentRuntimeClient } = require('@aws-sdk/client-bedrock-agent-runtime');
            const testService = new (require('../bedrockAgentService').default.constructor)();

            const config = testService.getConfigurationStatus();
            expect(config.agentConfigured).toBe(false);
        });
    });

    describe('Session Management', () => {
        test('should initialize new session', () => {
            const sessionId = bedrockAgentService.initializeSession();

            expect(sessionId).toMatch(/^outfit-session-\d+-[a-z0-9]+$/);

            const sessionInfo = bedrockAgentService.getSessionInfo();
            expect(sessionInfo.sessionId).toBe(sessionId);
            expect(sessionInfo.sessionAttributes.conversationType).toBe('outfit-planning');
        });

        test('should update session attributes', () => {
            bedrockAgentService.initializeSession();

            const testAttributes = {
                eventType: 'conference',
                location: 'New York'
            };

            bedrockAgentService.updateSessionAttributes(testAttributes);

            const sessionInfo = bedrockAgentService.getSessionInfo();
            expect(sessionInfo.sessionAttributes.eventType).toBe('conference');
            expect(sessionInfo.sessionAttributes.location).toBe('New York');
            expect(sessionInfo.sessionAttributes.lastUpdated).toBeDefined();
        });

        test('should end session', () => {
            bedrockAgentService.initializeSession();
            bedrockAgentService.endSession();

            const sessionInfo = bedrockAgentService.getSessionInfo();
            expect(sessionInfo.sessionId).toBeNull();
            expect(sessionInfo.sessionAttributes).toEqual({});
        });
    });

    describe('Error Handling', () => {
        test('should handle missing agent ID', async () => {
            // Temporarily remove agent ID
            const originalAgentId = process.env.REACT_APP_BEDROCK_AGENT_ID;
            delete process.env.REACT_APP_BEDROCK_AGENT_ID;

            // Import the class directly to create a new instance
            const BedrockAgentServiceClass = require('../bedrockAgentService').default.constructor;
            const testService = new BedrockAgentServiceClass();

            const result = await testService.processOutfitRequest('test message');

            expect(result.success).toBe(false);
            expect(result.error.code).toBe('AGENT_ERROR');

            // Restore original value
            process.env.REACT_APP_BEDROCK_AGENT_ID = originalAgentId;
        });

        test('should handle ResourceNotFoundException', async () => {
            const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

            const mockSend = jest.fn().mockRejectedValue({
                name: 'ResourceNotFoundException',
                message: 'Agent not found'
            });

            BedrockAgentRuntimeClient.mockImplementation(() => ({
                send: mockSend
            }));

            // Create new instance to use mocked client
            const testService = new (require('../bedrockAgentService').default.constructor)();

            const result = await testService.processOutfitRequest('test message');

            expect(result.success).toBe(false);
            expect(result.error.code).toBe('AGENT_NOT_FOUND');
        });

        test('should handle AccessDeniedException', async () => {
            const { BedrockAgentRuntimeClient } = require('@aws-sdk/client-bedrock-agent-runtime');

            const mockSend = jest.fn().mockRejectedValue({
                name: 'AccessDeniedException',
                message: 'Access denied'
            });

            BedrockAgentRuntimeClient.mockImplementation(() => ({
                send: mockSend
            }));

            const testService = new (require('../bedrockAgentService').default.constructor)();

            const result = await testService.processOutfitRequest('test message');

            expect(result.success).toBe(false);
            expect(result.error.code).toBe('ACCESS_DENIED');
        });
    });

    describe('Response Processing', () => {
        test('should process streaming response correctly', async () => {
            const mockResponseText = 'Here are some outfit recommendations...';
            const mockChunks = [
                { chunk: { bytes: new TextEncoder().encode('Here are some ') } },
                { chunk: { bytes: new TextEncoder().encode('outfit recommendations...') } }
            ];

            const mockResponse = {
                completion: {
                    [Symbol.asyncIterator]: async function* () {
                        for (const chunk of mockChunks) {
                            yield chunk;
                        }
                    }
                }
            };

            const { BedrockAgentRuntimeClient } = require('@aws-sdk/client-bedrock-agent-runtime');

            const mockSend = jest.fn().mockResolvedValue(mockResponse);
            BedrockAgentRuntimeClient.mockImplementation(() => ({
                send: mockSend
            }));

            const testService = new (require('../bedrockAgentService').default.constructor)();

            const result = await testService.processOutfitRequest('Plan outfits for a 3-day conference');

            expect(result.success).toBe(true);
            expect(result.data.response).toBe(mockResponseText);
            expect(result.data.sessionId).toBeDefined();
        });
    });
});