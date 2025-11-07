/**
 * ClothingAnalysisEngine
 * 
 * Analyzes clothing dataset and filters items based on trip requirements.
 * Provides functionality for weather-based filtering, dress code filtering,
 * and category-based item grouping.
 */

/**
 * ClothingAnalysisEngine class for analyzing and filtering clothing items
 */
export class ClothingAnalysisEngine {
    constructor() {
        // Weather condition mappings
        this.weatherMappings = {
            hot: ['warm', 'hot', 'summer'],
            warm: ['warm', 'mild', 'spring'],
            mild: ['mild', 'warm', 'cool'],
            cool: ['cool', 'mild', 'cold'],
            cold: ['cold', 'winter', 'cool'],
            rainy: ['rain', 'wet', 'waterproof'],
            snowy: ['snow', 'cold', 'winter']
        };

        // Formality level mappings
        this.formalityLevels = {
            'very-casual': ['casual'],
            'casual': ['casual', 'smart-casual'],
            'smart-casual': ['smart-casual', 'casual', 'formal'],
            'business-casual': ['smart-casual', 'formal'],
            'formal': ['formal', 'smart-casual'],
            'black-tie': ['formal']
        };

        // Category mappings for standardization
        this.categoryMappings = {
            'tops': ['topwear', 'shirt', 'blouse', 'sweater', 'tshirt'],
            'bottoms': ['bottomwear', 'pants', 'jeans', 'skirt', 'shorts'],
            'outerwear': ['outerwear', 'jacket', 'coat', 'blazer', 'cardigan'],
            'shoes': ['footwear', 'shoes', 'boots', 'sneakers', 'heels'],
            'accessories': ['accessories', 'jewelry', 'belt', 'hat', 'scarf']
        };
    }

    /**
     * Filter items by weather suitability
     * @param {Array<ClothingItem>} items - Array of clothing items
     * @param {string|Array<string>} weatherConditions - Weather condition(s) to filter by
     * @returns {Array<ClothingItem>} Filtered items suitable for the weather
     */
    filterByWeather(items, weatherConditions) {
        if (!items || !Array.isArray(items)) {
            return [];
        }

        // Normalize weather conditions to array
        const conditions = Array.isArray(weatherConditions)
            ? weatherConditions
            : [weatherConditions];

        // Get all applicable weather keywords
        const applicableWeatherKeywords = new Set();
        conditions.forEach(condition => {
            const normalizedCondition = condition.toLowerCase().trim();
            if (this.weatherMappings[normalizedCondition]) {
                this.weatherMappings[normalizedCondition].forEach(keyword => {
                    applicableWeatherKeywords.add(keyword);
                });
            } else {
                // If not in mapping, use the condition directly
                applicableWeatherKeywords.add(normalizedCondition);
            }
        });

        return items.filter(item => {
            if (!item.weather_suitability) {
                return false;
            }

            const itemWeatherSuitability = item.weather_suitability.toLowerCase();

            // Check if any of the applicable weather keywords match
            return Array.from(applicableWeatherKeywords).some(keyword =>
                itemWeatherSuitability.includes(keyword)
            );
        });
    }

    /**
     * Filter items by dress code/formality level
     * @param {Array<ClothingItem>} items - Array of clothing items
     * @param {string} dressCode - Dress code level to filter by
     * @returns {Array<ClothingItem>} Filtered items matching the dress code
     */
    filterByDressCode(items, dressCode) {
        if (!items || !Array.isArray(items) || !dressCode) {
            return items || [];
        }

        const normalizedDressCode = dressCode.toLowerCase().trim();
        const applicableFormalityLevels = this.formalityLevels[normalizedDressCode] || [normalizedDressCode];

        return items.filter(item => {
            if (!item.formality) {
                return false;
            }

            const itemFormality = item.formality.toLowerCase();
            return applicableFormalityLevels.some(level =>
                itemFormality.includes(level) || level.includes(itemFormality)
            );
        });
    }

