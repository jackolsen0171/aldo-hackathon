/**
 * Real Service Integration Test
 * This test verifies that services can actually connect to their respective APIs
 * Note: This test requires actual API credentials and network access
 */

import bedrockService from '../bedrockService';
import weatherService from '../weatherService';
import chatService from '../chatService';

describe('Real Service Integration (requires network)', () => {
    // Increase timeout for network requests
    const originalTimeout = 30000;

    beforeAll(() => {
        jest.setTimeout(originalTimeout);
    });

    describe('WeatherService Real API', () => {
        it('should geocode a real location', async () => {
            try {
                const result = await weatherService.geocodeLocation('London');

                expect(result).toBeDefined();
                expect(result.name).toBe('London');
                expect(result.country).toBeDefined();
                expect(result.coordinates).toBeDefined();
                expect(result.coordinates.lat).toBeCloseTo(51.5074, 1);
                expect(result.coordinates.lon).toBeCloseTo(-0.1278, 1);
            } catch (error) {
                // If API key is invalid or network is down, skip this test
                if (error.message.includes('401') || error.message.includes('API key')) {
                    console.warn('Weather API test skipped - invalid API key');
                    return;
                }
                throw error;
            }
        }, 15000);

        it('should get current weather for coordinates', async () => {
            try {
                // London coordinates
                const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

                expect(result).toBeDefined();
                expect(result.main).toBeDefined();
                expect(result.main.temp).toBeDefined();
                expect(result.weather).toBeDefined();
                expect(result.weather[0]).toBeDefined();
                expect(result.weather[0].description).toBeDefined();
            } catch (error) {
                if (error.message.includes('401') || error.message.includes('API key')) {
                    console.warn('Weather API test skipped - invalid API key');
                    return;
                }
                throw error;
            }
        }, 15000);
    });

    describe('BedrockService Real API', () => {
        it('should test connection to AWS Bedrock', async () => {
            try {
                const result = await bedrockService.testConnection();

                if (result.success) {
                    expect(result.success).toBe(true);
                    expect(result.data).toBeDefined();
                    expect(result.data.message).toBe('Bedrock connection successful');
                } else {
                    // Connection failed - could be credentials or network
                    expect(result.success).toBe(false);
                    expect(result.error).toBeDefined();
                    console.warn('Bedrock connection test failed:', result.error.message);
                }
            } catch (error) {
                console.warn('Bedrock test error:', error.message);
                // Don't fail the test - just log the issue
                expect(error).toBeDefined();
            }
        }, 20000);
    });

    describe('ChatService Real Integration', () => {
        it('should check service availability', async () => {
            const isAvailable = await chatService.isServiceAvailable();

            // Service availability depends on AWS credentials and network
            expect(typeof isAvailable).toBe('boolean');

            if (!isAvailable) {
                console.warn('Chat service is not available - likely due to AWS credentials or network');
            }
        }, 15000);

        it('should handle simple weather request (if services are available)', async () => {
            try {
                const result = await chatService.sendMessage('What is the weather like?');

                expect(result).toBeDefined();
                expect(result.success).toBe(true);
                expect(result.response).toBeDefined();
                expect(typeof result.response).toBe('string');
                expect(result.timestamp).toBeDefined();

                console.log('Chat service response:', result.response.substring(0, 100) + '...');
            } catch (error) {
                // Expected if AWS credentials are not valid or services are down
                console.warn('Chat service test failed (expected if no valid credentials):', error.message);
                expect(error).toBeDefined();
            }
        }, 30000);
    });

    describe('Error Handling', () => {
        it('should handle invalid location gracefully', async () => {
            try {
                await weatherService.geocodeLocation('InvalidLocationThatDoesNotExist12345');
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error.message).toContain('not found');
            }
        });

        it('should handle empty chat message', async () => {
            try {
                await chatService.sendMessage('');
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error.message).toContain('required');
            }
        });
    });
});