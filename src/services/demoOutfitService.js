/**
 * Demo Outfit Service
 * Returns pre-configured outfits for hackathon demo based on demo.md
 */

class DemoOutfitService {
    constructor() {
        this.demoPrompt = "2 day trip to spain\n\nWant to walk around the city and for a nice dinner and casual outfit";

        // Demo outfit configuration from demo.md
        this.demoOutfits = {
            walkAround: {
                name: "Walk around",
                occasion: "Walk around the city",
                clothes: {
                    top: "005",
                    shorts: "002",
                    shoes: "006"
                },
                accessories: ["D003", "D006", "D007", "D008"]
            },
            dinner: {
                name: "Dinner",
                occasion: "Nice dinner",
                clothes: {
                    dress: "D002",
                    shoes: "D009"
                },
                accessories: ["D003", "D006", "D007", "D008"]
            }
        };
    }

    /**
     * Check if we should use demo mode
     * @param {string} userInput - User's input prompt
     * @returns {boolean}
     */
    isDemoMode(userInput) {
        if (!userInput) {
            console.log('🎬 Demo check: No user input provided');
            return false;
        }

        const normalizedInput = userInput.toLowerCase().trim().replace(/\s+/g, ' ');
        console.log('🎬 Demo check: Input =', normalizedInput);

        // Check if input matches demo prompt (allow some variation)
        const hasSpain = normalizedInput.includes('spain');
        const hasWalk = normalizedInput.includes('walk') || normalizedInput.includes('city');
        const hasDinner = normalizedInput.includes('dinner');

        console.log('🎬 Demo check: spain =', hasSpain, ', walk/city =', hasWalk, ', dinner =', hasDinner);

        const isDemoMode = hasSpain && hasWalk && hasDinner;
        console.log('🎬 Demo mode:', isDemoMode ? 'ACTIVATED ✅' : 'Not activated ❌');

        return isDemoMode;
    }

