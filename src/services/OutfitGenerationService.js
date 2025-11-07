/**
 * Outfit Generation Service
 * Orchestrates the outfit generation process by coordinating context accumulation,
 * CSV data loading, and AI-powered outfit recommendations
 */

import contextAccumulator from './contextAccumulator';
import csvLoader from './CSVLoader';

class OutfitGenerationService {
    constructor() {
        // No local caching needed - CSVLoader handles caching
    }

    /**
     * Main orchestration method for generating outfits
     * @param {string} sessionId - Session identifier
     * @param {Object} confirmedDetails - User-confirmed event details
     * @returns {Promise<Object>} Generated outfit recommendations
     */
    async generateOutfits(sessionId, confirmedDetails) {
        try {
            // Validate inputs
            this.validateInputs(sessionId, confirmedDetails);

            // Load clothing dataset
            const csvData = await this.loadClothingDataset();

            // Get accumulated context
            const contextFile = contextAccumulator.getContextFile(sessionId);
            if (!contextFile) {
                throw new Error('Context file not found for session');
            }

            // Generate context summary for AI
            const contextSummary = contextAccumulator.generateContextSummary(sessionId);

            // Get formatted context for AI consumption
            const formattedContext = contextAccumulator.formatContextForAI(sessionId);

            // Build AI prompt with context and CSV data
            const prompt = this.buildAIPrompt(contextSummary, csvData, confirmedDetails.duration, formattedContext);

            // Return structured data for AI processing
            return {
                success: true,
                data: {
                    sessionId,
                    contextSummary,
                    csvData,
                    prompt,
                    confirmedDetails,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Outfit generation error:', error);
            return {
                success: false,
                error: {
                    code: 'GENERATION_ERROR',
                    message: error.message || 'Failed to generate outfits'
                }
            };
        }
    }

    /**
     * Load clothing dataset from CSV file
     * @returns {Promise<string>} Raw CSV content
     */
    async loadClothingDataset() {
        try {
            // Use CSVLoader utility to load the clothing dataset
            const csvContent = await csvLoader.loadCSV('/clothing_dataset.csv');
            return csvContent;

        } catch (error) {
            console.error('CSV loading error:', error);
            throw new Error(`Failed to load clothing dataset: ${error.message}`);
        }
    }

    /**
     * Build AI prompt with context and CSV data
     * @param {Object} contextSummary - Accumulated context summary
     * @param {string} csvData - Raw CSV clothing data
     * @param {number} duration - Trip duration in days
     * @param {string} formattedContext - Formatted context string for AI
     * @returns {string} Formatted AI prompt
     */
    buildAIPrompt(contextSummary, csvData, duration, formattedContext) {
        let prompt = "OUTFIT GENERATION REQUEST\n\n";

        // Add formatted context from context accumulator
        if (formattedContext) {
            prompt += formattedContext + "\n";
        } else {
            // Fallback to basic context information
            prompt += "CONTEXT:\n";
            prompt += `Event: ${contextSummary.event.occasion || 'Not specified'}\n`;
            prompt += `Duration: ${duration} day(s)\n`;
            prompt += `Location: ${contextSummary.event.location || 'Not specified'}\n`;
            prompt += `Dress Code: ${contextSummary.style.dressCode || 'Not specified'}\n`;

            if (contextSummary.style.budget) {
                prompt += `Budget: $${contextSummary.style.budget}\n`;
            }

            if (contextSummary.environment.weather) {
                prompt += `Weather: ${JSON.stringify(contextSummary.environment.weather)}\n`;
            }

            prompt += "\n";
        }

        // Add reusability requirements
        prompt += "REQUIREMENTS:\n";
        prompt += "- Generate complete outfits for each day\n";
        prompt += "- Prioritize practical, versatile items\n";
        if (duration > 3) {
            prompt += "- Ensure at least 60% of items are reused across multiple days\n";
        }
        prompt += "- Consider weather appropriateness and dress code compliance\n";
        prompt += "- Provide styling rationale for each outfit\n\n";

        // Add CSV data
        prompt += "AVAILABLE CLOTHING ITEMS:\n";
        prompt += csvData;
        prompt += "\n";

        // Add response format instructions
        prompt += "RESPONSE FORMAT:\n";
        prompt += "Please respond with a JSON object containing daily outfits and reusability analysis.\n";

        return prompt;
    }

    /**
     * Validate session ID and confirmed details
     * @param {string} sessionId - Session identifier
     * @param {Object} confirmedDetails - Confirmed event details
     */
    validateInputs(sessionId, confirmedDetails) {
        if (!sessionId || typeof sessionId !== 'string') {
            throw new Error('Valid session ID is required');
        }

        if (!confirmedDetails || typeof confirmedDetails !== 'object') {
            throw new Error('Confirmed details are required');
        }

        if (!confirmedDetails.duration || typeof confirmedDetails.duration !== 'number' || confirmedDetails.duration < 1) {
            throw new Error('Valid trip duration is required');
        }

        if (!confirmedDetails.occasion || typeof confirmedDetails.occasion !== 'string') {
            throw new Error('Event occasion is required');
        }
    }



    /**
     * Clear CSV cache (delegates to CSVLoader)
     */
    clearCache() {
        csvLoader.clearCache();
    }

    /**
     * Get cache status information (delegates to CSVLoader)
     * @returns {Object} Cache status
     */
    getCacheStatus() {
        return csvLoader.getCacheStats();
    }
}

// Export singleton instance
const outfitGenerationService = new OutfitGenerationService();
export default outfitGenerationService;
export { OutfitGenerationService };