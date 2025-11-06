/**
 * Event Extraction Service
 * Handles structured data extraction from natural language input for outfit planning
 */

import bedrockService from './bedrockService';

class EventExtractionService {
    constructor() {
        this.validDressCodes = ['casual', 'smart-casual', 'business', 'formal', 'black-tie'];
        this.validOccasionTypes = [
            'business conference', 'wedding', 'vacation', 'job interview',
            'business meeting', 'formal dinner', 'casual outing', 'work event',
            'social gathering', 'date night', 'travel', 'presentation'
        ];
    }

    /**
     * Extract structured event details from natural language input
     * @param {string} userMessage - User's natural language input
     * @returns {Promise<Object>} Extraction result with structured data
     */
    async extractEventDetails(userMessage) {
        try {
            // Primary extraction using AI
            const aiResult = await this.extractWithAI(userMessage);

            if (aiResult.success) {
                // Validate and normalize the extracted data
                const validatedData = this.validateAndNormalizeData(aiResult.data);

                return {
                    success: true,
                    data: validatedData,
                    extractionMethod: 'ai',
                    confidence: this.calculateConfidence(validatedData)
                };
            }

            // Fallback to rule-based extraction if AI fails
            console.warn('AI extraction failed, using fallback method');
            const fallbackResult = this.extractWithRules(userMessage);

            return {
                success: true,
                data: fallbackResult,
                extractionMethod: 'fallback',
                confidence: this.calculateConfidence(fallbackResult)
            };

        } catch (error) {
            console.error('Event extraction error:', error);

            // Last resort: basic extraction
            const basicResult = this.extractBasicInfo(userMessage);

            return {
                success: true,
                data: basicResult,
                extractionMethod: 'basic',
                confidence: 0.3,
                error: error.message
            };
        }
    }

    /**
     * Extract event details using AI (BedrockService)
     * @param {string} userMessage - User input
     * @returns {Promise<Object>} AI extraction result
     */
    async extractWithAI(userMessage) {
        try {
            const extractionPrompt = this.buildExtractionPrompt(userMessage);

            // Use BedrockService's existing infrastructure
            const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

            const requestPayload = {
                messages: [{
                    role: 'user',
                    content: [{ text: extractionPrompt }]
                }],
                inferenceConfig: {
                    temperature: 0.1,
                    maxTokens: 600
                }
            };

            const command = new InvokeModelCommand({
                modelId: bedrockService.modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestPayload)
            });

            const response = await bedrockService.client.send(command);

            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const aiResponse = responseBody.output?.message?.content?.[0]?.text || '{}';

            // Parse JSON response
            const extractedData = JSON.parse(aiResponse.trim());

            return {
                success: true,
                data: extractedData
            };

        } catch (error) {
            console.error('AI extraction failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Build extraction prompt for AI
     * @param {string} userMessage - User input
     * @returns {string} Formatted prompt
     */
    buildExtractionPrompt(userMessage) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        return `You are an expert event planner. Extract structured information from this user's event description.

User input: "${userMessage}"

Extract the following information and respond with JSON in this exact format:
{
  "occasion": "string - type of event (e.g., business conference, wedding, vacation, job interview)",
  "location": "string - city/location or null if not specified",
  "startDate": "YYYY-MM-DD - start date or null if not specified",
  "duration": "number - duration in days (default 1 if not specified)",
  "dressCode": "string - inferred dress code (casual, smart-casual, business, formal, black-tie)",
  "budget": "number - budget amount or null if not specified",
  "specialRequirements": ["array of strings - any special needs mentioned"],
  "needsClarification": ["array of strings - what information is missing or unclear"]
}

Dress code inference rules:
- Job interview, business meeting → "business" 
- Wedding, gala, formal dinner → "formal"
- Conference, work event → "smart-casual"
- Vacation, weekend trip → "casual"
- Evening event, awards ceremony → "formal" or "black-tie"

Date parsing rules:
- "tomorrow" → ${tomorrow}
- "next week" → ${this.getDateInDays(7)}
- "this weekend" → ${this.getNextWeekend()}
- If no date given, set to null

Examples:
Input: "3-day conference in NYC next week, need professional outfits"
Output: {"occasion": "business conference", "location": "NYC", "startDate": "${this.getDateInDays(7)}", "duration": 3, "dressCode": "smart-casual", "budget": null, "specialRequirements": ["professional outfits"], "needsClarification": []}

Input: "wedding this Saturday, formal dress required"
Output: {"occasion": "wedding", "location": null, "startDate": "${this.getNextWeekend()}", "duration": 1, "dressCode": "formal", "budget": null, "specialRequirements": ["formal dress required"], "needsClarification": ["location"]}

Only respond with the JSON, nothing else.`;
    }

    /**
     * Rule-based extraction fallback method
     * @param {string} userMessage - User input
     * @returns {Object} Extracted event details
     */
    extractWithRules(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        // Extract duration
        const durationMatch = lowerMessage.match(/(\d+)[-\s]?day/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : 1;

        // Extract location
        const locationPatterns = [
            /in\s+([a-zA-Z\s,]+?)(?:\s|$|,|tomorrow|today|next|this)/i,
            /at\s+([a-zA-Z\s,]+?)(?:\s|$|,|tomorrow|today|next|this)/i,
            /to\s+([a-zA-Z\s,]+?)(?:\s|$|,|tomorrow|today|next|this)/i
        ];

        let location = null;
        for (const pattern of locationPatterns) {
            const match = lowerMessage.match(pattern);
            if (match) {
                location = match[1].trim();
                break;
            }
        }

        // Extract budget
        const budgetMatch = lowerMessage.match(/\$(\d+)|budget.*?(\d+)|(\d+).*?budget/i);
        const budget = budgetMatch ? parseInt(budgetMatch[1] || budgetMatch[2] || budgetMatch[3]) : null;

        // Infer occasion and dress code
        const { occasion, dressCode } = this.inferOccasionAndDressCode(lowerMessage);

        // Extract date
        const startDate = this.extractDate(lowerMessage);

        // Identify special requirements
        const specialRequirements = this.extractSpecialRequirements(lowerMessage);

        // Identify what needs clarification
        const needsClarification = this.identifyMissingInformation({
            occasion, location, startDate, duration, dressCode, budget, specialRequirements
        });

        return {
            occasion,
            location,
            startDate,
            duration,
            dressCode,
            budget,
            specialRequirements,
            needsClarification
        };
    }

    /**
     * Basic extraction method (last resort)
     * @param {string} userMessage - User input
     * @returns {Object} Basic event details
     */
    extractBasicInfo(userMessage) {
        return {
            occasion: 'general event',
            location: null,
            startDate: null,
            duration: 1,
            dressCode: 'smart-casual',
            budget: null,
            specialRequirements: [],
            needsClarification: ['occasion', 'location', 'start date', 'dress code requirements']
        };
    }

    /**
     * Infer occasion type and dress code from message
     * @param {string} lowerMessage - Lowercase user message
     * @returns {Object} Occasion and dress code
     */
    inferOccasionAndDressCode(lowerMessage) {
        const occasionPatterns = {
            'job interview': { keywords: ['interview', 'job interview'], dressCode: 'business' },
            'business conference': { keywords: ['conference', 'business conference'], dressCode: 'smart-casual' },
            'business meeting': { keywords: ['business meeting', 'work meeting', 'meeting'], dressCode: 'business' },
            'wedding': { keywords: ['wedding', 'marriage ceremony'], dressCode: 'formal' },
            'formal dinner': { keywords: ['formal dinner', 'gala', 'awards'], dressCode: 'formal' },
            'vacation': { keywords: ['vacation', 'holiday', 'trip', 'travel'], dressCode: 'casual' },
            'date night': { keywords: ['date', 'date night', 'romantic dinner'], dressCode: 'smart-casual' },
            'work event': { keywords: ['work event', 'company event', 'office party'], dressCode: 'smart-casual' }
        };

        for (const [occasion, config] of Object.entries(occasionPatterns)) {
            if (config.keywords.some(keyword => lowerMessage.includes(keyword))) {
                return { occasion, dressCode: config.dressCode };
            }
        }

        // Default fallback
        return { occasion: 'general event', dressCode: 'smart-casual' };
    }

    /**
     * Extract date from message
     * @param {string} lowerMessage - Lowercase user message
     * @returns {string|null} Date in YYYY-MM-DD format or null
     */
    extractDate(lowerMessage) {
        const today = new Date();

        if (lowerMessage.includes('tomorrow')) {
            return this.getDateInDays(1);
        }

        if (lowerMessage.includes('next week')) {
            return this.getDateInDays(7);
        }

        if (lowerMessage.includes('this weekend') || lowerMessage.includes('saturday')) {
            return this.getNextWeekend();
        }

        if (lowerMessage.includes('sunday')) {
            return this.getNextSunday();
        }

        // Try to extract specific dates (basic patterns)
        const datePatterns = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
            /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
            /(\d{1,2})-(\d{1,2})-(\d{4})/    // DD-MM-YYYY
        ];

        for (const pattern of datePatterns) {
            const match = lowerMessage.match(pattern);
            if (match) {
                try {
                    const date = new Date(match[0]);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                    }
                } catch (error) {
                    continue;
                }
            }
        }

        return null;
    }

    /**
     * Extract special requirements from message
     * @param {string} lowerMessage - Lowercase user message
     * @returns {Array<string>} Special requirements
     */
    extractSpecialRequirements(lowerMessage) {
        const requirements = [];

        const requirementPatterns = {
            'professional attire': ['professional', 'business attire'],
            'formal dress required': ['formal dress', 'black tie'],
            'comfortable shoes': ['walking', 'comfortable shoes', 'lots of walking'],
            'weather protection': ['rain', 'cold', 'hot weather', 'sun protection'],
            'conservative dress': ['conservative', 'modest', 'covered'],
            'cocktail attire': ['cocktail', 'semi-formal'],
            'outdoor event': ['outdoor', 'outside', 'garden party']
        };

        for (const [requirement, keywords] of Object.entries(requirementPatterns)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                requirements.push(requirement);
            }
        }

        return requirements;
    }

    /**
     * Validate extracted event details
     * @param {Object} eventDetails - Extracted event details
     * @returns {Object} Validation result
     */
    validateEventDetails(eventDetails) {
        const errors = [];
        const warnings = [];

        // Validate required fields
        if (!eventDetails.occasion || typeof eventDetails.occasion !== 'string') {
            errors.push('Occasion is required and must be a string');
        }

        // Validate duration
        if (eventDetails.duration !== null &&
            (typeof eventDetails.duration !== 'number' || eventDetails.duration < 1 || eventDetails.duration > 365)) {
            errors.push('Duration must be a number between 1 and 365 days');
        }

        // Validate date
        if (eventDetails.startDate && !this.isValidDate(eventDetails.startDate)) {
            errors.push('Start date must be a valid date in YYYY-MM-DD format');
        }

        // Validate dress code
        if (eventDetails.dressCode && !this.validDressCodes.includes(eventDetails.dressCode)) {
            warnings.push(`Dress code '${eventDetails.dressCode}' is not standard. Valid options: ${this.validDressCodes.join(', ')}`);
        }

        // Validate budget
        if (eventDetails.budget !== null &&
            (typeof eventDetails.budget !== 'number' || eventDetails.budget < 0)) {
            errors.push('Budget must be a positive number or null');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate and normalize extracted data
     * @param {Object} rawData - Raw extracted data
     * @returns {Object} Validated and normalized data
     */
    validateAndNormalizeData(rawData) {
        const normalized = {
            occasion: rawData.occasion || 'general event',
            location: rawData.location || null,
            startDate: rawData.startDate || null,
            duration: rawData.duration || 1,
            dressCode: rawData.dressCode || 'smart-casual',
            budget: rawData.budget || null,
            specialRequirements: Array.isArray(rawData.specialRequirements) ? rawData.specialRequirements : [],
            needsClarification: Array.isArray(rawData.needsClarification) ? rawData.needsClarification : []
        };

        // Normalize dress code
        if (normalized.dressCode && !this.validDressCodes.includes(normalized.dressCode)) {
            normalized.dressCode = this.mapToValidDressCode(normalized.dressCode);
        }

        // Ensure duration is reasonable
        if (normalized.duration > 365) {
            normalized.duration = 365;
            normalized.needsClarification.push('duration (seems unusually long)');
        }

        // Validate date is not in the past
        if (normalized.startDate && new Date(normalized.startDate) < new Date()) {
            normalized.needsClarification.push('start date (appears to be in the past)');
        }

        return normalized;
    }

    /**
     * Map invalid dress codes to valid ones
     * @param {string} dressCode - Invalid dress code
     * @returns {string} Valid dress code
     */
    mapToValidDressCode(dressCode) {
        const mapping = {
            'professional': 'business',
            'semi-formal': 'smart-casual',
            'cocktail': 'smart-casual',
            'business-casual': 'smart-casual',
            'dressy': 'smart-casual',
            'elegant': 'formal',
            'fancy': 'formal'
        };

        return mapping[dressCode.toLowerCase()] || 'smart-casual';
    }

    /**
     * Identify missing information that needs clarification
     * @param {Object} eventDetails - Extracted event details
     * @returns {Array<string>} List of missing information
     */
    identifyMissingInformation(eventDetails) {
        const missing = [];

        if (!eventDetails.occasion || eventDetails.occasion === 'general event') {
            missing.push('specific occasion type');
        }

        if (!eventDetails.location) {
            missing.push('location');
        }

        if (!eventDetails.startDate) {
            missing.push('start date');
        }

        if (eventDetails.duration > 7 && !eventDetails.budget) {
            missing.push('budget (for extended trip)');
        }

        return missing;
    }

    /**
     * Calculate confidence score for extraction
     * @param {Object} eventDetails - Extracted event details
     * @returns {number} Confidence score between 0 and 1
     */
    calculateConfidence(eventDetails) {
        let score = 0;
        let maxScore = 0;

        // Occasion confidence
        maxScore += 0.3;
        if (eventDetails.occasion && eventDetails.occasion !== 'general event') {
            score += 0.3;
        }

        // Location confidence
        maxScore += 0.2;
        if (eventDetails.location) {
            score += 0.2;
        }

        // Date confidence
        maxScore += 0.2;
        if (eventDetails.startDate) {
            score += 0.2;
        }

        // Dress code confidence
        maxScore += 0.15;
        if (eventDetails.dressCode && this.validDressCodes.includes(eventDetails.dressCode)) {
            score += 0.15;
        }

        // Special requirements confidence
        maxScore += 0.1;
        if (eventDetails.specialRequirements && eventDetails.specialRequirements.length > 0) {
            score += 0.1;
        }

        // Clarification penalty
        maxScore += 0.05;
        if (eventDetails.needsClarification && eventDetails.needsClarification.length === 0) {
            score += 0.05;
        }

        return Math.min(score / maxScore, 1);
    }

    /**
     * Utility: Check if date string is valid
     * @param {string} dateString - Date string to validate
     * @returns {boolean} Whether date is valid
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    /**
     * Utility: Get date N days from today
     * @param {number} days - Number of days to add
     * @returns {string} Date in YYYY-MM-DD format
     */
    getDateInDays(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    /**
     * Utility: Get next weekend (Saturday)
     * @returns {string} Date in YYYY-MM-DD format
     */
    getNextWeekend() {
        const today = new Date();
        const daysUntilSaturday = (6 - today.getDay()) % 7 || 7;
        const saturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
        return saturday.toISOString().split('T')[0];
    }

    /**
     * Utility: Get next Sunday
     * @returns {string} Date in YYYY-MM-DD format
     */
    getNextSunday() {
        const today = new Date();
        const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
        const sunday = new Date(today.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
        return sunday.toISOString().split('T')[0];
    }
}

// Export singleton instance
const eventExtractionService = new EventExtractionService();
export default eventExtractionService;
export { EventExtractionService };