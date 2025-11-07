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
import outfitRecommendationSchema from '../schemas/outfitRecommendationSchema';

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

        return `You are an expert event planner. The user identifies as male, so interpret pronouns and context accordingly. Extract structured information from the user's event description. When the user mentions multiple days or activities, infer a per-day plan.

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
7. If duration > 1, create a dailyPlans array with entries like {"day":1,"activity":"Board meetings","dressCode":"business"}. Use user hints (e.g., "day two is casual sightseeing") or infer reasonable activities if unspecified. Each day must have a dressCode.

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
        if (!Array.isArray(dataObj.dailyPlans)) {
            dataObj.dailyPlans = [];
        } else {
            dataObj.dailyPlans = dataObj.dailyPlans
                .filter(plan => plan && typeof plan === 'object')
                .map((plan, index) => ({
                    day: typeof plan.day === 'number' ? Math.max(1, Math.floor(plan.day)) : index + 1,
                    activity: plan.activity || '',
                    dressCode: validDressCodes.includes(plan.dressCode) ? plan.dressCode : dataObj.dressCode
                }));
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

        const dailyPlans = Array.from({ length: duration }, (_, idx) => ({
            day: idx + 1,
            activity: idx === 0 ? occasion : `${occasion} - Day ${idx + 1}`,
            dressCode
        }));

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
                confidence: 0.5,
                dailyPlans
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
     * Generate outfit recommendations using CSV data and AI
     * @param {Object} params
     * @param {Object} params.eventDetails
     * @param {string} params.csvContent
     * @param {Object} params.contextSummary
     */
    async generateOutfitRecommendations({ eventDetails, csvContent, contextSummary }) {
        try {
            console.log('Generating outfit recommendations with Bedrock:', eventDetails);

            const outfitPrompt = this.buildOutfitGenerationPrompt(eventDetails, csvContent, contextSummary);

            const requestPayload = {
                messages: [{
                    role: 'user',
                    content: [{ text: outfitPrompt }]
                }],
                inferenceConfig: {
                    temperature: 0.2, // Lower temperature for more consistent results
                    maxTokens: 3000   // More tokens for complete responses
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

            console.log('Raw outfit AI response:', aiResponse);

            // Parse the AI response into structured outfit data
            const outfitData = this.parseOutfitResponse(aiResponse);

            return {
                success: true,
                data: outfitData,
                rawResponse: aiResponse
            };

        } catch (error) {
            console.error('Outfit generation error:', error);
            return {
                success: false,
                error: {
                    code: 'OUTFIT_GENERATION_ERROR',
                    message: 'Failed to generate outfit recommendations'
                }
            };
        }
    }

    /**
     * Build outfit generation prompt with CSV data
     */
    buildOutfitGenerationPrompt(eventDetails, csvContent, contextSummary) {
        const { occasion, duration, location, dressCode, budget, dayPlans = [] } = eventDetails;
        const promptContext = {
            occasion,
            duration,
            location,
            dressCode,
            budget,
            userGender: 'male',
            dayPlans,
            weather: contextSummary?.environment?.weather || null,
            weatherConstraints: contextSummary?.weatherConstraints || null,
            specialRequirements: contextSummary?.style?.specialRequirements || []
        };

        return `You are an expert travel stylist. Using the clothing catalog below, create ${duration} complete daily outfits for the described trip. The traveler is male, so select menswear SKUs and male-appropriate styling. You must select items ONLY by SKU from the CSV table—do not invent new products. Follow the dayPlans array to tailor each day’s outfit.

TRIP CONTEXT:
${JSON.stringify(promptContext, null, 2)}

AVAILABLE CLOTHING ITEMS (CSV):
${csvContent}

OUTPUT REQUIREMENTS:
1. Build ${duration} daily outfits with topwear, bottomwear, and footwear. Add outerwear/accessories only when they improve the outfit or meet weather requirements.
2. For each day, align the outfit with the provided activity and dress code from dayPlans (if an activity is blank, infer it from the overall occasion). Reuse versatile items across days to keep packing lean.
3. For each day, explain why the selected combination works (styling rationale), how it satisfies weather needs, and how it complies with the dress code.
4. Respond with JSON ONLY in this structure (no markdown, no prose outside JSON):

{
  "tripDetails": {
    "occasion": "${occasion}",
    "duration": ${duration},
    "location": "${location || 'unspecified'}",
    "dressCode": "${dressCode}",
    "budget": ${budget ?? 'null'}
  },
  "dailyOutfits": [
    {
      "day": 1,
      "date": "Day 1",
      "occasion": "${occasion} - Day 1",
      "outfit": {
        "topwear": { "sku": "SKU###" },
        "bottomwear": { "sku": "SKU###" },
        "footwear": { "sku": "SKU###" },
        "outerwear": { "sku": "SKU###" } | null,
        "accessories": [{ "sku": "SKU###" }, ...]
      },
      "styling": {
        "rationale": "Why each item works together, referencing SKUs",
        "weatherConsiderations": "How the look handles the forecast",
        "dresscodeCompliance": "Why it matches ${dressCode}"
      }
    }
  ],
  "reusabilityAnalysis": {
    "totalItems": number,
    "reusedItems": number,
    "reusabilityPercentage": number,
    "reusabilityMap": {
      "SKU###": [1,3]
    }
  }
}

