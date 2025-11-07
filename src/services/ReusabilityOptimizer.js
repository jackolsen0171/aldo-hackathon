/**
 * ReusabilityOptimizer
 * 
 * Service for maximizing clothing item reuse across multiple days.
 * Calculates versatility scores, optimizes outfit combinations, and generates
 * reusability reports to meet the 60% reusability target.
 */

import { createReusabilityReport } from '../data/dataModels.js';

/**
 * ReusabilityOptimizer class for optimizing clothing item reuse
 */
export class ReusabilityOptimizer {
    constructor() {
        // Versatility scoring weights
        this.scoringWeights = {
            tags: 0.25,           // Versatility based on item tags
            colors: 0.20,         // Color versatility and neutrality
            formality: 0.20,      // Formality range adaptability
            layering: 0.15,       // Layering potential
            weather: 0.15,        // Weather adaptability
            category: 0.05        // Category-specific bonuses
        };

        // Neutral colors that work with many combinations
        this.neutralColors = [
            'white', 'black', 'grey', 'gray', 'beige', 'cream',
            'navy', 'brown', 'tan', 'khaki', 'charcoal', 'ivory'
        ];

        // Versatile tags that indicate multi-use potential
        this.versatileTags = [
            'versatile', 'classic', 'basic', 'essential', 'staple',
            'timeless', 'neutral', 'layerable', 'mix-and-match',
            'wardrobe-essential', 'go-with-everything'
        ];

        // Formality flexibility mappings
        this.formalityFlexibility = {
            'casual': { range: ['casual'], flexibility: 0.3 },
            'smart-casual': { range: ['casual', 'smart-casual', 'business-casual'], flexibility: 0.8 },
            'business-casual': { range: ['smart-casual', 'business-casual', 'formal'], flexibility: 0.7 },
            'formal': { range: ['business-casual', 'formal'], flexibility: 0.5 },
            'black-tie': { range: ['formal', 'black-tie'], flexibility: 0.2 }
        };

        // Weather adaptability mappings
        this.weatherAdaptability = {
            'mild': { conditions: ['mild', 'warm', 'cool'], adaptability: 0.9 },
            'warm': { conditions: ['warm', 'mild', 'hot'], adaptability: 0.7 },
            'cool': { conditions: ['cool', 'mild', 'cold'], adaptability: 0.7 },
            'cold': { conditions: ['cold', 'cool'], adaptability: 0.5 },
            'hot': { conditions: ['hot', 'warm'], adaptability: 0.5 },
            'rain': { conditions: ['rain', 'wet'], adaptability: 0.3 },
            'snow': { conditions: ['snow', 'cold'], adaptability: 0.3 }
        };

        // Layering potential by category
        this.layeringPotential = {
            'base': 0.9,      // Base layers are highly versatile
            'mid': 0.8,       // Mid layers offer good versatility
            'outer': 0.6,     // Outer layers are more specific
            'standalone': 0.4  // Standalone items are less versatile
        };
    }

    /**
     * Calculate item versatility score based on multiple factors
     * @param {ClothingItem} item - Clothing item to score
     * @param {Object} tripContext - Trip context for scoring adjustments
     * @param {number} tripContext.duration - Trip duration in days
     * @param {Array<string>} tripContext.weatherConditions - Expected weather conditions
     * @param {string} tripContext.dressCode - Primary dress code requirement
     * @param {Array<string>} tripContext.activities - Planned activities
     * @returns {number} Versatility score (0-100)
     */
    calculateItemVersatility(item, tripContext = {}) {
        if (!item) {
            return 0;
        }

        let versatilityScore = 0;

        // 1. Tags-based versatility (25% weight)
        const tagsScore = this.calculateTagsVersatility(item.tags || []);
        versatilityScore += tagsScore * this.scoringWeights.tags;

        // 2. Color versatility (20% weight)
        const colorScore = this.calculateColorVersatility(item.colors || '');
        versatilityScore += colorScore * this.scoringWeights.colors;

        // 3. Formality adaptability (20% weight)
        const formalityScore = this.calculateFormalityVersatility(
            item.formality || 'casual',
            tripContext.dressCode
        );
        versatilityScore += formalityScore * this.scoringWeights.formality;

        // 4. Layering potential (15% weight)
        const layeringScore = this.calculateLayeringVersatility(item.layering || 'standalone');
        versatilityScore += layeringScore * this.scoringWeights.layering;

        // 5. Weather adaptability (15% weight)
        const weatherScore = this.calculateWeatherVersatility(
            item.weather_suitability || 'mild',
            tripContext.weatherConditions || []
        );
        versatilityScore += weatherScore * this.scoringWeights.weather;

        // 6. Category-specific bonuses (5% weight)
        const categoryScore = this.calculateCategoryVersatility(item.category || '');
        versatilityScore += categoryScore * this.scoringWeights.category;

        // Apply trip duration multiplier
        if (tripContext.duration) {
            const durationMultiplier = this.getDurationMultiplier(tripContext.duration);
            versatilityScore *= durationMultiplier;
        }

        // Normalize to 0-100 range
        return Math.max(0, Math.min(100, versatilityScore * 100));
    }

