/**
 * Weather Context Service Tests
 * Tests for the weather context orchestration service
 */

import weatherContextService from '../weatherContextService.js';
import contextAccumulator from '../contextAccumulator.js';

// Mock the weather service
jest.mock('../weatherService.js', () => ({
    geocodeLocation: jest.fn(),
    getWeatherForLocationAndDate: jest.fn()
}));

// Mock the context accumulator
jest.mock('../contextAccumulator.js', () => ({
    addWeatherContext: jest.fn()
}));

describe('WeatherContextService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear cache
        weatherContextService.cache.clear();
    });

    describe('processLocationAndDates', () => {
        test('should process valid event details with location and date', async () => {
            const mockWeatherService = require('../weatherService.js');
            mockWeatherService.geocodeLocation.mockResolvedValue({
                name: 'New York',
                country: 'US',
                state: 'NY',
                coordinates: { lat: 40.7128, lon: -74.0060 }
            });

            const eventDetails = {
                location: 'New York',
                startDate: '2024-12-01',
                duration: 3
            };

            const result = await weatherContextService.processLocationAndDates(eventDetails);

            expect(result.location.name).toBe('New York');
            expect(result.location.coordinates).toEqual({ lat: 40.7128, lon: -74.0060 });
            expect(result.dateRange.duration).toBe(3);
            expect(mockWeatherService.geocodeLocation).toHaveBeenCalledWith('New York');
        });

        test('should throw error when location is missing', async () => {
            const eventDetails = {
                startDate: '2024-12-01',
                duration: 3
            };

            await expect(weatherContextService.processLocationAndDates(eventDetails))
                .rejects.toThrow('Location is required for weather context gathering');
        });
    });

    describe('calculateDateRange', () => {
        test('should calculate correct date range for valid inputs', () => {
            const result = weatherContextService.calculateDateRange('2024-12-01', 3);

            expect(result.start).toBe('2024-12-01');
            expect(result.end).toBe('2024-12-03');
            expect(result.duration).toBe(3);
        });

        test('should use current date when startDate is not provided', () => {
            const today = new Date().toISOString().split('T')[0];
            const result = weatherContextService.calculateDateRange(null, 1);

            expect(result.start).toBe(today);
            expect(result.duration).toBe(1);
        });

        test('should limit forecast to 14 days maximum', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20);
            const futureDateString = futureDate.toISOString().split('T')[0];

            const result = weatherContextService.calculateDateRange(futureDateString, 10);

            // Should be limited to 14 days from now
            const maxEndDate = new Date();
            maxEndDate.setDate(maxEndDate.getDate() + 14);
            const maxEndDateString = maxEndDate.toISOString().split('T')[0];

            expect(result.end).toBe(maxEndDateString);
        });
    });

    describe('categorizeWeatherCondition', () => {
        test('should categorize weather conditions correctly', () => {
            expect(weatherContextService.categorizeWeatherCondition('Clear')).toBe('sunny');
            expect(weatherContextService.categorizeWeatherCondition('Rain')).toBe('rainy');
            expect(weatherContextService.categorizeWeatherCondition('Snow')).toBe('snowy');
            expect(weatherContextService.categorizeWeatherCondition('Clouds')).toBe('cloudy');
            expect(weatherContextService.categorizeWeatherCondition('Unknown')).toBe('cloudy');
        });

        test('should handle enhanced weather condition categorization', () => {
            // Test enhanced rain conditions
            expect(weatherContextService.categorizeWeatherCondition('light rain')).toBe('rainy');
            expect(weatherContextService.categorizeWeatherCondition('heavy intensity rain')).toBe('rainy');
            expect(weatherContextService.categorizeWeatherCondition('thunderstorm with rain')).toBe('rainy');

            // Test enhanced snow conditions
            expect(weatherContextService.categorizeWeatherCondition('light snow')).toBe('snowy');
            expect(weatherContextService.categorizeWeatherCondition('sleet')).toBe('snowy');

            // Test enhanced cloudy conditions
            expect(weatherContextService.categorizeWeatherCondition('scattered clouds')).toBe('cloudy');
            expect(weatherContextService.categorizeWeatherCondition('overcast clouds')).toBe('cloudy');

            // Test windy conditions
            expect(weatherContextService.categorizeWeatherCondition('Squalls')).toBe('windy');
            expect(weatherContextService.categorizeWeatherCondition('sand/dust whirls')).toBe('windy');

            // Test case insensitive matching
            expect(weatherContextService.categorizeWeatherCondition('CLEAR SKY')).toBe('sunny');
            expect(weatherContextService.categorizeWeatherCondition('Light Rain')).toBe('rainy');
        });

        test('should handle partial matching for complex descriptions', () => {
            expect(weatherContextService.categorizeWeatherCondition('some rain expected')).toBe('rainy');
            expect(weatherContextService.categorizeWeatherCondition('windy conditions')).toBe('windy');
            expect(weatherContextService.categorizeWeatherCondition('clear and sunny')).toBe('sunny');
            expect(weatherContextService.categorizeWeatherCondition('snow possible')).toBe('snowy');
        });
    });

    describe('calculateComfortIndices', () => {
        test('should calculate heat index correctly', () => {
            const weather = {
                temperature: { current: 30, feels_like: 32 },
                humidity: 70,
                wind: { speed: 5 }
            };

            const comfort = weatherContextService.calculateComfortIndices(weather);

            expect(comfort.heatIndex).toBeGreaterThan(30);
            expect(comfort.comfortLevel).toBe('hot');
            expect(comfort.comfortFactors).toContain('high heat index');
        });

        test('should calculate wind chill correctly', () => {
            const weather = {
                temperature: { current: 5, feels_like: 2 },
                humidity: 60,
                wind: { speed: 10 }
            };

            const comfort = weatherContextService.calculateComfortIndices(weather);

            expect(comfort.windChill).toBeLessThan(5);
            expect(comfort.windChill).not.toBeNull();
            expect(comfort.comfortLevel).toBe('cold');
        });

        test('should handle comfortable conditions', () => {
            const weather = {
                temperature: { current: 22, feels_like: 22 },
                humidity: 50,
                wind: { speed: 3 }
            };

            const comfort = weatherContextService.calculateComfortIndices(weather);

            expect(comfort.comfortLevel).toBe('comfortable');
            expect(comfort.heatIndex).toBeNull();
            expect(comfort.windChill).toBeNull();
        });

        test('should calculate discomfort index', () => {
            const weather = {
                temperature: { current: 28, feels_like: 30 },
                humidity: 80,
                wind: { speed: 2 }
            };

            const comfort = weatherContextService.calculateComfortIndices(weather);

            expect(comfort.discomfortIndex).toBeDefined();
            expect(comfort.discomfortIndex.level).toBeDefined();
            expect(comfort.discomfortIndex.value).toBeGreaterThan(20);
        });
    });

    describe('generateWeatherRecommendations', () => {
        test('should generate comprehensive clothing recommendations for cold weather', () => {
            const weather = {
                temperature: { current: 2, min: 0, max: 5, feels_like: -1 },
                conditions: { main: 'snowy', precipitation: { probability: 80 } },
                humidity: 70,
                wind: { speed: 8 }
            };

            const recommendations = weatherContextService.generateWeatherRecommendations(weather);

            expect(recommendations.layering).toBe('heavy');
            expect(recommendations.layeringDetails).toContain('warm base layer');
            expect(recommendations.waterproof).toBe(true);
            expect(recommendations.warmAccessories).toBe(true);
            expect(recommendations.footwear.primary).toContain('insulated waterproof boots');
        });

        test('should generate recommendations for hot sunny weather', () => {
            const weather = {
                temperature: { current: 32, min: 28, max: 35, feels_like: 36 },
                conditions: { main: 'sunny', precipitation: { probability: 5 } },
                humidity: 40,
                wind: { speed: 3 }
            };

            const recommendations = weatherContextService.generateWeatherRecommendations(weather);

            expect(recommendations.layering).toBe('none');
            expect(recommendations.layeringDetails).toContain('lightweight, breathable clothing');
            expect(recommendations.sunProtection).toBe(true);
            expect(recommendations.sunProtectionDetails).toContain('strong sun protection needed');
            expect(recommendations.fabrics.recommended).toContain('cotton');
            expect(recommendations.colors.recommended).toContain('light colors');
        });

        test('should generate recommendations for rainy weather', () => {
            const weather = {
                temperature: { current: 18, min: 15, max: 20, feels_like: 17 },
                conditions: { main: 'rainy', precipitation: { probability: 90 } },
                humidity: 85,
                wind: { speed: 12 }
            };

            const recommendations = weatherContextService.generateWeatherRecommendations(weather);

            expect(recommendations.waterproof).toBe(true);
            expect(recommendations.waterproofDetails).toContain('rain protection essential');
            expect(recommendations.footwear.primary).toContain('waterproof boots');
            expect(recommendations.fabrics.recommended).toContain('merino wool');
            expect(recommendations.fabrics.avoid).toContain('cotton');
        });

        test('should provide activity adjustments', () => {
            const weather = {
                temperature: { current: 30, min: 28, max: 32, feels_like: 33 },
                conditions: { main: 'sunny', precipitation: { probability: 0 } },
                humidity: 60,
                wind: { speed: 5 }
            };

            const recommendations = weatherContextService.generateWeatherRecommendations(weather);

            expect(recommendations.activityAdjustments).toContain('Consider lighter clothing if active outdoors');
            expect(recommendations.activityAdjustments).toContain('Increase hydration for outdoor activities');
        });

        test('should provide comfort tips', () => {
            const weather = {
                temperature: { current: 25, min: 22, max: 28, feels_like: 27 },
                conditions: { main: 'sunny', precipitation: { probability: 10 } },
                humidity: 75,
                wind: { speed: 4 }
            };

            const recommendations = weatherContextService.generateWeatherRecommendations(weather);

            expect(recommendations.comfortTips).toContain('Choose breathable fabrics to manage moisture');
            // The sun protection tip is only added for sunny conditions with temp > 25, let's check for humidity tip instead
            expect(recommendations.comfortTips).toContain('Avoid tight-fitting clothes in humid conditions');
        });
    });

    describe('generateWeatherSummary', () => {
        test('should generate correct weather summary for multiple days', () => {
            const weatherData = [
                {
                    date: '2024-12-01',
                    temperature: { min: 10, max: 20, average: 15 },
                    conditions: {
                        main: 'sunny',
                        wind: { speed: 5 }
                    }
                },
                {
                    date: '2024-12-02',
                    temperature: { min: 15, max: 25, average: 20 },
                    conditions: {
                        main: 'cloudy',
                        wind: { speed: 8 }
                    }
                }
            ];

            const summary = weatherContextService.generateWeatherSummary(weatherData);

            expect(summary.temperatureRange).toEqual({ min: 10, max: 25 });
            expect(summary.overallConditions).toBe('cloudy'); // Most frequent or last in case of tie
            expect(summary.significantWeatherChanges).toBe(false);
        });

        test('should return null for empty weather data', () => {
            const summary = weatherContextService.generateWeatherSummary([]);
            expect(summary).toBeNull();
        });
    });

    describe('gatherWeatherContext', () => {
        test('should successfully gather weather context', async () => {
            const mockWeatherService = require('../weatherService.js');

            // Mock geocoding
            mockWeatherService.geocodeLocation.mockResolvedValue({
                name: 'New York',
                country: 'US',
                state: 'NY',
                coordinates: { lat: 40.7128, lon: -74.0060 }
            });

            // Mock weather data
            mockWeatherService.getWeatherForLocationAndDate.mockResolvedValue({
                weather: {
                    temperature: { min: 10, max: 20, current: 15, feels_like: 16, unit: 'celsius' },
                    conditions: { main: 'Clear', description: 'Clear sky' },
                    humidity: 60,
                    wind: { speed: 5, direction: 180 }
                }
            });

            const eventDetails = {
                location: 'New York',
                startDate: '2024-12-01',
                duration: 1,
                occasion: 'business meeting'
            };

            const result = await weatherContextService.gatherWeatherContext(eventDetails, 'test-session');

            expect(result.success).toBe(true);
            expect(result.weatherContext).toBeDefined();
            expect(result.weatherContext.weatherContext.location.name).toBe('New York');
            expect(contextAccumulator.addWeatherContext).toHaveBeenCalledWith('test-session', expect.any(Object));
        });

        test('should handle errors and provide fallback', async () => {
            const mockWeatherService = require('../weatherService.js');
            mockWeatherService.geocodeLocation.mockRejectedValue(new Error('API Error'));

            const eventDetails = {
                location: 'Invalid Location',
                startDate: '2024-12-01',
                duration: 1
            };

            const result = await weatherContextService.gatherWeatherContext(eventDetails, 'test-session');

            expect(result.success).toBe(true);
            expect(result.fallbackUsed).toBe(true);
            expect(result.weatherContext).toBeDefined();
        });
    });

    describe('assessWeatherQuality', () => {
        test('should assess excellent weather quality', () => {
            const weatherData = {
                temperature: { average: 22 },
                conditions: {
                    main: 'sunny',
                    wind: { speed: 3 },
                    humidity: 50,
                    precipitation: { probability: 10 }
                }
            };

            const quality = weatherContextService.assessWeatherQuality(weatherData);

            expect(quality.rating).toBe('excellent');
            expect(quality.score).toBeGreaterThan(80);
            expect(quality.advantages).toContain('comfortable temperature range');
            expect(quality.advantages).toContain('low precipitation risk');
            expect(quality.outfitComplexity).toBe('low');
        });

        test('should assess challenging weather quality', () => {
            const weatherData = {
                temperature: { average: 2 },
                conditions: {
                    main: 'snowy',
                    wind: { speed: 18 },
                    humidity: 85,
                    precipitation: { probability: 85 }
                }
            };

            const quality = weatherContextService.assessWeatherQuality(weatherData);

            expect(quality.rating).toBe('difficult');
            expect(quality.score).toBeLessThan(40);
            expect(quality.challenges).toContain('extreme temperature');
            expect(quality.challenges).toContain('snow conditions');
            expect(quality.challenges).toContain('moderate winds');
            expect(quality.outfitComplexity).toBe('high');
        });

        test('should assess fair weather with moderate challenges', () => {
            const weatherData = {
                temperature: { average: 28 },
                conditions: {
                    main: 'rainy',
                    wind: { speed: 8 },
                    humidity: 75,
                    precipitation: { probability: 60 }
                }
            };

            const quality = weatherContextService.assessWeatherQuality(weatherData);

            expect(quality.rating).toBe('good');
            expect(quality.score).toBeGreaterThan(40);
            expect(quality.challenges).toContain('wet conditions');
            expect(quality.outfitComplexity).toBe('moderate');
        });
    });

    describe('caching', () => {
        test('should cache and retrieve weather data', () => {
            const testData = { temperature: 20 };
            const cacheKey = 'test-key';

            weatherContextService.cacheWeatherData(cacheKey, testData);
            const cached = weatherContextService.getCachedWeatherData(cacheKey);

            expect(cached).toEqual(testData);
        });

        test('should return null for expired cache', () => {
            const testData = { temperature: 20 };
            const cacheKey = 'test-key';

            // Manually set expired cache
            weatherContextService.cache.set(cacheKey, {
                data: testData,
                timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            });

            const cached = weatherContextService.getCachedWeatherData(cacheKey);
            expect(cached).toBeNull();
        });
    });
});