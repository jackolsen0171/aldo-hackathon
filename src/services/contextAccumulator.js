/**
 * Context Accumulator Service
 * Builds comprehensive context files throughout the outfit generation pipeline
 * Accumulates user input, constraints, environmental data, and other context
 */

class ContextAccumulator {
    constructor() {
        this.storageKey = 'outfit_context_files';
        this.contextTimeout = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Initialize a new context file for a session
     * @param {string} sessionId - Unique session identifier
     * @param {Object} initialData - Initial context data
     * @returns {Object} Context file structure
     */
    initializeContextFile(sessionId, initialData = {}) {
        const contextFile = {
            sessionId,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),

            // User input and extracted details
            userInput: {
                originalMessage: initialData.originalMessage || null,
                extractedDetails: null,
                confirmedDetails: null,
                clarifications: []
            },

            // Environmental context
            environmentalContext: {
                weather: null,
                location: null,
                seasonalFactors: null
            },

            // Constraints and requirements
            constraints: {
                dressCode: null,
                budget: null,
                specialRequirements: [],
                occasionConstraints: null,
                weatherConstraints: null
            },

            // Context metadata
            metadata: {
                confidence: 0,
                completeness: 0,
                dataSource: 'user_input',
                processingStage: 'initialized',
                errors: [],
                warnings: []
            }
        };

        this.saveContextFile(contextFile);
        return contextFile;
    }

    /**
     * Add extracted event details to context file
     * @param {string} sessionId - Session identifier
     * @param {Object} extractedDetails - Event details from extraction service
     * @param {string} originalMessage - Original user message
     * @returns {Object} Updated context file
     */
    addExtractedDetails(sessionId, extractedDetails, originalMessage = null) {
        const contextFile = this.getContextFile(sessionId);
        if (!contextFile) {
            throw new Error(`Context file not found for session: ${sessionId}`);
        }

        // Update user input section
        contextFile.userInput.originalMessage = originalMessage || contextFile.userInput.originalMessage;
        contextFile.userInput.extractedDetails = extractedDetails;

        // Update constraints from extracted details
        if (extractedDetails.dressCode) {
            contextFile.constraints.dressCode = extractedDetails.dressCode;
        }
        if (extractedDetails.budget) {
            contextFile.constraints.budget = extractedDetails.budget;
        }
        if (extractedDetails.specialRequirements) {
            contextFile.constraints.specialRequirements = extractedDetails.specialRequirements;
        }

        // Update occasion constraints
        contextFile.constraints.occasionConstraints = {
            occasion: extractedDetails.occasion,
            duration: extractedDetails.duration,
            startDate: extractedDetails.startDate,
            location: extractedDetails.location
        };

        // Update metadata
        contextFile.metadata.confidence = extractedDetails.confidence || 0;
        contextFile.metadata.processingStage = 'details_extracted';
        contextFile.lastUpdated = new Date().toISOString();

        // Add clarification needs
        if (extractedDetails.needsClarification && extractedDetails.needsClarification.length > 0) {
            contextFile.userInput.clarifications = extractedDetails.needsClarification;
        }

        this.saveContextFile(contextFile);
        return contextFile;
    }

    /**
     * Add confirmed event details to context file
     * @param {string} sessionId - Session identifier
     * @param {Object} confirmedDetails - User-confirmed event details
     * @returns {Object} Updated context file
     */
    addConfirmedDetails(sessionId, confirmedDetails) {
        const contextFile = this.getContextFile(sessionId);
        if (!contextFile) {
            throw new Error(`Context file not found for session: ${sessionId}`);
        }

        // Update user input section
        contextFile.userInput.confirmedDetails = confirmedDetails;

        // Update constraints with confirmed details
        contextFile.constraints.dressCode = confirmedDetails.dressCode;
        contextFile.constraints.budget = confirmedDetails.budget;
        contextFile.constraints.specialRequirements = confirmedDetails.specialRequirements || [];

        // Update occasion constraints
        contextFile.constraints.occasionConstraints = {
            occasion: confirmedDetails.occasion,
            duration: confirmedDetails.duration,
            startDate: confirmedDetails.startDate,
            location: confirmedDetails.location
        };

        // Update metadata - keep original confidence from extracted details
        contextFile.metadata.processingStage = 'details_confirmed';
        contextFile.lastUpdated = new Date().toISOString();

        // Clear clarifications since details are now confirmed
        contextFile.userInput.clarifications = [];

        this.saveContextFile(contextFile);
        return contextFile;
    }

    /**
     * Add weather context to context file
     * @param {string} sessionId - Session identifier
     * @param {Object} weatherContext - Weather data and constraints
     * @returns {Object} Updated context file
     */
    addWeatherContext(sessionId, weatherContext) {
        const contextFile = this.getContextFile(sessionId);
        if (!contextFile) {
            throw new Error(`Context file not found for session: ${sessionId}`);
        }

        // Update environmental context
        contextFile.environmentalContext.weather = weatherContext.weatherData || weatherContext;
        contextFile.environmentalContext.location = weatherContext.location;
        contextFile.environmentalContext.seasonalFactors = weatherContext.seasonalFactors;

        // Update weather constraints
        contextFile.constraints.weatherConstraints = {
            temperatureRange: weatherContext.temperatureRange,
            precipitationProbability: weatherContext.precipitationProbability,
            weatherConditions: weatherContext.conditions,
            layeringNeeds: weatherContext.layeringNeeds,
            weatherProtection: weatherContext.weatherProtection,
            comfortFactors: weatherContext.comfortFactors
        };

        // Update metadata
        contextFile.metadata.processingStage = 'weather_gathered';
        contextFile.metadata.confidence = Math.min(contextFile.metadata.confidence + 0.3, 1.0);
        contextFile.lastUpdated = new Date().toISOString();

        // Calculate completeness
        contextFile.metadata.completeness = this.calculateCompleteness(contextFile);

        this.saveContextFile(contextFile);
        return contextFile;
    }

    /**
     * Add additional context data to context file
     * @param {string} sessionId - Session identifier
     * @param {Object} additionalContext - Additional context data
     * @returns {Object} Updated context file
     */
    addAdditionalContext(sessionId, additionalContext) {
        const contextFile = this.getContextFile(sessionId);
        if (!contextFile) {
            throw new Error(`Context file not found for session: ${sessionId}`);
        }

        // Merge additional context based on type
        if (additionalContext.environmental) {
            contextFile.environmentalContext = {
                ...contextFile.environmentalContext,
                ...additionalContext.environmental
            };
        }

        if (additionalContext.constraints) {
            contextFile.constraints = {
                ...contextFile.constraints,
                ...additionalContext.constraints
            };
        }

        if (additionalContext.metadata) {
            contextFile.metadata = {
                ...contextFile.metadata,
                ...additionalContext.metadata
            };
        }

        // Update timestamps
        contextFile.lastUpdated = new Date().toISOString();

        // Recalculate completeness
        contextFile.metadata.completeness = this.calculateCompleteness(contextFile);

        this.saveContextFile(contextFile);
        return contextFile;
    }

    /**
     * Get context file for a session
     * @param {string} sessionId - Session identifier
     * @returns {Object|null} Context file or null if not found
     */
    getContextFile(sessionId) {
        try {
            const allContextFiles = this.getAllContextFiles();
            const contextFile = allContextFiles[sessionId];

            if (!contextFile) {
                return null;
            }

            // Check if context file is expired
            if (this.isContextFileExpired(contextFile)) {
                this.deleteContextFile(sessionId);
                return null;
            }

            return contextFile;
        } catch (error) {
            console.error('Failed to get context file:', error);
            return null;
        }
    }

