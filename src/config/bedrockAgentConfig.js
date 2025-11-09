/**
 * Bedrock Agent Configuration
 * Defines agent instructions, tool schemas, and deployment settings
 */

export const AGENT_INSTRUCTIONS = `You are an expert fashion stylist and packing consultant specializing in women's outfit planning and travel packing optimization. Your role is to help female users create complete, weather-appropriate outfits for specific occasions and generate optimized packing lists.

## Your Capabilities:
1. **Event Analysis**: Extract key details from user descriptions (occasion, duration, location, dress code, budget)
2. **Weather Integration**: Use weather data to ensure outfit appropriateness
3. **Outfit Curation**: Create complete daily outfits with item reuse optimization, prioritizing items from her existing closet
4. **Packing Optimization**: Generate consolidated packing lists with rationale
5. **Style Guidance**: Provide styling tips and outfit justifications tailored for women

## Core Principles:
- Always prioritize weather appropriateness and dress code compliance
- Maximize item reuse across multiple outfits to minimize packing
- **Prioritize items from the user's existing closet** (marked with "CLOC" SKU prefix) before recommending catalog purchases
- Consider budget constraints and suggest cost-effective alternatives
- Provide clear explanations for outfit choices and packing decisions
- Focus on practical, versatile pieces that work across multiple occasions
- Style recommendations should be appropriate for women's fashion

## Response Format:
When providing outfit recommendations, structure your response as:
1. **Event Summary**: Confirm understanding of the occasion, duration, and constraints
2. **Daily Outfits**: Complete outfit for each day with weather considerations
3. **Packing List**: Consolidated list organized by category with quantities
4. **Styling Tips**: Additional advice for maximizing outfit versatility

## Tool Usage:
- Use weather lookup tools for location-specific forecasts
- Query clothing databases for appropriate items within budget
- Apply style rules and dress code guidelines
- Optimize packing lists for efficiency and completeness

Always ask clarifying questions if essential information is missing, and provide alternatives when constraints cannot be fully met.`;

export const TOOL_SCHEMAS = {
    weatherLookup: {
        name: 'get_weather_forecast',
        description: 'Retrieve weather forecast for a specific location and date range',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'City name or coordinates for weather lookup'
                },
                startDate: {
                    type: 'string',
                    description: 'Start date in YYYY-MM-DD format'
                },
                duration: {
                    type: 'integer',
                    description: 'Number of days for forecast'
                }
            },
            required: ['location', 'startDate', 'duration']
        }
    },

    clothingSearch: {
        name: 'search_clothing_catalog',
        description: 'Search clothing database with filters for category, occasion, weather, and budget',
        parameters: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Clothing category (tops, bottoms, dresses, outerwear, shoes, accessories)'
                },
                occasion: {
                    type: 'string',
                    description: 'Occasion type (business, casual, formal, athletic, etc.)'
                },
                weatherConditions: {
                    type: 'object',
                    properties: {
                        temperature: {
                            type: 'object',
                            properties: {
                                min: { type: 'number' },
                                max: { type: 'number' }
                            }
                        },
                        conditions: {
                            type: 'string',
                            description: 'Weather conditions (sunny, rainy, snowy, etc.)'
                        }
                    }
                },
                budgetRange: {
                    type: 'object',
                    properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                        currency: { type: 'string', default: 'USD' }
                    }
                }
            },
            required: ['category']
        }
    },

    outfitGeneration: {
        name: 'generate_outfit_combinations',
        description: 'Generate complete outfit combinations with item reuse optimization',
        parameters: {
            type: 'object',
            properties: {
                clothingItems: {
                    type: 'array',
                    description: 'Available clothing items from catalog search'
                },
                dailyRequirements: {
                    type: 'array',
                    description: 'Per-day requirements including weather and occasion'
                },
                reusePreference: {
                    type: 'number',
                    description: 'Item reuse optimization weight (0-1)',
                    default: 0.7
                }
            },
            required: ['clothingItems', 'dailyRequirements']
        }
    },

    packingOptimization: {
        name: 'optimize_packing_list',
        description: 'Create optimized packing list from outfit combinations',
        parameters: {
            type: 'object',
            properties: {
                outfits: {
                    type: 'array',
                    description: 'Generated outfit combinations'
                },
                tripDuration: {
                    type: 'integer',
                    description: 'Total trip duration in days'
                },
                luggageConstraints: {
                    type: 'object',
                    properties: {
                        maxWeight: { type: 'number' },
                        maxSize: { type: 'string' },
                        type: { type: 'string', enum: ['carry-on', 'checked', 'backpack'] }
                    }
                }
            },
            required: ['outfits', 'tripDuration']
        }
    }
};

export const AGENT_CONFIG = {
    // Agent basic configuration
    agentName: 'OutfitPlannerAgent',
    description: 'AI-powered outfit planning and packing assistant for events and travel',

    // Model configuration
    foundationModel: 'anthropic.claude-3-haiku-20240307-v1:0',

    // Agent instructions
    instruction: AGENT_INSTRUCTIONS,

    // Session configuration
    idleSessionTTLInSeconds: 3600, // 1 hour

    // Tool configuration
    tools: Object.values(TOOL_SCHEMAS),

    // Knowledge base configuration
    knowledgeBases: [
        {
            knowledgeBaseId: 'R7UWJZQGKs',
            name: 'StylesKnowledgeBase',
            description: 'Comprehensive styles and clothing database with product information, categories, colors, and attributes from styles.csv'
        }
    ]
};

export const IAM_POLICY_TEMPLATE = {
    Version: '2012-10-17',
    Statement: [
        {
            Effect: 'Allow',
            Action: [
                'bedrock:InvokeAgent',
                'bedrock:InvokeModel',
                'bedrock:GetAgent',
                'bedrock:GetAgentAlias'
            ],
            Resource: [
                'arn:aws:bedrock:*:*:agent/*',
                'arn:aws:bedrock:*:*:agent-alias/*',
                'arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-haiku-20240307-v1:0'
            ]
        },
        {
            Effect: 'Allow',
            Action: [
                'bedrock:Retrieve',
                'bedrock:Query'
            ],
            Resource: [
                'arn:aws:bedrock:*:*:knowledge-base/*'
            ]
        }
    ]
};

export const DEPLOYMENT_CONFIG = {
    // Environment-specific settings
    development: {
        agentAliasName: 'development',
        description: 'Development version of the outfit planning agent'
    },

    staging: {
        agentAliasName: 'staging',
        description: 'Staging version for testing outfit planning features'
    },

    production: {
        agentAliasName: 'production',
        description: 'Production version of the outfit planning agent'
    }
};