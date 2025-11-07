/**
 * Basic integration tests for OutfitGenerationService
 * Tests core functionality and error handling
 */

import outfitGenerationService from '../OutfitGenerationService';
import csvLoader from '../CSVLoader';

describe('OutfitGenerationService', () => {
    beforeEach(() => {
        // Clear any cached data before each test
        csvLoader.clearCache();
        // Suppress console.error during tests
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        // Restore console.error after each test
        console.error.mockRestore();
    });

    test('should be properly instantiated', () => {
        expect(outfitGenerationService).toBeDefined();
        expect(typeof outfitGenerationService.generateOutfits).toBe('function');
        expect(typeof outfitGenerationService.loadClothingDataset).toBe('function');
    });

    test('should validate inputs correctly', async () => {
        // Test invalid session ID
        const result1 = await outfitGenerationService.generateOutfits(null, {
            occasion: 'conference',
            duration: 3
        });

        expect(result1.success).toBe(false);
        expect(result1.error.message).toContain('session ID');

        // Test invalid confirmed details
        const result2 = await outfitGenerationService.generateOutfits('test-session', null);

        expect(result2.success).toBe(false);
        expect(result2.error.message).toContain('Confirmed details');

        // Test missing duration
        const result3 = await outfitGenerationService.generateOutfits('test-session', {
            occasion: 'conference'
        });

        expect(result3.success).toBe(false);
        expect(result3.error.message).toContain('duration');
    });

    test('should handle CSV loading errors gracefully', async () => {
        // Mock fetch to simulate CSV loading failure
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

        const result = await outfitGenerationService.generateOutfits('test-session', {
            occasion: 'conference',
            duration: 3
        });

        expect(result.success).toBe(false);
        expect(result.error.message).toContain('clothing dataset');

        // Restore original fetch
        global.fetch = originalFetch;
    });

    test('should provide cache status', () => {
        const cacheStatus = outfitGenerationService.getCacheStatus();

        expect(cacheStatus).toBeDefined();
        expect(typeof cacheStatus.totalEntries).toBe('number');
        expect(typeof cacheStatus.validEntries).toBe('number');
    });

    test('should clear cache', () => {
        expect(() => {
            outfitGenerationService.clearCache();
        }).not.toThrow();
    });
});