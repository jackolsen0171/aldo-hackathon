/**
 * Weather Context Integration Tests
 * Tests the integration between PipelineService and WeatherContextService
 */

import { PipelineService } from '../pipelineService.js';
import { ContextAccumulator } from '../contextAccumulator.js';

describe('Weather Context Integration', () => {
    let pipelineService;
    let contextAccumulator;
    const testSessionId = 'weather-integration-test-session';

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

    describe('Automatic Weather Context Gathering', () => {
        test('should automatically gather weather context when confirming details with location', async () => {
            // Initialize session
            pipelineService.initializeSession(testSessionId);

            // Process initial input
            await pipelineService.processUserInput(
                'I need outfits for a business conference',
                testSessionId,
                { occasion: 'business conference', dressCode: 'business' }
            );

            // Confirm details with location
            const confirmedDetails = {
                occasion: 'business conference',
                location: 'New York',
                startDate: '2024-01-15',
                duration: 2,
                dressCode: 'business'
            };

            const result = await pipelineService.confirmEventDetails(confirmedDetails, testSessionId);

            // Should succeed and automatically gather weather context
            expect(result.success).toBe(true);
            expect(result.state.stage).toBe('context_gathering');
            expect(result.weatherResult).toBeDefined();

            // Check that weather context was added to pipeline state
            const finalState = pipelineService.getSessionState(testSessionId);
            expect(finalState.contextData.weather).toBeDefined();
            expect(finalState.contextData.weatherMetadata).toBeDefined();

            // Check that context file was updated with weather data
            const contextFile = contextAccumulator.getContextFile(testSessionId);
            expect(contextFile.environmentalContext.weather).toBeDefined();
            expect(contextFile.metadata.processingStage).toBe('weather_gathered');
        });

        test('should handle weather gathering failure gracefully', async () => {
            // Initialize session
            pipelineService.initializeSession(testSessionId);

            // Process initial input
            await pipelineService.processUserInput(
                'I need outfits for a conference',
                testSessionId,
                { occasion: 'conference', dressCode: 'business' }
            );

            // Confirm details with invalid location
            const confirmedDetails = {
                occasion: 'conference',
                location: 'Invalid Location That Does Not Exist',
                startDate: '2024-01-15',
                duration: 1,
                dressCode: 'business'
            };

            const result = await pipelineService.confirmEventDetails(confirmedDetails, testSessionId);

            // Should still succeed even if weather gathering fails
            expect(result.success).toBe(true);
            expect(result.state.stage).toBe('context_gathering');
            expect(result.weatherResult).toBeDefined();

            // Weather result should indicate failure but with fallback
            if (result.weatherResult.success) {
                expect(result.weatherResult.fallbackUsed).toBe(true);
            } else {
                expect(result.weatherResult.weatherFailed).toBe(true);
            }
        });

        test('should skip weather gathering when no location is provided', async () => {
            // Initialize session
            pipelineService.initializeSession(testSessionId);

            // Process initial input
            await pipelineService.processUserInput(
                'I need casual outfits',
                testSessionId,
                { occasion: 'casual outing', dressCode: 'casual' }
            );

            // Confirm details without location
            const confirmedDetails = {
                occasion: 'casual outing',
                startDate: '2024-01-15',
                duration: 1,
                dressCode: 'casual'
                // No location provided
            };

            const result = await pipelineService.confirmEventDetails(confirmedDetails, testSessionId);

            // Should succeed but not attempt weather gathering
            expect(result.success).toBe(true);
            expect(result.state.stage).toBe('context_gathering');
            expect(result.weatherResult).toBeNull();

            // Check that no weather context was added
            const finalState = pipelineService.getSessionState(testSessionId);
            expect(finalState.contextData?.weather).toBeUndefined();
        });
    });

    describe('Manual Weather Context Gathering', () => {
        test('should allow manual weather context gathering', async () => {
            // Set up pipeline to context gathering stage
            pipelineService.initializeSession(testSessionId);

            const confirmedDetails = {
                occasion: 'outdoor event',
                location: 'San Francisco',
                startDate: '2024-01-20',
                duration: 1,
                dressCode: 'casual'
            };

            await pipelineService.processUserInput('Test', testSessionId, confirmedDetails);
            await pipelineService.confirmEventDetails(confirmedDetails, testSessionId);

            // Manually gather weather context again (should use cache or update)
            const weatherResult = await pipelineService.gatherWeatherContext(testSessionId);

            expect(weatherResult.success).toBe(true);
            expect(weatherResult.weatherGathered).toBe(true);
            expect(weatherResult.weatherContext).toBeDefined();
        });
    });

    describe('Context Validation', () => {
        test('should validate context completeness including weather', async () => {
            // Set up complete context
            pipelineService.initializeSession(testSessionId);

            const details = {
                occasion: 'business meeting',
                location: 'Chicago',
                startDate: '2024-01-25',
                duration: 1,
                dressCode: 'business'
            };

            await pipelineService.processUserInput('Test', testSessionId, details);
            await pipelineService.confirmEventDetails(details, testSessionId);

            // Complete context gathering
            const result = await pipelineService.completeContextGathering(testSessionId);

            expect(result.success).toBe(true);
            expect(result.readyForGeneration).toBe(true);
            expect(result.contextValidation).toBeDefined();
            expect(result.contextValidation.isValid).toBe(true);
        });

        test('should warn about missing weather context when location is provided', async () => {
            // Set up session with location but manually skip weather gathering
            pipelineService.initializeSession(testSessionId);

            const details = {
                occasion: 'event',
                location: 'Boston',
                dressCode: 'casual'
            };

            await pipelineService.processUserInput('Test', testSessionId, details);

            // Manually update state to skip automatic weather gathering
            const state = pipelineService.getSessionState(testSessionId);
            const updatedState = {
                ...state,
                stage: 'context_gathering',
                eventDetails: details
            };
            pipelineService.saveSessionState(updatedState);

            // Try to complete context gathering without weather data
            const result = await pipelineService.completeContextGathering(testSessionId);

            expect(result.success).toBe(true);
            expect(result.contextValidation.warnings).toContain('Weather context missing despite location being provided');
        });
    });
});