    /**
     * Load demo dataset
     * @returns {Promise<Object>} Dataset with SKU map and CSV content
     */
    async loadDemoDataset() {
        try {
            const response = await fetch('/demo_dataset.csv');
            if (!response.ok) {
                throw new Error('Failed to load demo dataset');
            }

            const csvContent = await response.text();
            const lines = csvContent.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',');

            const skuMap = new Map();

            // Parse CSV and build SKU map
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length >= headers.length) {
                    const item = {};
                    headers.forEach((header, index) => {
                        item[header.trim()] = values[index]?.trim() || '';
                    });

                    if (item.sku) {
                        skuMap.set(item.sku, {
                            sku: item.sku,
                            name: item.name,
                            category: item.category,
                            price: parseFloat(item.price) || 0,
                            colors: item.colors,
                            weatherSuitability: item.weatherSuitability,
                            formality: item.formality,
                            layering: item.layering,
                            tags: item.tags,
                            notes: item.notes,
                            image: item.image,
                            productUrl: item.productUrl || null
                        });
                    }
                }
            }

            return {
                csvContent,
                skuMap,
                items: Array.from(skuMap.values())
            };
        } catch (error) {
            console.error('Error loading demo dataset:', error);
            throw error;
        }
    }

    /**
     * Parse a CSV line handling quoted values
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * Generate demo outfits
     * @param {string} sessionId - Session identifier
     * @param {Object} confirmedDetails - Event details
     * @returns {Promise<Object>} Generated outfits
     */
    async generateDemoOutfits(sessionId, confirmedDetails) {
        try {
            console.log('🎬 Generating DEMO outfits for hackathon');
            console.log('🎬 Using 3 closet items (005, 002, 006) for Walk Around outfit');

            // Add realistic delay to simulate AI processing (2-4 seconds)
            const delay = 2000 + Math.random() * 2000; // Random between 2-4 seconds
            console.log(`🎬 Simulating AI processing for ${Math.round(delay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            const dataset = await this.loadDemoDataset();
            const { skuMap } = dataset;

            // Build outfit 1: Walk around
            const outfit1 = this.buildOutfit(
                1,
                this.demoOutfits.walkAround,
                skuMap,
                sessionId
            );

            // Build outfit 2: Dinner
            const outfit2 = this.buildOutfit(
                2,
                this.demoOutfits.dinner,
                skuMap,
                sessionId
            );

            const outfits = {
                1: outfit1,
                2: outfit2
            };

            // Calculate reusability
            const reusabilityAnalysis = this.calculateReusability(outfits);

            console.log('🎬 Demo outfits generated successfully!');
            console.log('🎬 Day 1: 3 closet items + 4 accessories');
            console.log('🎬 Day 2: 2 demo items + 4 accessories (reused)');

            return {
                success: true,
                data: {
                    outfits,
                    reusabilityAnalysis,
                    contextSummary: {
                        occasion: 'Spain Trip',
                        location: 'Spain',
                        duration: 2
                    },
                    rawAiData: {
                        tripDetails: confirmedDetails,
                        dailyOutfits: [outfit1, outfit2]
                    },
                    generatedAt: new Date().toISOString(),
                    isDemoMode: true
                }
            };
        } catch (error) {
            console.error('Demo outfit generation error:', error);
            return {
                success: false,
                error: {
                    code: 'DEMO_GENERATION_ERROR',
                    message: error.message || 'Failed to generate demo outfits'
                }
            };
        }
    }

    /**
     * Build a single outfit from demo configuration
     */
    buildOutfit(day, demoConfig, skuMap, sessionId) {
        const { name, occasion, clothes, accessories } = demoConfig;

        const items = {
            topwear: null,
            bottomwear: null,
            footwear: null,
            outerwear: null,
            accessories: []
        };

        // Map clothes to outfit slots
        if (clothes.top) {
            items.topwear = skuMap.get(clothes.top);
        }
        if (clothes.dress) {
            // For dresses, put in topwear slot (it's a single piece)
            items.topwear = skuMap.get(clothes.dress);
        }
        if (clothes.shorts) {
            items.bottomwear = skuMap.get(clothes.shorts);
        }
        if (clothes.shoes) {
            items.footwear = skuMap.get(clothes.shoes);
        }

        // Add accessories
        if (accessories && Array.isArray(accessories)) {
            items.accessories = accessories
                .map(sku => skuMap.get(sku))
                .filter(item => item !== undefined);
        }

        // Create specific styling rationale for each outfit
        const styling = this.getStylingRationale(day, name, items);

        return {
            id: `outfit-${sessionId}-${day}`,
            name: name,
            day: day,
            tripId: sessionId,
            occasion: occasion,
            items: items,
            styling: styling,
            isSaved: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate specific styling rationale for each outfit
     */
    getStylingRationale(day, name, items) {
        if (day === 1) {
            // Walk Around outfit
            return {
                rationale: "This vibrant casual look uses pieces you already own! The pink graphic tee brings a soft, playful vibe perfect for Spain's relaxed daytime atmosphere. Paired with classic denim shorts for comfort during city exploration, and statement zebra print shoes that add personality while being walkable. Gold accessories elevate the casual base - bangles and hoops catch the Mediterranean light, while sunglasses protect from the Spanish sun. The brown heels are included for an evening tapas option.",
                weatherConsiderations: "Ideal for warm Spanish weather (20-28°C). The breathable cotton tee keeps you cool, shorts provide comfort for walking, and the accessories are lightweight. Sunglasses are essential for bright Mediterranean sunshine.",
                dresscodeCompliance: "Perfect casual attire for daytime city exploring. The outfit strikes the right balance - relaxed enough for comfort but stylish enough for Spain's fashion-conscious streets. The zebra shoes add that bold European flair Spaniards appreciate."
            };
        } else {
            // Dinner outfit
            return {
                rationale: "This elegant sequin halter dress makes a statement for your nice dinner out. The brown and gold tones create a warm, sophisticated look ideal for Spanish evening ambiance. The dress's halter neckline is perfect for warm nights, while the sequins catch candlelight beautifully. Black heels provide classic elegance and height. The same gold accessories from daytime create outfit cohesion across your trip - smart packing! The sunglasses transition from day to evening, useful for sunset pre-dinner drinks.",
                weatherConsiderations: "Perfect for warm Spanish evenings (18-24°C). The halter style keeps you cool while dining outdoors, and the dress's cut allows air circulation. Light enough for summer nights but elegant enough for upscale venues.",
                dresscodeCompliance: "Ideal smart-casual dinner attire. In Spain, evening dining calls for elevated style - this sequin dress hits the mark without being overly formal. Black heels add sophistication, and the gold accessories show you've made an effort, which Spanish restaurants appreciate."
            };
        }
    }

    /**
     * Calculate reusability metrics
     */
    calculateReusability(outfits) {
        const usageMap = new Map();

        Object.values(outfits).forEach(outfit => {
            const { items, day } = outfit;

            // Track main clothing items
            ['topwear', 'bottomwear', 'footwear', 'outerwear'].forEach(slot => {
                const item = items[slot];
                if (item && item.sku) {
                    if (!usageMap.has(item.sku)) {
                        usageMap.set(item.sku, []);
                    }
                    usageMap.get(item.sku).push(day);
                }
            });

            // Track accessories
            (items.accessories || []).forEach(accessory => {
                if (accessory && accessory.sku) {
                    if (!usageMap.has(accessory.sku)) {
                        usageMap.set(accessory.sku, []);
                    }
                    usageMap.get(accessory.sku).push(day);
                }
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
}

// Export singleton instance
const demoOutfitService = new DemoOutfitService();
export default demoOutfitService;

