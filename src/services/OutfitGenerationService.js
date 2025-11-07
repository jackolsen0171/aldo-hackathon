/**
 * Outfit Generation Service
 * Orchestrates the outfit generation process by coordinating context accumulation,
 * CSV data loading, and AI-powered outfit recommendations
 */

import contextAccumulator from './contextAccumulator';
import clothingDatasetService from './clothingDatasetService';
import bedrockService from './bedrockService';
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
            this.validateInputs(sessionId, confirmedDetails);

            const dataset = await clothingDatasetService.getDataset();

            const contextFile = contextAccumulator.getContextFile(sessionId);
            if (!contextFile) {
                throw new Error('Context file not found for session');
            }

            const contextSummary = contextAccumulator.generateContextSummary(sessionId);

            const aiResult = await bedrockService.generateOutfitRecommendations({
                eventDetails: confirmedDetails,
                csvContent: dataset.csvContent,
                contextSummary
            });

            if (!aiResult.success) {
                throw new Error(aiResult.error?.message || 'AI outfit generation failed');
            }

            const hydratedOutfits = this.hydrateOutfits(aiResult.data, dataset.skuMap, sessionId);
            const reusabilityAnalysis = aiResult.data.reusabilityAnalysis ||
                this.calculateReusabilityMetrics(hydratedOutfits);

            return {
                success: true,
                data: {
                    outfits: hydratedOutfits,
                    reusabilityAnalysis,
                    contextSummary,
                    rawAiData: aiResult.data,
                    generatedAt: new Date().toISOString()
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

    hydrateOutfits(aiData, skuMap, sessionId) {
        const outfits = {};
        const timestamp = new Date().toISOString();

        aiData.dailyOutfits.forEach(dayOutfit => {
            const { day } = dayOutfit;
            const hydratedItems = {
                topwear: this.hydrateSlot('topwear', dayOutfit.outfit.topwear, skuMap),
                bottomwear: this.hydrateSlot('bottomwear', dayOutfit.outfit.bottomwear, skuMap),
                footwear: this.hydrateSlot('footwear', dayOutfit.outfit.footwear, skuMap),
                outerwear: this.hydrateSlot('outerwear', dayOutfit.outfit.outerwear, skuMap),
                accessories: (dayOutfit.outfit.accessories || [])
                    .map(accessory => this.hydrateSlot('accessories', accessory, skuMap))
                    .filter(Boolean)
            };

            outfits[day] = {
                id: `outfit-${sessionId}-${day}`,
                name: `Day ${day} Outfit`,
                day,
                tripId: sessionId,
                occasion: dayOutfit.occasion || `Day ${day}`,
                items: hydratedItems,
                styling: dayOutfit.styling,
                isSaved: true,
                createdAt: timestamp,
                updatedAt: timestamp
            };
        });

        return outfits;
    }

    hydrateSlot(slotName, slotData, skuMap) {
        if (!slotData || slotData === null) {
            return null;
        }

        if (!slotData.sku) {
            throw new Error(`AI response missing SKU for ${slotName}`);
        }

        const sku = slotData.sku.trim();
        const catalogItem = skuMap.get(sku);

        if (!catalogItem) {
            throw new Error(`AI referenced unknown SKU "${sku}" for ${slotName}`);
        }

        return {
            ...catalogItem
        };
    }

    calculateReusabilityMetrics(outfits) {
        const usageMap = new Map();

        Object.values(outfits).forEach(outfit => {
            const { items, day } = outfit;
            ['topwear', 'bottomwear', 'footwear', 'outerwear'].forEach(slot => {
                const item = items[slot];
                if (item) {
                    if (!usageMap.has(item.sku)) {
                        usageMap.set(item.sku, []);
                    }
                    usageMap.get(item.sku).push(day);
                }
            });

            (items.accessories || []).forEach(accessory => {
                if (!usageMap.has(accessory.sku)) {
                    usageMap.set(accessory.sku, []);
                }
                usageMap.get(accessory.sku).push(day);
            });
        });

        const totalItems = usageMap.size;
        const reusedItems = Array.from(usageMap.values()).filter(days => days.length > 1).length;
        const reusabilityPercentage = totalItems > 0
            ? Math.round((reusedItems / totalItems) * 100)
            : 0;

        const reusabilityMap = {};
        usageMap.forEach((days, sku) => {
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