    /**
     * Group items by category
     * @param {Array<ClothingItem>} items - Array of clothing items
     * @returns {Map<string, Array<ClothingItem>>} Map of standardized category names to items
     */
    categorizeItems(items) {
        if (!items || !Array.isArray(items)) {
            return new Map();
        }

        const categorizedItems = new Map();

        // Initialize all standard categories
        Object.keys(this.categoryMappings).forEach(category => {
            categorizedItems.set(category, []);
        });

        items.forEach(item => {
            if (!item.category) {
                return;
            }

            const itemCategory = item.category.toLowerCase();
            let categorized = false;

            // Find matching standard category
            for (const [standardCategory, variations] of Object.entries(this.categoryMappings)) {
                if (variations.some(variation =>
                    itemCategory.includes(variation) || variation.includes(itemCategory)
                )) {
                    categorizedItems.get(standardCategory).push(item);
                    categorized = true;
                    break;
                }
            }

            // If no standard category found, create a new one
            if (!categorized) {
                const categoryKey = itemCategory;
                if (!categorizedItems.has(categoryKey)) {
                    categorizedItems.set(categoryKey, []);
                }
                categorizedItems.get(categoryKey).push(item);
            }
        });

        // Remove empty categories
        for (const [category, items] of categorizedItems.entries()) {
            if (items.length === 0) {
                categorizedItems.delete(category);
            }
        }

        return categorizedItems;
    }

    /**
     * Filter items by multiple criteria
     * @param {Array<ClothingItem>} items - Array of clothing items
     * @param {Object} criteria - Filtering criteria
     * @param {string|Array<string>} criteria.weather - Weather conditions
     * @param {string} criteria.dressCode - Dress code level
     * @param {string|Array<string>} criteria.categories - Categories to include
     * @param {number} criteria.maxPrice - Maximum price filter
     * @param {Array<string>} criteria.colors - Preferred colors
     * @returns {Array<ClothingItem>} Filtered items
     */
    filterByCriteria(items, criteria = {}) {
        if (!items || !Array.isArray(items)) {
            return [];
        }

        let filteredItems = [...items];

        // Apply weather filter
        if (criteria.weather) {
            filteredItems = this.filterByWeather(filteredItems, criteria.weather);
        }

        // Apply dress code filter
        if (criteria.dressCode) {
            filteredItems = this.filterByDressCode(filteredItems, criteria.dressCode);
        }

        // Apply category filter
        if (criteria.categories) {
            const targetCategories = Array.isArray(criteria.categories)
                ? criteria.categories
                : [criteria.categories];

            filteredItems = filteredItems.filter(item => {
                const itemCategory = item.category.toLowerCase();
                return targetCategories.some(category =>
                    itemCategory.includes(category.toLowerCase()) ||
                    category.toLowerCase().includes(itemCategory)
                );
            });
        }

        // Apply price filter
        if (criteria.maxPrice && typeof criteria.maxPrice === 'number') {
            filteredItems = filteredItems.filter(item =>
                item.price <= criteria.maxPrice
            );
        }

        // Apply color filter
        if (criteria.colors && Array.isArray(criteria.colors)) {
            filteredItems = filteredItems.filter(item => {
                if (!item.colors) return false;
                const itemColors = item.colors.toLowerCase();
                return criteria.colors.some(color =>
                    itemColors.includes(color.toLowerCase())
                );
            });
        }

        return filteredItems;
    }

    /**
     * Get items suitable for layering
     * @param {Array<ClothingItem>} items - Array of clothing items
     * @param {string} layerType - Type of layer ('base', 'mid', 'outer')
     * @returns {Array<ClothingItem>} Items suitable for the specified layer
     */
    getItemsByLayer(items, layerType) {
        if (!items || !Array.isArray(items) || !layerType) {
            return [];
        }

        const normalizedLayerType = layerType.toLowerCase();
        return items.filter(item => {
            if (!item.layering) return false;
            return item.layering.toLowerCase().includes(normalizedLayerType);
        });
    }

    /**
     * Get items by tags
     * @param {Array<ClothingItem>} items - Array of clothing items
     * @param {Array<string>} tags - Tags to filter by
     * @returns {Array<ClothingItem>} Items that have any of the specified tags
     */
    getItemsByTags(items, tags) {
        if (!items || !Array.isArray(items) || !tags || !Array.isArray(tags)) {
            return [];
        }

        const normalizedTags = tags.map(tag => tag.toLowerCase());

        return items.filter(item => {
            if (!item.tags || !Array.isArray(item.tags)) return false;

            return item.tags.some(itemTag =>
                normalizedTags.some(searchTag =>
                    itemTag.toLowerCase().includes(searchTag)
                )
            );
        });
    }

