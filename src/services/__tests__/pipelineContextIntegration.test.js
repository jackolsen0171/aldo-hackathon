/**
 * Pipeline Service and Context Accumulator Integration Tests
 * Tests the integration between pipeline service and context accumulation
 */

import { PipelineService } from '../pipelineService.js';
import { ContextAccumulator } from '../contextAccumulator.js';

describe('Pipeline Service Context Integration', () => {
    let pipelineService;
    let contextAccumulator;
    const testSessionId = 'integration-test-session';

    beforeEach(() => {
        pipelineService = new PipelineService();
        contextAccumulator = new ContextAccumulator();

        // Clear any existing data
        contextAccumulator.reset();
        localStorage.clear();
    });

    afterEach(() => {
        contextAccumulator.reset();
        localStorage.clear();
    });

    describe('Session Initialization', () => {
        test('should initialize both pipeline state and context file', () => {
            const pipelineState = pipelineService.initializeSession(testSessionId);
            const contextFile = contextAccumulator.getContextFile(testSessionId);

            expect(pipelineState).toBeDefined();
            expect(pipelineState.sessionId).toBe(testSessionId);
            expect(contextFile).toBeDefined();
            expect(contextFile.sessionId).toBe(testSessionId);
        });
    });

    describe('Event Details Processing', () => {
        test('should process user input and add extracted details to context', async () => {
            // Initialize session
            pipelineService.initializeSession(testSessionId);

            const extractedDetails = {
                occasion: 'business conference',
                location: 'New York',
                startDate: '2024-01-15',
                duration: 3,
                dressCode: 'business',
                confidence: 0.8
            };

            // Process user input with extracted details
            const result = await pipelineService.processUserInput(
                'I need outfits for a 3-day business conference in New York',
                testSessionId,
                extractedDetails
            );

            expect(result.success).toBe(true);
            expect(result.state.stage).toBe('confirmation_pending');

            // Check that context file was updated
            const contextFile = contextAccumulator.getContextFile(testSessionId);
            expect(contextFile.userInput.extractedDetails).toEqual(extractedDetails);
            expect(contextFile.constraints.dressCode).toBe('business');
        });

        test('should confirm event details and update context', async () => {
            // Initialize and process input first
            pipelineService.initializeSession(testSessionId);

            const extractedDetails = {
                occasion: 'business conference',
                location: 'New York',
                dressCode: 'business'
            };

            await pipelineService.processUserInput(
                'Test message',
                testSessionId,
                extractedDetails
            );

            // Confirm details
            const confirmedDetails = {
                occasion: 'business conference',
                location: 'New York',
                startDate: '2024-01-15',
                duration: 3,
                dressCode: 'business',
                budget: 500
            };

            const result = await pipelineService.confirmEventDetails(confirmedDetails, testSessionId);

            expect(result.success).toBe(true);
            expect(result.state.stage).toBe('context_gathering');
            expect(result.weatherResult).toBeDefined(); // Weather context should be gathered automatically

            // Check context file was updated
            const contextFile = contextAccumulator.getContextFile(testSessionId);
            expect(contextFile.userInput.confirmedDetails).toEqual(confirmedDetails);
            // Since weather context is automatically gathered, processing stage should be 'weather_gathered'
            expect(contextFile.metadata.processingStage).toBe('weather_gathered');

            // Check that weather context was added
            expect(contextFile.environmentalContext.weather).toBeDefined();
        });
    });

    describe('Context Gathering', () => {
        test('should add weather context during context gathering stage', async () => {
            // Set up pipeline to context gathering stage
            pipelineService.initializeSession(testSessionId);

            const confirmedDetails = {
                occasion: 'business conference',
                location: 'New York',
                dressCode: 'business'
            };

            await pipelineService.processUserInput('Test', testSessionId, confirmedDetails);
            await pipelineService.confirmEventDetails(confirmedDetails, testSessionId);

            // Add weather context
            const weatherContext = {
                weather: {
                    weatherData: {
                        temperature: { min: 15, max: 25, unit: 'celsius' },
                        conditions: 'partly cloudy'
                    },
                    location: { name: 'New York' },
                    temperatureRange: { min: 15, max: 25 },
                    layeringNeeds: 'light'
                }
            };

            const result = await pipelineService.addContextData(testSessionId, weatherContext);

            expect(result.success).toBe(true);
            expect(result.contextAdded).toBe(true);

            // Check context file was updated
            const contextFile = contextAccumulator.getContextFile(testSessionId);
            expect(contextFile.environmentalContext.weather).toBeDefined();
            expect(contextFile.constraints.weatherConstraints).toBeDefined();
            expect(contextFile.metadata.processingStage).toBe('weather_gathered');
        });

        test('should complete context gathering and transition to generation', async () => {
            // Set up pipeline with context
            pipelineService.initializeSession(testSessionId);

            const details = { occasion: 'test', dressCode: 'casual' };
            await pipelineService.processUserInput('Test', testSessionId, details);
            await pipelineService.confirmEventDetails(details, testSessionId);

            const weatherContext = {
                weather: { weatherData: { temperature: { min: 20, max: 25 } } }
            };
            await pipelineService.addContextData(testSessionId, weatherContext);

            // Complete context gathering
            const result = await pipelineService.completeContextGathering(testSessionId);

            expect(result.success).toBe(true);
            expect(result.readyForGeneration).toBe(true);
            expect(result.state.stage).toBe('generating');
        });
    });

    describe('Context Retrieval', () => {
        test('should retrieve context file and summary from pipeline service', async () => {
            // Set up complete context
            pipelineService.initializeSession(testSessionId);

            const details = {
                occasion: 'business conference',
                location: 'New York',
                dressCode: 'business'
            };

            await pipelineService.processUserInput('Test', testSessionId, details);
            await pipelineService.confirmEventDetails(details, testSessionId);

            const weatherContext = {
                weather: {
                    weatherData: { temperature: { min: 20, max: 25 } },
                    temperatureRange: { min: 20, max: 25 }
                }
            };
            await pipelineService.addContextData(testSessionId, weatherContext);

            // Test context retrieval methods
            const contextFile = pipelineService.getContextFile(testSessionId);
            const contextSummary = pipelineService.getContextSummary(testSessionId);
            const formattedContext = pipelineService.getFormattedContextForAI(testSessionId);

            expect(contextFile).toBeDefined();
            expect(contextFile.sessionId).toBe(testSessionId);

            expect(contextSummary).toBeDefined();
            expect(contextSummary.event.occasion).toBe('business conference');
            expect(contextSummary.style.dressCode).toBe('business');

            expect(formattedContext).toBeDefined();
            expect(formattedContext).toContain('OUTFIT PLANNING CONTEXT:');
            expect(formattedContext).toContain('business conference');
        });
    });

    describe('Outfit Generation with Context', () => {
        test('should generate outfits with context summary', async () => {
            // Set up complete pipeline
            pipelineService.initializeSession(testSessionId);

            const details = {
                occasion: 'business conference',
                location: 'New York',
                dressCode: 'business'
            };

            await pipelineService.processUserInput('Test', testSessionId, details);
            await pipelineService.confirmEventDetails(details, testSessionId);

            const weatherContext = {
                weather: { weatherData: { temperature: { min: 20, max: 25 } } }
            };
            await pipelineService.addContextData(testSessionId, weatherContext);
            await pipelineService.completeContextGathering(testSessionId);

            // Generate outfits
            const result = await pipelineService.generateOutfits(details, testSessionId);

            expect(result.success).toBe(true);
            expect(result.state.stage).toBe('complete');
            expect(result.contextSummary).toBeDefined();
            expect(result.contextSummary.event.occasion).toBe('business conference');
        });
    });
});