    /**
     * Calculate versatility score based on item tags
     * @param {Array<string>} tags - Item tags
     * @returns {number} Tags versatility score (0-1)
     */
    calculateTagsVersatility(tags) {
        if (!Array.isArray(tags) || tags.length === 0) {
            return 0.3; // Default score for items without tags
        }

        const lowerTags = tags.map(tag => tag.toLowerCase());
        let score = 0.3; // Base score

        // Check for versatile tags
        const versatileTagMatches = this.versatileTags.filter(versatileTag =>
            lowerTags.some(tag => tag.includes(versatileTag) || versatileTag.includes(tag))
        );

        // Each versatile tag adds to the score
        score += versatileTagMatches.length * 0.15;

        // Bonus for multiple complementary tags
        if (tags.length >= 3) {
            score += 0.1;
        }

        // Check for specific versatility indicators
        const versatilityIndicators = [
            'mix', 'match', 'coordinate', 'pair', 'combine',
            'day-to-night', 'transition', 'adaptable'
        ];

        const hasVersatilityIndicators = versatilityIndicators.some(indicator =>
            lowerTags.some(tag => tag.includes(indicator))
        );

        if (hasVersatilityIndicators) {
            score += 0.2;
        }

        return Math.min(1, score);
    }

    /**
     * Calculate versatility score based on item colors
     * @param {string} colors - Item color information
     * @returns {number} Color versatility score (0-1)
     */
    calculateColorVersatility(colors) {
        if (!colors) {
            return 0.3; // Default score for items without color info
        }

        const colorString = colors.toLowerCase();
        let score = 0.2; // Base score

        // Check for neutral colors (highly versatile)
        const neutralMatches = this.neutralColors.filter(neutral =>
            colorString.includes(neutral)
        );

        if (neutralMatches.length > 0) {
            score += 0.6; // High bonus for neutral colors
        }

        // Check for multi-color items (potentially versatile)
        const colorSeparators = [',', '/', '&', 'and', 'with', '+'];
        const hasMultipleColors = colorSeparators.some(separator =>
            colorString.includes(separator)
        );

        if (hasMultipleColors) {
            score += 0.2;
        }

        // Specific versatile color combinations
        const versatilePatterns = [
            'black and white', 'navy and white', 'grey and white',
            'striped', 'checked', 'plaid', 'solid'
        ];

        const hasVersatilePattern = versatilePatterns.some(pattern =>
            colorString.includes(pattern)
        );

        if (hasVersatilePattern) {
            score += 0.2;
        }

        return Math.min(1, score);
    }

    /**
     * Calculate versatility score based on formality level
     * @param {string} itemFormality - Item's formality level
     * @param {string} tripDressCode - Trip's primary dress code
     * @returns {number} Formality versatility score (0-1)
     */
    calculateFormalityVersatility(itemFormality, tripDressCode) {
        const normalizedFormality = itemFormality.toLowerCase();
        const flexibility = this.formalityFlexibility[normalizedFormality];

        if (!flexibility) {
            return 0.5; // Default score for unknown formality
        }

        let score = flexibility.flexibility;

        // Bonus if item matches trip dress code
        if (tripDressCode && flexibility.range.includes(tripDressCode.toLowerCase())) {
            score += 0.2;
        }

        // Smart-casual gets highest versatility as it bridges casual and formal
        if (normalizedFormality === 'smart-casual') {
            score += 0.1;
        }

        return Math.min(1, score);
    }

    /**
     * Calculate versatility score based on layering potential
     * @param {string} layering - Item's layering classification
     * @returns {number} Layering versatility score (0-1)
     */
    calculateLayeringVersatility(layering) {
        const normalizedLayering = layering.toLowerCase();

        // Direct mapping from layering potential
        for (const [layer, potential] of Object.entries(this.layeringPotential)) {
            if (normalizedLayering.includes(layer)) {
                return potential;
            }
        }

        // Check for layering-related keywords
        const layeringKeywords = {
            'cardigan': 0.8,
            'blazer': 0.7,
            'jacket': 0.6,
            'vest': 0.7,
            'scarf': 0.8,
            'sweater': 0.6
        };

        for (const [keyword, score] of Object.entries(layeringKeywords)) {
            if (normalizedLayering.includes(keyword)) {
                return score;
            }
        }

        return 0.5; // Default score
    }

    /**
     * Calculate versatility score based on weather adaptability
     * @param {string} weatherSuitability - Item's weather suitability
     * @param {Array<string>} tripWeatherConditions - Expected weather conditions for trip
     * @returns {number} Weather versatility score (0-1)
     */
    calculateWeatherVersatility(weatherSuitability, tripWeatherConditions) {
        const normalizedWeather = weatherSuitability.toLowerCase();

        // Find matching weather adaptability
        let adaptability = 0.5; // Default
        for (const [weather, info] of Object.entries(this.weatherAdaptability)) {
            if (normalizedWeather.includes(weather)) {
                adaptability = info.adaptability;
                break;
            }
        }

        // Bonus if item suits multiple trip weather conditions
        if (Array.isArray(tripWeatherConditions) && tripWeatherConditions.length > 0) {
            const matchingConditions = tripWeatherConditions.filter(condition =>
                normalizedWeather.includes(condition.toLowerCase())
            );

            if (matchingConditions.length > 1) {
                adaptability += 0.2;
            }
        }

        return Math.min(1, adaptability);
    }

