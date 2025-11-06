/**
 * Tests for Knowledge Base Service
 */

import knowledgeBaseService from '../knowledgeBaseService';

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-agent-runtime', () => ({
    BedrockAgentRuntimeClient: jest.fn().mockImplementation(() => ({
        send: jest.fn()
    })),
    RetrieveCommand: jest.fn()
}));

describe('KnowledgeBaseService', () => {
    beforeEach(() => {
        // Set up environment variables
        process.env.REACT_APP_KNOWLEDGE_BASE_ID = 'R7UWJZQGKs';
        process.env.REACT_APP_AWS_REGION = 'us-east-1';
        process.env.REACT_APP_AWS_ACCESS_KEY_ID = 'test-key';
        process.env.REACT_APP_AWS_SECRET_ACCESS_KEY = 'test-secret';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Configuration', () => {
        test('should return correct configuration status', () => {
            const config = knowledgeBaseService.getConfigurationStatus();

            expect(config.knowledgeBaseConfigured).toBe(true);
            expect(config.knowledgeBaseId).toBe('R7UWJZQGKs');
            expect(config.credentialsConfigured).toBe(true);
        });

        test('should detect missing knowledge base ID', () => {
            delete process.env.REACT_APP_KNOWLEDGE_BASE_ID;

            // Create new instance to test configuration
            const { BedrockAgentRuntimeClient } = require('@aws-sdk/client-bedrock-agent-runtime');
            const testService = new (require('../knowledgeBaseService').default.constructor)();

            const config = testService.getConfigurationStatus();
            expect(config.knowledgeBaseConfigured).toBe(false);
        });
    });

    describe('Query Methods', () => {
        test('should format search queries correctly', async () => {
            const { BedrockAgentRuntimeClient, RetrieveCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

            const mockResults = [
                {
                    content: { text: 'Blue cotton shirt, casual style, $29.99' },
                    score: 0.85
                },
                {
                    content: { text: 'Navy blazer, business formal, $89.99' },
                    score: 0.78
                }
            ];

            const mockSend = jest.fn().mockResolvedValue({
                retrievalResults: mockResults
            });

            BedrockAgentRuntimeClient.mockImplementation(() => ({
                send: mockSend
            }));

            const testService = new (require('../knowledgeBaseService').default.constructor)();

            const result = await testService.searchByCategory('shirts', 'business', 'cool');

            expect(result.success).toBe(true);
            expect(result.data.results).toEqual(mockResults);
            expect(mockSend).toHaveBeenCalledWith(expect.any(RetrieveCommand));
        });

        test('should handle search by color', async () => {
            const result = await knowledgeBaseService.searchByColor('blue', 'shirts');

            // This will test the query construction
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('success');
        });

        test('should handle outfit combinations search', async () => {
            const result = await knowledgeBaseService.searchOutfitCombinations('business meeting', 'cold', 'professional');

            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('success');
        });
    });

    describe('Result Formatting', () => {
        test('should format results correctly', () => {
            const mockResults = [
                {
                    content: { text: 'Blue cotton shirt, casual style, $29.99' },
                    score: 0.85
                },
                {
                    content: { text: 'Navy blazer, business formal, $89.99' },
                    score: 0.78
                }
            ];

            const formatted = knowledgeBaseService.formatResults(mockResults);

            expect(formatted).toContain('Blue cotton shirt');
            expect(formatted).toContain('Navy blazer');
            expect(formatted).toContain('85%');
            expect(formatted).toContain('78%');
        });

        test('should handle empty results', () => {
            const formatted = knowledgeBaseService.formatResults([]);

            expect(formatted).toBe('No matching items found in the knowledge base.');
        });
    });

    describe('Error Handling', () => {
        test('should handle missing knowledge base ID', async () => {
            delete process.env.REACT_APP_KNOWLEDGE_BASE_ID;

            const testService = new (require('../knowledgeBaseService').default.constructor)();

            const result = await testService.queryStyles('test query');

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('Knowledge Base ID not configured');
        });

        test('should handle ResourceNotFoundException', async () => {
            const { BedrockAgentRuntimeClient } = require('@aws-sdk/client-bedrock-agent-runtime');

            const mockSend = jest.fn().mockRejectedValue({
                name: 'ResourceNotFoundException',
                message: 'Knowledge base not found'
            });

            BedrockAgentRuntimeClient.mockImplementation(() => ({
                send: mockSend
            }));

            const testService = new (require('../knowledgeBaseService').default.constructor)();

            const result = await testService.queryStyles('test query');

            expect(result.success).toBe(false);
            expect(result.error.code).toBe('KB_NOT_FOUND');
        });
    });
});