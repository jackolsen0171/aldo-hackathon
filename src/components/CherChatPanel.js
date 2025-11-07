import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import EventDetailsForm from './EventDetailsForm';
import './CherChatPanel.css';

const CherChatPanel = ({ selectedTrip, selectedOutfit, currentItems }) => {
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

  const [inputMessage, setInputMessage] = useState('');
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [pendingEventData, setPendingEventData] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check service availability on component mount
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await checkServiceAvailability();
      setIsServiceAvailable(available);
    };
    checkAvailability();
  }, [checkServiceAvailability]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    // Include context about current trip and outfit in the message
    let contextualMessage = inputMessage;
    if (selectedTrip || selectedOutfit || currentItems) {
      const context = [];
      if (selectedTrip?.name) context.push(`Trip: ${selectedTrip.name}`);
      if (selectedOutfit) context.push(`Outfit ${selectedOutfit}`);

      const currentItemsList = Object.entries(currentItems)
        .filter(([_, item]) => item !== null)
        .map(([category, index]) => {
          // Mock clothing data - this should match the data in MannequinOutfitBuilder
          const clothingData = {
            hat: [
              { id: 1, name: 'Baseball Cap', color: 'Blue' },
              { id: 2, name: 'Beanie', color: 'Black' },
              { id: 3, name: 'Sun Hat', color: 'Beige' },
              { id: 4, name: 'Fedora', color: 'Brown' }
            ],
            top: [
              { id: 1, name: 'White T-Shirt', color: 'White' },
              { id: 2, name: 'Blue Blouse', color: 'Blue' },
              { id: 3, name: 'Black Sweater', color: 'Black' },
              { id: 4, name: 'Red Tank Top', color: 'Red' }
            ],
            bottom: [
              { id: 1, name: 'Blue Jeans', color: 'Blue' },
              { id: 2, name: 'Black Skirt', color: 'Black' },
              { id: 3, name: 'Khaki Pants', color: 'Khaki' },
              { id: 4, name: 'White Shorts', color: 'White' }
            ],
            shoes: [
              { id: 1, name: 'White Sneakers', color: 'White' },
              { id: 2, name: 'Black Heels', color: 'Black' },
              { id: 3, name: 'Brown Boots', color: 'Brown' },
              { id: 4, name: 'Sandals', color: 'Tan' }
            ]
          };

          const item = clothingData[category]?.[index];
          return item ? `${item.name} (${item.color})` : null;
        })
        .filter(Boolean);

      if (currentItemsList.length > 0) {
        context.push(`Current items: ${currentItemsList.join(', ')}`);
      }

      if (context.length > 0) {
        contextualMessage = `${inputMessage}\n\nContext: ${context.join(', ')}`;
      }
    }

    // Send message using the chat hook
    const result = await sendChatMessage(contextualMessage);
    setInputMessage('');

    // Check if we received outfit planning data that needs user confirmation
    if (result && result.eventContext) {
      setPendingEventData(result.eventContext);
      setShowEventForm(true);
    }

    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleEventFormConfirm = async (confirmedEventData) => {
    setFormLoading(true);
    setShowEventForm(false);

    try {
      // TODO: Generate outfit recommendations based on confirmed event data
      // For now, just show a confirmation message
      const confirmationMessage = `Perfect! I'll now generate outfit recommendations for your ${confirmedEventData.occasion} in ${confirmedEventData.location || 'the specified location'}. This feature is coming soon!`;

      addMessage({
        content: confirmationMessage
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

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="cher-chat-panel">
      <div className="chat-header">
        <div className="cher-avatar">
          {/* TODO: REPLACE WITH CHER AVATAR IMAGE */}
          {/* Replace with: <img src="/images/cher-chat-avatar.png" alt="Cher" className="cher-avatar-img" /> */}
          <div className="cher-avatar-placeholder">👩‍🦱</div>
        </div>
        <div className="chat-header-info">
          <h3>Chat with Cher</h3>
          <p>Your AI Style Assistant</p>
        </div>
        <div className="chat-actions">
          <button
            onClick={clearChatHistory}
            className="clear-chat-btn"
            title="Clear conversation"
          >
            🗑️
          </button>
          <div className="chat-status">
            <div className={`status-dot ${isServiceAvailable ? 'online' : 'offline'}`}></div>
          </div>
        </div>
      </div>

      <div className="chat-content">
        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type === 'user' ? 'user' : 'cher'}`}>
              <div className="message-content">
                <p>{message.content}</p>
                <span className="message-time">{formatTime(new Date(message.timestamp))}</span>
                {message.status === 'failed' && (
                  <span className="message-status failed">Failed to send</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message cher typing">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {/* Event Details Form within scrollable area */}
          {showEventForm && pendingEventData && (
            <div className="form-message">
              <EventDetailsForm
                eventData={pendingEventData}
                onConfirm={handleEventFormConfirm}
                onCancel={handleEventFormCancel}
                loading={formLoading}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="chat-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
          <div className="error-actions">
            {retryLastMessage && (
              <button onClick={retryLastMessage} className="retry-btn">
                🔄 Retry
              </button>
            )}
            <button onClick={clearError} className="dismiss-btn">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Service Status */}
      {!isServiceAvailable && (
        <div className="service-status offline">
          <span className="status-indicator">🔴</span>
          <span>AI service unavailable</span>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              // Clear error when user starts typing
              if (error) {
                clearError();
              }
            }}
            placeholder={
              isServiceAvailable
                ? "Ask Cher about your outfit..."
                : "AI service unavailable"
            }
            className="chat-input"
            disabled={loading || !isServiceAvailable}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!inputMessage.trim() || loading || !isServiceAvailable}
            title={!isServiceAvailable ? "AI service unavailable" : "Send message"}
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </form>

      {/* Context Info */}
      <div className="chat-context">
        <div className="context-item">
          <strong>Trip:</strong> {selectedTrip?.name || 'No trip selected'}
        </div>
        <div className="context-item">
          <strong>Outfit:</strong> {selectedOutfit}
        </div>
      </div>
    </div>
  );
};

export default CherChatPanel;