    /**
     * Calculate versatility score based on item category
     * @param {string} category - Item category
     * @returns {number} Category versatility score (0-1)
     */
    calculateCategoryVersatility(category) {
        const normalizedCategory = category.toLowerCase();

        // Category versatility mappings
        const categoryVersatility = {
            'topwear': 0.8,      // Tops are generally versatile
            'shirt': 0.9,        // Shirts are highly versatile
            'blouse': 0.8,       // Blouses are versatile
            'sweater': 0.7,      // Sweaters are moderately versatile
            'cardigan': 0.9,     // Cardigans are highly versatile
            'blazer': 0.8,       // Blazers are versatile
            'jacket': 0.6,       // Jackets are moderately versatile
            'bottomwear': 0.7,   // Bottoms are moderately versatile
            'pants': 0.8,        // Pants are versatile
            'jeans': 0.9,        // Jeans are highly versatile
            'skirt': 0.6,        // Skirts are moderately versatile
            'shorts': 0.5,       // Shorts are less versatile
            'footwear': 0.6,     // Shoes are moderately versatile
            'sneakers': 0.8,     // Sneakers are versatile
            'boots': 0.7,        // Boots are moderately versatile
            'heels': 0.4,        // Heels are less versatile
            'accessories': 0.9,  // Accessories are highly versatile
            'belt': 0.8,         // Belts are versatile
            'jewelry': 0.7,      // Jewelry is moderately versatile
            'hat': 0.6,          // Hats are moderately versatile
            'scarf': 0.9         // Scarves are highly versatile
        };

        // Find matching category
        for (const [cat, score] of Object.entries(categoryVersatility)) {
            if (normalizedCategory.includes(cat)) {
                return score;
            }
        }

        return 0.6; // Default score for unknown categories
    }

    /**
     * Get duration multiplier for versatility scoring
     * @param {number} duration - Trip duration in days
     * @returns {number} Duration multiplier
     */
    getDurationMultiplier(duration) {
        if (duration <= 2) {
            return 0.8; // Short trips need less versatility
        } else if (duration <= 4) {
            return 1.0; // Standard multiplier
        } else if (duration <= 7) {
            return 1.2; // Longer trips benefit more from versatile items
        } else {
            return 1.4; // Very long trips highly benefit from versatile items
        }
    }

    /**
     * Score items based on reusability potential considering trip duration and context
     * @param {Array<ClothingItem>} items - Array of clothing items
     * @param {Object} tripContext - Trip context information
     * @returns {Map<string, number>} Map of item SKU to reusability score
     */
    calculateReusabilityScores(items, tripContext = {}) {
        if (!Array.isArray(items)) {
            return new Map();
        }

        const reusabilityScores = new Map();

        items.forEach(item => {
            if (!item || !item.sku) {
                return;
            }

            // Calculate base versatility score
            const versatilityScore = this.calculateItemVersatility(item, tripContext);

            // Apply reusability-specific adjustments
            let reusabilityScore = versatilityScore;

            // Price efficiency factor (cheaper items get slight bonus for reusability)
            if (item.price && tripContext.budget) {
                const priceEfficiencyFactor = this.calculatePriceEfficiency(item.price, tripContext.budget);
                reusabilityScore *= (1 + priceEfficiencyFactor * 0.1);
            }

            // Category reusability factor
            const categoryFactor = this.getCategoryReusabilityFactor(item.category);
            reusabilityScore *= categoryFactor;

            // Trip duration factor
            if (tripContext.duration) {
                const durationFactor = this.getReusabilityDurationFactor(tripContext.duration);
                reusabilityScore *= durationFactor;
            }

            // Normalize to 0-100 range
            reusabilityScore = Math.max(0, Math.min(100, reusabilityScore));

            reusabilityScores.set(item.sku, reusabilityScore);
        });

        return reusabilityScores;
    }

    /**
     * Calculate price efficiency factor for reusability
     * @param {number} itemPrice - Item price
     * @param {number} totalBudget - Total trip budget
     * @returns {number} Price efficiency factor (0-1)
     */
    calculatePriceEfficiency(itemPrice, totalBudget) {
        if (!itemPrice || !totalBudget || totalBudget <= 0) {
            return 0.5;
        }

        const priceRatio = itemPrice / totalBudget;

        // Items that are 5% or less of budget get highest efficiency
        if (priceRatio <= 0.05) {
            return 1.0;
        }
        // Items that are 10% or less get good efficiency
        else if (priceRatio <= 0.10) {
            return 0.8;
        }
        // Items that are 20% or less get moderate efficiency
        else if (priceRatio <= 0.20) {
            return 0.6;
        }
        // Items that are more than 20% get lower efficiency
        else {
            return 0.3;
        }
    }

