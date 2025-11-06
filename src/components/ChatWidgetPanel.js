import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import { useChat } from '../hooks/useChat';
import pipelineService from '../services/pipelineService';
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
        retryLastMessage,
        sessionId,
        addMessage
    } = useChat();

    const [currentMessage, setCurrentMessage] = useState('');
    const [isServiceAvailable, setIsServiceAvailable] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [pipelineLoading, setPipelineLoading] = useState(false);
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

    const handleEventConfirm = async (confirmedData, messageId) => {
        console.log('Event details confirmed:', confirmedData);
        setPipelineLoading(true);

        try {
            // Initialize a new pipeline session
            const newSession = pipelineService.initializeSession();
            const currentSessionId = newSession.sessionId;

            // First, process the user input to get the pipeline to the right stage
            const processResult = await pipelineService.processUserInput(
                `I need outfits for a ${confirmedData.occasion}`,
                currentSessionId,
                confirmedData
            );

            if (!processResult.success) {
                throw new Error(processResult.error?.message || 'Failed to process user input');
            }

            // Now confirm event details with the pipeline service
            const result = await pipelineService.confirmEventDetails(confirmedData, currentSessionId);

            if (result.success) {
                // Update the message to show context gathering stage
                const contextGatheringMessage = {
                    content: `Great! I've confirmed your event details. Now I'm gathering weather context and additional information for your ${confirmedData.occasion} in ${confirmedData.location || 'your location'}.`,
                    pipelineStage: result.state.stage,
                    pipelineLoading: true
                };

                addMessage(contextGatheringMessage);

                // Check if weather context was gathered
                if (result.weatherResult) {
                    let weatherMessage = '';
                    if (result.weatherResult.success) {
                        if (result.weatherResult.fallbackUsed) {
                            weatherMessage = 'Weather context gathered using seasonal averages (API unavailable). ';
                        } else {
                            weatherMessage = 'Weather context successfully gathered. ';
                        }
                    } else {
                        weatherMessage = 'Weather context gathering failed, but continuing with available information. ';
                    }

                    // Complete context gathering and move to generation
                    const contextResult = await pipelineService.completeContextGathering(currentSessionId);

                    if (contextResult.success) {
                        const generationMessage = {
                            content: `${weatherMessage}Now generating your personalized outfit recommendations based on your event details and context...`,
                            pipelineStage: contextResult.state.stage,
                            pipelineLoading: true
                        };

                        addMessage(generationMessage);

                        // Simulate outfit generation (this would normally call the outfit generation service)
                        setTimeout(async () => {
                            try {
                                const outfitResult = await pipelineService.generateOutfits(confirmedData, currentSessionId);

                                if (outfitResult.success) {
                                    const contextMarkdown = outfitResult.contextSummary ?
                                        formatContextSummaryAsMarkdown(outfitResult.contextSummary) :
                                        'Context gathered successfully';

                                    const completionMessage = {
                                        content: `Perfect! I've generated your outfit recommendations for your ${confirmedData.occasion}. Here's what I recommend based on the weather and your requirements:\n\n${contextMarkdown}\n\n✨ Your personalized outfit recommendations are ready!`,
                                        pipelineStage: outfitResult.state.stage,
                                        pipelineLoading: false
                                    };

                                    addMessage(completionMessage);
                                } else {
                                    throw new Error('Outfit generation failed');
                                }
                            } catch (error) {
                                console.error('Outfit generation error:', error);
                                addMessage({
                                    content: 'I encountered an issue while generating your outfits. Please try again or provide more details about your event.',
                                    isError: true
                                });
                            } finally {
                                setPipelineLoading(false);
                            }
                        }, 2000); // 2 second delay to simulate processing
                    } else {
                        throw new Error('Context gathering completion failed');
                    }
                } else {
                    // No weather context to gather, proceed directly
                    const contextResult = await pipelineService.completeContextGathering(currentSessionId);

                    if (contextResult.success) {
                        const generationMessage = {
                            content: 'Context gathering complete. Now generating your personalized outfit recommendations...',
                            pipelineStage: contextResult.state.stage,
                            pipelineLoading: true
                        };

                        addMessage(generationMessage);

                        // Continue with outfit generation as above
                        setTimeout(async () => {
                            try {
                                const outfitResult = await pipelineService.generateOutfits(confirmedData, currentSessionId);

                                if (outfitResult.success) {
                                    const contextMarkdown = outfitResult.contextSummary ?
                                        formatContextSummaryAsMarkdown(outfitResult.contextSummary) :
                                        'Context gathered successfully';

                                    const completionMessage = {
                                        content: `Perfect! I've generated your outfit recommendations for your ${confirmedData.occasion}.\n\n${contextMarkdown}\n\n✨ Your personalized recommendations are ready!`,
                                        pipelineStage: outfitResult.state.stage,
                                        pipelineLoading: false
                                    };

                                    addMessage(completionMessage);
                                } else {
                                    throw new Error('Outfit generation failed');
                                }
                            } catch (error) {
                                console.error('Outfit generation error:', error);
                                addMessage({
                                    content: 'I encountered an issue while generating your outfits. Please try again or provide more details about your event.',
                                    isError: true
                                });
                            } finally {
                                setPipelineLoading(false);
                            }
                        }, 2000);
                    } else {
                        throw new Error('Context gathering completion failed');
                    }
                }
            } else {
                throw new Error(result.error?.message || 'Failed to confirm event details');
            }
        } catch (error) {
            console.error('Pipeline error:', error);
            addMessage({
                content: `I encountered an issue processing your event details: ${error.message}. Please try again.`,
                isError: true
            });
            setPipelineLoading(false);
        }
    };

    const handleEventCancel = (messageId) => {
        console.log('Event details cancelled');
        addMessage({
            content: 'No problem! Feel free to describe your event or occasion again, and I\'ll help you plan the perfect outfits.'
        });
    };

    const formatContextSummaryAsMarkdown = (contextSummary) => {
        if (!contextSummary) return 'Context gathered successfully';

        let markdown = '## 🎯 Context Summary\n\n';

        // Event Information
        if (contextSummary.event) {
            markdown += '### 📅 Event Details\n';
            if (contextSummary.event.occasion) {
                markdown += `- **Occasion:** ${contextSummary.event.occasion}\n`;
            }
            if (contextSummary.event.location) {
                markdown += `- **Location:** ${contextSummary.event.location}\n`;
            }
            if (contextSummary.event.startDate) {
                markdown += `- **Date:** ${contextSummary.event.startDate}\n`;
            }
            if (contextSummary.event.duration) {
                markdown += `- **Duration:** ${contextSummary.event.duration} day${contextSummary.event.duration > 1 ? 's' : ''}\n`;
            }
            markdown += '\n';
        }

        // Style Requirements
        if (contextSummary.style) {
            markdown += '### 👔 Style Requirements\n';
            if (contextSummary.style.dressCode) {
                markdown += `- **Dress Code:** ${contextSummary.style.dressCode}\n`;
            }
            if (contextSummary.style.budget) {
                markdown += `- **Budget:** $${contextSummary.style.budget}\n`;
            }
            if (contextSummary.style.specialRequirements && contextSummary.style.specialRequirements.length > 0) {
                markdown += `- **Special Requirements:** ${contextSummary.style.specialRequirements.join(', ')}\n`;
            }
            markdown += '\n';
        }

        // Weather Context
        if (contextSummary.weather) {
            markdown += '### 🌤️ Weather Context\n';
            if (contextSummary.weather.temperatureRange) {
                markdown += `- **Temperature:** ${contextSummary.weather.temperatureRange.min}°C - ${contextSummary.weather.temperatureRange.max}°C\n`;
            }
            if (contextSummary.weather.conditions) {
                markdown += `- **Conditions:** ${contextSummary.weather.conditions}\n`;
            }
            if (contextSummary.weather.precipitationProbability !== undefined) {
                markdown += `- **Rain Chance:** ${contextSummary.weather.precipitationProbability}%\n`;
            }
            if (contextSummary.weather.layeringNeeds) {
                markdown += `- **Layering:** ${contextSummary.weather.layeringNeeds}\n`;
            }
            if (contextSummary.weather.weatherProtection && contextSummary.weather.weatherProtection.length > 0) {
                markdown += `- **Protection Needed:** ${contextSummary.weather.weatherProtection.join(', ')}\n`;
            }
            markdown += '\n';
        }

        // Constraints and Considerations
        if (contextSummary.constraints) {
            markdown += '### ⚠️ Key Considerations\n';
            if (contextSummary.constraints.weatherConstraints && contextSummary.constraints.weatherConstraints.length > 0) {
                contextSummary.constraints.weatherConstraints.forEach(constraint => {
                    markdown += `- ${constraint}\n`;
                });
            }
            if (contextSummary.constraints.occasionConstraints && contextSummary.constraints.occasionConstraints.length > 0) {
                contextSummary.constraints.occasionConstraints.forEach(constraint => {
                    markdown += `- ${constraint}\n`;
                });
            }
            markdown += '\n';
        }

        // Context Quality
        if (contextSummary.metadata) {
            markdown += '### 📊 Context Quality\n';
            if (contextSummary.metadata.confidence !== undefined) {
                const confidencePercent = Math.round(contextSummary.metadata.confidence * 100);
                markdown += `- **Confidence:** ${confidencePercent}%\n`;
            }
            if (contextSummary.metadata.completeness !== undefined) {
                const completenessPercent = Math.round(contextSummary.metadata.completeness * 100);
                markdown += `- **Completeness:** ${completenessPercent}%\n`;
            }
            if (contextSummary.metadata.dataSource) {
                markdown += `- **Data Source:** ${contextSummary.metadata.dataSource}\n`;
            }
        }

        return markdown;
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

            </div>

            <MessageList
                messages={messages}
                loading={loading || pipelineLoading}
                onEventConfirm={handleEventConfirm}
                onEventCancel={handleEventCancel}
            />



            <div className="chat-input-container">
                {/* Service status check disabled for development/testing */}
                {false && !isServiceAvailable && (
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
                        placeholder="Describe your event or trip... (e.g., '3-day business conference in Chicago next week')"
                        className="chat-input"
                        rows="2"
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!currentMessage.trim() || loading}
                        className="send-button"
                        title="Send message"
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