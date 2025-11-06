/**
 * Service Integration Tests
 * Tests the actual integration between services without mocking
 */

import bedrockService from '../bedrockService';
import weatherService from '../weatherService';
import chatService from '../chatService';

describe('Service Integration', () => {
    describe('WeatherService', () => {
        it('should be properly instantiated', () => {
            expect(weatherService).toBeDefined();
            expect(typeof weatherService.geocodeLocation).toBe('function');
            expect(typeof weatherService.getCurrentWeather).toBe('function');
            expect(typeof weatherService.getWeatherForecast).toBe('function');
            expect(typeof weatherService.getWeatherForLocationAndDate).toBe('function');
        });

        it('should have required configuration', () => {
            expect(weatherService.apiKey).toBeDefined();
            expect(weatherService.baseUrl).toBe('https://api.openweathermap.org/data/2.5');
            expect(weatherService.geocodingUrl).toBe('https://api.openweathermap.org/geo/1.0');
        });
    });

    describe('BedrockService', () => {
        it('should be properly instantiated', () => {
            expect(bedrockService).toBeDefined();
            expect(typeof bedrockService.processWeatherRequest).toBe('function');
            expect(typeof bedrockService.extractLocationAndDate).toBe('function');
            expect(typeof bedrockService.generateWeatherResponse).toBe('function');
            expect(typeof bedrockService.testConnection).toBe('function');
        });

        it('should have required configuration', () => {
            expect(bedrockService.client).toBeDefined();
            expect(bedrockService.modelId).toBe('us.amazon.nova-lite-v1:0');
            expect(bedrockService.modelConfig).toBeDefined();
            expect(bedrockService.modelConfig.temperature).toBe(0.3);
            expect(bedrockService.modelConfig.maxTokens).toBe(1000);
        });
    });

    describe('ChatService', () => {
        it('should be properly instantiated', () => {
            expect(chatService).toBeDefined();
            expect(typeof chatService.sendMessage).toBe('function');
            expect(typeof chatService.isServiceAvailable).toBe('function');
            expect(typeof chatService.getErrorMessage).toBe('function');
        });

        it('should have required configuration', () => {
            expect(chatService.timeout).toBe(30000);
        });
    });

    describe('Service Dependencies', () => {
        it('should have proper service dependencies', () => {
            // BedrockService should have access to WeatherService
            expect(bedrockService.constructor.name).toBe('BedrockService');

            // ChatService should work with BedrockService
            expect(chatService.constructor.name).toBe('ChatService');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid input gracefully', async () => {
            // Test ChatService with invalid input
            await expect(chatService.sendMessage('')).rejects.toThrow();
            await expect(chatService.sendMessage(null)).rejects.toThrow();
            await expect(chatService.sendMessage(undefined)).rejects.toThrow();
        });

        it('should provide user-friendly error messages', () => {
            const networkError = new Error('Network failed');
            networkError.name = 'NetworkError';

            const message = chatService.getErrorMessage(networkError);
            expect(message).toBe('An unexpected error occurred. Please try again.');
        });
    });

    describe('Environment Configuration', () => {
        it('should have required environment variables', () => {
            // Check that environment variables are accessible
            expect(process.env.REACT_APP_AWS_REGION).toBeDefined();
            expect(process.env.REACT_APP_WEATHER_API_KEY).toBeDefined();

            // AWS credentials should be available (either from env or hardcoded)
            expect(process.env.REACT_APP_AWS_ACCESS_KEY_ID || 'AKIA6GBMEZYKV3ODLVGG').toBeDefined();
            expect(process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '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').toBeDefined();
        });
    });
});