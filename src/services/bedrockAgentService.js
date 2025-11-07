/**
 * AWS Bedrock Agent Service
 * Handles AI outfit planning requests through Bedrock Agents
 */

import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand
} from '@aws-sdk/client-bedrock-agent-runtime';
import knowledgeBaseService from './knowledgeBaseService';

class BedrockAgentService {
    constructor() {
        // Initialize AWS Bedrock Agent Runtime client
        this.client = new BedrockAgentRuntimeClient({
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
            }
        });

        // Agent configuration
        this.agentId = process.env.REACT_APP_BEDROCK_AGENT_ID;
        this.agentAliasId = process.env.REACT_APP_BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID';

        // Session management
        this.sessionId = null;
        this.sessionAttributes = {};
    }

    /**
     * Initialize a new conversation session
     */
    initializeSession() {
        this.sessionId = `outfit-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.sessionAttributes = {
            conversationType: 'outfit-planning',
            startTime: new Date().toISOString()
        };
        return this.sessionId;
    }

    /**
     * Process outfit planning request through Bedrock Agent
     */
    async processOutfitRequest(userMessage, sessionId = null) {
        try {
            // Use existing session or create new one
            const currentSessionId = sessionId || this.sessionId || this.initializeSession();

            if (!this.agentId) {
                throw new Error('Bedrock Agent ID not configured. Please set REACT_APP_BEDROCK_AGENT_ID environment variable.');
            }

            const command = new InvokeAgentCommand({
                agentId: this.agentId,
                agentAliasId: this.agentAliasId,
                sessionId: currentSessionId,
                inputText: userMessage,
                sessionState: {
                    sessionAttributes: this.sessionAttributes
                }
            });

            const response = await this.client.send(command);

            // Process the streaming response
            const responseText = await this.processAgentResponse(response);

            return {
                success: true,
                data: {
                    response: responseText,
                    sessionId: currentSessionId,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Bedrock Agent service error:', error);

            // Handle specific error cases
            if (error.name === 'ResourceNotFoundException') {
                return {
                    success: false,
                    error: {
                        code: 'AGENT_NOT_FOUND',
                        message: 'The AI outfit assistant is currently unavailable. Please check the configuration.'
                    }
                };
            }

            if (error.name === 'AccessDeniedException') {
                return {
                    success: false,
                    error: {
                        code: 'ACCESS_DENIED',
                        message: 'Access denied to the AI outfit assistant. Please check your permissions.'
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'AGENT_ERROR',
                    message: 'I had trouble processing your outfit request. Please try again.'
                }
            };
        }
    }

    /**
     * Process the streaming response from Bedrock Agent
     */
    async processAgentResponse(response) {
        let responseText = '';

        try {
            // Handle the async iterator for streaming response
            for await (const chunk of response.completion) {
                if (chunk.chunk && chunk.chunk.bytes) {
                    const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
                    responseText += chunkText;
                }
            }
        } catch (error) {
            console.error('Error processing agent response:', error);
            throw new Error('Failed to process agent response');
        }

        return responseText || 'I received your request but had trouble generating a response. Please try again.';
    }

    /**
     * Get current session information
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            sessionAttributes: this.sessionAttributes,
            agentId: this.agentId,
            agentAliasId: this.agentAliasId
        };
    }

    /**
     * End current session
     */
    endSession() {
        this.sessionId = null;
        this.sessionAttributes = {};
    }

    /**
     * Test agent connection and configuration
     */
    async testAgentConnection() {
        try {
            const testMessage = "Hello, I'd like to test the outfit planning assistant.";
            const result = await this.processOutfitRequest(testMessage);

            if (result.success) {
                return {
                    success: true,
                    data: {
                        message: 'Bedrock Agent connection successful',
                        agentId: this.agentId,
                        agentAliasId: this.agentAliasId,
                        response: result.data.response
                    }
                };
            } else {
                return result;
            }

        } catch (error) {
            console.error('Bedrock Agent connection test failed:', error);
            return {
                success: false,
                error: {
                    code: 'CONNECTION_ERROR',
                    message: error.message
                }
            };
        }
    }

    /**
     * Update session attributes (for maintaining context)
     */
    updateSessionAttributes(attributes) {
        this.sessionAttributes = {
            ...this.sessionAttributes,
            ...attributes,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Query knowledge base directly for style information
     */
    async queryStylesKnowledgeBase(query) {
        try {
            const result = await knowledgeBaseService.queryStyles(query);

            if (result.success && result.data.results.length > 0) {
                const formattedResults = knowledgeBaseService.formatResults(result.data.results);
                return {
                    success: true,
                    data: {
                        response: `Based on the styles database:\n\n${formattedResults}`,
                        rawResults: result.data.results,
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                return {
                    success: true,
                    data: {
                        response: "I'm having trouble accessing the styles database right now. This could be because:\n\n1. The knowledge base is still being set up\n2. The data is still being indexed\n3. There might be a configuration issue\n\nIn the meantime, I can help with weather information! Try asking 'What's the weather in [city]?'",
                        timestamp: new Date().toISOString()
                    }
                };
            }
        } catch (error) {
            console.error('Knowledge base query error:', error);

            if (error.message.includes('does not exist')) {
                return {
                    success: true,
                    data: {
                        response: "The styles database isn't accessible right now. This might be because:\n\n1. The knowledge base is still being created\n2. There's a configuration issue with the knowledge base ID\n3. The knowledge base might be in a different AWS region\n\nI can still help with weather information! Try asking about the weather in any city.",
                        timestamp: new Date().toISOString()
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'KB_QUERY_ERROR',
                    message: 'Failed to query the styles database. Please try again.'
                }
            };
        }
    }

    /**
     * Generate outfit recommendations using AI
     * @param {string} prompt - The formatted prompt with context and CSV data
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} AI response with outfit recommendations
     */
    async generateOutfitRecommendations(prompt, sessionId = null) {
        try {
            // Use existing session or create new one
            const currentSessionId = sessionId || this.sessionId || this.initializeSession();

            if (!this.agentId) {
                throw new Error('Bedrock Agent ID not configured. Please set REACT_APP_BEDROCK_AGENT_ID environment variable.');
            }

            // Update session attributes for outfit generation context
            this.updateSessionAttributes({
                requestType: 'outfit-generation',
                timestamp: new Date().toISOString()
            });

            const command = new InvokeAgentCommand({
                agentId: this.agentId,
                agentAliasId: this.agentAliasId,
                sessionId: currentSessionId,
                inputText: prompt,
                sessionState: {
                    sessionAttributes: this.sessionAttributes
                }
            });

            const response = await this.client.send(command);
            const responseText = await this.processAgentResponse(response);

            return {
                success: true,
                data: {
                    response: responseText,
                    sessionId: currentSessionId,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Outfit generation error:', error);

            return {
                success: false,
                error: {
                    code: 'OUTFIT_GENERATION_ERROR',
                    message: 'Failed to generate outfit recommendations. Please try again.',
                    details: error.message
                }
            };
        }
    }

    /**
     * Format outfit generation prompt with context and CSV data
     * @param {Object} contextSummary - Trip context and constraints
     * @param {string} csvData - Raw CSV clothing dataset
     * @param {number} duration - Trip duration in days
     * @returns {string} Formatted prompt for AI
     */
    formatOutfitPrompt(contextSummary, csvData, duration) {
        // Build dynamic context sections
        const weatherSection = this.buildWeatherSection(contextSummary);
        const budgetSection = this.buildBudgetSection(contextSummary);
        const dressCodeSection = this.buildDressCodeSection(contextSummary);
        const reusabilitySection = this.buildReusabilitySection(duration);

        const prompt = `You are an expert outfit planner and stylist specializing in practical, travel-friendly outfit recommendations. I need you to create complete outfit recommendations for a ${duration}-day trip based on the provided context and clothing dataset.

TRIP CONTEXT:
${JSON.stringify(contextSummary, null, 2)}

${weatherSection}

${budgetSection}

${dressCodeSection}

${reusabilitySection}

CLOTHING DATASET (CSV format):
The following CSV contains all available clothing items. Each row represents one item with these columns:
- sku: Unique item identifier
- name: Item name/description
- category: Clothing category (topwear, bottomwear, footwear, accessories, outerwear)
- price: Item price in USD
- colors: Available colors
- weatherSuitability: Weather conditions this item is suitable for
- formality: Formality level (casual, smart-casual, business, formal)
- layering: Layering capability (base, mid, outer)
- tags: Additional descriptive tags
- notes: Special care or styling notes

${csvData}

CORE REQUIREMENTS:
1. Generate complete outfits for each day of the trip
2. Select items ONLY from the provided CSV dataset - match SKUs exactly
3. Prioritize practical, versatile items that maximize reusability
4. Ensure weather appropriateness for all recommendations
5. Comply with dress code requirements for each day/occasion
6. Respect budget constraints when specified
7. Provide clear styling rationale for each outfit choice

OUTFIT COMPOSITION RULES:
- Each outfit MUST include: topwear, bottomwear, footwear
- Include outerwear when weather requires it (cold, rain, wind)
- Add accessories when they enhance the outfit or serve practical purposes
- Consider layering options for variable weather conditions
- Ensure color coordination and style cohesion

RESPONSE FORMAT:
Respond with ONLY a valid JSON object in this exact structure (no additional text):

{
  "tripId": "trip-${Date.now()}",
  "sessionId": "${this.sessionId || 'new-session'}",
  "generatedAt": "${new Date().toISOString()}",
  "tripDetails": {
    "occasion": "extracted from context",
    "duration": ${duration},
    "location": "extracted from context",
    "dressCode": "extracted from context",
    "budget": "extracted from context or null"
  },
  "dailyOutfits": [
    {
      "day": 1,
      "date": "Day 1",
      "occasion": "Day 1 - [specific occasion/activity]",
      "outfit": {
        "topwear": {
          "sku": "exact SKU from CSV",
          "name": "exact name from CSV",
          "category": "from CSV",
          "price": "from CSV as number",
          "colors": "from CSV",
          "weatherSuitability": "from CSV",
          "formality": "from CSV",
          "notes": "from CSV"
        },
        "bottomwear": {
          "sku": "exact SKU from CSV",
          "name": "exact name from CSV",
          "category": "from CSV",
          "price": "from CSV as number",
          "colors": "from CSV",
          "weatherSuitability": "from CSV",
          "formality": "from CSV",
          "notes": "from CSV"
        },
        "outerwear": null,
        "footwear": {
          "sku": "exact SKU from CSV",
          "name": "exact name from CSV",
          "category": "from CSV",
          "price": "from CSV as number",
          "colors": "from CSV",
          "weatherSuitability": "from CSV",
          "formality": "from CSV",
          "notes": "from CSV"
        },
        "accessories": []
      },
      "styling": {
        "rationale": "Detailed explanation of why these items work together, considering style, comfort, and practicality",
        "weatherConsiderations": "How this outfit addresses the weather conditions",
        "dresscodeCompliance": "How this outfit meets the dress code requirements"
      }
    }
  ],
  "reusabilityAnalysis": {
    "totalItems": 0,
    "reusedItems": 0,
    "reusabilityPercentage": 0,
    "reusabilityMap": {
      "item-sku": [1, 3, 5]
    }
  },
  "constraints": {
    "weather": "weather constraints that were applied",
    "budget": "budget constraints that were applied",
    "dressCode": "dress code requirements that were applied"
  }
}

CRITICAL VALIDATION CHECKLIST:
✓ All SKUs match exactly with CSV data
✓ All item attributes copied exactly from CSV
✓ Each day has complete outfit (topwear, bottomwear, footwear minimum)
✓ Weather appropriateness verified for each item
✓ Dress code compliance confirmed for each outfit
✓ Reusability targets met (60%+ for trips >3 days)
✓ JSON structure is valid and complete
✓ No items invented - all from provided CSV dataset`;

        return prompt;
    }

    /**
     * Build weather-specific prompt section
     * @param {Object} contextSummary - Trip context
     * @returns {string} Weather section for prompt
     */
    buildWeatherSection(contextSummary) {
        if (!contextSummary.weather) {
            return 'WEATHER CONSIDERATIONS:\nNo specific weather data provided. Use general seasonal appropriateness.';
        }

        return `WEATHER CONSIDERATIONS:
Weather conditions: ${contextSummary.weather.conditions || 'Variable'}
Temperature range: ${contextSummary.weather.temperature || 'Moderate'}
Precipitation: ${contextSummary.weather.precipitation || 'Possible'}

Weather-based filtering requirements:
- Filter items by weatherSuitability column in CSV
- Prioritize items suitable for the expected conditions
- Include appropriate outerwear for cold/wet weather
- Consider layering options for variable conditions`;
    }

    /**
     * Build budget-specific prompt section
     * @param {Object} contextSummary - Trip context
     * @returns {string} Budget section for prompt
     */
    buildBudgetSection(contextSummary) {
        if (!contextSummary.budget || contextSummary.budget === 'unlimited') {
            return 'BUDGET CONSIDERATIONS:\nNo budget constraints specified. Focus on value and practicality.';
        }

        return `BUDGET CONSIDERATIONS:
Budget constraint: ${contextSummary.budget}
Budget filtering requirements:
- Filter items by price column in CSV
- Prioritize items within the specified budget range
- Balance cost with quality and reusability
- Provide cost-effective outfit combinations`;
    }

    /**
     * Build dress code specific prompt section
     * @param {Object} contextSummary - Trip context
     * @returns {string} Dress code section for prompt
     */
    buildDressCodeSection(contextSummary) {
        const dressCode = contextSummary.dressCode || contextSummary.occasion || 'casual';

        return `DRESS CODE REQUIREMENTS:
Dress code: ${dressCode}
Formality filtering requirements:
- Filter items by formality column in CSV
- Ensure all items meet the required formality level
- Consider occasion-appropriate styling
- Balance formality with comfort for travel`;
    }

    /**
     * Build reusability-specific prompt section
     * @param {number} duration - Trip duration
     * @returns {string} Reusability section for prompt
     */
    buildReusabilitySection(duration) {
        const reusabilityTarget = duration > 3 ? 60 : 40;

        return `REUSABILITY OPTIMIZATION:
Trip duration: ${duration} days
Reusability target: ${reusabilityTarget}% of items should be reused across multiple days

Reusability strategy:
- Prioritize versatile pieces that work in multiple outfits
- Focus on neutral colors and classic styles
- Select items that can be dressed up or down
- Consider mix-and-match potential
- Minimize single-use items unless essential
- Calculate and report actual reusability percentage`;
    }

    /**
     * Parse AI response into structured outfit recommendation
     * @param {string} response - Raw AI response text
     * @returns {Object} Parsed outfit recommendation or error
     */
    parseOutfitResponse(response) {
        try {
            // Clean the response to extract JSON
            let jsonStr = this.extractJsonFromResponse(response);

            // Parse the JSON
            const outfitData = JSON.parse(jsonStr);

            // Validate required structure
            this.validateOutfitStructure(outfitData);

            // Validate outfit components
            this.validateOutfitComponents(outfitData);

            // Extract and validate reusability analysis
            const reusabilityAnalysis = this.extractReusabilityAnalysis(outfitData);
            outfitData.reusabilityAnalysis = reusabilityAnalysis;

            return {
                success: true,
                data: outfitData
            };

        } catch (error) {
            console.error('Failed to parse outfit response:', error);

            // Attempt recovery for common parsing issues
            const recoveryResult = this.attemptResponseRecovery(response, error);
            if (recoveryResult.success) {
                return recoveryResult;
            }

            return {
                success: false,
                error: {
                    code: 'PARSE_ERROR',
                    message: 'Failed to parse AI response into outfit recommendations',
                    details: error.message,
                    rawResponse: response.substring(0, 500) + '...' // Truncate for logging
                }
            };
        }
    }

    /**
     * Extract JSON from AI response, handling various formats
     * @param {string} response - Raw AI response
     * @returns {string} Clean JSON string
     */
    extractJsonFromResponse(response) {
        let jsonStr = response.trim();

        // Remove markdown code blocks
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Remove any leading/trailing text that isn't JSON
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}') + 1;

        if (jsonStart === -1 || jsonEnd === 0) {
            throw new Error('No valid JSON object found in response');
        }

        jsonStr = jsonStr.substring(jsonStart, jsonEnd);

        // Clean up common JSON formatting issues
        jsonStr = jsonStr
            .replace(/,\s*}/g, '}') // Remove trailing commas
            .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
            .replace(/\n\s*\/\*.*?\*\//g, '') // Remove comments
            .replace(/\/\*.*?\*\//g, ''); // Remove inline comments

        return jsonStr;
    }

    /**
     * Validate outfit recommendation structure
     * @param {Object} outfitData - Parsed outfit data
     * @throws {Error} If structure is invalid
     */
    validateOutfitStructure(outfitData) {
        // Check required top-level fields
        const requiredFields = ['tripDetails', 'dailyOutfits', 'reusabilityAnalysis'];
        for (const field of requiredFields) {
            if (!outfitData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate tripDetails
        if (!outfitData.tripDetails.duration || typeof outfitData.tripDetails.duration !== 'number') {
            throw new Error('Invalid or missing trip duration');
        }

        // Validate dailyOutfits array
        if (!Array.isArray(outfitData.dailyOutfits) || outfitData.dailyOutfits.length === 0) {
            throw new Error('dailyOutfits must be a non-empty array');
        }

        // Validate array length matches duration
        if (outfitData.dailyOutfits.length !== outfitData.tripDetails.duration) {
            console.warn(`Outfit count (${outfitData.dailyOutfits.length}) doesn't match duration (${outfitData.tripDetails.duration})`);
        }
    }

    /**
     * Validate individual outfit components
     * @param {Object} outfitData - Parsed outfit data
     * @throws {Error} If outfit components are invalid
     */
    validateOutfitComponents(outfitData) {
        outfitData.dailyOutfits.forEach((dayOutfit, index) => {
            const dayNum = index + 1;

            // Validate day outfit structure
            if (!dayOutfit.outfit) {
                throw new Error(`Day ${dayNum} missing outfit data`);
            }

            if (!dayOutfit.day || dayOutfit.day !== dayNum) {
                dayOutfit.day = dayNum; // Auto-correct day numbering
            }

            // Check required outfit components
            const requiredComponents = ['topwear', 'bottomwear', 'footwear'];
            for (const component of requiredComponents) {
                if (!dayOutfit.outfit[component]) {
                    throw new Error(`Day ${dayNum} missing required component: ${component}`);
                }

                // Validate component structure
                this.validateClothingItem(dayOutfit.outfit[component], component, dayNum);
            }

            // Validate optional components
            if (dayOutfit.outfit.outerwear && dayOutfit.outfit.outerwear !== null) {
                this.validateClothingItem(dayOutfit.outfit.outerwear, 'outerwear', dayNum);
            }

            if (dayOutfit.outfit.accessories && Array.isArray(dayOutfit.outfit.accessories)) {
                dayOutfit.outfit.accessories.forEach((accessory, accIndex) => {
                    this.validateClothingItem(accessory, `accessory ${accIndex + 1}`, dayNum);
                });
            }

            // Validate styling information
            if (!dayOutfit.styling) {
                throw new Error(`Day ${dayNum} missing styling information`);
            }

            const requiredStylingFields = ['rationale', 'weatherConsiderations', 'dresscodeCompliance'];
            for (const field of requiredStylingFields) {
                if (!dayOutfit.styling[field] || typeof dayOutfit.styling[field] !== 'string') {
                    throw new Error(`Day ${dayNum} missing or invalid styling.${field}`);
                }
            }
        });
    }

    /**
     * Validate individual clothing item structure
     * @param {Object} item - Clothing item
     * @param {string} component - Component type
     * @param {number} dayNum - Day number for error reporting
     * @throws {Error} If item structure is invalid
     */
    validateClothingItem(item, component, dayNum) {
        const requiredFields = ['sku', 'name', 'category', 'price'];

        for (const field of requiredFields) {
            if (!item[field]) {
                throw new Error(`Day ${dayNum} ${component} missing required field: ${field}`);
            }
        }

        // Validate price is a number
        if (typeof item.price !== 'number' && !isNaN(parseFloat(item.price))) {
            item.price = parseFloat(item.price); // Auto-convert string prices
        }

        if (typeof item.price !== 'number' || item.price < 0) {
            throw new Error(`Day ${dayNum} ${component} has invalid price: ${item.price}`);
        }

        // Validate SKU format (basic check)
        if (typeof item.sku !== 'string' || item.sku.length === 0) {
            throw new Error(`Day ${dayNum} ${component} has invalid SKU: ${item.sku}`);
        }
    }

    /**
     * Extract and validate reusability analysis
     * @param {Object} outfitData - Parsed outfit data
     * @returns {Object} Validated reusability analysis
     */
    extractReusabilityAnalysis(outfitData) {
        const analysis = outfitData.reusabilityAnalysis || {};

        // Calculate actual reusability from outfits
        const itemUsage = new Map();
        const allItems = [];

        // Count item usage across all days
        outfitData.dailyOutfits.forEach((dayOutfit, dayIndex) => {
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

        // Calculate reusability metrics
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
     * Attempt to recover from parsing errors
     * @param {string} response - Original response
     * @param {Error} error - Original parsing error
     * @returns {Object} Recovery result
     */
    attemptResponseRecovery(response, error) {
        try {
            // Try to find and fix common JSON issues
            let recoveredJson = response;

            // Fix common issues
            recoveredJson = recoveredJson
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
                .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
                .replace(/\n/g, ' ') // Remove newlines
                .replace(/\s+/g, ' '); // Normalize whitespace

            // Try to extract and parse again
            const jsonStr = this.extractJsonFromResponse(recoveredJson);
            const outfitData = JSON.parse(jsonStr);

            // Basic validation only for recovery
            if (outfitData.dailyOutfits && Array.isArray(outfitData.dailyOutfits)) {
                return {
                    success: true,
                    data: outfitData,
                    recovered: true
                };
            }

        } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError);
        }

        return { success: false };
    }

    /**
     * Get agent configuration status
     */
    getConfigurationStatus() {
        const kbStatus = knowledgeBaseService.getConfigurationStatus();

        return {
            agentConfigured: !!this.agentId,
            agentId: this.agentId,
            agentAliasId: this.agentAliasId,
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            credentialsConfigured: !!(process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY),
            knowledgeBase: kbStatus
        };
    }
}

const bedrockAgentService = new BedrockAgentService();
export default bedrockAgentService;