    /**
     * Generate context summary for AI consumption
     * @param {string} sessionId - Session identifier
     * @returns {Object} Context summary formatted for AI prompts
     */
    generateContextSummary(sessionId) {
        const contextFile = this.getContextFile(sessionId);
        if (!contextFile) {
            throw new Error(`Context file not found for session: ${sessionId}`);
        }

        const summary = {
            // Event details
            event: {
                occasion: contextFile.constraints.occasionConstraints?.occasion,
                duration: contextFile.constraints.occasionConstraints?.duration,
                startDate: contextFile.constraints.occasionConstraints?.startDate,
                location: contextFile.constraints.occasionConstraints?.location
            },

            // Dress code and style constraints
            style: {
                dressCode: contextFile.constraints.dressCode,
                specialRequirements: contextFile.constraints.specialRequirements,
                budget: contextFile.constraints.budget
            },

            // Weather and environmental factors
            environment: {
                weather: contextFile.environmentalContext.weather,
                location: contextFile.environmentalContext.location,
                seasonalFactors: contextFile.environmentalContext.seasonalFactors
            },

            // Weather-based clothing constraints
            weatherConstraints: contextFile.constraints.weatherConstraints,

            // Context quality indicators
            quality: {
                confidence: contextFile.metadata.confidence,
                completeness: contextFile.metadata.completeness,
                processingStage: contextFile.metadata.processingStage
            }
        };

        return summary;
    }

    /**
     * Format context for Bedrock AI consumption
     * @param {string} sessionId - Session identifier
     * @returns {string} Formatted context string for AI prompts
     */
    formatContextForAI(sessionId) {
        const summary = this.generateContextSummary(sessionId);

        let contextString = "OUTFIT PLANNING CONTEXT:\n\n";

        // Event information
        contextString += "EVENT DETAILS:\n";
        contextString += `- Occasion: ${summary.event.occasion || 'Not specified'}\n`;
        contextString += `- Duration: ${summary.event.duration || 1} day(s)\n`;
        contextString += `- Date: ${summary.event.startDate || 'Not specified'}\n`;
        contextString += `- Location: ${summary.event.location || 'Not specified'}\n\n`;

        // Style requirements
        contextString += "STYLE REQUIREMENTS:\n";
        contextString += `- Dress Code: ${summary.style.dressCode || 'Not specified'}\n`;
        contextString += `- Budget: ${summary.style.budget ? `$${summary.style.budget}` : 'Not specified'}\n`;
        if (summary.style.specialRequirements && summary.style.specialRequirements.length > 0) {
            contextString += `- Special Requirements: ${summary.style.specialRequirements.join(', ')}\n`;
        }
        contextString += "\n";

        // Weather context
        if (summary.environment.weather) {
            contextString += "WEATHER CONDITIONS:\n";
            const weather = summary.environment.weather;
            if (weather.temperature) {
                contextString += `- Temperature: ${weather.temperature.min}°-${weather.temperature.max}°${weather.temperature.unit || 'C'}\n`;
            }
            if (weather.conditions) {
                contextString += `- Conditions: ${weather.conditions}\n`;
            }
            if (weather.precipitation) {
                contextString += `- Precipitation: ${weather.precipitation}% chance\n`;
            }
            contextString += "\n";
        }

        // Weather constraints
        if (summary.weatherConstraints) {
            contextString += "WEATHER-BASED CLOTHING NEEDS:\n";
            const constraints = summary.weatherConstraints;
            if (constraints.layeringNeeds) {
                contextString += `- Layering: ${constraints.layeringNeeds}\n`;
            }
            if (constraints.weatherProtection) {
                contextString += `- Weather Protection: ${constraints.weatherProtection.join(', ')}\n`;
            }
            if (constraints.comfortFactors) {
                contextString += `- Comfort Considerations: ${constraints.comfortFactors.join(', ')}\n`;
            }
            contextString += "\n";
        }

        // Context quality
        contextString += `CONTEXT CONFIDENCE: ${Math.round(summary.quality.confidence * 100)}%\n`;
        contextString += `CONTEXT COMPLETENESS: ${Math.round(summary.quality.completeness * 100)}%\n`;

        return contextString;
    }