    /**
     * Get statistics about filtered items
     * @param {Array<ClothingItem>} items - Array of clothing items
     * @returns {Object} Statistics about the items
     */
    getItemStatistics(items) {
        if (!items || !Array.isArray(items)) {
            return {
                totalItems: 0,
                categories: {},
                priceRange: { min: 0, max: 0, average: 0 },
                formalityLevels: {},
                weatherSuitability: {}
            };
        }

        const stats = {
            totalItems: items.length,
            categories: {},
            priceRange: { min: Infinity, max: 0, average: 0 },
            formalityLevels: {},
            weatherSuitability: {}
        };

        let totalPrice = 0;

        items.forEach(item => {
            // Category stats
            const category = item.category || 'Unknown';
            stats.categories[category] = (stats.categories[category] || 0) + 1;

            // Price stats
            if (item.price) {
                totalPrice += item.price;
                stats.priceRange.min = Math.min(stats.priceRange.min, item.price);
                stats.priceRange.max = Math.max(stats.priceRange.max, item.price);
            }

            // Formality stats
            const formality = item.formality || 'Unknown';
            stats.formalityLevels[formality] = (stats.formalityLevels[formality] || 0) + 1;

            // Weather suitability stats
            const weather = item.weather_suitability || 'Unknown';
            stats.weatherSuitability[weather] = (stats.weatherSuitability[weather] || 0) + 1;
        });

        // Calculate average price
        if (items.length > 0) {
            stats.priceRange.average = totalPrice / items.length;
        }

        // Handle case where no items have prices
        if (stats.priceRange.min === Infinity) {
            stats.priceRange.min = 0;
        }

        return stats;
    }

    // ===== ITEM COMPATIBILITY ANALYSIS METHODS =====

    /**
     * Check if two clothing items are compatible
     * @param {ClothingItem} item1 - First clothing item
     * @param {ClothingItem} item2 - Second clothing item
     * @returns {Object} Compatibility result with score and reasons
     */
    checkItemCompatibility(item1, item2) {
        if (!item1 || !item2) {
            return { compatible: false, score: 0, reasons: ['Invalid items provided'] };
        }

        const compatibility = {
            compatible: true,
            score: 100,
            reasons: [],
            issues: []
        };

        // Check color coordination
        const colorCompatibility = this.checkColorCompatibility(item1, item2);
        compatibility.score *= colorCompatibility.score;
        if (!colorCompatibility.compatible) {
            compatibility.compatible = false;
            compatibility.issues.push(`Color clash: ${colorCompatibility.reason}`);
        } else if (colorCompatibility.reason) {
            compatibility.reasons.push(colorCompatibility.reason);
        }

        // Check formality consistency
        const formalityCompatibility = this.checkFormalityCompatibility(item1, item2);
        compatibility.score *= formalityCompatibility.score;
        if (!formalityCompatibility.compatible) {
            compatibility.compatible = false;
            compatibility.issues.push(`Formality mismatch: ${formalityCompatibility.reason}`);
        } else if (formalityCompatibility.reason) {
            compatibility.reasons.push(formalityCompatibility.reason);
        }

        // Check style consistency
        const styleCompatibility = this.checkStyleCompatibility(item1, item2);
        compatibility.score *= styleCompatibility.score;
        if (!styleCompatibility.compatible) {
            compatibility.compatible = false;
            compatibility.issues.push(`Style conflict: ${styleCompatibility.reason}`);
        } else if (styleCompatibility.reason) {
            compatibility.reasons.push(styleCompatibility.reason);
        }

        // Normalize score to 0-100 range
        compatibility.score = Math.max(0, Math.min(100, compatibility.score));

        return compatibility;
    }

    /**
     * Check color compatibility between two items
     * @param {ClothingItem} item1 - First clothing item
     * @param {ClothingItem} item2 - Second clothing item
     * @returns {Object} Color compatibility result
     */
    checkColorCompatibility(item1, item2) {
        if (!item1.colors || !item2.colors) {
            return { compatible: true, score: 0.8, reason: 'Color information missing' };
        }

        const colors1 = this.extractColors(item1.colors);
        const colors2 = this.extractColors(item2.colors);

        // Define color compatibility rules
        const neutralColors = ['white', 'black', 'grey', 'gray', 'beige', 'cream', 'navy', 'brown'];
        const complementaryPairs = [
            ['blue', 'orange'], ['red', 'green'], ['yellow', 'purple'],
            ['navy', 'white'], ['black', 'white'], ['grey', 'yellow']
        ];
        const clashingCombinations = [
            ['red', 'pink'], ['orange', 'red'], ['purple', 'pink'],
            ['green', 'red'], ['blue', 'green']
        ];

        // Check for exact matches (always compatible)
        const hasCommonColor = colors1.some(color1 =>
            colors2.some(color2 => color1 === color2)
        );
        if (hasCommonColor) {
            return { compatible: true, score: 1.0, reason: 'Matching colors' };
        }

        // Check for neutral combinations (highly compatible)
        const hasNeutral1 = colors1.some(color => neutralColors.includes(color));
        const hasNeutral2 = colors2.some(color => neutralColors.includes(color));
        if (hasNeutral1 || hasNeutral2) {
            return { compatible: true, score: 0.9, reason: 'Neutral color combination' };
        }

        // Check for complementary colors
        const isComplementary = complementaryPairs.some(pair => {
            return (colors1.includes(pair[0]) && colors2.includes(pair[1])) ||
                (colors1.includes(pair[1]) && colors2.includes(pair[0]));
        });
        if (isComplementary) {
            return { compatible: true, score: 0.85, reason: 'Complementary colors' };
        }

        // Check for clashing combinations
        const isClashing = clashingCombinations.some(clash => {
            return (colors1.includes(clash[0]) && colors2.includes(clash[1])) ||
                (colors1.includes(clash[1]) && colors2.includes(clash[0]));
        });
        if (isClashing) {
            return { compatible: false, score: 0.3, reason: 'Clashing color combination' };
        }

        // Default: moderately compatible
        return { compatible: true, score: 0.7, reason: 'Acceptable color combination' };
    }

