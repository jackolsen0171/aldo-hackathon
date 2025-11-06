import React from 'react';
import './SlidingChatPanel.css';

const SlidingChatPanel = ({ isOpen, onClose, children }) => {
    return (
        <>
            {/* Overlay for mobile/tablet */}
            {isOpen && <div className="sliding-chat-overlay" onClick={onClose} />}

            {/* Sliding panel */}
            <div className={`sliding-chat-panel ${isOpen ? 'open' : ''}`}>
                <div className="chat-panel-header">
                    <h3>Trip Planner Chat</h3>
                    <button
                        className="close-panel-btn"
                        onClick={onClose}
                        aria-label="Close chat panel"
                    >
                        ✕
                    </button>
                </div>

                <div className="chat-panel-content">
                    {children}
                </div>
            </div>
        </>
    );
};

export default SlidingChatPanel;