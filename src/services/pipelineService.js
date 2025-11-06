/**
 * Pipeline Service for AI Outfit Assistant
 * Manages multi-stage workflow for outfit generation with state persistence
 */

import contextAccumulator from './contextAccumulator.js';
import weatherContextService from './weatherContextService.js';

// Pipeline stage constants
const PIPELINE_STAGES = {
    INPUT_PROCESSING: 'input_processing',
    CONFIRMATION_PENDING: 'confirmation_pending',
    CONTEXT_GATHERING: 'context_gathering',
    GENERATING: 'generating',
    COMPLETE: 'complete',
    ERROR: 'error'
};

// Pipeline stage transitions
const STAGE_TRANSITIONS = {
    [PIPELINE_STAGES.INPUT_PROCESSING]: [PIPELINE_STAGES.CONFIRMATION_PENDING, PIPELINE_STAGES.ERROR],
    [PIPELINE_STAGES.CONFIRMATION_PENDING]: [PIPELINE_STAGES.CONTEXT_GATHERING, PIPELINE_STAGES.INPUT_PROCESSING, PIPELINE_STAGES.ERROR],
    [PIPELINE_STAGES.CONTEXT_GATHERING]: [PIPELINE_STAGES.GENERATING, PIPELINE_STAGES.ERROR],
    [PIPELINE_STAGES.GENERATING]: [PIPELINE_STAGES.COMPLETE, PIPELINE_STAGES.ERROR],
    [PIPELINE_STAGES.COMPLETE]: [PIPELINE_STAGES.INPUT_PROCESSING],
    [PIPELINE_STAGES.ERROR]: [PIPELINE_STAGES.INPUT_PROCESSING]
};

// Error types for pipeline
const PIPELINE_ERRORS = {
    EXTRACTION_ERROR: 'extraction_error',
    WEATHER_ERROR: 'weather_error',
    GENERATION_ERROR: 'generation_error',
    NETWORK_ERROR: 'network_error',
    VALIDATION_ERROR: 'validation_error'
};

