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
            // TODO: Generate outfit recommendations based on confirmed event data
            // For now, just show a confirmation message
            const confirmationMessage = {
                id: Date.now(),
                type: 'ai',
                content: `Perfect! I'll now generate outfit recommendations for your ${confirmedEventData.occasion} in ${confirmedEventData.location || 'the specified location'}. This feature is coming soon!`,
                timestamp: new Date().toISOString(),
                status: 'delivered'
            };

            addMessage({
                content: `Perfect! I'll now generate outfit recommendations for your ${confirmedEventData.occasion} in ${confirmedEventData.location || 'the specified location'}. This feature is coming soon!`
            });
        } catch (error) {
            console.error('Error processing confirmed event data:', error);
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