    /**
     * Get category-specific reusability factor
     * @param {string} category - Item category
     * @returns {number} Category reusability factor
     */
    getCategoryReusabilityFactor(category) {
        if (!category) {
            return 1.0;
        }

        const normalizedCategory = category.toLowerCase();

        // Categories that are naturally more reusable
        const reusabilityFactors = {
            'topwear': 1.2,      // Tops can be mixed and matched easily
            'shirt': 1.3,        // Shirts are highly reusable
            'blouse': 1.2,       // Blouses are reusable
            'cardigan': 1.4,     // Cardigans are excellent for layering
            'blazer': 1.3,       // Blazers can dress up/down outfits
            'bottomwear': 1.1,   // Bottoms are moderately reusable
            'pants': 1.2,        // Pants are quite reusable
            'jeans': 1.3,        // Jeans are highly reusable
            'accessories': 1.4,  // Accessories are highly reusable
            'belt': 1.3,         // Belts can change outfit looks
            'jewelry': 1.2,      // Jewelry adds variety
            'scarf': 1.4,        // Scarves are excellent for variety
            'footwear': 0.9,     // Shoes are less reusable
            'sneakers': 1.1,     // Sneakers are more versatile
            'outerwear': 0.8     // Outerwear is typically less reusable
        };

        for (const [cat, factor] of Object.entries(reusabilityFactors)) {
            if (normalizedCategory.includes(cat)) {
                return factor;
            }
        }

        return 1.0; // Default factor
    }

    /**
     * Get duration-specific reusability factor
     * @param {number} duration - Trip duration in days
     * @returns {number} Duration reusability factor
     */
    getReusabilityDurationFactor(duration) {
        if (duration <= 2) {
            return 0.8; // Short trips need less reusability
        } else if (duration <= 4) {
            return 1.0; // Standard factor
        } else if (duration <= 7) {
            return 1.3; // Week-long trips benefit from reusability
        } else {
            return 1.5; // Long trips highly benefit from reusability
        }
    }
}

// Export singleton instance
export const reusabilityOptimizer = new ReusabilityOptimizer();

// Export class for testing and custom instances
export default ReusabilityOptimizer;
// ===== OUTFIT OPTIMIZATION METHODS =====

/**
 * Optimize outfit combinations to maximize item reuse across multiple days
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits to optimize
 * @param {number} targetReusability - Target reusability percentage (default 0.6 = 60%)
 * @param {Object} optimizationOptions - Additional optimization options
 * @returns {Array<DailyOutfit>} Optimized outfits with maximized reuse
 */
optimizeOutfitCombinations(outfits, targetReusability = 0.6, optimizationOptions = {}) {
    if (!Array.isArray(outfits) || outfits.length < 2) {
        return outfits || [];
    }

    // Create deep copy to avoid mutating original outfits
    let optimizedOutfits = JSON.parse(JSON.stringify(outfits));

    // Extract all items and calculate their reusability scores
    const allItems = this.extractAllItemsFromOutfits(optimizedOutfits);
    const itemReusabilityScores = this.calculateItemReusabilityFromOutfits(allItems, optimizedOutfits.length);

    // Sort items by reusability score (highest first)
    const sortedItems = allItems.sort((a, b) =>
        (itemReusabilityScores.get(b.sku) || 0) - (itemReusabilityScores.get(a.sku) || 0)
    );

    // Perform iterative optimization
    let currentReusability = this.calculateCurrentReusability(optimizedOutfits);
    let iterations = 0;
    const maxIterations = optimizationOptions.maxIterations || 10;

    while (currentReusability.reusabilityPercentage < targetReusability && iterations < maxIterations) {
        // Try different optimization strategies
        const strategies = [
            () => this.optimizeBySwappingHighValueItems(optimizedOutfits, sortedItems),
            () => this.optimizeByPromotingVersatileItems(optimizedOutfits, sortedItems),
            () => this.optimizeByConsolidatingCategories(optimizedOutfits),
            () => this.optimizeByAccessoryReuse(optimizedOutfits)
        ];

        let improved = false;
        for (const strategy of strategies) {
            const previousReusability = currentReusability.reusabilityPercentage;
            optimizedOutfits = strategy();
            currentReusability = this.calculateCurrentReusability(optimizedOutfits);

            if (currentReusability.reusabilityPercentage > previousReusability) {
                improved = true;
                break;
            }
        }

        // If no strategy improved the result, break to avoid infinite loop
        if (!improved) {
            break;
        }

        iterations++;
    }

    // Update outfit reusability scores and cost efficiency
    optimizedOutfits = this.updateOutfitMetrics(optimizedOutfits, currentReusability);

    return optimizedOutfits;
}

/**
 * Extract all unique items from outfits
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {Array<ClothingItem>} Array of all unique items
 */
extractAllItemsFromOutfits(outfits) {
    const itemMap = new Map();

    outfits.forEach(outfit => {
        Object.values(outfit.items || {}).forEach(item => {
            if (item && item.sku) {
                itemMap.set(item.sku, item);
            }
        });
    });

    return Array.from(itemMap.values());
}

/**
 * Calculate reusability scores for items based on their usage in outfits
 * @param {Array<ClothingItem>} items - Array of clothing items
 * @param {number} totalOutfits - Total number of outfits
 * @returns {Map<string, number>} Map of item SKU to reusability score
 */
calculateItemReusabilityFromOutfits(items, totalOutfits) {
    const reusabilityScores = new Map();

    items.forEach(item => {
        if (!item || !item.sku) return;

        // Base versatility score
        const versatilityScore = this.calculateItemVersatility(item);

        // Potential usage frequency (how many outfits could use this item)
        const potentialUsage = Math.min(totalOutfits, Math.ceil(versatilityScore / 25));

        // Reusability score combines versatility with potential usage
        const reusabilityScore = versatilityScore * (1 + potentialUsage * 0.1);

        reusabilityScores.set(item.sku, reusabilityScore);
    });

    return reusabilityScores;
}

