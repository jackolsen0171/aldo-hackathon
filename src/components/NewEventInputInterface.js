import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import './NewEventInputInterface.css';

const NewEventInputInterface = ({
    tripId,
    onTripDescriptionSubmit,
    loading = false,
    error = null,
    onClearError = null,
    placeholder = "Tell Cher about your trip..."
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const textareaRef = useRef(null);

    const {
        sendMessage: sendChatMessage,
        loading: chatLoading,
        error: chatError,
        clearError
    } = useChat();

    // Auto-focus the input when component mounts
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [inputValue]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!inputValue.trim() || loading || chatLoading) {
            return;
        }

        const tripDescription = inputValue.trim();

        try {
            // Clear any existing errors
            if (chatError) {
                clearError();
            }

            // Call the parent handler if provided (preferred approach)
            if (onTripDescriptionSubmit) {
                await onTripDescriptionSubmit(tripDescription);
                // Clear the input after successful submission
                setInputValue('');
            } else {
                // Fallback to direct chat integration
                const result = await sendChatMessage(tripDescription);
                if (result && result.success) {
                    // Clear the input after successful submission
                    setInputValue('');
                }
            }

        } catch (error) {
            console.error('Error submitting trip description:', error);
            // Error handling is managed by the parent component or useChat hook
        }
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);

        // Clear errors when user starts typing
        if (chatError) {
            clearError();
        }
        if (error && onClearError) {
            onClearError();
        }
    };

    const handleKeyDown = (e) => {
        // Submit on Ctrl/Cmd + Enter
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const isSubmitDisabled = !inputValue.trim() || loading || chatLoading;
    const isProcessing = loading || chatLoading;

    return (
        <div className="new-event-input-interface" role="main" aria-label="New trip planning interface">
            <a href="#trip-input" className="skip-link">Skip to trip input</a>
            <div className="input-container">
                {/* Header Section */}
                <div className="input-header">
                    <div className="cher-greeting">
                        <div className="cher-avatar-small" role="img" aria-label="Cher, your AI style assistant">
                            <div className="cher-avatar-placeholder">👩‍🦱</div>
                        </div>
                        <div className="greeting-text">
                            <h1 id="main-heading">Hi! I'm Cher, your AI style assistant</h1>
                            <p>Tell me about your upcoming trip and I'll help you plan the perfect outfits</p>
                        </div>
                    </div>
                </div>

                {/* Main Input Section */}
                <form className="trip-input-form" onSubmit={handleSubmit} role="form" aria-labelledby="main-heading">
                    <div
                        className={`trip-input-wrapper ${isInputFocused ? 'focused' : ''}`}
                        aria-invalid={error || chatError ? 'true' : 'false'}
                    >
                        <label htmlFor="trip-input" className="sr-only">
                            Describe your trip details for outfit planning
                        </label>
                        <textarea
                            id="trip-input"
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="trip-input-box"
                            disabled={isProcessing}
                            rows={3}
                            maxLength={1000}
                            aria-describedby="helper-text character-count"
                            aria-invalid={error || chatError ? 'true' : 'false'}
                            aria-required="true"
                        />

                        <button
                            type="submit"
                            className={`submit-button ${isSubmitDisabled ? 'disabled' : ''}`}
                            disabled={isSubmitDisabled}
                            aria-disabled={isSubmitDisabled}
                            aria-busy={isProcessing}
                            aria-label={isProcessing ? "Processing trip description" : "Send trip description"}
                            title={isSubmitDisabled ? "Enter trip details to continue" : "Send trip description (Ctrl+Enter)"}
                        >
                            {isProcessing ? (
                                <div className="loading-spinner" aria-hidden="true">⏳</div>
                            ) : (
                                <span className="send-icon" aria-hidden="true">➤</span>
                            )}
                            <span className="sr-only">
                                {isProcessing ? "Processing your trip description" : "Send trip description"}
                            </span>
                        </button>
                    </div>

                    {/* Helper Text */}
                    <div className="input-helper">
                        <p id="helper-text" className="helper-text">
                            Example: "3-day business trip to Chicago in December, need professional outfits for meetings and casual clothes for evenings"
                        </p>
                        <div className="input-actions">
                            <span
                                id="character-count"
                                className={`character-count ${inputValue.length > 800 ? 'warning' : ''} ${inputValue.length > 950 ? 'danger' : ''}`}
                                aria-live="polite"
                                aria-label={`${inputValue.length} of 1000 characters used`}
                            >
                                {inputValue.length}/1000
                            </span>
                            <span className="keyboard-hint" aria-hidden="true">
                                Press Ctrl+Enter to send
                            </span>
                        </div>
                    </div>
                </form>

                {/* Error Display */}
                {(error || chatError) && (
                    <div
                        className="error-message"
                        role="alert"
                        aria-live="assertive"
                        aria-atomic="true"
                    >
                        <div className="error-content">
                            <span className="error-icon" aria-hidden="true">⚠️</span>
                            <span className="error-text">{error || chatError}</span>
                        </div>
                        <button
                            onClick={() => {
                                if (chatError) clearError();
                                if (error && onClearError) onClearError();
                            }}
                            className="error-dismiss"
                            aria-label="Dismiss error message"
                            title="Dismiss error"
                        >
                            <span aria-hidden="true">✕</span>
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isProcessing && (
                    <div
                        className="processing-indicator"
                        role="status"
                        aria-live="polite"
                        aria-label="Processing trip details"
                    >
                        <div className="processing-content">
                            <div className="processing-spinner" aria-hidden="true">
                                <div className="spinner-dot"></div>
                                <div className="spinner-dot"></div>
                                <div className="spinner-dot"></div>
                            </div>
                            <p className="processing-text">
                                Cher is analyzing your trip details...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewEventInputInterface;