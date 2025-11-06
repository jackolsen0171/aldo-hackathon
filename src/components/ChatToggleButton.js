import React from 'react';
import './ChatToggleButton.css';

const ChatToggleButton = ({ isOpen, onClick }) => {
    return (
        <button
            className={`chat-toggle-button ${isOpen ? 'active' : ''}`}
            onClick={onClick}
            aria-label={isOpen ? 'Close chat panel' : 'Open chat panel'}
            title={isOpen ? 'Close chat panel' : 'Open chat panel'}
        >
            <div className="toggle-icon">
                {isOpen ? (
                    <span className="close-icon">✕</span>
                ) : (
                    <span className="chat-icon">💬</span>
                )}
            </div>
            <div className="toggle-text">
                {isOpen ? 'Close' : 'Chat'}
            </div>
        </button>
    );
};

export default ChatToggleButton;