/**
 * Optimize outfits by swapping in high-value reusable items
 * @param {Array<DailyOutfit>} outfits - Current outfits
 * @param {Array<ClothingItem>} sortedItems - Items sorted by reusability score
 * @returns {Array<DailyOutfit>} Optimized outfits
 */
optimizeBySwappingHighValueItems(outfits, sortedItems) {
    const optimizedOutfits = [...outfits];
    const itemUsageCount = this.getItemUsageCount(optimizedOutfits);

    // Focus on top 20% most reusable items
    const topItems = sortedItems.slice(0, Math.ceil(sortedItems.length * 0.2));

    topItems.forEach(highValueItem => {
        const currentUsage = itemUsageCount.get(highValueItem.sku) || 0;

        // If item is underutilized, try to use it in more outfits
        if (currentUsage < Math.min(outfits.length, 3)) {
            this.tryToReuseItem(optimizedOutfits, highValueItem, itemUsageCount);
        }
    });

    return optimizedOutfits;
}

/**
 * Try to reuse a specific item in more outfits
 * @param {Array<DailyOutfit>} outfits - Current outfits
 * @param {ClothingItem} item - Item to reuse
 * @param {Map<string, number>} itemUsageCount - Current item usage counts
 */
tryToReuseItem(outfits, item, itemUsageCount) {
    const itemCategory = this.getItemSlotCategory(item.category);
    if (!itemCategory) return;

    outfits.forEach(outfit => {
        // Skip if outfit already uses this item
        if (this.outfitContainsItem(outfit, item.sku)) return;

        const currentItem = outfit.items[itemCategory];

        // Only replace if current item has lower reusability or is null
        if (!currentItem || this.shouldReplaceItem(currentItem, item, itemUsageCount)) {
            outfit.items[itemCategory] = item;
        }
    });
}

/**
 * Optimize by promoting versatile items to be used more frequently
 * @param {Array<DailyOutfit>} outfits - Current outfits
 * @param {Array<ClothingItem>} sortedItems - Items sorted by reusability score
 * @returns {Array<DailyOutfit>} Optimized outfits
 */
optimizeByPromotingVersatileItems(outfits, sortedItems) {
    const optimizedOutfits = [...outfits];

    // Group items by category
    const itemsByCategory = this.groupItemsByCategory(sortedItems);

    // For each category, promote the most versatile items
    itemsByCategory.forEach((categoryItems, category) => {
        const slotCategory = this.getItemSlotCategory(category);
        if (!slotCategory) return;

        // Get top 2 most versatile items in this category
        const topVersatileItems = categoryItems.slice(0, 2);

        topVersatileItems.forEach(versatileItem => {
            // Try to use this item in multiple outfits
            let usageCount = 0;
            const maxUsage = Math.min(outfits.length, 3);

            for (let i = 0; i < optimizedOutfits.length && usageCount < maxUsage; i++) {
                const outfit = optimizedOutfits[i];

                if (!this.outfitContainsItem(outfit, versatileItem.sku)) {
                    const currentItem = outfit.items[slotCategory];

                    if (!currentItem || this.isMoreVersatile(versatileItem, currentItem)) {
                        outfit.items[slotCategory] = versatileItem;
                        usageCount++;
                    }
                }
            }
        });
    });

    return optimizedOutfits;
}

/**
 * Optimize by consolidating similar categories to increase reuse
 * @param {Array<DailyOutfit>} outfits - Current outfits
 * @returns {Array<DailyOutfit>} Optimized outfits
 */
optimizeByConsolidatingCategories(outfits) {
    const optimizedOutfits = [...outfits];

    // Focus on consolidating accessories and layering pieces
    const consolidationCategories = ['belt', 'jewelry', 'outerwear'];

    consolidationCategories.forEach(category => {
        const categoryItems = this.getItemsFromCategory(optimizedOutfits, category);

        if (categoryItems.length > 1) {
            // Find the most versatile item in this category
            const mostVersatile = categoryItems.reduce((best, current) => {
                const bestScore = this.calculateItemVersatility(best);
                const currentScore = this.calculateItemVersatility(current);
                return currentScore > bestScore ? current : best;
            });

            // Replace other items in this category with the most versatile one
            optimizedOutfits.forEach(outfit => {
                if (outfit.items[category] && outfit.items[category].sku !== mostVersatile.sku) {
                    outfit.items[category] = mostVersatile;
                }
            });
        }
    });

    return optimizedOutfits;
}

/**
 * Optimize by maximizing accessory reuse
 * @param {Array<DailyOutfit>} outfits - Current outfits
 * @returns {Array<DailyOutfit>} Optimized outfits
 */
