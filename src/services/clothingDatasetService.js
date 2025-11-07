import csvLoader from './CSVLoader';

const CATEGORY_MAP = {
    topwear: 'topwear',
    tops: 'topwear',
    shirts: 'topwear',
    blouses: 'topwear',
    dresses: 'dress',
    bottomwear: 'bottomwear',
    bottoms: 'bottomwear',
    pants: 'bottomwear',
    trousers: 'bottomwear',
    skirts: 'bottomwear',
    footwear: 'footwear',
    shoes: 'footwear',
    sneakers: 'footwear',
    boots: 'footwear',
    outerwear: 'outerwear',
    jackets: 'outerwear',
    coats: 'outerwear',
    accessories: 'accessories',
    accessory: 'accessories',
    bags: 'accessories'
};

const HEADER_MAP = {
    weather_suitability: 'weatherSuitability'
};

class ClothingDatasetService {
    constructor() {
        this.datasetPromise = null;
    }

    /**
     * Get the normalized dataset (cached per session)
     * @returns {Promise<{csvContent: string, items: Array, skuMap: Map<string, Object>}>}
     */
    async getDataset() {
        if (!this.datasetPromise) {
            this.datasetPromise = this.loadDataset();
        }
        return this.datasetPromise;
    }

    /**
     * Force dataset reload (mainly for tests)
     */
    async refreshDataset() {
        this.datasetPromise = this.loadDataset();
        return this.datasetPromise;
    }

    async loadDataset() {
        const csvContent = await csvLoader.loadCSV('/clothing_dataset.csv');
        const parsedRows = csvLoader.parseCSV(csvContent);

        const items = parsedRows
            .filter(row => row.sku)
            .map(row => this.normalizeItem(row));

        const skuMap = new Map();
        items.forEach(item => {
            skuMap.set(item.sku, item);
        });

        return {
            csvContent,
            items,
            skuMap
        };
    }

    normalizeItem(row) {
        const normalized = {};

        Object.entries(row).forEach(([key, value]) => {
            const targetKey = HEADER_MAP[key] || key;
            normalized[targetKey] = typeof value === 'string' ? value.trim() : value;
        });

        const normalizedCategory = this.normalizeCategory(normalized.category);

        return {
            sku: normalized.sku,
            name: normalized.name,
            category: normalizedCategory,
            tags: normalized.tags ? normalized.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
            weatherSuitability: normalized.weatherSuitability || normalized.weather_suitability || '',
            price: normalized.price ? Number(normalized.price) : null,
            colors: normalized.colors || '',
            layering: normalized.layering || '',
            formality: normalized.formality || '',
            notes: normalized.notes || '',
            rawCategory: normalized.category
        };
    }

    normalizeCategory(categoryValue = '') {
        const key = categoryValue.toString().toLowerCase();
        return CATEGORY_MAP[key] || categoryValue.toLowerCase() || 'accessories';
    }
}

const clothingDatasetService = new ClothingDatasetService();
export default clothingDatasetService;
