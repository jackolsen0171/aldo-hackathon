/**
 * Frontend AWS Bedrock Service
 * Handles AI requests directly from the browser
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import weatherService from './weatherService';
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
     * Pipeline-specific method for structured event detail extraction
     * @param {string} userMessage - User's natural language input
     * @returns {Promise<Object>} Structured extraction result
     */
    async extractEventDetailsForPipeline(userMessage) {
        try {
            console.log('Starting AI extraction for:', userMessage);

            // Simplified prompt that focuses on getting clean JSON
            const extractionPrompt = `Extract event details from this user input and respond with ONLY valid JSON:

User input: "${userMessage}"

Respond with this exact JSON structure (no additional text):
{
  "success": true,
  "data": {
    "occasion": "specific event type (e.g., business conference, wedding, vacation)",
    "location": "city/location or null",
    "startDate": "YYYY-MM-DD or null",
    "duration": 1,
    "dressCode": "casual, smart-casual, business, formal, or black-tie",
    "budget": null,
    "specialRequirements": [],
    "needsClarification": [],
    "confidence": 0.8
  }
}

Rules:
- Festival/music event → casual dress code
- Business/conference → smart-casual dress code  
- Wedding/formal event → formal dress code
- Interview → business dress code
- If location unclear, add "location" to needsClarification
- If date unclear, add "start date" to needsClarification
- Extract duration from phrases like "3 day" or "5 days"`;

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
                modelId: this.modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestPayload)
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const aiResponse = responseBody.output?.message?.content?.[0]?.text || '{}';

            console.log('Raw AI response:', aiResponse);

            // Try to parse the JSON directly
            try {
                const parsedData = JSON.parse(aiResponse.trim());
                console.log('Parsed AI data:', parsedData);

                if (parsedData.success && parsedData.data) {
                    return parsedData;
                }
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
            }

            // If AI parsing fails, use fallback
            console.log('AI extraction failed, using fallback');
            return this.fallbackEventExtraction(userMessage);

        } catch (error) {
            console.error('Pipeline event extraction error:', error);
            return this.fallbackEventExtraction(userMessage);
        }
    }

    /**
     * Pipeline-specific method for context-aware outfit generation
     * @param {Object} eventDetails - Confirmed event details
     * @param {Object} contextData - Weather and additional context
     * @returns {Promise<Object>} Outfit generation result
     */
    async generateOutfitsForPipeline(eventDetails, contextData) {
        try {
            const generationPrompt = this.buildPipelineGenerationPrompt(eventDetails, contextData);

            const requestPayload = {
                messages: [{
                    role: 'user',
                    content: [{ text: generationPrompt }]
                }],
                inferenceConfig: {
                    temperature: 0.3,
                    maxTokens: 1500
                }
            };

            const command = new InvokeModelCommand({
                modelId: this.modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestPayload)
            });

            const response = await this.client.send(command);
            return this.parseStructuredResponse(response, 'outfit_generation');

        } catch (error) {
            console.error('Pipeline outfit generation error:', error);
            return {
                success: false,
                error: {
                    code: 'GENERATION_ERROR',
                    message: 'I had trouble generating outfit recommendations. Please try again.'
                }
            };
        }
    }

    /**
     * Determine if user message is about outfit planning
     */
    isOutfitPlanningRequest(userMessage) {
        const outfitKeywords = [
            'outfit', 'clothes', 'clothing', 'wear', 'dress', 'attire',
            'conference', 'meeting', 'wedding', 'interview', 'trip', 'vacation',
            'event', 'occasion', 'formal', 'casual', 'business', 'pack', 'packing'
        ];

        const lowerMessage = userMessage.toLowerCase();
        return outfitKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Process general conversation request with AI
     */
    async processGeneralRequest(userMessage) {
        try {
            const conversationPrompt = `You are an AI Outfit Assistant specializing in fashion, style, and outfit planning. You can help with:

1. Outfit planning for events, trips, and occasions
2. Weather-appropriate clothing recommendations  
3. Style advice and fashion tips
4. Packing lists and travel wardrobe optimization
5. General fashion and clothing questions

User message: "${userMessage}"

Respond naturally and helpfully. If it's about outfits or fashion, provide detailed advice. If it's a general request like writing a haiku, fulfill that request. Always be friendly and conversational.`;

            const requestPayload = {
                messages: [
                    {
                        role: 'user',
                        content: [{ text: conversationPrompt }]
                    }
                ],
                inferenceConfig: {
                    temperature: this.modelConfig.temperature,
                    maxTokens: this.modelConfig.maxTokens,
                    topP: this.modelConfig.topP
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

            const aiResponse = responseBody.output?.message?.content?.[0]?.text ||
                'I received your message but had trouble generating a response. Please try again.';

            return {
                success: true,
                data: {
                    response: aiResponse,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Bedrock general request error:', error);
            return {
                success: false,
                error: {
                    code: 'BEDROCK_ERROR',
                    message: 'I had trouble processing your request. Please try again.'
                }
            };
        }
    }

    /**
     * Process weather request with AI
     */
    async processWeatherRequest(userMessage) {
        try {
            // Extract location and date from the message using simple AI call first
            const extractionResult = await this.extractLocationAndDate(userMessage);

            if (!extractionResult.location) {
                return {
                    success: true,
                    data: {
                        response: "I'd be happy to help you with weather information! Could you please specify a location? For example, 'What's the weather in New York?' or 'How's the weather in London tomorrow?'",
                        timestamp: new Date().toISOString()
                    }
                };
            }

            // Get weather data
            const weatherData = await weatherService.getWeatherForLocationAndDate(
                extractionResult.location,
                extractionResult.date
            );

            // Generate AI response with weather data
            const aiResponse = await this.generateWeatherResponse(userMessage, weatherData);

            return {
                success: true,
                data: {
                    response: aiResponse,
                    weatherData: weatherData,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Bedrock service error:', error);

            if (error.message.includes('Location') && error.message.includes('not found')) {
                return {
                    success: true,
                    data: {
                        response: `I couldn't find that location. Could you please check the spelling or try a different location name?`,
                        timestamp: new Date().toISOString()
                    }
                };
            }

            if (error.message.includes('forecast is only available')) {
                return {
                    success: true,
                    data: {
                        response: `I can only provide weather forecasts for the next 5 days. For longer-term forecasts, you might want to check a dedicated weather service.`,
                        timestamp: new Date().toISOString()
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'BEDROCK_ERROR',
                    message: 'I had trouble processing your weather request. Please try again.'
                }
            };
        }
    }

    /**
     * Extract location and date from user message
     */
    async extractLocationAndDate(userMessage) {
        try {
            const extractionPrompt = `Extract the location and date from this weather request. If no date is specified, use today's date.

User message: "${userMessage}"

Respond with JSON in this exact format:
{
  "location": "city name or location",
  "date": "YYYY-MM-DD"
}

Examples:
- "What's the weather in Paris?" -> {"location": "Paris", "date": "${new Date().toISOString().split('T')[0]}"}
- "How's the weather in New York tomorrow?" -> {"location": "New York", "date": "${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}"}
- "Weather in London next Monday" -> {"location": "London", "date": "${this.getNextMonday()}"}

Only respond with the JSON, nothing else.`;

            const requestPayload = {
                messages: [
                    {
                        role: 'user',
                        content: [{ text: extractionPrompt }]
                    }
                ],
                inferenceConfig: {
                    temperature: 0.1,
                    maxTokens: 200
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

            try {
                const extracted = JSON.parse(aiResponse.trim());
                return {
                    location: extracted.location || null,
                    date: extracted.date || new Date().toISOString().split('T')[0]
                };
            } catch (parseError) {
                // Fallback: try to extract location manually
                const locationMatch = userMessage.match(/(?:in|for|at)\s+([A-Za-z\s,]+?)(?:\s|$|tomorrow|today|yesterday)/i);
                return {
                    location: locationMatch ? locationMatch[1].trim() : null,
                    date: new Date().toISOString().split('T')[0]
                };
            }

        } catch (error) {
            console.error('Location extraction error:', error);
            // Fallback extraction
            const locationMatch = userMessage.match(/(?:in|for|at)\s+([A-Za-z\s,]+?)(?:\s|$|tomorrow|today|yesterday)/i);
            return {
                location: locationMatch ? locationMatch[1].trim() : null,
                date: new Date().toISOString().split('T')[0]
            };
        }
    }

    /**
     * Generate AI response with weather data
     */
    async generateWeatherResponse(userMessage, weatherData) {
        try {
            const weatherDescription = this.formatWeatherForAI(weatherData);

            const responsePrompt = `You are a helpful weather assistant. The user asked: "${userMessage}"

Here's the current weather data:
${weatherDescription}

Provide a natural, conversational response about the weather. Be friendly and informative. Include the key details like temperature, conditions, and any relevant advice.`;

            const requestPayload = {
                messages: [
                    {
                        role: 'user',
                        content: [{ text: responsePrompt }]
                    }
                ],
                inferenceConfig: {
                    temperature: this.modelConfig.temperature,
                    maxTokens: this.modelConfig.maxTokens,
                    topP: this.modelConfig.topP
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

            return responseBody.output?.message?.content?.[0]?.text ||
                'I got the weather data but had trouble formatting the response. Please try again.';

        } catch (error) {
            console.error('AI response generation error:', error);
            // Fallback to simple weather description
            return this.generateSimpleWeatherResponse(weatherData);
        }
    }

    /**
     * Format weather data for AI
     */
    formatWeatherForAI(weatherData) {
        const location = `${weatherData.location.name}${weatherData.location.state ? ', ' + weatherData.location.state : ''}, ${weatherData.location.country}`;
        const temp = weatherData.weather.temperature;
        const conditions = weatherData.weather.conditions;

        return `Location: ${location}
Date: ${weatherData.date}
Temperature: ${temp.current}°C (feels like ${temp.feels_like}°C)
Range: ${temp.min}°C to ${temp.max}°C
Conditions: ${conditions.description}
Humidity: ${weatherData.weather.humidity}%
Wind: ${weatherData.weather.wind.speed} m/s
${weatherData.weather.visibility ? `Visibility: ${weatherData.weather.visibility} km` : ''}
Source: ${weatherData.source}`;
    }

    /**
     * Generate simple weather response (fallback)
     */
    generateSimpleWeatherResponse(weatherData) {
        const location = `${weatherData.location.name}${weatherData.location.state ? ', ' + weatherData.location.state : ''}, ${weatherData.location.country}`;
        const temp = weatherData.weather.temperature;
        const conditions = weatherData.weather.conditions;

        return `Here's the weather for ${location}:

🌡️ **Temperature**: ${temp.current}°C (feels like ${temp.feels_like}°C)
📊 **Range**: ${temp.min}°C to ${temp.max}°C  
☁️ **Conditions**: ${conditions.description}
💧 **Humidity**: ${weatherData.weather.humidity}%
🌬️ **Wind**: ${weatherData.weather.wind.speed} m/s

Have a great day!`;
    }

    /**
     * Get next Monday date
     */
    getNextMonday() {
        const today = new Date();
        const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7;
        const nextMonday = new Date(today.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
        return nextMonday.toISOString().split('T')[0];
    }

    /**
     * Parse relative dates to ISO format
     */
    parseRelativeDate(dateString) {
        const today = new Date();
        const lowerDate = dateString.toLowerCase();

        if (lowerDate.includes('tomorrow')) {
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            return tomorrow.toISOString().split('T')[0];
        }

        if (lowerDate.includes('next week')) {
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            return nextWeek.toISOString().split('T')[0];
        }

        if (lowerDate.includes('this weekend') || lowerDate.includes('saturday')) {
            const daysUntilSaturday = (6 - today.getDay()) % 7;
            const saturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
            return saturday.toISOString().split('T')[0];
        }

        if (lowerDate.includes('sunday')) {
            const daysUntilSunday = (7 - today.getDay()) % 7;
            const sunday = new Date(today.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
            return sunday.toISOString().split('T')[0];
        }

        // Return null if can't parse
        return null;
    }

    /**
     * Process outfit planning request - extracts structured data from user input
     */
    async processOutfitPlanningRequest(userMessage) {
        try {
            // Use AI-powered extraction with structured JSON response
            const extractionResult = await this.extractEventDetailsForPipeline(userMessage);

            if (!extractionResult.success) {
                return {
                    success: false,
                    error: {
                        code: 'EXTRACTION_ERROR',
                        message: extractionResult.error?.message || 'I had trouble understanding your event details. Please try describing your occasion again.'
                    }
                };
            }

            // The AI extraction returns the data in a different format, so we need to adapt it
            const eventData = extractionResult.data || extractionResult;

            // Step 2: Get weather data if location is provided
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
                    // Continue without weather data
                }
            }

            // Step 3: Return structured event context with extraction metadata
            const structuredData = {
                ...eventData,
                weather: weatherData,
                extractedAt: new Date().toISOString(),
                extractionMethod: 'ai_extraction',
                extractionConfidence: eventData.confidence || 0.8
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
     * Extract structured event parameters from unstructured user input
     */
    async extractEventParameters(userMessage) {
        try {
            const extractionPrompt = `You are an expert event planner. Extract structured information from this user's event description.

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
- "tomorrow" → tomorrow's date
- "next week" → 7 days from today
- "this weekend" → next Saturday
- If no date given, set to null

Examples:
Input: "3-day conference in NYC next week, need professional outfits"
Output: {"occasion": "business conference", "location": "NYC", "startDate": "2024-11-13", "duration": 3, "dressCode": "smart-casual", "budget": null, "specialRequirements": ["professional outfits"], "needsClarification": []}

Input: "wedding this Saturday, formal dress required"
Output: {"occasion": "wedding", "location": null, "startDate": "2024-11-09", "duration": 1, "dressCode": "formal", "budget": null, "specialRequirements": ["formal dress required"], "needsClarification": ["location"]}

Only respond with the JSON, nothing else.`;

            const requestPayload = {
                messages: [
                    {
                        role: 'user',
                        content: [{ text: extractionPrompt }]
                    }
                ],
                inferenceConfig: {
                    temperature: 0.1,
                    maxTokens: 500
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

            console.log('Raw AI response for event extraction:', aiResponse);

            try {
                const extracted = JSON.parse(aiResponse.trim());

                // Validate and set defaults
                const eventData = {
                    occasion: extracted.occasion || 'general event',
                    location: extracted.location || null,
                    startDate: extracted.startDate || null,
                    duration: extracted.duration || 1,
                    dressCode: extracted.dressCode || 'smart-casual',
                    budget: extracted.budget || null,
                    specialRequirements: extracted.specialRequirements || [],
                    needsClarification: extracted.needsClarification || []
                };

                return {
                    success: true,
                    data: eventData
                };

            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                console.error('Failed to parse AI response:', aiResponse);

                // Try to extract basic information manually as fallback
                const fallbackData = this.extractBasicEventInfo(userMessage);

                return {
                    success: true,
                    data: fallbackData
                };
            }

        } catch (error) {
            console.error('Event parameter extraction error:', error);
            return {
                success: false,
                error: {
                    code: 'EXTRACTION_ERROR',
                    message: 'I had trouble processing your event description. Please try again.'
                }
            };
        }
    }

    /**
     * Fallback method to extract basic event information manually
     */
    extractBasicEventInfo(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        // Extract duration
        const durationMatch = lowerMessage.match(/(\d+)[-\s]?day/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : 1;

        // Extract location
        const locationMatch = lowerMessage.match(/in\s+([a-zA-Z\s]+?)(?:\s|$|,)/);
        const location = locationMatch ? locationMatch[1].trim() : null;

        // Infer occasion type
        let occasion = 'general event';
        let dressCode = 'smart-casual';

        if (lowerMessage.includes('business') || lowerMessage.includes('work') || lowerMessage.includes('conference')) {
            occasion = 'business trip';
            dressCode = 'business';
        } else if (lowerMessage.includes('wedding')) {
            occasion = 'wedding';
            dressCode = 'formal';
        } else if (lowerMessage.includes('vacation') || lowerMessage.includes('holiday')) {
            occasion = 'vacation';
            dressCode = 'casual';
        } else if (lowerMessage.includes('interview')) {
            occasion = 'job interview';
            dressCode = 'business';
        }

        return {
            occasion,
            location,
            startDate: null,
            duration,
            dressCode,
            budget: null,
            specialRequirements: [],
            needsClarification: ['start date']
        };
    }

    /**
     * Generate a summary of the extracted event context
     */
    generateEventSummary(eventContext) {
        const { occasion, location, startDate, duration, dressCode, weather, needsClarification } = eventContext;

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

        if (weather) {
            const temp = weather.weather.temperature;
            summary += ` The weather will be ${weather.weather.conditions.description} with temperatures around ${temp.current}°C.`;
        }

        if (needsClarification.length > 0) {
            summary += `\n\nTo provide better recommendations, could you clarify: ${needsClarification.join(', ')}?`;
        } else {
            summary += `\n\nI have all the information needed to create your outfit recommendations!`;
        }

        return summary;
    }

    /**
     * Build pipeline-specific extraction prompt
     * @param {string} userMessage - User input
     * @returns {string} Formatted extraction prompt
     */
    buildPipelineExtractionPrompt(userMessage) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        return `You are an expert event planner for an AI outfit assistant. Extract structured information from the user's event description with high accuracy.

User input: "${userMessage}"

Extract information and respond with JSON in this EXACT format:
{
  "success": true,
  "data": {
    "occasion": "string - specific event type",
    "location": "string - city/location or null",
    "startDate": "YYYY-MM-DD - start date or null",
    "duration": "number - duration in days (default 1)",
    "dressCode": "string - one of: casual, smart-casual, business, formal, black-tie",
    "budget": "number - budget amount or null",
    "specialRequirements": ["array of strings - special needs"],
    "needsClarification": ["array of strings - missing information"],
    "confidence": "number - confidence score 0.0-1.0"
  }
}

DRESS CODE MAPPING:
- Job interview, business meeting, corporate event → "business"
- Wedding, gala, formal dinner, awards ceremony → "formal"
- Conference, work event, networking → "smart-casual"
- Vacation, weekend trip, casual outing → "casual"
- Black-tie event, evening gala → "black-tie"

DATE PARSING:
- "tomorrow" → "${tomorrow}"
- "next week" → "${nextWeek}"
- "this weekend" → "${this.getNextWeekend()}"
- "today" → "${today}"

CONFIDENCE SCORING:
- 0.9-1.0: All key details clear and specific
- 0.7-0.8: Most details clear, minor ambiguity
- 0.5-0.6: Some details unclear or missing
- 0.3-0.4: Major details missing or ambiguous
- 0.1-0.2: Very unclear input

EXAMPLES:
Input: "3-day business conference in NYC next week"
Output: {"success": true, "data": {"occasion": "business conference", "location": "NYC", "startDate": "${nextWeek}", "duration": 3, "dressCode": "smart-casual", "budget": null, "specialRequirements": [], "needsClarification": [], "confidence": 0.9}}

Input: "wedding this Saturday"
Output: {"success": true, "data": {"occasion": "wedding", "location": null, "startDate": "${this.getNextWeekend()}", "duration": 1, "dressCode": "formal", "budget": null, "specialRequirements": [], "needsClarification": ["location", "dress code specifics"], "confidence": 0.7}}

Respond ONLY with the JSON, no additional text.`;
    }

    /**
     * Build pipeline-specific outfit generation prompt
     * @param {Object} eventDetails - Confirmed event details
     * @param {Object} contextData - Weather and context information
     * @returns {string} Formatted generation prompt
     */
    buildPipelineGenerationPrompt(eventDetails, contextData) {
        const weatherInfo = contextData?.weather ?
            `Weather: ${contextData.weather.conditions.description}, ${contextData.weather.temperature.current}°C (${contextData.weather.temperature.min}°C-${contextData.weather.temperature.max}°C)` :
            'Weather: Not available';

        return `You are an expert fashion stylist creating outfit recommendations for a specific event.

EVENT DETAILS:
- Occasion: ${eventDetails.occasion}
- Location: ${eventDetails.location || 'Not specified'}
- Date: ${eventDetails.startDate || 'Not specified'}
- Duration: ${eventDetails.duration} day(s)
- Dress Code: ${eventDetails.dressCode}
- Budget: ${eventDetails.budget ? '$' + eventDetails.budget : 'Not specified'}
- Special Requirements: ${eventDetails.specialRequirements?.join(', ') || 'None'}

CONTEXT:
- ${weatherInfo}

Create ${eventDetails.duration} outfit recommendation(s) and respond with JSON in this EXACT format:
{
  "success": true,
  "data": {
    "outfits": [
      {
        "day": 1,
        "occasion": "string - specific occasion for this day",
        "items": {
          "top": "string - specific top recommendation",
          "bottom": "string - specific bottom recommendation",
          "outerwear": "string - jacket/coat recommendation or null",
          "shoes": "string - specific shoe recommendation",
          "accessories": ["array of accessory recommendations"]
        },
        "explanation": "string - why this outfit works for the occasion and weather",
        "weatherConsiderations": ["array of weather-specific advice"],
        "packingPriority": "essential|recommended|optional"
      }
    ],
    "packingList": {
      "essential": ["array of must-have items"],
      "recommended": ["array of nice-to-have items"],
      "optional": ["array of optional items"]
    },
    "tips": ["array of general styling and packing tips"],
    "itemReuse": {
      "sharedItems": ["items that can be worn multiple days"],
      "uniqueItems": ["items specific to certain days"]
    }
  }
}

GUIDELINES:
- Consider weather conditions for all recommendations
- Ensure dress code compliance
- Optimize for item reuse across multiple days
- Provide practical, specific item recommendations
- Include weather-appropriate layering options
- Consider the event's formality and cultural context

Respond ONLY with the JSON, no additional text.`;
    }

    /**
     * Parse structured JSON response from AI with error handling
     * @param {Object} response - Raw AI response
     * @param {string} responseType - Type of response (event_extraction, outfit_generation)
     * @returns {Object} Parsed response with error handling
     */
    parseStructuredResponse(response, responseType) {
        try {
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const aiResponse = responseBody.output?.message?.content?.[0]?.text || '{}';

            console.log(`Raw AI response for ${responseType}:`, aiResponse);

            // Clean and parse JSON
            const cleanedResponse = this.cleanJsonResponse(aiResponse);
            const parsedData = JSON.parse(cleanedResponse);

            // Validate response structure
            if (!this.validateResponseStructure(parsedData, responseType)) {
                throw new Error(`Invalid response structure for ${responseType}`);
            }

            return parsedData;

        } catch (error) {
            console.error(`Failed to parse ${responseType} response:`, error);
            return {
                success: false,
                error: {
                    code: 'PARSE_ERROR',
                    message: `Failed to parse AI response for ${responseType}`,
                    details: error.message
                }
            };
        }
    }

    /**
     * Clean JSON response by removing markdown formatting and extra text
     * @param {string} rawResponse - Raw AI response
     * @returns {string} Cleaned JSON string
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
     * Validate response structure based on type
     * @param {Object} parsedData - Parsed JSON data
     * @param {string} responseType - Type of response
     * @returns {boolean} Whether structure is valid
     */
    validateResponseStructure(parsedData, responseType) {
        if (!parsedData || typeof parsedData !== 'object') {
            return false;
        }

        switch (responseType) {
            case 'event_extraction':
                return parsedData.success !== undefined &&
                    parsedData.data &&
                    typeof parsedData.data.occasion === 'string';

            case 'outfit_generation':
                return parsedData.success !== undefined &&
                    parsedData.data &&
                    Array.isArray(parsedData.data.outfits);

            default:
                return false;
        }
    }

    /**
     * Development mode event extraction (simple pattern matching)
     * @param {string} userMessage - User input
     * @returns {Object} Development extraction result
     */
    developmentEventExtraction(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        console.log('Development extraction for:', userMessage);

        // Extract duration
        const durationMatch = lowerMessage.match(/(\d+)[-\s]?day/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : 1;

        // Better location extraction patterns
        let location = null;
        const locationPatterns = [
            /in\s+(new\s+york|nyc|ny)(?:\s|$)/i,
            /in\s+(los\s+angeles|la)(?:\s|$)/i,
            /in\s+(san\s+francisco|sf)(?:\s|$)/i,
            /in\s+(las\s+vegas)(?:\s|$)/i,
            /in\s+(new\s+orleans)(?:\s|$)/i,
            /in\s+([a-zA-Z\s]+?)(?:\s|$)/i
        ];

        for (const pattern of locationPatterns) {
            const match = userMessage.match(pattern);
            if (match) {
                location = match[1].trim();
                // Fix common abbreviations
                if (location.toLowerCase().includes('new york') || location.toLowerCase() === 'nyc' || location.toLowerCase() === 'ny') {
                    location = 'New York';
                } else if (location.toLowerCase().includes('los angeles') || location.toLowerCase() === 'la') {
                    location = 'Los Angeles';
                } else if (location.toLowerCase().includes('san francisco') || location.toLowerCase() === 'sf') {
                    location = 'San Francisco';
                }
                break;
            }
        }

        // Infer occasion and dress code
        let occasion = 'general event';
        let dressCode = 'smart-casual';

        if (lowerMessage.includes('business') || lowerMessage.includes('conference')) {
            occasion = 'business conference';
            dressCode = 'smart-casual';
        } else if (lowerMessage.includes('wedding')) {
            occasion = 'wedding';
            dressCode = 'formal';
        } else if (lowerMessage.includes('interview')) {
            occasion = 'job interview';
            dressCode = 'business';
        } else if (lowerMessage.includes('vacation') || lowerMessage.includes('trip')) {
            occasion = 'vacation';
            dressCode = 'casual';
        }

        // Extract budget
        const budgetMatch = lowerMessage.match(/\$(\d+)|budget.*?(\d+)|(\d+).*?budget/i);
        const budget = budgetMatch ? parseInt(budgetMatch[1] || budgetMatch[2] || budgetMatch[3]) : null;

        // Extract date information
        let startDate = null;
        if (lowerMessage.includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            startDate = tomorrow.toISOString().split('T')[0];
        } else if (lowerMessage.includes('next week')) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            startDate = nextWeek.toISOString().split('T')[0];
        }

        const result = {
            occasion,
            location,
            startDate,
            duration,
            dressCode,
            budget,
            specialRequirements: [],
            needsClarification: [],
            extractedAt: new Date().toISOString(),
            extractionMethod: 'development_fallback'
        };

        // Add clarification needs
        if (!location) result.needsClarification.push('location');
        if (!startDate) result.needsClarification.push('start date');

        console.log('Development extraction result:', result);
        return result;
    }

    /**
     * Fallback event extraction when AI parsing fails
     * @param {string} userMessage - User input
     * @returns {Object} Basic extraction result
     */
    fallbackEventExtraction(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        // Basic pattern matching
        let occasion = 'general event';
        let dressCode = 'smart-casual';

        if (lowerMessage.includes('business') || lowerMessage.includes('work') || lowerMessage.includes('conference')) {
            occasion = 'business event';
            dressCode = 'business';
        } else if (lowerMessage.includes('wedding')) {
            occasion = 'wedding';
            dressCode = 'formal';
        } else if (lowerMessage.includes('vacation') || lowerMessage.includes('trip')) {
            occasion = 'vacation';
            dressCode = 'casual';
        } else if (lowerMessage.includes('interview')) {
            occasion = 'job interview';
            dressCode = 'business';
        }

        // Extract duration
        const durationMatch = lowerMessage.match(/(\d+)[-\s]?day/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : 1;

        // Extract location
        const locationMatch = lowerMessage.match(/in\s+([a-zA-Z\s,]+?)(?:\s|$|,)/);
        const location = locationMatch ? locationMatch[1].trim() : null;

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
                needsClarification: ['start date', 'specific requirements'],
                confidence: 0.4
            },
            extractionMethod: 'fallback'
        };
    }

    /**
     * Test connection
     */
    async testConnection() {

        try {
            const requestPayload = {
                messages: [
                    {
                        role: 'user',
                        content: [{ text: 'Hello, can you help me with weather information?' }]
                    }
                ],
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

const bedrockService = new BedrockService();
export default bedrockService;