optimizeByAccessoryReuse(outfits) {
    const optimizedOutfits = [...outfits];
    const accessoryCategories = ['belt', 'jewelry', 'hat'];

    accessoryCategories.forEach(category => {
        const accessories = this.getItemsFromCategory(optimizedOutfits, category);

        if (accessories.length > 0) {
            // Sort accessories by versatility
            const sortedAccessories = accessories.sort((a, b) =>
                this.calculateItemVersatility(b) - this.calculateItemVersatility(a)
            );

            // Use top 1-2 accessories across multiple outfits
            const topAccessories = sortedAccessories.slice(0, Math.min(2, sortedAccessories.length));

            topAccessories.forEach((accessory, index) => {
                // Distribute accessories across outfits
                for (let i = index; i < optimizedOutfits.length; i += topAccessories.length) {
                    if (optimizedOutfits[i] && !optimizedOutfits[i].items[category]) {
                        optimizedOutfits[i].items[category] = accessory;
                    }
                }
            });
        }
    });

    return optimizedOutfits;
}

/**
 * Calculate current reusability statistics for outfits
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {Object} Current reusability statistics
 */
calculateCurrentReusability(outfits) {
    if (!Array.isArray(outfits) || outfits.length === 0) {
        return createReusabilityReport();
    }

    const itemUsageCount = this.getItemUsageCount(outfits);
    const totalUniqueItems = itemUsageCount.size;
    const reusedItems = Array.from(itemUsageCount.values()).filter(count => count > 1).length;
    const reusabilityPercentage = totalUniqueItems > 0 ? reusedItems / totalUniqueItems : 0;

    // Calculate cost efficiency
    const totalCost = this.calculateTotalCost(outfits);
    const costPerOutfit = outfits.length > 0 ? totalCost / outfits.length : 0;
    const costEfficiency = this.calculateCostEfficiency(totalCost, reusabilityPercentage);

    // Calculate packing optimization
    const packingOptimization = this.calculatePackingOptimization(totalUniqueItems, outfits.length);

    return createReusabilityReport({
        totalItems: totalUniqueItems,
        reusedItems,
        reusabilityPercentage,
        itemUsageMap: itemUsageCount,
        costEfficiency,
        packingOptimization
    });
}

/**
 * Get item usage count across all outfits
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {Map<string, number>} Map of item SKU to usage count
 */
getItemUsageCount(outfits) {
    const usageCount = new Map();

    outfits.forEach(outfit => {
        Object.values(outfit.items || {}).forEach(item => {
            if (item && item.sku) {
                usageCount.set(item.sku, (usageCount.get(item.sku) || 0) + 1);
            }
        });
    });

    return usageCount;
}

/**
 * Calculate total cost of all outfits
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {number} Total cost
 */
calculateTotalCost(outfits) {
    const uniqueItems = this.extractAllItemsFromOutfits(outfits);
    return uniqueItems.reduce((total, item) => total + (item.price || 0), 0);
}

/**
 * Calculate cost efficiency based on reusability
 * @param {number} totalCost - Total cost of all items
 * @param {number} reusabilityPercentage - Reusability percentage (0-1)
 * @returns {number} Cost efficiency score (0-100)
 */
calculateCostEfficiency(totalCost, reusabilityPercentage) {
    if (totalCost === 0) return 100;

    // Higher reusability means better cost efficiency
    const baseEfficiency = reusabilityPercentage * 100;

    // Bonus for high reusability
    const reusabilityBonus = reusabilityPercentage > 0.6 ? (reusabilityPercentage - 0.6) * 50 : 0;

    return Math.min(100, baseEfficiency + reusabilityBonus);
}

/**
 * Calculate packing optimization score
 * @param {number} totalItems - Total number of unique items
 * @param {number} totalOutfits - Total number of outfits
 * @returns {number} Packing optimization score (0-100)
 */
calculatePackingOptimization(totalItems, totalOutfits) {
    if (totalOutfits === 0) return 0;

    // Ideal ratio: 1.5 items per outfit (high reuse)
    const idealRatio = 1.5;
    const actualRatio = totalItems / totalOutfits;

    // Score based on how close to ideal ratio
    const ratioScore = Math.max(0, 100 - Math.abs(actualRatio - idealRatio) * 20);

    return Math.min(100, ratioScore);
}

/**
 * Update outfit metrics after optimization
 * @param {Array<DailyOutfit>} outfits - Optimized outfits
 * @param {Object} reusabilityStats - Reusability statistics
 * @returns {Array<DailyOutfit>} Outfits with updated metrics
 */
updateOutfitMetrics(outfits, reusabilityStats) {
    return outfits.map(outfit => {
        // Calculate outfit-specific reusability score
        const outfitItems = Object.values(outfit.items).filter(item => item);
        const reusedItemsInOutfit = outfitItems.filter(item =>
            reusabilityStats.itemUsageMap.get(item.sku) > 1
        ).length;

        const outfitReusabilityScore = outfitItems.length > 0
            ? (reusedItemsInOutfit / outfitItems.length) * 100
            : 0;

        // Calculate outfit cost
        const outfitCost = outfitItems.reduce((total, item) => total + (item.price || 0), 0);

        return {
            ...outfit,
            reusabilityScore: outfitReusabilityScore,
            totalCost: outfitCost
        };
    });
}

// ===== HELPER METHODS FOR OPTIMIZATION =====

/**
 * Get the outfit slot category for an item category
 * @param {string} itemCategory - Item category
 * @returns {string|null} Outfit slot category
 */
