/**
 * Pipeline Service for AI Outfit Assistant
 * Manages multi-stage workflow for outfit generation with state persistence
 */

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

        this.saveSessionState(newState);
        return newState;
    }

    /**
     * Process user input and transition to confirmation stage
     * @param {string} message - User's input message
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Processing result with updated state
     */
    async processUserInput(message, sessionId = null) {
        try {
            const state = this.initializeSession(sessionId);

            if (!this.canTransitionTo(state.stage, PIPELINE_STAGES.CONFIRMATION_PENDING)) {
                throw new Error(`Cannot process input from stage: ${state.stage}`);
            }

            // Update state to processing
            const updatedState = this.updateStage(state, PIPELINE_STAGES.INPUT_PROCESSING);

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

            // Update state with confirmed details
            const updatedState = {
                ...state,
                stage: PIPELINE_STAGES.CONTEXT_GATHERING,
                eventDetails: eventDetails,
                lastActivity: new Date().toISOString()
            };

            this.saveSessionState(updatedState);

            return {
                success: true,
                state: updatedState,
                proceedToContextGathering: true
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

            if (!this.canTransitionTo(state.stage, PIPELINE_STAGES.GENERATING)) {
                throw new Error(`Cannot generate outfits from stage: ${state.stage}`);
            }

            // Update state to generating
            const generatingState = this.updateStage(state, PIPELINE_STAGES.GENERATING);
            this.saveSessionState(generatingState);

            // Here we would integrate with OutfitGenerator
            // For now, simulate completion
            const completedState = {
                ...generatingState,
                stage: PIPELINE_STAGES.COMPLETE,
                outfitRecommendations: [], // Would be populated by OutfitGenerator
                lastActivity: new Date().toISOString()
            };

            this.saveSessionState(completedState);

            return {
                success: true,
                state: completedState,
                recommendations: completedState.outfitRecommendations
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