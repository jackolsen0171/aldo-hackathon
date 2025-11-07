/**
 * CSV Loader Utility
 * Handles loading and formatting of clothing dataset CSV file
 * Provides caching and error handling for CSV operations
 */

class CSVLoader {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Load CSV file from the specified path
     * @param {string} filePath - Path to the CSV file (relative to public directory)
     * @returns {Promise<string>} Raw CSV content
     */
    async loadCSV(filePath) {
        try {
            // Check cache first
            const cacheKey = filePath;
            const cachedData = this.getCachedData(cacheKey);

            if (cachedData) {
                return cachedData.content;
            }

            // Load CSV file
            const response = await fetch(filePath);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvContent = await response.text();

            // Validate content
            this.validateCSVContent(csvContent);

            // Cache the data
            this.setCachedData(cacheKey, csvContent);

            return csvContent;

        } catch (error) {
            console.error(`CSV loading error for ${filePath}:`, error);

            // Provide specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(`Unable to access CSV file at ${filePath}. Please ensure the file exists in the public directory.`);
            }

            if (error.message.includes('HTTP 404')) {
                throw new Error(`CSV file not found at ${filePath}. Please check the file path.`);
            }

            throw new Error(`Failed to load CSV file: ${error.message}`);
        }
    }

    /**
     * Format CSV content for AI consumption
     * @param {string} csvContent - Raw CSV content
     * @returns {string} Formatted CSV content with metadata
     */
    formatForAI(csvContent) {
        try {
            const lines = csvContent.trim().split('\n');
            const header = lines[0];
            const dataRows = lines.slice(1);

            let formattedContent = "CLOTHING DATASET:\n\n";
            formattedContent += `Total Items: ${dataRows.length}\n`;
            formattedContent += `Columns: ${header.split(',').join(', ')}\n\n`;
            formattedContent += "CSV DATA:\n";
            formattedContent += csvContent;

            return formattedContent;

        } catch (error) {
            console.error('CSV formatting error:', error);
            throw new Error(`Failed to format CSV content: ${error.message}`);
        }
    }

    /**
     * Parse CSV content into structured data
     * @param {string} csvContent - Raw CSV content
     * @returns {Array<Object>} Parsed CSV data as array of objects
     */
    parseCSV(csvContent) {
        try {
            const lines = csvContent.trim().split('\n');

            if (lines.length < 2) {
                throw new Error('CSV must contain header and at least one data row');
            }

            const headers = lines[0].split(',').map(header => header.trim());
            const data = [];

            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);

                if (values.length !== headers.length) {
                    console.warn(`Row ${i + 1} has ${values.length} values but expected ${headers.length}`);
                    continue;
                }

                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });

                data.push(row);
            }

            return data;

        } catch (error) {
            console.error('CSV parsing error:', error);
            throw new Error(`Failed to parse CSV content: ${error.message}`);
        }
    }

    /**
     * Parse a single CSV line handling quoted values
     * @param {string} line - CSV line to parse
     * @returns {Array<string>} Parsed values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    }

    /**
     * Validate CSV content structure and format
     * @param {string} csvContent - Raw CSV content to validate
     */
    validateCSVContent(csvContent) {
        if (!csvContent || typeof csvContent !== 'string') {
            throw new Error('CSV content must be a non-empty string');
        }

        const trimmedContent = csvContent.trim();
        if (trimmedContent.length === 0) {
            throw new Error('CSV file is empty');
        }

        const lines = trimmedContent.split('\n');
        if (lines.length < 2) {
            throw new Error('CSV file must contain a header row and at least one data row');
        }

        // Validate header
        const header = lines[0];
        if (!header || header.trim().length === 0) {
            throw new Error('CSV file must have a valid header row');
        }

        // Check for minimum required columns for clothing dataset
        const headerLower = header.toLowerCase();
        const requiredColumns = ['sku', 'name', 'category'];
        const missingColumns = requiredColumns.filter(col => !headerLower.includes(col));

        if (missingColumns.length > 0) {
            throw new Error(`CSV file missing required columns: ${missingColumns.join(', ')}`);
        }
    }

    /**
     * Get cached data if valid
     * @param {string} cacheKey - Cache key
     * @returns {Object|null} Cached data or null if not found/expired
     */
    getCachedData(cacheKey) {
        const cached = this.cache.get(cacheKey);

        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(cacheKey);
            return null;
        }

        return cached;
    }

    /**
     * Set cached data
     * @param {string} cacheKey - Cache key
     * @param {string} content - Content to cache
     */
    setCachedData(cacheKey, content) {
        this.cache.set(cacheKey, {
            content,
            timestamp: Date.now()
        });
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const entries = Array.from(this.cache.entries());
        const validEntries = entries.filter(([key, data]) =>
            Date.now() - data.timestamp <= this.cacheTimeout
        );

        return {
            totalEntries: this.cache.size,
            validEntries: validEntries.length,
            expiredEntries: this.cache.size - validEntries.length,
            cacheTimeout: this.cacheTimeout
        };
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, data] of this.cache.entries()) {
            if (now - data.timestamp > this.cacheTimeout) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        return keysToDelete.length;
    }
}

// Export singleton instance
const csvLoader = new CSVLoader();
export default csvLoader;
export { CSVLoader };