getItemSlotCategory(itemCategory) {
    if (!itemCategory) return null;

    const categoryMappings = {
        'topwear': 'shirt',
        'shirt': 'shirt',
        'blouse': 'shirt',
        'sweater': 'shirt',
        'tshirt': 'shirt',
        'bottomwear': 'pants',
        'pants': 'pants',
        'jeans': 'pants',
        'skirt': 'pants',
        'shorts': 'pants',
        'outerwear': 'outerwear',
        'jacket': 'outerwear',
        'coat': 'outerwear',
        'blazer': 'outerwear',
        'cardigan': 'outerwear',
        'footwear': 'shoes',
        'shoes': 'shoes',
        'boots': 'shoes',
        'sneakers': 'shoes',
        'heels': 'shoes',
        'accessories': 'jewelry',
        'jewelry': 'jewelry',
        'belt': 'belt',
        'hat': 'hat',
        'scarf': 'jewelry'
    };

    const normalizedCategory = itemCategory.toLowerCase();
    for (const [category, slot] of Object.entries(categoryMappings)) {
        if (normalizedCategory.includes(category)) {
            return slot;
        }
    }

    return null;
}

/**
 * Check if an outfit contains a specific item
 * @param {DailyOutfit} outfit - Daily outfit
 * @param {string} itemSku - Item SKU to check
 * @returns {boolean} True if outfit contains the item
 */
outfitContainsItem(outfit, itemSku) {
    return Object.values(outfit.items || {}).some(item =>
        item && item.sku === itemSku
    );
}

/**
 * Determine if one item should replace another based on reusability
 * @param {ClothingItem} currentItem - Current item in outfit
 * @param {ClothingItem} newItem - Potential replacement item
 * @param {Map<string, number>} itemUsageCount - Current item usage counts
 * @returns {boolean} True if replacement should occur
 */
shouldReplaceItem(currentItem, newItem, itemUsageCount) {
    const currentUsage = itemUsageCount.get(currentItem.sku) || 0;
    const newUsage = itemUsageCount.get(newItem.sku) || 0;

    // Prefer items that are used less frequently (to increase reuse)
    if (newUsage < currentUsage) {
        return true;
    }

    // If usage is similar, prefer more versatile item
    if (newUsage === currentUsage) {
        const currentVersatility = this.calculateItemVersatility(currentItem);
        const newVersatility = this.calculateItemVersatility(newItem);
        return newVersatility > currentVersatility;
    }

    return false;
}

/**
 * Check if one item is more versatile than another
 * @param {ClothingItem} item1 - First item
 * @param {ClothingItem} item2 - Second item
 * @returns {boolean} True if item1 is more versatile
 */
isMoreVersatile(item1, item2) {
    const versatility1 = this.calculateItemVersatility(item1);
    const versatility2 = this.calculateItemVersatility(item2);
    return versatility1 > versatility2;
}

/**
 * Group items by category
 * @param {Array<ClothingItem>} items - Array of clothing items
 * @returns {Map<string, Array<ClothingItem>>} Items grouped by category
 */
groupItemsByCategory(items) {
    const grouped = new Map();

    items.forEach(item => {
        const category = item.category || 'unknown';
        if (!grouped.has(category)) {
            grouped.set(category, []);
        }
        grouped.get(category).push(item);
    });

    return grouped;
}

/**
 * Get all items of a specific category from outfits
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @param {string} category - Category to filter by
 * @returns {Array<ClothingItem>} Items of the specified c
ategory
     */
getItemsFromCategory(outfits, category) {
    const items = [];
    const seenSkus = new Set();

    outfits.forEach(outfit => {
        const item = outfit.items[category];
        if (item && item.sku && !seenSkus.has(item.sku)) {
            items.push(item);
            seenSkus.add(item.sku);
        }
    });

    return items;
}

// ===== REUSABILITY REPORTING METHODS =====

/**
 * Generate comprehensive reusability report for optimized outfits
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {Object} Detailed reusability report
 */
generateReusabilityReport(outfits) {
    if (!Array.isArray(outfits) || outfits.length === 0) {
        return createReusabilityReport();
    }

    const baseReport = this.calculateCurrentReusability(outfits);

    // Add detailed breakdown
    const detailedReport = {
        ...baseReport,
        breakdown: {
            byCategory: this.getReusabilityByCategory(outfits),
            byDay: this.getReusabilityByDay(outfits),
            topReusedItems: this.getTopReusedItems(outfits),
            recommendations: this.getReusabilityRecommendations(outfits, baseReport)
        },
        metrics: {
            averageItemsPerOutfit: this.calculateAverageItemsPerOutfit(outfits),
            costPerWear: this.calculateCostPerWear(outfits),
            packingEfficiency: baseReport.packingOptimization,
            sustainabilityScore: this.calculateSustainabilityScore(baseReport)
        }
    };

    return detailedReport;
}

/**
 * Get reusability breakdown by category
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {Object} Reusability by category
 */
