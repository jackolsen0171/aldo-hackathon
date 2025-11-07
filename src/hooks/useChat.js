import { useState, useCallback } from 'react';
import chatService from '../services/chatService';

/**
 * Custom hook for managing chat state and interactions
 * Provides message management, loading states, and error handling
 */
export const useChat = () => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'ai',
            content: 'Hello! I\'m your AI Outfit Assistant. Tell me about your upcoming event, trip, or occasion, and I\'ll help you plan the perfect outfits and create an optimized packing list. I can also check weather conditions to ensure your outfits are appropriate for the climate!',
            timestamp: new Date().toISOString(),
            status: 'delivered'
        }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastUserMessage, setLastUserMessage] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [conversationType, setConversationType] = useState(null);

    /**
     * Send a message to the chat service
     * @param {string} messageContent - The message content to send
     * @returns {Promise<Object|null>} The result object if successful, null otherwise
     */
    const sendMessage = useCallback(async (messageContent) => {
        if (!messageContent.trim() || loading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: messageContent.trim(),
            timestamp: new Date().toISOString(),
            status: 'sending'
        };

        // Store the last user message for retry functionality
        setLastUserMessage(userMessage);

        // Add user message to chat
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);
        setError('');

        // Update message status to sent
        setMessages(prev => prev.map(msg =>
            msg.id === userMessage.id
                ? { ...msg, status: 'sent' }
                : msg
        ));

        try {



            // Use the chat service to send the message with session continuity
            const result = await chatService.sendMessage(userMessage.content, sessionId);

            if (result.success) {
                // Update session information
                if (result.sessionId) {
                    setSessionId(result.sessionId);
                }
                if (result.messageType) {
                    setConversationType(result.messageType);
                }

                const aiMessage = {
                    id: Date.now() + 1,
                    type: 'ai',
                    content: result.response,
                    timestamp: result.timestamp,
                    status: 'delivered',
                    messageType: result.messageType,
                    eventData: result.eventContext,
                    needsClarification: result.needsClarification,
                    extractionConfidence: result.extractionConfidence,
                    pipelineStage: result.pipelineStage
                };
                setMessages(prev => [...prev, aiMessage]);

                // Update user message status to delivered
                setMessages(prev => prev.map(msg =>
                    msg.id === userMessage.id
                        ? { ...msg, status: 'delivered', messageType: result.messageType }
                        : msg
                ));

                // Return the result for the caller to handle
                return result;
            } else {
                throw new Error('Failed to get AI response');
            }
        } catch (err) {
            console.error('Chat error:', err);

            // Get user-friendly error message from chat service
            const errorMessage = chatService.getErrorMessage(err);
            setError(errorMessage);

            // Update user message status to failed
            setMessages(prev => prev.map(msg =>
                msg.id === userMessage.id
                    ? { ...msg, status: 'failed' }
                    : msg
            ));

            const aiErrorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: errorMessage,
                timestamp: new Date().toISOString(),
                isError: true,
                status: 'delivered'
            };
            setMessages(prev => [...prev, aiErrorMessage]);
        } finally {
            setLoading(false);
        }

        return null; // Return null if there was an error
    }, [loading]);

    /**
     * Retry the last failed message
     */
    const retryLastMessage = useCallback(async () => {
        if (lastUserMessage && !loading) {
            // Remove any error messages from the last attempt
            setMessages(prev => prev.filter(msg =>
                !(msg.type === 'ai' && msg.isError &&
                    new Date(msg.timestamp) > new Date(lastUserMessage.timestamp))
            ));

            // Clear current error
            setError('');

            // Resend the message
            await sendMessage(lastUserMessage.content);
        }
    }, [lastUserMessage, loading, sendMessage]);

    /**
     * Clear the chat conversation
     */
    const clearChat = useCallback(() => {
        setMessages([
            {
                id: 1,
                type: 'ai',
                content: 'Hello! I\'m your AI Outfit Assistant. Tell me about your upcoming event, trip, or occasion, and I\'ll help you plan the perfect outfits and create an optimized packing list. I can also check weather conditions to ensure your outfits are appropriate for the climate!',
                timestamp: new Date().toISOString(),
                status: 'delivered'
            }
        ]);
        setError('');
        setLastUserMessage(null);
        setSessionId(null);
        setConversationType(null);

        // End the current session in the chat service
        chatService.endSession();
    }, []);

    /**
     * Clear any current error
     */
    const clearError = useCallback(() => {
        setError('');
    }, []);

    /**
     * Check if the chat services are available
     */
    const checkServiceAvailability = useCallback(async () => {
        try {
            const availability = await chatService.isServiceAvailable();
            if (!availability.overall) {
                console.warn('Some services may be unavailable, but allowing input for testing');
                // For development/testing, we'll still return true to allow input
                // In production, you might want to return availability.overall
            }
            return true; // Always return true for development/testing
        } catch (err) {
            console.warn('Service availability check failed, but allowing input for testing:', err);
            return true; // Always return true for development/testing
        }
    }, []);

    /**
     * Get current session information
     */
    const getSessionInfo = useCallback(() => {
        return {
            sessionId,
            conversationType,
            messageCount: messages.length - 1, // Exclude initial greeting
            serviceInfo: chatService.getSessionInfo()
        };
    }, [sessionId, conversationType, messages.length]);

    /**
     * Get configuration status
     */
    const getConfigurationStatus = useCallback(() => {
        return chatService.getConfigurationStatus();
    }, []);

    /**
     * Add a message directly to the chat (for system messages)
     */
    const addMessage = useCallback((message) => {
        const newMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'ai',
            status: 'delivered',
            timestamp: new Date().toISOString(),
            ...message
        };
        setMessages(prev => [...prev, newMessage]);
    }, []);

    return {
        messages,
        loading,
        error,
        sendMessage,
        clearChat,
        clearError,
        checkServiceAvailability,
        retryLastMessage: lastUserMessage ? retryLastMessage : null,
        sessionId,
        conversationType,
        getSessionInfo,
        getConfigurationStatus,
        addMessage
    };
};