import chatService, { ChatServiceError } from '../chatService';

// Mock the BedrockService
jest.mock('../bedrockService', () => ({
    processWeatherRequest: jest.fn(),
    testConnection: jest.fn()
}));

import bedrockService from '../bedrockService';

describe('ChatService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('sendMessage', () => {
        it('should send message successfully', async () => {
            const mockBedrockResponse = {
                success: true,
                data: {
                    response: 'Test AI response',
                    timestamp: '2023-01-01T00:00:00.000Z'
                }
            };

            bedrockService.processWeatherRequest.mockResolvedValue(mockBedrockResponse);

            const result = await chatService.sendMessage('Test message');

            expect(bedrockService.processWeatherRequest).toHaveBeenCalledWith('Test message');
            expect(result).toEqual({
                success: true,
                response: 'Test AI response',
                timestamp: '2023-01-01T00:00:00.000Z'
            });
        });

        it('should throw error for empty message', async () => {
            await expect(chatService.sendMessage('')).rejects.toThrow(
                'Message is required and must be a non-empty string'
            );
        });

        it('should handle bedrock service errors', async () => {
            const mockError = {
                success: false,
                error: {
                    message: 'AI service error',
                    code: 'AI_ERROR'
                }
            };

            bedrockService.processWeatherRequest.mockResolvedValue(mockError);

            await expect(chatService.sendMessage('Test message')).rejects.toThrow(
                ChatServiceError
            );
        });

        it('should handle network errors', async () => {
            bedrockService.processWeatherRequest.mockRejectedValue(new TypeError('Failed to fetch'));

            await expect(chatService.sendMessage('Test message')).rejects.toThrow(
                ChatServiceError
            );
        });

        it('should handle AWS access denied errors', async () => {
            const accessError = new Error('Access denied');
            accessError.name = 'AccessDeniedException';
            bedrockService.processWeatherRequest.mockRejectedValue(accessError);

            await expect(chatService.sendMessage('Test message')).rejects.toThrow(
                'AI service access denied. Please check your credentials.'
            );
        });

        it('should handle throttling errors', async () => {
            const throttleError = new Error('Too many requests');
            throttleError.name = 'ThrottlingException';
            bedrockService.processWeatherRequest.mockRejectedValue(throttleError);

            await expect(chatService.sendMessage('Test message')).rejects.toThrow(
                'Too many requests. Please wait a moment and try again.'
            );
        });
    });

    describe('isServiceAvailable', () => {
        it('should return true when bedrock service is available', async () => {
            bedrockService.testConnection.mockResolvedValue({
                success: true,
                data: { message: 'Connection successful' }
            });

            const result = await chatService.isServiceAvailable();
            expect(result).toBe(true);
        });

        it('should return false when bedrock service is unavailable', async () => {
            bedrockService.testConnection.mockResolvedValue({
                success: false,
                error: { message: 'Connection failed' }
            });

            const result = await chatService.isServiceAvailable();
            expect(result).toBe(false);
        });

        it('should return false when bedrock service throws error', async () => {
            bedrockService.testConnection.mockRejectedValue(new Error('Network error'));

            const result = await chatService.isServiceAvailable();
            expect(result).toBe(false);
        });
    });

    describe('getErrorMessage', () => {
        it('should return user-friendly message for network error', () => {
            const error = new ChatServiceError('Network failed', 0, 'NETWORK_ERROR');
            const message = chatService.getErrorMessage(error);
            expect(message).toBe('Connection failed. Please check your internet connection and try again.');
        });

        it('should return generic message for unknown error', () => {
            const error = new Error('Unknown error');
            const message = chatService.getErrorMessage(error);
            expect(message).toBe('An unexpected error occurred. Please try again.');
        });
    });
});