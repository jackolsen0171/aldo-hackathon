/**
 * Integration tests for Bedrock Agent Service
 * Tests basic functionality without complex mocking
 */

import bedrockAgentService from '../bedrockAgentService';

describe('BedrockAgentService Integration', () => {
    describe('Configuration Status', () => {
        test('should return configuration status', () => {
            const status = bedrockAgentService.getConfigurationStatus();

            expect(status).toHaveProperty('agentConfigured');
            expect(status).toHaveProperty('agentId');
            expect(status).toHaveProperty('agentAliasId');
            expect(status).toHaveProperty('region');
            expect(status).toHaveProperty('credentialsConfigured');

            expect(typeof status.agentConfigured).toBe('boolean');
            expect(typeof status.credentialsConfigured).toBe('boolean');
        });
    });

    describe('Session Management', () => {
        test('should initialize and manage sessions', () => {
            const sessionId = bedrockAgentService.initializeSession();

            expect(sessionId).toBeDefined();
            expect(typeof sessionId).toBe('string');
            expect(sessionId).toMatch(/^outfit-session-/);

            const sessionInfo = bedrockAgentService.getSessionInfo();
            expect(sessionInfo.sessionId).toBe(sessionId);
            expect(sessionInfo.sessionAttributes).toHaveProperty('conversationType');
            expect(sessionInfo.sessionAttributes.conversationType).toBe('outfit-planning');
        });

        test('should update session attributes', () => {
            bedrockAgentService.initializeSession();

            const testAttributes = {
                eventType: 'business-trip',
                duration: 3
            };

            bedrockAgentService.updateSessionAttributes(testAttributes);

            const sessionInfo = bedrockAgentService.getSessionInfo();
            expect(sessionInfo.sessionAttributes.eventType).toBe('business-trip');
            expect(sessionInfo.sessionAttributes.duration).toBe(3);
            expect(sessionInfo.sessionAttributes.lastUpdated).toBeDefined();
        });

        test('should end sessions properly', () => {
            bedrockAgentService.initializeSession();
            bedrockAgentService.endSession();

            const sessionInfo = bedrockAgentService.getSessionInfo();
            expect(sessionInfo.sessionId).toBeNull();
            expect(sessionInfo.sessionAttributes).toEqual({});
        });
    });

    describe('Error Handling', () => {
        test('should handle requests gracefully when not configured', async () => {
            // This test will fail gracefully if agent is not configured
            const result = await bedrockAgentService.processOutfitRequest('test message');

            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');

            if (!result.success) {
                expect(result).toHaveProperty('error');
                expect(result.error).toHaveProperty('code');
                expect(result.error).toHaveProperty('message');
            } else {
                expect(result).toHaveProperty('data');
                expect(result.data).toHaveProperty('response');
            }
        });
    });
});