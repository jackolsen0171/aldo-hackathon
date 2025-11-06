import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import { useChat } from '../hooks/useChat';
import './ChatWidgetPanel.css';

const ChatWidgetPanel = () => {
    const {
        messages,
        loading,
        error,
        sendMessage: sendChatMessage,
        clearChat: clearChatHistory,
        clearError,
        checkServiceAvailability,
        retryLastMessage
    } = useChat();

    const [currentMessage, setCurrentMessage] = useState('');
    const [isServiceAvailable, setIsServiceAvailable] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
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
        await sendChatMessage(currentMessage);
        setCurrentMessage('');
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

    // Test function to demonstrate EventDetailsForm
    const addTestEventMessage = () => {
        sendChatMessage('Test: 3-day business conference in NYC next week, need professional outfits under $500');
    };

    return (
        <div className="chat-widget-panel">
            {/* Panel-specific header with clear chat button */}
            <div className="chat-panel-actions">
                <button
                    onClick={handleClearChat}
                    className="clear-chat-btn"
                    title="Clear conversation"
                >
                    🗑️ Clear Chat
                </button>
                <button
                    onClick={addTestEventMessage}
                    className="test-event-btn"
                    title="Test EventDetailsForm"
                    style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8em',
                        cursor: 'pointer'
                    }}
                >
                    🧪 Test Event Form
                </button>
            </div>

            <MessageList messages={messages} loading={loading} />



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

export default ChatWidgetPanel;