class PipelineService {
    constructor() {
        this.storageKey = 'outfit_pipeline_state';
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Initialize or retrieve pipeline state for a session
     * @param {string} sessionId - Unique session identifier
     * @returns {Object} Pipeline state object
     */
    initializeSession(sessionId) {
        if (!sessionId) {
            sessionId = this.generateSessionId();
        }

        const existingState = this.getSessionState(sessionId);

        if (existingState && !this.isSessionExpired(existingState)) {
            return existingState;
        }

        // Create new session state
        const newState = {
            sessionId,
            stage: PIPELINE_STAGES.INPUT_PROCESSING,
            eventDetails: null,
            contextData: null,
            outfitRecommendations: null,
            error: null,
            timestamp: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        // Initialize context file for this session
        try {
            contextAccumulator.initializeContextFile(sessionId);
        } catch (error) {
            console.warn('Failed to initialize context file:', error);
        }

        this.saveSessionState(newState);
        return newState;
    }

    /**
     * Process user input and transition to confirmation stage
     * @param {string} message - User's input message
     * @param {string} sessionId - Session identifier
     * @param {Object} extractedDetails - Optional pre-extracted details
     * @returns {Promise<Object>} Processing result with updated state
     */
    async processUserInput(message, sessionId = null, extractedDetails = null) {
        try {
            const state = this.initializeSession(sessionId);

            if (!this.canTransitionTo(state.stage, PIPELINE_STAGES.CONFIRMATION_PENDING)) {
                throw new Error(`Cannot process input from stage: ${state.stage}`);
            }

            // Update state to processing
            const updatedState = this.updateStage(state, PIPELINE_STAGES.INPUT_PROCESSING);

            // Add extracted details to context file if provided
            if (extractedDetails) {
                try {
                    contextAccumulator.addExtractedDetails(state.sessionId, extractedDetails, message);
                } catch (error) {
                    console.warn('Failed to add extracted details to context:', error);
                }
            }

            // Here we would integrate with BedrockService for extraction
            // For now, return the state ready for confirmation
            const processedState = {
                ...updatedState,
                stage: PIPELINE_STAGES.CONFIRMATION_PENDING,
                lastActivity: new Date().toISOString()
            };

            this.saveSessionState(processedState);

            return {
                success: true,
                state: processedState,
                requiresConfirmation: true
            };

        } catch (error) {
            return this.handleError(sessionId, PIPELINE_ERRORS.EXTRACTION_ERROR, error.message);
        }
    }

    /**
     * Confirm event details and transition to context gathering
     * @param {Object} eventDetails - Confirmed event details
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Confirmation result with updated state
     */
    async confirmEventDetails(eventDetails, sessionId) {
        try {
            const state = this.getSessionState(sessionId);

            if (!state) {
                throw new Error('Session not found');
            }

            if (!this.canTransitionTo(state.stage, PIPELINE_STAGES.CONTEXT_GATHERING)) {
                throw new Error(`Cannot confirm details from stage: ${state.stage}`);
            }

            // Validate event details
            const validationResult = this.validateEventDetails(eventDetails);
            if (!validationResult.isValid) {
                throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Add confirmed details to context file
            try {
                contextAccumulator.addConfirmedDetails(sessionId, eventDetails);
            } catch (error) {
                console.warn('Failed to add confirmed details to context:', error);
            }

            // Update state with confirmed details and transition to context gathering
            const updatedState = {
                ...state,
                stage: PIPELINE_STAGES.CONTEXT_GATHERING,
                eventDetails: eventDetails,
                lastActivity: new Date().toISOString()
            };

            this.saveSessionState(updatedState);

            // Automatically gather weather context if location is provided
            let weatherResult = null;
            if (eventDetails.location) {
                try {
                    weatherResult = await this.gatherWeatherContext(sessionId);
                } catch (error) {
                    console.warn('Weather context gathering failed during confirmation:', error);
                    // Don't fail the entire confirmation process
                    weatherResult = {
                        success: false,
                        error: error.message,
                        weatherFailed: true
                    };
                }
            }

            return {
                success: true,
                state: this.getSessionState(sessionId), // Get updated state after weather gathering
                proceedToContextGathering: true,
                weatherResult: weatherResult
            };

        } catch (error) {
            return this.handleError(sessionId, PIPELINE_ERRORS.VALIDATION_ERROR, error.message);
        }
    }

    /**
     * Add context data during context gathering stage
     * @param {string} sessionId - Session identifier
     * @param {Object} contextData - Context data to add (weather, environmental, etc.)
     * @returns {Promise<Object>} Context gathering result
     */
    async addContextData(sessionId, contextData) {
        try {
            const state = this.getSessionState(sessionId);

            if (!state) {
                throw new Error('Session not found');
            }

            if (state.stage !== PIPELINE_STAGES.CONTEXT_GATHERING) {
                throw new Error(`Cannot add context data from stage: ${state.stage}`);
            }

            // Add context data to accumulator based on type
            if (contextData.weather) {
                contextAccumulator.addWeatherContext(sessionId, contextData.weather);
            }

            if (contextData.additional) {
                contextAccumulator.addAdditionalContext(sessionId, contextData.additional);
            }

            // Update pipeline state with context data
            const updatedState = {
                ...state,
                contextData: {
                    ...state.contextData,
                    ...contextData
                },
                lastActivity: new Date().toISOString()
            };

            this.saveSessionState(updatedState);

            return {
                success: true,
                state: updatedState,
                contextAdded: true
            };

        } catch (error) {
            return this.handleError(sessionId, PIPELINE_ERRORS.WEATHER_ERROR, error.message);
        }
    }

    /**
     * Gather weather context for event details during context gathering stage
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Weather context gathering result
     */
    async gatherWeatherContext(sessionId) {
        try {
            const state = this.getSessionState(sessionId);

            if (!state) {
                throw new Error('Session not found');
            }

            if (state.stage !== PIPELINE_STAGES.CONTEXT_GATHERING) {
                throw new Error(`Cannot gather weather context from stage: ${state.stage}`);
            }

            if (!state.eventDetails) {
                throw new Error('Event details are required for weather context gathering');
            }

            // Validate event details for weather gathering
            const weatherValidation = this.validateEventDetailsForWeather(state.eventDetails);
            if (!weatherValidation.isValid) {
                console.warn('Weather context gathering skipped:', weatherValidation.warnings.join(', '));

                // Continue without weather context but log the issue
                return {
                    success: true,
                    state: state,
                    weatherSkipped: true,
                    warnings: weatherValidation.warnings
                };
            }

            // Use WeatherContextService to gather comprehensive weather context
            const weatherResult = await weatherContextService.gatherWeatherContext(
                state.eventDetails,
                sessionId
            );

            if (!weatherResult.success) {
                // Weather gathering failed, but don't fail the entire pipeline
                console.warn('Weather context gathering failed:', weatherResult.error);

                return {
                    success: true,
                    state: state,
                    weatherFailed: true,
                    error: weatherResult.error,
                    fallbackUsed: weatherResult.fallbackUsed || false
                };
            }

            // Update pipeline state with weather context
            const updatedState = {
                ...state,
                contextData: {
                    ...state.contextData,
                    weather: weatherResult.weatherContext,
                    weatherMetadata: {
                        dataSource: weatherResult.dataSource,
                        gatheredAt: weatherResult.gatheredAt,
                        fallbackUsed: weatherResult.fallbackUsed || false,
                        confidence: weatherResult.weatherContext?.weatherDataConfidence || 0.8
                    }
                },
                lastActivity: new Date().toISOString()
            };

            this.saveSessionState(updatedState);

            return {
                success: true,
                state: updatedState,
                weatherContext: weatherResult.weatherContext,
                weatherGathered: true,
                fallbackUsed: weatherResult.fallbackUsed || false
            };

        } catch (error) {
            console.error('Weather context gathering error:', error);
            return this.handleError(sessionId, PIPELINE_ERRORS.WEATHER_ERROR, error.message);
        }
    }

    /**
     * Complete context gathering and transition to generation stage
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Context completion result
     */
    async completeContextGathering(sessionId) {
        try {
            const state = this.getSessionState(sessionId);

            if (!state) {
                throw new Error('Session not found');
            }

            if (!this.canTransitionTo(state.stage, PIPELINE_STAGES.GENERATING)) {
                throw new Error(`Cannot complete context gathering from stage: ${state.stage}`);
            }

            // Validate context completeness including weather context
            const contextValidation = this.validateContextCompleteness(state);
            if (!contextValidation.isValid) {
                console.warn('Context validation warnings:', contextValidation.warnings);
            }

            // Validate context file
            const contextFile = contextAccumulator.getContextFile(sessionId);
            if (contextFile) {
                const fileValidation = contextAccumulator.validateContextFile(contextFile);
                if (!fileValidation.isValid) {
                    console.warn('Context file validation warnings:', fileValidation.warnings);
                }
            }

            // Update state to ready for generation
            const updatedState = {
                ...state,
                stage: PIPELINE_STAGES.GENERATING,
                lastActivity: new Date().toISOString()
            };

            this.saveSessionState(updatedState);

            return {
                success: true,
                state: updatedState,
                readyForGeneration: true,
                contextValidation: contextValidation
            };

        } catch (error) {
            return this.handleError(sessionId, PIPELINE_ERRORS.VALIDATION_ERROR, error.message);
        }
    }

    /**
     * Generate outfit recommendations and complete pipeline
     * @param {Object} confirmedDetails - Confirmed event details
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Generation result with recommendations
     */
    async generateOutfits(confirmedDetails, sessionId) {
        try {
            const state = this.getSessionState(sessionId);

            if (!state) {
                throw new Error('Session not found');
            }

            if (state.stage !== PIPELINE_STAGES.GENERATING) {
                throw new Error(`Cannot generate outfits from stage: ${state.stage}. Must be in generating stage.`);
            }

            // State is already in generating, no need to update

            // Get context file for outfit generation
            const contextFile = contextAccumulator.getContextFile(sessionId);
            const contextSummary = contextFile ? contextAccumulator.generateContextSummary(sessionId) : null;

            // Here we would integrate with OutfitGenerator using the context
            // For now, simulate completion
            const completedState = {
                ...state,
                stage: PIPELINE_STAGES.COMPLETE,
                outfitRecommendations: [], // Would be populated by OutfitGenerator
                contextSummary: contextSummary,
                lastActivity: new Date().toISOString()
            };

            this.saveSessionState(completedState);

            return {
                success: true,
                state: completedState,
                recommendations: completedState.outfitRecommendations,
                contextSummary: contextSummary
            };

        } catch (error) {
            return this.handleError(sessionId, PIPELINE_ERRORS.GENERATION_ERROR, error.message);
        }
    }

    /**
     * Get current pipeline state for a session
     * @param {string} sessionId - Session identifier
     * @returns {Object|null} Pipeline state or null if not found
     */
    getPipelineState(sessionId) {
        return this.getSessionState(sessionId);
    }

    /**
     * Get context file for a session
     * @param {string} sessionId - Session identifier
     * @returns {Object|null} Context file or null if not found
     */
    getContextFile(sessionId) {
        return contextAccumulator.getContextFile(sessionId);
    }

    /**
     * Get context summary for a session
     * @param {string} sessionId - Session identifier
     * @returns {Object|null} Context summary or null if not found
     */
    getContextSummary(sessionId) {
        try {
            return contextAccumulator.generateContextSummary(sessionId);
        } catch (error) {
            console.error('Failed to generate context summary:', error);
            return null;
        }
    }

    /**
     * Get formatted context for AI consumption
     * @param {string} sessionId - Session identifier
     * @returns {string|null} Formatted context string or null if not found
     */
    getFormattedContextForAI(sessionId) {
        try {
            return contextAccumulator.formatContextForAI(sessionId);
        } catch (error) {
            console.error('Failed to format context for AI:', error);
            return null;
        }
    }

    /**
     * Reset pipeline to initial state
     * @param {string} sessionId - Session identifier
     * @returns {Object} New pipeline state
     */
    resetPipeline(sessionId) {
        const newState = {
            sessionId,
            stage: PIPELINE_STAGES.INPUT_PROCESSING,
            eventDetails: null,
            contextData: null,
            outfitRecommendations: null,
            error: null,
            timestamp: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        this.saveSessionState(newState);
        return newState;
    }

    /**
     * Check if stage transition is valid
     * @param {string} currentStage - Current pipeline stage
     * @param {string} targetStage - Target pipeline stage
     * @returns {boolean} Whether transition is valid
     */
    canTransitionTo(currentStage, targetStage) {
        const allowedTransitions = STAGE_TRANSITIONS[currentStage];
        return allowedTransitions && allowedTransitions.includes(targetStage);
    }

    /**
     * Update pipeline stage and timestamp
     * @param {Object} state - Current state
     * @param {string} newStage - New stage
     * @returns {Object} Updated state
     */
    updateStage(state, newStage) {
        return {
            ...state,
            stage: newStage,
            lastActivity: new Date().toISOString()
        };
    }

    /**
     * Handle pipeline errors
     * @param {string} sessionId - Session identifier
     * @param {string} errorType - Type of error
     * @param {string} errorMessage - Error message
     * @returns {Object} Error result
     */
    handleError(sessionId, errorType, errorMessage) {
        const state = this.getSessionState(sessionId) || this.initializeSession(sessionId);

        const errorState = {
            ...state,
            stage: PIPELINE_STAGES.ERROR,
            error: {
                type: errorType,
                message: errorMessage,
                timestamp: new Date().toISOString()
            },
            lastActivity: new Date().toISOString()
        };

        this.saveSessionState(errorState);

        return {
            success: false,
            state: errorState,
            error: errorState.error
        };
    }

    /**
     * Validate event details structure
     * @param {Object} eventDetails - Event details to validate
     * @returns {Object} Validation result
     */
    validateEventDetails(eventDetails) {
        const errors = [];

        if (!eventDetails) {
            errors.push('Event details are required');
            return { isValid: false, errors };
        }

        if (!eventDetails.occasion || typeof eventDetails.occasion !== 'string') {
            errors.push('Occasion is required and must be a string');
        }

        if (eventDetails.duration && (typeof eventDetails.duration !== 'number' || eventDetails.duration < 1)) {
            errors.push('Duration must be a positive number');
        }

        if (eventDetails.startDate && !this.isValidDate(eventDetails.startDate)) {
            errors.push('Start date must be a valid date string');
        }

        const validDressCodes = ['casual', 'smart-casual', 'business', 'formal', 'black-tie'];
        if (eventDetails.dressCode && !validDressCodes.includes(eventDetails.dressCode)) {
            errors.push(`Dress code must be one of: ${validDressCodes.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate event details for weather context gathering
     * @param {Object} eventDetails - Event details to validate for weather
     * @returns {Object} Validation result with warnings
     */
    validateEventDetailsForWeather(eventDetails) {
        const warnings = [];
        let isValid = true;

        if (!eventDetails.location) {
            warnings.push('No location specified - weather context cannot be gathered');
            isValid = false;
        }

        if (!eventDetails.startDate) {
            warnings.push('No start date specified - using current date for weather');
        } else if (!this.isValidDate(eventDetails.startDate)) {
            warnings.push('Invalid start date format - using current date for weather');
        } else {
            // Check if date is too far in the future (>14 days)
            const startDate = new Date(eventDetails.startDate);
            const now = new Date();
            const daysDifference = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));

            if (daysDifference > 14) {
                warnings.push(`Event is ${daysDifference} days away - weather forecast accuracy may be limited`);
            } else if (daysDifference < -1) {
                warnings.push('Event date is in the past - using current weather data');
            }
        }

        if (!eventDetails.duration || eventDetails.duration < 1) {
            warnings.push('No duration specified - assuming 1 day for weather context');
        } else if (eventDetails.duration > 14) {
            warnings.push('Event duration exceeds weather forecast limit - limiting to 14 days');
        }

        return {
            isValid,
            warnings
        };
    }

    /**
     * Validate context completeness for pipeline transitions
     * @param {Object} state - Pipeline state to validate
     * @returns {Object} Context validation result
     */
    validateContextCompleteness(state) {
        const warnings = [];
        let isValid = true;

        // Check if event details are present
        if (!state.eventDetails) {
            warnings.push('Event details missing');
            isValid = false;
        }

        // Check weather context if location was provided
        if (state.eventDetails?.location) {
            if (!state.contextData?.weather) {
                warnings.push('Weather context missing despite location being provided');
            } else {
                // Validate weather context structure
                const weatherContext = state.contextData.weather;
                if (!weatherContext.weatherContext?.dailyForecasts) {
                    warnings.push('Weather forecast data incomplete');
                }

                if (!weatherContext.weatherContext?.location) {
                    warnings.push('Weather location data incomplete');
                }

                // Check weather data confidence
                const confidence = state.contextData.weatherMetadata?.confidence || 0;
                if (confidence < 0.5) {
                    warnings.push('Weather data confidence is low - recommendations may be less accurate');
                }

                // Check if fallback was used
                if (state.contextData.weatherMetadata?.fallbackUsed) {
                    warnings.push('Weather data fallback was used - using seasonal averages');
                }
            }
        }

        // Check context file exists
        try {
            const contextFile = contextAccumulator.getContextFile(state.sessionId);
            if (!contextFile) {
                warnings.push('Context accumulator file missing');
            }
        } catch (error) {
            warnings.push('Error accessing context file');
        }

        return {
            isValid,
            warnings
        };
    }

    /**
     * Check if date string is valid
     * @param {string} dateString - Date string to validate
     * @returns {boolean} Whether date is valid
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Generate unique session ID
     * @returns {string} Unique session identifier
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save session state to localStorage
     * @param {Object} state - Pipeline state to save
     */
    saveSessionState(state) {
        try {
            const allStates = this.getAllSessionStates();
            allStates[state.sessionId] = state;

            // Clean up expired sessions
            this.cleanupExpiredSessions(allStates);

            localStorage.setItem(this.storageKey, JSON.stringify(allStates));
        } catch (error) {
            console.error('Failed to save pipeline state:', error);
        }
    }

    /**
     * Get session state from localStorage
     * @param {string} sessionId - Session identifier
     * @returns {Object|null} Session state or null if not found
     */
    getSessionState(sessionId) {
        try {
            const allStates = this.getAllSessionStates();
            return allStates[sessionId] || null;
        } catch (error) {
            console.error('Failed to get pipeline state:', error);
            return null;
        }
    }

    /**
     * Get all session states from localStorage
     * @returns {Object} All session states
     */
    getAllSessionStates() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to parse stored pipeline states:', error);
            return {};
        }
    }

    /**
     * Check if session is expired
     * @param {Object} state - Session state
     * @returns {boolean} Whether session is expired
     */
    isSessionExpired(state) {
        if (!state.lastActivity) {
            return true;
        }

        const lastActivity = new Date(state.lastActivity);
        const now = new Date();
        return (now - lastActivity) > this.sessionTimeout;
    }

    /**
     * Clean up expired sessions from storage
     * @param {Object} allStates - All session states
     */
    cleanupExpiredSessions(allStates) {
        const now = new Date();

        Object.keys(allStates).forEach(sessionId => {
            const state = allStates[sessionId];
            if (this.isSessionExpired(state)) {
                delete allStates[sessionId];
            }
        });
    }

    /**
     * Get pipeline stage display information
     * @param {string} stage - Pipeline stage
     * @returns {Object} Stage display information
     */
    getStageInfo(stage) {
        const stageInfo = {
            [PIPELINE_STAGES.INPUT_PROCESSING]: {
                title: 'Processing Input',
                description: 'Understanding your event details...',
                loading: true
            },
            [PIPELINE_STAGES.CONFIRMATION_PENDING]: {
                title: 'Confirm Details',
                description: 'Please review and confirm your event details',
                loading: false
            },
            [PIPELINE_STAGES.CONTEXT_GATHERING]: {
                title: 'Gathering Context',
                description: 'Collecting weather and additional context...',
                loading: true
            },
            [PIPELINE_STAGES.GENERATING]: {
                title: 'Generating Outfits',
                description: 'Creating your personalized outfit recommendations...',
                loading: true
            },
            [PIPELINE_STAGES.COMPLETE]: {
                title: 'Complete',
                description: 'Your outfit recommendations are ready!',
                loading: false
            },
            [PIPELINE_STAGES.ERROR]: {
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                loading: false
            }
        };

        return stageInfo[stage] || {
            title: 'Unknown Stage',
            description: 'Processing...',
            loading: false
        };
    }
}

// Export singleton instance
const pipelineService = new PipelineService();
export default pipelineService;
export { PipelineService, PIPELINE_STAGES, STAGE_TRANSITIONS, PIPELINE_ERRORS };