    /**
     * Calculate context completeness score
     * @param {Object} contextFile - Context file to evaluate
     * @returns {number} Completeness score between 0 and 1
     */
    calculateCompleteness(contextFile) {
        let score = 0;
        let maxScore = 0;

        // User input completeness (30%)
        maxScore += 0.3;
        if (contextFile.userInput && contextFile.userInput.confirmedDetails) {
            score += 0.3;
        } else if (contextFile.userInput && contextFile.userInput.extractedDetails) {
            score += 0.15;
        }

        // Environmental context completeness (25%)
        maxScore += 0.25;
        if (contextFile.environmentalContext && contextFile.environmentalContext.weather) {
            score += 0.25;
        }

        // Constraints completeness (25%)
        maxScore += 0.25;
        let constraintScore = 0;
        if (contextFile.constraints && contextFile.constraints.dressCode) constraintScore += 0.1;
        if (contextFile.constraints && contextFile.constraints.occasionConstraints) constraintScore += 0.1;
        if (contextFile.constraints && contextFile.constraints.weatherConstraints) constraintScore += 0.05;
        score += Math.min(constraintScore, 0.25);

        // Metadata completeness (20%)
        maxScore += 0.2;
        if (contextFile.metadata && contextFile.metadata.confidence > 0.5) {
            score += 0.2;
        } else if (contextFile.metadata && contextFile.metadata.confidence > 0.3) {
            score += 0.1;
        }

        return Math.min(score / maxScore, 1);
    }

    /**
     * Validate context file structure
     * @param {Object} contextFile - Context file to validate
     * @returns {Object} Validation result
     */
    validateContextFile(contextFile) {
        const errors = [];
        const warnings = [];

        // Check required structure
        if (!contextFile.sessionId) {
            errors.push('Context file must have a sessionId');
        }

        if (!contextFile.userInput) {
            errors.push('Context file must have userInput section');
        }

        if (!contextFile.environmentalContext) {
            errors.push('Context file must have environmentalContext section');
        }

        if (!contextFile.constraints) {
            errors.push('Context file must have constraints section');
        }

        if (!contextFile.metadata) {
            errors.push('Context file must have metadata section');
        }

        // Check completeness
        const completeness = this.calculateCompleteness(contextFile);
        if (completeness < 0.5) {
            warnings.push('Context file appears incomplete (less than 50% complete)');
        }

        // Check confidence
        if (contextFile.metadata && contextFile.metadata.confidence < 0.3) {
            warnings.push('Low confidence in extracted data');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            completeness
        };
    }

    /**
     * Save context file to storage
     * @param {Object} contextFile - Context file to save
     */
    saveContextFile(contextFile) {
        try {
            const allContextFiles = this.getAllContextFiles();
            allContextFiles[contextFile.sessionId] = contextFile;

            // Clean up expired context files
            this.cleanupExpiredContextFiles(allContextFiles);

            localStorage.setItem(this.storageKey, JSON.stringify(allContextFiles));
        } catch (error) {
            console.error('Failed to save context file:', error);
        }
    }

    /**
     * Get all context files from storage
     * @returns {Object} All context files
     */
    getAllContextFiles() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to parse stored context files:', error);
            return {};
        }
    }

    /**
     * Delete context file
     * @param {string} sessionId - Session identifier
     */
    deleteContextFile(sessionId) {
        try {
            const allContextFiles = this.getAllContextFiles();
            delete allContextFiles[sessionId];
            localStorage.setItem(this.storageKey, JSON.stringify(allContextFiles));
        } catch (error) {
            console.error('Failed to delete context file:', error);
        }
    }

    /**
     * Check if context file is expired
     * @param {Object} contextFile - Context file to check
     * @returns {boolean} Whether context file is expired
     */
    isContextFileExpired(contextFile) {
        if (!contextFile.lastUpdated) {
            return true;
        }

        const lastUpdated = new Date(contextFile.lastUpdated);
        const now = new Date();
        return (now - lastUpdated) > this.contextTimeout;
    }

    /**
     * Clean up expired context files from storage
     * @param {Object} allContextFiles - All context files
     */
    cleanupExpiredContextFiles(allContextFiles) {
        Object.keys(allContextFiles).forEach(sessionId => {
            const contextFile = allContextFiles[sessionId];
            if (this.isContextFileExpired(contextFile)) {
                delete allContextFiles[sessionId];
            }
        });
    }

    /**
     * Reset all context files (useful for testing)
     */
    reset() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Failed to reset context files:', error);
        }
    }
}

// Export singleton instance
const contextAccumulator = new ContextAccumulator();
export default contextAccumulator;
export { ContextAccumulator };