getReusabilityByCategory(outfits) {
    const categoryStats = {};
    const categories = ['shirt', 'pants', 'shoes', 'outerwear', 'belt', 'jewelry', 'hat'];

    categories.forEach(category => {
        const items = this.getItemsFromCategory(outfits, category);
        const usageCount = this.getItemUsageCount(outfits);

        const categoryItems = items.length;
        const reusedCategoryItems = items.filter(item =>
            usageCount.get(item.sku) > 1
        ).length;

        categoryStats[category] = {
            totalItems: categoryItems,
            reusedItems: reusedCategoryItems,
            reusabilityPercentage: categoryItems > 0 ? reusedCategoryItems / categoryItems : 0
        };
    });

    return categoryStats;
}

/**
 * Get reusability breakdown by day
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {Array<Object>} Reusability by day
 */
getReusabilityByDay(outfits) {
    const usageCount = this.getItemUsageCount(outfits);

    return outfits.map(outfit => {
        const outfitItems = Object.values(outfit.items).filter(item => item);
        const reusedItems = outfitItems.filter(item =>
            usageCount.get(item.sku) > 1
        );

        return {
            day: outfit.day,
            totalItems: outfitItems.length,
            reusedItems: reusedItems.length,
            reusabilityPercentage: outfitItems.length > 0 ? reusedItems.length / outfitItems.length : 0,
            newItems: outfitItems.length - reusedItems.length
        };
    });
}

/**
 * Get top reused items with usage statistics
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {Array<Object>} Top reused items
 */
getTopReusedItems(outfits) {
    const usageCount = this.getItemUsageCount(outfits);
    const allItems = this.extractAllItemsFromOutfits(outfits);

    return allItems
        .filter(item => usageCount.get(item.sku) > 1)
        .map(item => ({
            item,
            usageCount: usageCount.get(item.sku),
            versatilityScore: this.calculateItemVersatility(item),
            costPerWear: item.price ? item.price / usageCount.get(item.sku) : 0
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10); // Top 10 most reused items
}

/**
 * Get reusability recommendations for improvement
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @param {Object} currentReport - Current reusability report
 * @returns {Array<string>} Array of recommendations
 */
getReusabilityRecommendations(outfits, currentReport) {
    const recommendations = [];
    const targetReusability = 0.6;

    // Overall reusability recommendations
    if (currentReport.reusabilityPercentage < targetReusability) {
        const gap = (targetReusability - currentReport.reusabilityPercentage) * 100;
        recommendations.push(`Increase reusability by ${gap.toFixed(1)}% to reach the 60% target`);
    }

    // Category-specific recommendations
    const categoryBreakdown = this.getReusabilityByCategory(outfits);
    Object.entries(categoryBreakdown).forEach(([category, stats]) => {
        if (stats.totalItems > 1 && stats.reusabilityPercentage < 0.5) {
            recommendations.push(`Consider consolidating ${category} items - currently ${(stats.reusabilityPercentage * 100).toFixed(1)}% reused`);
        }
    });

    // Cost efficiency recommendations
    if (currentReport.costEfficiency < 70) {
        recommendations.push('Focus on reusing higher-priced items to improve cost efficiency');
    }

    // Packing optimization recommendations
    if (currentReport.packingOptimization < 70) {
        recommendations.push('Reduce total number of items by increasing reuse of versatile pieces');
    }

    // Specific item recommendations
    const usageCount = this.getItemUsageCount(outfits);
    const underutilizedItems = this.extractAllItemsFromOutfits(outfits)
        .filter(item => {
            const usage = usageCount.get(item.sku) || 0;
            const versatility = this.calculateItemVersatility(item);
            return usage === 1 && versatility > 70;
        })
        .slice(0, 3);

    underutilizedItems.forEach(item => {
        recommendations.push(`Consider reusing "${item.name}" - it has high versatility but is only used once`);
    });

    return recommendations;
}

/**
 * Calculate average items per outfit
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {number} Average items per outfit
 */
calculateAverageItemsPerOutfit(outfits) {
    if (outfits.length === 0) return 0;

    const totalItems = outfits.reduce((sum, outfit) => {
        return sum + Object.values(outfit.items).filter(item => item).length;
    }, 0);

    return totalItems / outfits.length;
}

/**
 * Calculate cost per wear across all items
 * @param {Array<DailyOutfit>} outfits - Array of daily outfits
 * @returns {number} Average cost per wear
 */
calculateCostPerWear(outfits) {
    const usageCount = this.getItemUsageCount(outfits);
    const allItems = this.extractAllItemsFromOutfits(outfits);

    if (allItems.length === 0) return 0;

    const totalCostPerWear = allItems.reduce((sum, item) => {
        const usage = usageCount.get(item.sku) || 1;
        const costPerWear = item.price ? item.price / usage : 0;
        return sum + costPerWear;
    }, 0);

    return totalCostPerWear / allItems.length;
}

/**
 * Calculate sustainability score based on reusability
 * @param {Object} reusabilityReport - Reusability report
 * @returns {number} Sustainability score (0-100)
 */
calculateSustainabilityScore(reusabilityReport) {
    // Higher reusability = better sustainability
    const reusabilityScore = reusabilityReport.reusabilityPercentage * 60;

    // Cost efficiency contributes to sustainability
    const costEfficiencyScore = reusabilityReport.costEfficiency * 0.25;

    // Packing optimization reduces waste
    const packingScore = reusabilityReport.packingOptimization * 0.15;

    return Math.min(100, reusabilityScore + costEfficiencyScore + packingScore);
}
}