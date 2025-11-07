/**
 * Basic tests for CSVLoader utility
 * Tests CSV loading, caching, and error handling
 */

import csvLoader from '../CSVLoader';

describe('CSVLoader', () => {
    beforeEach(() => {
        // Clear cache before each test
        csvLoader.clearCache();
        // Suppress console.error during tests
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        // Restore console.error after each test
        console.error.mockRestore();
    });

    test('should be properly instantiated', () => {
        expect(csvLoader).toBeDefined();
        expect(typeof csvLoader.loadCSV).toBe('function');
        expect(typeof csvLoader.formatForAI).toBe('function');
        expect(typeof csvLoader.parseCSV).toBe('function');
    });

    test('should handle CSV loading errors', async () => {
        // Mock fetch to simulate failure
        global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

        await expect(csvLoader.loadCSV('/nonexistent.csv')).rejects.toThrow('Failed to load CSV file');

        global.fetch.mockRestore();
    });

    test('should handle HTTP errors', async () => {
        // Mock fetch to simulate 404
        global.fetch = jest.fn(() => Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found'
        }));

        await expect(csvLoader.loadCSV('/missing.csv')).rejects.toThrow('CSV file not found');

        global.fetch.mockRestore();
    });

    test('should validate CSV content', () => {
        expect(() => csvLoader.validateCSVContent('')).toThrow('CSV content must be a non-empty string');
        expect(() => csvLoader.validateCSVContent('header only')).toThrow('must contain a header row and at least one data row');
        expect(() => csvLoader.validateCSVContent('invalid,header\ndata,row')).toThrow('missing required columns');
    });

    test('should format CSV for AI', () => {
        const csvContent = 'sku,name,category\nSKU001,Test Item,Topwear';
        const formatted = csvLoader.formatForAI(csvContent);

        expect(formatted).toContain('CLOTHING DATASET:');
        expect(formatted).toContain('Total Items: 1');
        expect(formatted).toContain('CSV DATA:');
        expect(formatted).toContain(csvContent);
    });

    test('should parse CSV correctly', () => {
        const csvContent = 'sku,name,category\nSKU001,Test Item,Topwear\nSKU002,Another Item,Bottomwear';
        const parsed = csvLoader.parseCSV(csvContent);

        expect(parsed).toHaveLength(2);
        expect(parsed[0]).toEqual({
            sku: 'SKU001',
            name: 'Test Item',
            category: 'Topwear'
        });
        expect(parsed[1]).toEqual({
            sku: 'SKU002',
            name: 'Another Item',
            category: 'Bottomwear'
        });
    });

    test('should provide cache statistics', () => {
        const stats = csvLoader.getCacheStats();

        expect(stats).toBeDefined();
        expect(typeof stats.totalEntries).toBe('number');
        expect(typeof stats.validEntries).toBe('number');
        expect(typeof stats.cacheTimeout).toBe('number');
    });

    test('should clear cache', () => {
        expect(() => {
            csvLoader.clearCache();
        }).not.toThrow();
    });

    test('should cleanup expired cache entries', () => {
        const cleaned = csvLoader.cleanupCache();
        expect(typeof cleaned).toBe('number');
    });
});