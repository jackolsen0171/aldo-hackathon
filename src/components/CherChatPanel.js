import React, { useState, useRef, useEffect } from 'react';
import './CherChatPanel.css';

const CherChatPanel = ({ selectedTrip, selectedOutfit, currentItems }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'cher',
      text: "Hey darling! I'm here to help you create the perfect outfit. What's the occasion?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate Cher AI response
    setTimeout(() => {
      const cherResponses = [
        "That sounds fabulous! Let me help you put together something stunning.",
        "Oh honey, I have the perfect idea for that! Trust me on this one.",
        "You know what would look amazing? Let me show you some options.",
        "Darling, we're going to make you look absolutely divine!",
        "I love your style! Let's create something that screams confidence.",
        "Perfect choice! Now let's add some pieces that will make you shine."
      ];

      const randomResponse = cherResponses[Math.floor(Math.random() * cherResponses.length)];
      
      const cherMessage = {
        id: Date.now() + 1,
        sender: 'cher',
        text: randomResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, cherMessage]);
      setIsTyping(false);
    }, 1500);
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
        <div className="chat-status">
          <div className="status-dot online"></div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-content">
              <p>{message.text}</p>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
        
        {isTyping && (
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
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask Cher about your outfit..."
            className="chat-input"
          />
          <button type="submit" className="send-button" disabled={!inputMessage.trim()}>
            {/* TODO: REPLACE WITH SEND ICON IMAGE */}
            {/* Replace with: <img src="/images/icons/send-icon.png" alt="Send" className="send-icon" /> */}
            ➤
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