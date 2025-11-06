/**
 * Frontend Chat Service for AI Outfit Assistant
 * Handles both weather lookup and outfit planning requests
 */

import bedrockService from './bedrockService';

class ChatService {
    constructor() {
        this.timeout = 30000; // 30 seconds timeout
    }

    /**
     * Send a message to the AI service
     * @param {string} message - The user's message
     * @param {string} sessionId - Optional session ID for conversation continuity
     * @returns {Promise<Object>} Response object with success status and data
     */
    async sendMessage(message, sessionId = null) {
        if (!message || typeof message !== 'string' || !message.trim()) {
            throw new Error('Message is required and must be a non-empty string');
        }

        try {
            // Use the outfit planning service for outfit-related requests
            const result = await bedrockService.processOutfitRequest(message.trim());

            if (!result.success) {
                throw new ChatServiceError(
                    result.error?.message || 'AI request failed',
                    500,
                    result.error?.code || 'AI_ERROR'
                );
            }

            // Check if this is an outfit planning response with structured data
            const messageType = result.data.eventContext ? 'event_extraction' : 'general';

            return {
                success: true,
                response: result.data.response,
                sessionId: result.data.sessionId || null,
                timestamp: result.data.timestamp || new Date().toISOString(),
                messageType: messageType,
                eventContext: result.data.eventContext || null,
                needsClarification: result.data.needsClarification || null,
                extractionConfidence: result.data.extractionConfidence || null,
                pipelineStage: result.data.pipelineStage || null
            };

        } catch (error) {
            if (error instanceof ChatServiceError) {
                throw error;
            }

            // Handle AWS/network errors
            if (error.name === 'NetworkError' || error.message.includes('fetch')) {
                throw new ChatServiceError(
                    'Unable to connect to the AI service. Please check your connection and try again.',
                    0,
                    'NETWORK_ERROR'
                );
            }

            if (error.name === 'AccessDeniedException') {
                throw new ChatServiceError(
                    'AI service access denied. Please check your credentials.',
                    403,
                    'ACCESS_DENIED'
                );
            }

            if (error.name === 'ThrottlingException') {
                throw new ChatServiceError(
                    'Too many requests. Please wait a moment and try again.',
                    429,
                    'RATE_LIMIT_EXCEEDED'
                );
            }

            // Generic error fallback
            throw new ChatServiceError(
                error.message || 'An unexpected error occurred',
                500,
                'UNKNOWN_ERROR'
            );
        }
    }



    /**
     * Check if the AI services are available
     * @returns {Promise<Object>} Service availability status
     */
    async isServiceAvailable() {
        try {
            const bedrockResult = await bedrockService.testConnection();

            return {
                bedrock: bedrockResult.success,
                overall: bedrockResult.success
            };
        } catch (error) {
            console.warn('AI service health check failed:', error.message);
            return {
                bedrock: false,
                overall: false
            };
        }
    }

    /**
     * Get session information
     * @returns {Object} Current session information
     */
    getSessionInfo() {
        return {
            sessionId: null,
            conversationType: 'general',
            serviceType: 'bedrock'
        };
    }

    /**
     * End current conversation session
     */
    endSession() {
        // No session management needed for direct Bedrock calls
    }

    /**
     * Get configuration status for both services
     * @returns {Object} Configuration status
     */
    getConfigurationStatus() {
        return {
            bedrock: {
                configured: !!(process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY),
                region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
                modelId: 'us.amazon.nova-lite-v1:0'
            }
        };
    }

    /**
     * Get user-friendly error message based on error type
     * @param {Error} error - The error object
     * @returns {string} User-friendly error message
     */
    getErrorMessage(error) {
        if (error instanceof ChatServiceError) {
            switch (error.code) {
                case 'NETWORK_ERROR':
                    return 'Connection failed. Please check your internet connection and try again.';
                case 'TIMEOUT_ERROR':
                    return 'The request took too long. Please try again.';
                case 'VALIDATION_ERROR':
                    return 'Please check your message and try again.';
                case 'RATE_LIMIT_EXCEEDED':
                    return 'Too many requests. Please wait a moment and try again.';
                case 'ACCESS_DENIED':
                    return 'Access denied. Please refresh the page and try again.';
                case 'WEATHER_DATA_ERROR':
                    return 'Unable to fetch weather data. Please try a different location or try again later.';
                default:
                    return error.message || 'Sorry, I had trouble processing your message. Please try again.';
            }
        }

        return 'An unexpected error occurred. Please try again.';
    }
}

/**
 * Custom error class for chat service errors
 */
class ChatServiceError extends Error {
    constructor(message, statusCode = 500, code = 'UNKNOWN_ERROR') {
        super(message);
        this.name = 'ChatServiceError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

// Export singleton instance
const chatService = new ChatService();
export default chatService;
export { ChatService, ChatServiceError };