    /**
     * Check formality compatibility between two items
     * @param {ClothingItem} item1 - First clothing item
     * @param {ClothingItem} item2 - Second clothing item
     * @returns {Object} Formality compatibility result
     */
    checkFormalityCompatibility(item1, item2) {
        if (!item1.formality || !item2.formality) {
            return { compatible: true, score: 0.8, reason: 'Formality information missing' };
        }

        const formality1 = item1.formality.toLowerCase();
        const formality2 = item2.formality.toLowerCase();

        // Define formality hierarchy (0 = most casual, 4 = most formal)
        const formalityLevels = {
            'casual': 0,
            'smart-casual': 1,
            'business-casual': 2,
            'formal': 3,
            'black-tie': 4
        };

        const level1 = formalityLevels[formality1] ?? 1;
        const level2 = formalityLevels[formality2] ?? 1;
        const difference = Math.abs(level1 - level2);

        // Same formality level
        if (difference === 0) {
            return { compatible: true, score: 1.0, reason: 'Matching formality levels' };
        }

        // Adjacent formality levels (acceptable)
        if (difference === 1) {
            return { compatible: true, score: 0.8, reason: 'Compatible formality levels' };
        }

        // Two levels apart (questionable but possible)
        if (difference === 2) {
            return { compatible: true, score: 0.6, reason: 'Moderate formality difference' };
        }

        // More than two levels apart (incompatible)
        return {
            compatible: false,
            score: 0.3,
            reason: `Significant formality mismatch: ${formality1} vs ${formality2}`
        };
    }

    /**
     * Check style consistency between two items
     * @param {ClothingItem} item1 - First clothing item
     * @param {ClothingItem} item2 - Second clothing item
     * @returns {Object} Style compatibility result
     */
    checkStyleCompatibility(item1, item2) {
        if (!item1.tags || !item2.tags) {
            return { compatible: true, score: 0.8, reason: 'Style information missing' };
        }

        const tags1 = Array.isArray(item1.tags) ? item1.tags : [];
        const tags2 = Array.isArray(item2.tags) ? item2.tags : [];

        // Define style categories and their compatibility
        const styleCategories = {
            'sporty': ['sporty', 'athletic', 'casual', 'comfortable'],
            'elegant': ['elegant', 'sophisticated', 'formal', 'dressy'],
            'bohemian': ['bohemian', 'flowy', 'artistic', 'relaxed'],
            'minimalist': ['minimalist', 'clean', 'simple', 'structured'],
            'vintage': ['vintage', 'retro', 'classic', 'timeless'],
            'edgy': ['edgy', 'bold', 'modern', 'statement']
        };

        // Find style categories for each item
        const styles1 = this.getItemStyles(tags1, styleCategories);
        const styles2 = this.getItemStyles(tags2, styleCategories);

        // Check for common styles
        const commonStyles = styles1.filter(style => styles2.includes(style));
        if (commonStyles.length > 0) {
            return { compatible: true, score: 1.0, reason: `Matching style: ${commonStyles[0]}` };
        }

        // Check for compatible style combinations
        const compatibleCombinations = [
            ['elegant', 'minimalist'],
            ['sporty', 'casual'],
            ['bohemian', 'vintage'],
            ['minimalist', 'modern']
        ];

        const isCompatibleCombination = compatibleCombinations.some(combo => {
            return (styles1.includes(combo[0]) && styles2.includes(combo[1])) ||
                (styles1.includes(combo[1]) && styles2.includes(combo[0]));
        });

        if (isCompatibleCombination) {
            return { compatible: true, score: 0.85, reason: 'Compatible style combination' };
        }

        // Check for conflicting styles
        const conflictingCombinations = [
            ['sporty', 'elegant'],
            ['bohemian', 'minimalist'],
            ['vintage', 'modern'],
            ['edgy', 'classic']
        ];

        const isConflicting = conflictingCombinations.some(conflict => {
            return (styles1.includes(conflict[0]) && styles2.includes(conflict[1])) ||
                (styles1.includes(conflict[1]) && styles2.includes(conflict[0]));
        });

        if (isConflicting) {
            return { compatible: false, score: 0.4, reason: 'Conflicting style combination' };
        }

        // Default: neutral compatibility
        return { compatible: true, score: 0.7, reason: 'Neutral style combination' };
    }

