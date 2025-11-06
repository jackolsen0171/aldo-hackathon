import React, { useEffect, useRef } from 'react';
import EventDetailsForm from './EventDetailsForm';
import './MessageList.css';

const MessageList = ({ messages, loading }) => {
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current && messagesEndRef.current.scrollIntoView) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="message-list">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`message ${message.type} ${message.isError ? 'error' : ''} ${message.status || ''}`}
                >
                    <div className="message-content">
                        {/* Render EventDetailsForm for event extraction messages */}
                        {message.type === 'ai' && message.eventData ? (
                            <div className="event-extraction-message">
                                <div className="ai-response-text">
                                    {message.content}
                                </div>
                                <EventDetailsForm
                                    eventData={message.eventData}
                                    pipelineStage={message.pipelineStage || 'confirmation_pending'}
                                    extractionConfidence={message.extractionConfidence}
                                    needsClarification={message.needsClarification}
                                    onConfirm={(confirmedData) => {
                                        console.log('Event details confirmed:', confirmedData);
                                        // This will be connected to the pipeline service
                                    }}
                                    onCancel={() => {
                                        console.log('Event details cancelled');
                                        // This will be connected to the pipeline service
                                    }}
                                    loading={message.pipelineLoading || false}
                                />
                            </div>
                        ) : (
                            message.content
                        )}
                    </div>
                    <div className="message-meta">
                        <div className="message-timestamp">
                            {formatTimestamp(message.timestamp)}
                        </div>
                        {message.type === 'user' && (
                            <div className="message-status">
                                {message.status === 'sending' && <span className="status-icon sending">⏳</span>}
                                {message.status === 'sent' && <span className="status-icon sent">✓</span>}
                                {message.status === 'delivered' && <span className="status-icon delivered">✓✓</span>}
                                {message.status === 'failed' && <span className="status-icon failed">⚠️</span>}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {loading && (
                <div className="message ai loading">
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
    );
};

export default MessageList;