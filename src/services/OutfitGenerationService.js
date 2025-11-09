/**
 * Outfit Generation Service
 * Orchestrates the outfit generation process by coordinating context accumulation,
 * CSV data loading, and AI-powered outfit recommendations
 */

import contextAccumulator from './contextAccumulator';
import clothingDatasetService from './clothingDatasetService';
import bedrockService from './bedrockService';
import csvLoader from './CSVLoader';
import demoOutfitService from './demoOutfitService';

class OutfitGenerationService {
    constructor() {
        // No local caching needed - CSVLoader handles caching
    }

    /**
     * Main orchestration method for generating outfits
     * @param {string} sessionId - Session identifier
     * @param {Object} confirmedDetails - User-confirmed event details
     * @param {Array} closetItems - User's existing closet items (optional)
     * @returns {Promise<Object>} Generated outfit recommendations
     */
    async generateOutfits(sessionId, confirmedDetails, closetItems = []) {
        try {
            this.validateInputs(sessionId, confirmedDetails);

            // Check if we should use demo mode
            const contextFile = contextAccumulator.getContextFile(sessionId);
            if (!contextFile) {
                throw new Error('Context file not found for session');
            }

            const originalMessage = contextFile?.userInput?.originalMessage || '';
            console.log('🎬 Checking demo mode for message:', originalMessage);

            if (demoOutfitService.isDemoMode(originalMessage)) {
                console.log('🎬 DEMO MODE ACTIVATED - Using predefined outfits from demo.md');
                return await demoOutfitService.generateDemoOutfits(sessionId, confirmedDetails);
            }

            console.log('🎬 Demo mode not detected, using AI generation');

            const dataset = await clothingDatasetService.getDataset();

            // Merge closet items with catalog dataset
            const mergedDataset = this.mergeClosetItems(dataset, closetItems);

            const contextSummary = contextAccumulator.generateContextSummary(sessionId);

            const aiResult = await bedrockService.generateOutfitRecommendations({
                eventDetails: confirmedDetails,
                csvContent: mergedDataset.csvContent,
                contextSummary
            });

            if (!aiResult.success) {
                throw new Error(aiResult.error?.message || 'AI outfit generation failed');
            }

            const hydratedOutfits = this.hydrateOutfits(aiResult.data, mergedDataset.skuMap, sessionId);
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

    /**
     * Merge closet items into the dataset
     * @param {Object} dataset - Original catalog dataset
     * @param {Array} closetItems - User's closet items
     * @returns {Object} Merged dataset with closet items
     */
    mergeClosetItems(dataset, closetItems) {
        if (!closetItems || closetItems.length === 0) {
            return dataset;
        }

        // Create a new SKU map with closet items
        const mergedSkuMap = new Map(dataset.skuMap);

        // Convert closet items to CSV rows and add to SKU map
        const closetRows = closetItems.map(item => {
            // Add to SKU map
            mergedSkuMap.set(item.sku, item);

            // Convert to CSV row format
            return `${item.sku},${item.name},${item.category},${item.price || 0},${item.colors || ''},${item.weatherSuitability || 'all-weather'},${item.formality || 'casual'},${item.layering || ''},${item.tags || ''},${item.notes || ''}`;
        }).join('\n');

        // Prepend closet items to CSV content (so they appear first and are prioritized)
        const mergedCsvContent = closetRows + '\n' + dataset.csvContent;

        return {
            csvContent: mergedCsvContent,
            skuMap: mergedSkuMap
        };
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
