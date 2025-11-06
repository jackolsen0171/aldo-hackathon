/**
 * Knowledge Base Service
 * Handles queries to the Bedrock Knowledge Base containing styles data
 */

import {
    BedrockAgentRuntimeClient,
    RetrieveCommand
} from '@aws-sdk/client-bedrock-agent-runtime';

class KnowledgeBaseService {
    constructor() {
        // Initialize AWS Bedrock Agent Runtime client
        this.client = new BedrockAgentRuntimeClient({
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
            }
        });

        this.knowledgeBaseId = process.env.REACT_APP_KNOWLEDGE_BASE_ID;
    }

    /**
     * Query the knowledge base for clothing/style information
     */
    async queryStyles(query, filters = {}) {
        try {
            if (!this.knowledgeBaseId) {
                throw new Error('Knowledge Base ID not configured. Please set REACT_APP_KNOWLEDGE_BASE_ID environment variable.');
            }

            const command = new RetrieveCommand({
                knowledgeBaseId: this.knowledgeBaseId,
                retrievalQuery: {
                    text: query
                },
                retrievalConfiguration: {
                    vectorSearchConfiguration: {
                        numberOfResults: 10,
                        overrideSearchType: 'HYBRID' // Use both semantic and keyword search
                    }
                }
            });

            const response = await this.client.send(command);

            return {
                success: true,
                data: {
                    results: response.retrievalResults || [],
                    query: query,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Knowledge Base service error:', error);

            // Handle specific error cases
            if (error.name === 'ResourceNotFoundException') {
                return {
                    success: false,
                    error: {
                        code: 'KB_NOT_FOUND',
                        message: 'Knowledge base not found. Please check the configuration.'
                    }
                };
            }

            if (error.name === 'AccessDeniedException') {
                return {
                    success: false,
                    error: {
                        code: 'ACCESS_DENIED',
                        message: 'Access denied to knowledge base. Please check your permissions.'
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'KB_ERROR',
                    message: 'Failed to query knowledge base. Please try again.'
                }
            };
        }
    }

    /**
     * Search for clothing items by category
     */
    async searchByCategory(category, occasion = null, weather = null) {
        let query = `Find ${category} items`;

        if (occasion) {
            query += ` suitable for ${occasion}`;
        }

        if (weather) {
            query += ` appropriate for ${weather} weather`;
        }

        return await this.queryStyles(query);
    }

    /**
     * Search for outfit combinations
     */
    async searchOutfitCombinations(occasion, weather = null, style = null) {
        let query = `Outfit combinations for ${occasion}`;

        if (weather) {
            query += ` in ${weather} weather`;
        }

        if (style) {
            query += ` with ${style} style`;
        }

        return await this.queryStyles(query);
    }

    /**
     * Search for items by color
     */
    async searchByColor(color, category = null) {
        let query = `${color} colored items`;

        if (category) {
            query += ` in ${category} category`;
        }

        return await this.queryStyles(query);
    }

    /**
     * Search for items by brand or price range
     */
    async searchByBrandOrPrice(brand = null, minPrice = null, maxPrice = null) {
        let query = 'Find items';

        if (brand) {
            query += ` from ${brand}`;
        }

        if (minPrice && maxPrice) {
            query += ` priced between $${minPrice} and $${maxPrice}`;
        } else if (minPrice) {
            query += ` priced above $${minPrice}`;
        } else if (maxPrice) {
            query += ` priced under $${maxPrice}`;
        }

        return await this.queryStyles(query);
    }

    /**
     * Get style recommendations based on user preferences
     */
    async getStyleRecommendations(userPreferences) {
        const {
            occasion,
            weather,
            style,
            colors,
            budget,
            bodyType,
            preferredBrands
        } = userPreferences;

        let query = `Recommend clothing items`;

        if (occasion) query += ` for ${occasion}`;
        if (weather) query += ` suitable for ${weather} weather`;
        if (style) query += ` in ${style} style`;
        if (colors && colors.length > 0) query += ` in colors: ${colors.join(', ')}`;
        if (budget) query += ` within budget of $${budget}`;
        if (bodyType) query += ` flattering for ${bodyType} body type`;
        if (preferredBrands && preferredBrands.length > 0) query += ` from brands: ${preferredBrands.join(', ')}`;

        return await this.queryStyles(query);
    }

    /**
     * Test knowledge base connection
     */
    async testConnection() {
        try {
            const result = await this.queryStyles('test query for clothing items');

            if (result.success) {
                return {
                    success: true,
                    data: {
                        message: 'Knowledge base connection successful',
                        knowledgeBaseId: this.knowledgeBaseId,
                        resultsCount: result.data.results.length
                    }
                };
            } else {
                return result;
            }

        } catch (error) {
            console.error('Knowledge base connection test failed:', error);
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
     * Get configuration status
     */
    getConfigurationStatus() {
        return {
            knowledgeBaseConfigured: !!this.knowledgeBaseId,
            knowledgeBaseId: this.knowledgeBaseId,
            region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
            credentialsConfigured: !!(process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY)
        };
    }

    /**
     * Format knowledge base results for display
     */
    formatResults(results) {
        if (!results || !results.length) {
            return 'No matching items found in the knowledge base.';
        }

        return results.map((result, index) => {
            const content = result.content?.text || 'No content available';
            const score = result.score ? ` (Relevance: ${Math.round(result.score * 100)}%)` : '';

            return `${index + 1}. ${content}${score}`;
        }).join('\n\n');
    }
}

const knowledgeBaseService = new KnowledgeBaseService();
export default knowledgeBaseService;