    /**
     * Validate a complete outfit for consistency
     * @param {Object} outfitItems - Object containing outfit items by category
     * @returns {Object} Validation result with overall score and detailed feedback
     */
    validateOutfitConsistency(outfitItems) {
        if (!outfitItems || typeof outfitItems !== 'object') {
            return { valid: false, score: 0, issues: ['Invalid outfit items provided'] };
        }

        const validation = {
            valid: true,
            score: 100,
            issues: [],
            strengths: [],
            suggestions: []
        };

        const items = Object.values(outfitItems).filter(item => item !== null && item !== undefined);

        if (items.length < 2) {
            validation.valid = false;
            validation.score = 0;
            validation.issues.push('Insufficient items for outfit validation');
            return validation;
        }

        let totalCompatibilityScore = 0;
        let compatibilityChecks = 0;

        // Check pairwise compatibility between all items
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const compatibility = this.checkItemCompatibility(items[i], items[j]);
                totalCompatibilityScore += compatibility.score;
                compatibilityChecks++;

                if (!compatibility.compatible) {
                    validation.valid = false;
                    validation.issues.push(...compatibility.issues);
                } else {
                    validation.strengths.push(...compatibility.reasons);
                }
            }
        }

        // Calculate average compatibility score
        if (compatibilityChecks > 0) {
            validation.score = totalCompatibilityScore / compatibilityChecks;
        }

        // Check for essential items
        const hasTop = outfitItems.shirt || outfitItems.blouse || outfitItems.sweater;
        const hasBottom = outfitItems.pants || outfitItems.skirt || outfitItems.shorts;
        const hasShoes = outfitItems.shoes;

        if (!hasTop) {
            validation.issues.push('Missing top garment');
            validation.score *= 0.7;
        }
        if (!hasBottom) {
            validation.issues.push('Missing bottom garment');
            validation.score *= 0.7;
        }
        if (!hasShoes) {
            validation.suggestions.push('Consider adding shoes to complete the outfit');
        }

        // Check for weather appropriateness
        const weatherSuitabilities = items.map(item => item.weather_suitability).filter(Boolean);
        if (weatherSuitabilities.length > 0) {
            const uniqueWeatherTypes = [...new Set(weatherSuitabilities)];
            if (uniqueWeatherTypes.length > 2) {
                validation.suggestions.push('Items may not be suitable for the same weather conditions');
            }
        }

        validation.score = Math.max(0, Math.min(100, validation.score));

        if (validation.score < 60) {
            validation.valid = false;
        }

        return validation;
    }

    // ===== HELPER METHODS =====

    /**
     * Extract color names from color string
     * @param {string} colorString - String containing color information
     * @returns {Array<string>} Array of normalized color names
     */
    extractColors(colorString) {
        if (!colorString) return [];

        const colorString_lower = colorString.toLowerCase();
        const commonColors = [
            'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
            'black', 'white', 'grey', 'gray', 'brown', 'beige', 'cream',
            'navy', 'maroon', 'olive', 'teal', 'coral', 'salmon', 'khaki',
            'charcoal', 'ivory', 'tan', 'burgundy', 'gold', 'silver'
        ];

        return commonColors.filter(color => colorString_lower.includes(color));
    }

    /**
     * Get style categories for an item based on its tags
     * @param {Array<string>} tags - Item tags
     * @param {Object} styleCategories - Style category mappings
     * @returns {Array<string>} Array of style categories
     */
    getItemStyles(tags, styleCategories) {
        const styles = [];
        const lowerTags = tags.map(tag => tag.toLowerCase());

        for (const [category, keywords] of Object.entries(styleCategories)) {
            if (keywords.some(keyword => lowerTags.some(tag => tag.includes(keyword)))) {
                styles.push(category);
            }
        }

        return styles;
    }
}

// Export singleton instance
export const clothingAnalysisEngine = new ClothingAnalysisEngine();

// Export class for testing and custom instances
export default ClothingAnalysisEngine;