import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import EventDetailsForm from './EventDetailsForm';
import { useChat } from '../hooks/useChat';
import './ChatWidget.css';

const ChatWidget = () => {
    const {
        messages,
        loading,
        error,
        sendMessage: sendChatMessage,
        clearChat: clearChatHistory,
        clearError,
        checkServiceAvailability,
        retryLastMessage,
        addMessage
    } = useChat();

    const [currentMessage, setCurrentMessage] = useState('');
    const [isServiceAvailable, setIsServiceAvailable] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [showEventForm, setShowEventForm] = useState(false);
    const [pendingEventData, setPendingEventData] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const inputRef = useRef(null);

    // Focus input on component mount and check service availability
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }

        // Check if chat service is available
        const checkAvailability = async () => {
            const available = await checkServiceAvailability();
            setIsServiceAvailable(available);
        };

        checkAvailability();
    }, [checkServiceAvailability]);

    const sendMessage = async () => {
        if (!currentMessage.trim() || loading) return;

        // Send message using the chat hook
        const result = await sendChatMessage(currentMessage);
        setCurrentMessage('');

        // Check if we received outfit planning data that needs user confirmation
        if (result && result.eventContext) {
            setPendingEventData(result.eventContext);
            setShowEventForm(true);
        }
    };



    const handleInputChange = (e) => {
        setCurrentMessage(e.target.value);
        // Clear error when user starts typing
        if (error) {
            clearError();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleClearChat = () => {
        clearChatHistory();
        setCurrentMessage('');
        setRetryCount(0);
    };

    const handleRetry = async () => {
        if (retryLastMessage) {
            setRetryCount(prev => prev + 1);
            await retryLastMessage();
        }
    };

    const handleCheckConnection = async () => {
        const available = await checkServiceAvailability();
        setIsServiceAvailable(available);
        if (available && error) {
            clearError();
        }
    };

    const handleEventFormConfirm = async (confirmedEventData) => {
        setFormLoading(true);
        setShowEventForm(false);

        try {
            // Import pipeline service
            const { default: pipelineService } = await import('../services/pipelineService');

            // Get current session ID from pending event data or initialize new session
            const sessionId = pendingEventData?.sessionId || `session_${Date.now()}`;

            // Initialize session if it doesn't exist
            const initialState = pipelineService.initializeSession(sessionId);

            // First, process the user input to transition to confirmation_pending stage
            const inputResult = await pipelineService.processUserInput(
                `Business trip to Chicago for 2 days`,
                sessionId,
                confirmedEventData
            );

            if (!inputResult.success) {
                throw new Error(inputResult.error?.message || 'Failed to process input');
            }

            // Now confirm event details with pipeline service
            const confirmResult = await pipelineService.confirmEventDetails(confirmedEventData, sessionId);

            if (!confirmResult.success) {
                throw new Error(confirmResult.error?.message || 'Failed to confirm event details');
            }

            // Show context gathering message
            addMessage({
                content: `Perfect! I'm now gathering weather information and context for your ${confirmedEventData.occasion}...`
            });

            // Complete context gathering
            const contextResult = await pipelineService.completeContextGathering(sessionId);

            if (!contextResult.success) {
                throw new Error(contextResult.error?.message || 'Failed to gather context');
            }

            // Show outfit generation message
            addMessage({
                content: `Context gathered! Now generating your outfit recommendations...`
            });

            // Generate outfits using pipeline service (which orchestrates the full flow)
            const generationResult = await pipelineService.generateOutfits(confirmedEventData, sessionId);

            if (!generationResult.success) {
                throw new Error(generationResult.error?.message || 'Failed to generate outfits');
            }

            // Show completion message
            addMessage({
                content: `Great! I've generated outfit recommendations for your ${confirmedEventData.duration}-day ${confirmedEventData.occasion}. The outfit generation system is now ready for AI integration!`
            });

        } catch (error) {
            console.error('Error processing confirmed event data:', error);
            addMessage({
                content: `I encountered an error while processing your event details: ${error.message}. Please try again.`
            });
        } finally {
            setFormLoading(false);
            setPendingEventData(null);
        }
    };

    const handleEventFormCancel = () => {
        setShowEventForm(false);
        setPendingEventData(null);

        addMessage({
            content: 'No problem! Feel free to describe your event again if you\'d like outfit recommendations.'
        });
    };

    return (
        <div className="chat-widget">
            <div className="chat-header">
                <h2>AI Outfit Assistant</h2>
                <button
                    onClick={handleClearChat}
                    className="clear-chat-btn"
                    title="Clear conversation"
                >
                    🗑️
                </button>
            </div>

            <MessageList messages={messages} loading={loading} />

            {showEventForm && pendingEventData && (
                <EventDetailsForm
                    eventData={pendingEventData}
                    onConfirm={handleEventFormConfirm}
                    onCancel={handleEventFormCancel}
                    loading={formLoading}
                />
            )}

            <div className="chat-input-container">
                {!isServiceAvailable && (
                    <div className="service-status offline">
                        <span className="status-indicator">🔴</span>
                        <span>Service unavailable</span>
                        <button onClick={handleCheckConnection} className="check-connection-btn">
                            Check Connection
                        </button>
                    </div>
                )}

                {error && (
                    <div className="chat-error">
                        <div className="error-content">
                            <span className="error-icon">⚠️</span>
                            <span className="error-text">{error}</span>
                        </div>
                        <div className="error-actions">
                            {retryLastMessage && (
                                <button onClick={handleRetry} className="retry-btn">
                                    🔄 Retry
                                </button>
                            )}
                            <button onClick={clearError} className="dismiss-btn">
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                <div className="chat-input-wrapper">
                    <textarea
                        ref={inputRef}
                        value={currentMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isServiceAvailable
                                ? "Describe your event or trip... (e.g., '3-day business conference in Chicago next week')"
                                : "Service unavailable - please check connection"
                        }
                        className="chat-input"
                        rows="2"
                        disabled={loading || !isServiceAvailable}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!currentMessage.trim() || loading || !isServiceAvailable}
                        className="send-button"
                        title={!isServiceAvailable ? "Service unavailable" : "Send message"}
                    >
                        {loading ? '⏳' : '➤'}
                    </button>
                </div>

                {retryCount > 0 && (
                    <div className="retry-info">
                        Retry attempt: {retryCount}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWidget;