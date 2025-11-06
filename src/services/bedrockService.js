/**
 * Enhanced Bedrock Service with Zod Schema Validation
 * Handles AI requests with structured JSON responses
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
    getEventExtractionSchemaForAI,
    validateEventExtraction,
    DRESS_CODE_RULES,
    DATE_PARSING_EXAMPLES
} from '../schemas/eventExtractionSchema';

class BedrockService {
    constructor() {
        // Initialize AWS Bedrock client
        this.client = new BedrockRuntimeClient({
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || 'AKIA6GBMEZYKV3ODLVGG',
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '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'
            }
        });

        this.modelId = 'us.amazon.nova-lite-v1:0';
        this.modelConfig = {
            temperature: 0.3,
            maxTokens: 1000,
            topP: 0.9
        };
    }

    /**
     * Main entry point for outfit planning conversations
     */
    async processOutfitRequest(userMessage) {
        try {
            // Check if this is an outfit planning request
            if (this.isOutfitPlanningRequest(userMessage)) {
                return await this.processOutfitPlanningRequest(userMessage);
            } else {
                // Fall back to general conversation
                return await this.processGeneralRequest(userMessage);
            }
        } catch (error) {
            console.error('Outfit request processing error:', error);
            return {
                success: false,
                error: {
                    code: 'PROCESSING_ERROR',
                    message: 'I had trouble processing your request. Please try again.'
                }
            };
        }
    }

    /**
     * Process outfit planning request with Zod schema validation
     */
    async processOutfitPlanningRequest(userMessage) {
        try {
            console.log('Processing outfit planning request:', userMessage);

            // Use AI-powered extraction with Zod schema validation
            const extractionResult = await this.extractEventDetailsWithSchema(userMessage);

            if (!extractionResult.success) {
                return {
                    success: false,
                    error: {
                        code: 'EXTRACTION_ERROR',
                        message: 'I had trouble understanding your event details. Please try describing your occasion again.'
                    }
                };
            }

            const eventData = extractionResult.data;

            // Get weather data if location is provided
            let weatherData = null;
            if (eventData.location && eventData.startDate) {
                try {
                    const weatherService = (await import('./weatherService')).default;
                    weatherData = await weatherService.getWeatherForLocationAndDate(
                        eventData.location,
                        eventData.startDate
                    );
                } catch (weatherError) {
                    console.warn('Weather data unavailable:', weatherError.message);
                }
            }

            // Return structured event context
            const structuredData = {
                ...eventData,
                weather: weatherData,
                extractedAt: new Date().toISOString()
            };

            return {
                success: true,
                data: {
                    eventContext: structuredData,
                    needsClarification: eventData.needsClarification || [],
                    extractionConfidence: eventData.confidence || 0.8,
                    pipelineStage: 'confirmation_pending',
                    response: this.generateEventSummary(structuredData),
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Outfit planning request error:', error);
            return {
                success: false,
                error: {
                    code: 'OUTFIT_PLANNING_ERROR',
                    message: 'I had trouble understanding your event details. Please try describing your occasion again.'
                }
            };
        }
    }

    /**
     * Extract event details using Zod schema validation
     */
    async extractEventDetailsWithSchema(userMessage) {
        try {
            console.log('Starting schema-based AI extraction for:', userMessage);

            const extractionPrompt = this.buildSchemaBasedPrompt(userMessage);

            const requestPayload = {
                messages: [{
                    role: 'user',
                    content: [{ text: extractionPrompt }]
                }],
                inferenceConfig: {
                    temperature: 0.1,
                    maxTokens: 800
                }
            };

            const command = new InvokeModelCommand({
                modelId: this.modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestPayload)
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const aiResponse = responseBody.output?.message?.content?.[0]?.text || '{}';

            console.log('Raw AI response:', aiResponse);

            // Clean and parse JSON
            const cleanedResponse = this.cleanJsonResponse(aiResponse);
            console.log('Cleaned response:', cleanedResponse);

            try {
                const parsedData = JSON.parse(cleanedResponse);
                console.log('Parsed AI data:', parsedData);

                // Validate against Zod schema
                const validation = validateEventExtraction(parsedData);

                if (validation.success) {
                    console.log('✅ Schema validation successful:', validation.data);
                    return validation.data;
                } else {
                    console.error('❌ Schema validation failed:', validation.error);
                    // Try to fix common issues and re-validate
                    const fixedData = this.fixCommonSchemaIssues(parsedData);
                    const retryValidation = validateEventExtraction(fixedData);

                    if (retryValidation.success) {
                        console.log('✅ Fixed data validation successful:', retryValidation.data);
                        return retryValidation.data;
                    } else {
                        console.error('❌ Retry validation also failed:', retryValidation.error);
                    }
                }
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
            }

            // If all parsing fails, return a basic fallback
            return this.createFallbackResponse(userMessage);

        } catch (error) {
            console.error('Schema-based extraction error:', error);
            return this.createFallbackResponse(userMessage);
        }
    }

    /**
     * Build schema-based prompt using Zod schema definition
     */
    buildSchemaBasedPrompt(userMessage) {
        const schemaDefinition = getEventExtractionSchemaForAI();
        const today = new Date().toISOString().split('T')[0];
        const exampleDates = {
            tomorrow: DATE_PARSING_EXAMPLES.tomorrow(),
            nextWeek: DATE_PARSING_EXAMPLES['next week'](),
            thisWeekend: DATE_PARSING_EXAMPLES['this weekend']()
        };

        return `You are an expert event planner. Extract structured information from the user's event description.

User input: "${userMessage}"

You must respond with ONLY valid JSON that matches this exact schema:
${schemaDefinition}

LOCATION EXTRACTION RULES:
- Look for phrases like "in [location]", "to [location]", "at [location]"
- Common locations: "UK" → "United Kingdom", "NYC" → "New York", "LA" → "Los Angeles"
- Extract full location names: "New York", "London", "Paris", "United Kingdom", etc.
- If no location mentioned, set to null and add "location" to needsClarification

DRESS CODE MAPPING RULES:
${Object.entries(DRESS_CODE_RULES).map(([code, occasions]) =>
            `- ${code}: ${occasions.join(', ')}`
        ).join('\n')}

DATE PARSING EXAMPLES:
- "today" → "${today}"
- "tomorrow" → "${exampleDates.tomorrow}"
- "next week" → "${exampleDates.nextWeek}"
- "this weekend" → "${exampleDates.thisWeekend}"

CONFIDENCE SCORING:
- 0.9-1.0: All key details clear and specific
- 0.7-0.8: Most details clear, minor ambiguity
- 0.5-0.6: Some details unclear or missing
- 0.3-0.4: Major details missing or ambiguous

EXTRACTION EXAMPLES:
Input: "3 day festival in the UK"
Output: {"success": true, "data": {"occasion": "festival", "location": "United Kingdom", "startDate": null, "duration": 3, "dressCode": "casual", "budget": null, "specialRequirements": [], "needsClarification": ["start date"], "confidence": 0.8}}

Input: "business conference in New York next week"
Output: {"success": true, "data": {"occasion": "business conference", "location": "New York", "startDate": "${exampleDates.nextWeek}", "duration": 1, "dressCode": "smart-casual", "budget": null, "specialRequirements": [], "needsClarification": [], "confidence": 0.9}}

EXTRACTION RULES:
1. Extract duration from phrases like "3 day", "5 days", "week-long"
2. Extract location from phrases like "in the UK", "in New York", "to London"
3. If location is unclear or missing, add "location" to needsClarification
4. If date is unclear or missing, add "start date" to needsClarification
5. Map occasion types to appropriate dress codes using the rules above
6. Extract budget from phrases like "$500", "under $1000", "budget of 200"

Respond with ONLY the JSON object, no additional text or formatting.`;
    }

    /**
     * Clean JSON response by removing markdown formatting and extra text
     */
    cleanJsonResponse(rawResponse) {
        // Remove markdown code blocks
        let cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Remove any text before the first {
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace > 0) {
            cleaned = cleaned.substring(firstBrace);
        }

        // Remove any text after the last }
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace > 0 && lastBrace < cleaned.length - 1) {
            cleaned = cleaned.substring(0, lastBrace + 1);
        }

        return cleaned.trim();
    }

    /**
     * Fix common schema validation issues
     */
    fixCommonSchemaIssues(data) {
        const fixed = { ...data };

        // Ensure success is boolean
        if (typeof fixed.success !== 'boolean') {
            fixed.success = true;
        }

        // Ensure data object exists
        if (!fixed.data || typeof fixed.data !== 'object') {
            fixed.data = {};
        }

        const dataObj = fixed.data;

        // Fix occasion
        if (!dataObj.occasion || typeof dataObj.occasion !== 'string') {
            dataObj.occasion = 'general event';
        }

        // Fix location (ensure null or string)
        if (dataObj.location !== null && typeof dataObj.location !== 'string') {
            dataObj.location = null;
        }

        // Fix startDate (ensure null or string)
        if (dataObj.startDate !== null && typeof dataObj.startDate !== 'string') {
            dataObj.startDate = null;
        }

        // Fix duration (ensure positive integer)
        if (typeof dataObj.duration !== 'number' || dataObj.duration < 1) {
            dataObj.duration = 1;
        }

        // Fix dressCode (ensure valid enum value)
        const validDressCodes = ['casual', 'smart-casual', 'business', 'formal', 'black-tie'];
        if (!validDressCodes.includes(dataObj.dressCode)) {
            dataObj.dressCode = 'smart-casual';
        }

        // Fix budget (ensure null or number)
        if (dataObj.budget !== null && typeof dataObj.budget !== 'number') {
            dataObj.budget = null;
        }

        // Fix arrays
        if (!Array.isArray(dataObj.specialRequirements)) {
            dataObj.specialRequirements = [];
        }
        if (!Array.isArray(dataObj.needsClarification)) {
            dataObj.needsClarification = [];
        }

        // Fix confidence (ensure number between 0 and 1)
        if (typeof dataObj.confidence !== 'number' || dataObj.confidence < 0 || dataObj.confidence > 1) {
            dataObj.confidence = 0.7;
        }

        return fixed;
    }

    /**
     * Create fallback response when AI extraction fails
     */
    createFallbackResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        // Basic pattern matching for fallback
        let occasion = 'general event';
        let dressCode = 'smart-casual';
        let duration = 1;

        if (lowerMessage.includes('festival')) {
            occasion = 'festival';
            dressCode = 'casual';
        } else if (lowerMessage.includes('business') || lowerMessage.includes('conference')) {
            occasion = 'business conference';
            dressCode = 'smart-casual';
        } else if (lowerMessage.includes('wedding')) {
            occasion = 'wedding';
            dressCode = 'formal';
        }

        // Extract duration
        const durationMatch = lowerMessage.match(/(\d+)\s*day/);
        if (durationMatch) {
            duration = parseInt(durationMatch[1]);
        }

        // Extract location with better patterns
        let location = null;
        const locationPatterns = [
            /in\s+the\s+(uk|united\s+kingdom)/i,
            /in\s+(new\s+york|nyc|ny)/i,
            /in\s+(los\s+angeles|la)/i,
            /in\s+(san\s+francisco|sf)/i,
            /in\s+(london)/i,
            /in\s+(paris)/i,
            /in\s+([a-zA-Z\s]+)/i
        ];

        for (const pattern of locationPatterns) {
            const match = userMessage.match(pattern);
            if (match) {
                const rawLocation = match[1].toLowerCase();
                if (rawLocation.includes('uk') || rawLocation.includes('united kingdom')) {
                    location = 'United Kingdom';
                } else if (rawLocation.includes('new york') || rawLocation === 'nyc' || rawLocation === 'ny') {
                    location = 'New York';
                } else if (rawLocation.includes('los angeles') || rawLocation === 'la') {
                    location = 'Los Angeles';
                } else if (rawLocation.includes('san francisco') || rawLocation === 'sf') {
                    location = 'San Francisco';
                } else {
                    // Capitalize first letter of each word
                    location = match[1].split(' ').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                }
                break;
            }
        }

        const needsClarification = [];
        if (!location) needsClarification.push('location');
        needsClarification.push('start date');

        return {
            success: true,
            data: {
                occasion,
                location,
                startDate: null,
                duration,
                dressCode,
                budget: null,
                specialRequirements: [],
                needsClarification,
                confidence: 0.5
            }
        };
    }

    /**
     * Generate event summary for user
     */
    generateEventSummary(eventContext) {
        const { occasion, location, startDate, duration, dressCode, needsClarification } = eventContext;

        let summary = `I understand you need outfit planning for a **${occasion}**`;

        if (duration > 1) {
            summary += ` lasting ${duration} days`;
        }

        if (location) {
            summary += ` in ${location}`;
        }

        if (startDate) {
            const date = new Date(startDate);
            summary += ` starting ${date.toLocaleDateString()}`;
        }

        summary += `. I've identified the dress code as **${dressCode}**.`;

        if (needsClarification.length > 0) {
            summary += ` To provide better recommendations, could you clarify: ${needsClarification.join(', ')}?`;
        } else {
            summary += ` I have all the information needed to create your outfit recommendations!`;
        }

        return summary;
    }

    /**
     * Determine if user message is about outfit planning
     */
    isOutfitPlanningRequest(userMessage) {
        const outfitKeywords = [
            'outfit', 'clothes', 'clothing', 'wear', 'dress', 'attire',
            'conference', 'meeting', 'wedding', 'interview', 'trip', 'vacation',
            'event', 'occasion', 'formal', 'casual', 'business', 'pack', 'packing',
            'festival'
        ];

        const lowerMessage = userMessage.toLowerCase();
        return outfitKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Process general conversation request
     */
    async processGeneralRequest(userMessage) {
        // Simple fallback for non-outfit requests
        return {
            success: true,
            data: {
                response: "I'm specialized in outfit planning and fashion advice. Could you tell me about an upcoming event, trip, or occasion you need help with?",
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Test connection
     */
    async testConnection() {
        try {
            const requestPayload = {
                messages: [{
                    role: 'user',
                    content: [{ text: 'Hello, test connection' }]
                }],
                inferenceConfig: {
                    temperature: 0.1,
                    maxTokens: 100
                }
            };

            const command = new InvokeModelCommand({
                modelId: this.modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestPayload)
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));

            return {
                success: true,
                data: {
                    message: 'Bedrock connection successful',
                    response: responseBody.output?.message?.content?.[0]?.text || 'Test response received'
                }
            };

        } catch (error) {
            console.error('Bedrock connection test failed:', error);
            return {
                success: false,
                error: {
                    code: 'CONNECTION_ERROR',
                    message: error.message
                }
            };
        }
    }
}

// Export singleton instance
const bedrockService = new BedrockService();
export default bedrockService;