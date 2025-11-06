/**
 * Context Accumulator Service Tests
 * Tests for the context accumulation system
 */

import { ContextAccumulator } from '../contextAccumulator.js';

describe('ContextAccumulator', () => {
    let contextAccumulator;
    const testSessionId = 'test-session-123';

    beforeEach(() => {
        contextAccumulator = new ContextAccumulator();
        contextAccumulator.reset(); // Clear any existing data
    });

    afterEach(() => {
        contextAccumulator.reset(); // Clean up after each test
    });

    describe('Context File Initialization', () => {
        test('should initialize a new context file', () => {
            const contextFile = contextAccumulator.initializeContextFile(testSessionId);

            expect(contextFile).toBeDefined();
            expect(contextFile.sessionId).toBe(testSessionId);
            expect(contextFile.userInput).toBeDefined();
            expect(contextFile.environmentalContext).toBeDefined();
            expect(contextFile.constraints).toBeDefined();
            expect(contextFile.metadata).toBeDefined();
            expect(contextFile.metadata.processingStage).toBe('initialized');
        });

        test('should initialize context file with initial data', () => {
            const initialData = {
                originalMessage: 'Test message'
            };

            const contextFile = contextAccumulator.initializeContextFile(testSessionId, initialData);

            expect(contextFile.userInput.originalMessage).toBe('Test message');
        });
    });

    describe('Adding Extracted Details', () => {
        test('should add extracted details to context file', () => {
            // Initialize context file first
            contextAccumulator.initializeContextFile(testSessionId);

            const extractedDetails = {
                occasion: 'business conference',
                location: 'New York',
                startDate: '2024-01-15',
                duration: 3,
                dressCode: 'business',
                budget: 500,
                specialRequirements: ['professional attire'],
                needsClarification: [],
                confidence: 0.8
            };

            const updatedContext = contextAccumulator.addExtractedDetails(
                testSessionId,
                extractedDetails,
                'Original user message'
            );

            expect(updatedContext.userInput.extractedDetails).toEqual(extractedDetails);
            expect(updatedContext.userInput.originalMessage).toBe('Original user message');
            expect(updatedContext.constraints.dressCode).toBe('business');
            expect(updatedContext.constraints.budget).toBe(500);
            expect(updatedContext.metadata.confidence).toBe(0.8);
            expect(updatedContext.metadata.processingStage).toBe('details_extracted');
        });

        test('should handle missing context file', () => {
            const extractedDetails = { occasion: 'test' };

            expect(() => {
                contextAccumulator.addExtractedDetails('nonexistent-session', extractedDetails);
            }).toThrow('Context file not found for session: nonexistent-session');
        });
    });

    describe('Adding Confirmed Details', () => {
        test('should add confirmed details to context file', () => {
            // Initialize and add extracted details first
            contextAccumulator.initializeContextFile(testSessionId);

            const confirmedDetails = {
                occasion: 'business conference',
                location: 'New York',
                startDate: '2024-01-15',
                duration: 3,
                dressCode: 'business',
                budget: 500,
                specialRequirements: ['professional attire']
            };

            const updatedContext = contextAccumulator.addConfirmedDetails(testSessionId, confirmedDetails);

            expect(updatedContext.userInput.confirmedDetails).toEqual(confirmedDetails);
            expect(updatedContext.constraints.dressCode).toBe('business');
            expect(updatedContext.metadata.processingStage).toBe('details_confirmed');
            expect(updatedContext.userInput.clarifications).toEqual([]);
        });
    });

    describe('Adding Weather Context', () => {
        test('should add weather context to context file', () => {
            // Initialize context file first
            contextAccumulator.initializeContextFile(testSessionId);

            const weatherContext = {
                weatherData: {
                    temperature: { min: 15, max: 25, unit: 'celsius' },
                    conditions: 'partly cloudy',
                    precipitation: 20
                },
                location: { name: 'New York', coordinates: { lat: 40.7128, lon: -74.0060 } },
                temperatureRange: { min: 15, max: 25 },
                precipitationProbability: 20,
                conditions: 'partly cloudy',
                layeringNeeds: 'light',
                weatherProtection: ['light jacket'],
                comfortFactors: ['moderate humidity']
            };

            const updatedContext = contextAccumulator.addWeatherContext(testSessionId, weatherContext);

            expect(updatedContext.environmentalContext.weather).toBeDefined();
            expect(updatedContext.environmentalContext.location).toEqual(weatherContext.location);
            expect(updatedContext.constraints.weatherConstraints).toBeDefined();
            expect(updatedContext.constraints.weatherConstraints.temperatureRange).toEqual({ min: 15, max: 25 });
            expect(updatedContext.metadata.processingStage).toBe('weather_gathered');
        });
    });

    describe('Context Summary Generation', () => {
        test('should generate context summary', () => {
            // Set up a complete context file
            contextAccumulator.initializeContextFile(testSessionId);

            const extractedDetails = {
                occasion: 'business conference',
                location: 'New York',
                startDate: '2024-01-15',
                duration: 3,
                dressCode: 'business',
                confidence: 0.8
            };

            contextAccumulator.addExtractedDetails(testSessionId, extractedDetails);
            contextAccumulator.addConfirmedDetails(testSessionId, extractedDetails);

            const weatherContext = {
                weatherData: { temperature: { min: 15, max: 25 } },
                temperatureRange: { min: 15, max: 25 }
            };

            contextAccumulator.addWeatherContext(testSessionId, weatherContext);

            const summary = contextAccumulator.generateContextSummary(testSessionId);

            expect(summary.event.occasion).toBe('business conference');
            expect(summary.event.location).toBe('New York');
            expect(summary.style.dressCode).toBe('business');
            expect(summary.environment.weather).toBeDefined();
            expect(summary.quality.confidence).toBe(1.0);
        });
    });

    describe('Context Formatting for AI', () => {
        test('should format context for AI consumption', () => {
            // Set up context file
            contextAccumulator.initializeContextFile(testSessionId);

            const details = {
                occasion: 'business conference',
                location: 'New York',
                startDate: '2024-01-15',
                duration: 3,
                dressCode: 'business'
            };

            contextAccumulator.addConfirmedDetails(testSessionId, details);

            const formattedContext = contextAccumulator.formatContextForAI(testSessionId);

            expect(formattedContext).toContain('OUTFIT PLANNING CONTEXT:');
            expect(formattedContext).toContain('EVENT DETAILS:');
            expect(formattedContext).toContain('Occasion: business conference');
            expect(formattedContext).toContain('Location: New York');
            expect(formattedContext).toContain('STYLE REQUIREMENTS:');
            expect(formattedContext).toContain('Dress Code: business');
        });
    });

    describe('Context Validation', () => {
        test('should validate context file structure', () => {
            const contextFile = contextAccumulator.initializeContextFile(testSessionId);
            const validation = contextAccumulator.validateContextFile(contextFile);

            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should detect invalid context file', () => {
            const invalidContext = { sessionId: testSessionId }; // Missing required sections
            const validation = contextAccumulator.validateContextFile(invalidContext);

            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });
    });

    describe('Context Completeness Calculation', () => {
        test('should calculate completeness score', () => {
            const contextFile = contextAccumulator.initializeContextFile(testSessionId);

            // Initially should have low completeness
            let completeness = contextAccumulator.calculateCompleteness(contextFile);
            expect(completeness).toBeLessThan(0.5);

            // Add confirmed details
            const details = { occasion: 'test', dressCode: 'casual' };
            contextAccumulator.addConfirmedDetails(testSessionId, details);

            const updatedContext = contextAccumulator.getContextFile(testSessionId);
            completeness = contextAccumulator.calculateCompleteness(updatedContext);
            expect(completeness).toBeGreaterThan(0.3);

            // Add weather context
            const weatherContext = { weatherData: { temperature: { min: 20, max: 25 } } };
            contextAccumulator.addWeatherContext(testSessionId, weatherContext);

            const finalContext = contextAccumulator.getContextFile(testSessionId);
            completeness = contextAccumulator.calculateCompleteness(finalContext);
            expect(completeness).toBeGreaterThan(0.5);
        });
    });
});