IMPORTANT:
- Do NOT add commentary outside the JSON object.
- Every SKU must exist in the CSV table above.
- You may include optional descriptive fields (name, colors, etc.) inside each outfit slot, but the SKU is mandatory.`;
    }

    /**
     * Get formality filter for dress code
     */
    getFormalityFilter(dressCode) {
        const formalityMap = {
            'casual': ['casual'],
            'smart-casual': ['casual', 'smart-casual'],
            'business': ['smart-casual', 'formal'],
            'formal': ['formal'],
            'black-tie': ['formal']
        };
        return formalityMap[dressCode] || ['smart-casual'];
    }

    /**
     * Build simple prompt when CSV parsing fails
     */
    buildSimplePrompt(eventDetails) {
        const { occasion, duration, location, dressCode } = eventDetails;

        return `Create ${duration} outfit recommendations for a ${occasion} with ${dressCode} dress code in ${location || 'unspecified location'}. 
        
        Respond with valid JSON containing tripDetails and dailyOutfits array with outfit objects containing topwear, bottomwear, footwear, and styling information.`;
    }


    /**
     * Parse AI outfit response into structured data
     */
    parseOutfitResponse(aiResponse) {
        console.log('Parsing AI response for outfit data...');
        const cleanedResponse = this.cleanJsonResponse(aiResponse);

        let parsed;
        try {
            parsed = JSON.parse(cleanedResponse);
        } catch (error) {
            console.error('Failed to parse AI JSON:', error);
            throw new Error('AI returned invalid JSON for outfit recommendations');
        }

        const validation = outfitRecommendationSchema.safeParse(parsed);

        if (!validation.success) {
            console.error('Outfit schema validation failed:', validation.error.issues);
            const firstIssue = validation.error.issues?.[0];
            throw new Error(firstIssue?.message || 'AI response failed validation');
        }

        console.log('✅ Successfully validated AI outfit response');
        return validation.data;
    }

    /**
     * Calculate reusability analysis from daily outfits
     */
    calculateReusabilityAnalysis(dailyOutfits) {
        const itemUsage = new Map();
        const allItems = [];

        // Count item usage across all days
        dailyOutfits.forEach((dayOutfit, dayIndex) => {
            const outfit = dayOutfit.outfit;
            const dayNum = dayIndex + 1;

            // Process each component
            ['topwear', 'bottomwear', 'footwear', 'outerwear'].forEach(component => {
                if (outfit[component] && outfit[component] !== null) {
                    const item = outfit[component];
                    allItems.push(item);

                    if (!itemUsage.has(item.sku)) {
                        itemUsage.set(item.sku, []);
                    }
                    itemUsage.get(item.sku).push(dayNum);
                }
            });

            // Process accessories
            if (outfit.accessories && Array.isArray(outfit.accessories)) {
                outfit.accessories.forEach(accessory => {
                    allItems.push(accessory);

                    if (!itemUsage.has(accessory.sku)) {
                        itemUsage.set(accessory.sku, []);
                    }
                    itemUsage.get(accessory.sku).push(dayNum);
                });
            }
        });

        // Calculate metrics
        const totalItems = itemUsage.size;
        const reusedItems = Array.from(itemUsage.values()).filter(days => days.length > 1).length;
        const reusabilityPercentage = totalItems > 0 ? Math.round((reusedItems / totalItems) * 100) : 0;

        // Build reusability map
        const reusabilityMap = {};
        itemUsage.forEach((days, sku) => {
            if (days.length > 1) {
                reusabilityMap[sku] = [...new Set(days)].sort((a, b) => a - b);
            }
        });

        return {
            totalItems,
            reusedItems,
            reusabilityPercentage,
            reusabilityMap
        };
    }

    /**
     * Create fallback outfit data when AI parsing fails
     * Now uses actual CSV data and user context
     */
    createFallbackOutfitData(eventDetails) {
        const { duration, occasion, location, dressCode } = eventDetails;

        // Parse CSV data to get actual items
        const csvItems = this.parseCSVData();

        // Filter items based on dress code and requirements
        const suitableItems = this.filterItemsByRequirements(csvItems, dressCode, eventDetails);

        // Generate outfits using actual CSV data
        const dailyOutfits = [];

        for (let day = 1; day <= duration; day++) {
            const outfit = this.generateSingleOutfit(suitableItems, day, dressCode, eventDetails);

            dailyOutfits.push({
                day: day,
                date: `Day ${day}`,
                occasion: `${occasion} - Day ${day}`,
                outfit: outfit,
                styling: {
                    rationale: `This ${dressCode} outfit is carefully selected for your ${occasion}, combining appropriate formality with comfort and style.`,
                    weatherConsiderations: `Items selected for ${location || 'your location'} with weather-appropriate materials and layering options.`,
                    dresscodeCompliance: `This outfit meets ${dressCode} dress code requirements with appropriate styling and formality level.`
                }
            });
        }

        // Calculate actual reusability
        const reusabilityAnalysis = this.calculateReusabilityAnalysis(dailyOutfits);

        return {
            tripId: `trip-${Date.now()}`,
            sessionId: `session-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            tripDetails: {
                occasion: occasion,
                duration: duration,
                location: location,
                dressCode: dressCode,
                budget: eventDetails.budget || null
            },
            dailyOutfits: dailyOutfits,
            reusabilityAnalysis: reusabilityAnalysis
        };
    }

    /**
     * Parse CSV data into structured items
     */
    parseCSVData() {
        // This would normally come from the CSV loader, but for fallback we'll use known data
        return [
            { sku: "SKU001", name: "Classic White T-Shirt", category: "Topwear", price: 25, colors: "white", weatherSuitability: "warm", formality: "casual", notes: "Essential lightweight cotton tee for everyday wear." },
            { sku: "SKU002", name: "Blue Denim Jeans", category: "Bottomwear", price: 60, colors: "blue", weatherSuitability: "mild", formality: "casual", notes: "Straight-fit jeans suitable for casual and semi-casual settings." },
            { sku: "SKU003", name: "Black Blazer", category: "Outerwear", price: 120, colors: "black", weatherSuitability: "mild", formality: "formal", notes: "Tailored blazer ideal for business or formal occasions." },
            { sku: "SKU006", name: "Chino Pants", category: "Bottomwear", price: 55, colors: "khaki", weatherSuitability: "mild", formality: "smart-casual", notes: "Cotton-blend chinos ideal for office or travel." },
            { sku: "SKU007", name: "Silk Blouse", category: "Topwear", price: 70, colors: "cream", weatherSuitability: "warm", formality: "formal", notes: "Flowy silk blouse for formal dinners or professional wear." },
            { sku: "SKU008", name: "Wool Turtleneck", category: "Topwear", price: 65, colors: "charcoal", weatherSuitability: "cold", formality: "smart-casual", notes: "Classic knit turtleneck perfect for layering in winter." },
            { sku: "SKU011", name: "White Sneakers", category: "Footwear", price: 85, colors: "white", weatherSuitability: "mild", formality: "casual", notes: "Comfortable sneakers that pair with nearly any outfit." },
            { sku: "SKU012", name: "Leather Dress Shoes", category: "Footwear", price: 130, colors: "black", weatherSuitability: "mild", formality: "formal", notes: "Classic lace-up oxfords for professional occasions." },
            { sku: "SKU014", name: "Linen Button-Up Shirt", category: "Topwear", price: 45, colors: "light blue", weatherSuitability: "warm", formality: "smart-casual", notes: "Ideal for vacations or outdoor lunches." },
            { sku: "SKU009", name: "Pleated Midi Skirt", category: "Bottomwear", price: 50, colors: "beige", weatherSuitability: "warm", formality: "smart-casual", notes: "Versatile skirt for brunch, dates, or business-casual outfits." }
        ];
    }

    /**
     * Filter items based on dress code and requirements
     */
    filterItemsByRequirements(items, dressCode, eventDetails) {
        const formalityMap = {
            'casual': ['casual'],
            'smart-casual': ['casual', 'smart-casual'],
            'business': ['smart-casual', 'formal'],
            'formal': ['formal'],
            'black-tie': ['formal']
        };

        const allowedFormalities = formalityMap[dressCode] || ['smart-casual'];

        return {
            topwear: items.filter(item => item.category === 'Topwear' && allowedFormalities.includes(item.formality)),
            bottomwear: items.filter(item => item.category === 'Bottomwear' && allowedFormalities.includes(item.formality)),
            footwear: items.filter(item => item.category === 'Footwear' && allowedFormalities.includes(item.formality)),
            outerwear: items.filter(item => item.category === 'Outerwear' && allowedFormalities.includes(item.formality))
        };
    }

    /**
     * Generate a single outfit from suitable items
     */
    generateSingleOutfit(suitableItems, day, dressCode, eventDetails) {
        // Select items based on day and variety
        const topwear = this.selectItemForDay(suitableItems.topwear, day, dressCode);
        const bottomwear = this.selectItemForDay(suitableItems.bottomwear, day, dressCode);
        const footwear = this.selectItemForDay(suitableItems.footwear, day, dressCode);

        // Add outerwear for formal occasions or first day
        const outerwear = (dressCode === 'formal' || dressCode === 'business' || day === 1)
            ? this.selectItemForDay(suitableItems.outerwear, day, dressCode)
            : null;

        return {
            topwear: topwear,
            bottomwear: bottomwear,
            footwear: footwear,
            outerwear: outerwear,
            accessories: []
        };
    }

    /**
     * Select appropriate item for specific day and dress code
     */
    selectItemForDay(items, day, dressCode) {
        if (!items || items.length === 0) {
            return null;
        }

        // For variety, cycle through available items
        const index = (day - 1) % items.length;

        // Prefer higher formality items for formal dress codes
        if (dressCode === 'formal' || dressCode === 'business') {
            const formalItems = items.filter(item => item.formality === 'formal');
            if (formalItems.length > 0) {
                return formalItems[index % formalItems.length];
            }
        }

        return items[index];
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
