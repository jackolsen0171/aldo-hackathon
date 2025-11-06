/**
 * Tests for PipelineService
 * Focuses on core state management and stage transitions
 */

import pipelineService, {
    PipelineService,
    PIPELINE_STAGES,
    STAGE_TRANSITIONS,
    PIPELINE_ERRORS
} from '../pipelineService';

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('PipelineService', () => {
    beforeEach(() => {
        // Clear localStorage mock
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();
        localStorageMock.clear.mockClear();

        // Mock localStorage to return empty state
        localStorageMock.getItem.mockReturnValue(null);
    });

    describe('Session Management', () => {
        test('should initialize new session with correct default state', () => {
            const state = pipelineService.initializeSession();

            expect(state).toMatchObject({
                stage: PIPELINE_STAGES.INPUT_PROCESSING,
                eventDetails: null,
                contextData: null,
                outfitRecommendations: null,
                error: null
            });
            expect(state.sessionId).toBeDefined();
            expect(state.timestamp).toBeDefined();
            expect(state.lastActivity).toBeDefined();
        });

        test('should generate unique session IDs', () => {
            const state1 = pipelineService.initializeSession();
            const state2 = pipelineService.initializeSession();

            expect(state1.sessionId).not.toBe(state2.sessionId);
        });

        test('should retrieve existing session state from storage', () => {
            const sessionId = 'test-session-123';
            const mockState = {
                sessionId,
                stage: PIPELINE_STAGES.CONFIRMATION_PENDING,
                eventDetails: { occasion: 'test event' },
                contextData: null,
                outfitRecommendations: null,
                error: null,
                timestamp: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            };

            const mockStorageData = {
                [sessionId]: mockState
            };

            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStorageData));

            const retrievedState = pipelineService.getSessionState(sessionId);
            expect(retrievedState).toEqual(mockState);
            expect(localStorageMock.getItem).toHaveBeenCalledWith('outfit_pipeline_state');
        });
    });

    describe('Stage Transitions', () => {
        test('should validate stage transitions correctly', () => {
            expect(pipelineService.canTransitionTo(
                PIPELINE_STAGES.INPUT_PROCESSING,
                PIPELINE_STAGES.CONFIRMATION_PENDING
            )).toBe(true);

            expect(pipelineService.canTransitionTo(
                PIPELINE_STAGES.CONFIRMATION_PENDING,
                PIPELINE_STAGES.CONTEXT_GATHERING
            )).toBe(true);

            expect(pipelineService.canTransitionTo(
                PIPELINE_STAGES.COMPLETE,
                PIPELINE_STAGES.CONFIRMATION_PENDING
            )).toBe(false);
        });

        test('should update stage with timestamp', () => {
            const initialState = {
                sessionId: 'test',
                stage: PIPELINE_STAGES.INPUT_PROCESSING,
                lastActivity: '2024-01-01T00:00:00.000Z'
            };

            const updatedState = pipelineService.updateStage(
                initialState,
                PIPELINE_STAGES.CONFIRMATION_PENDING
            );

            expect(updatedState.stage).toBe(PIPELINE_STAGES.CONFIRMATION_PENDING);
            expect(updatedState.lastActivity).not.toBe(initialState.lastActivity);
        });
    });

    describe('Event Details Validation', () => {
        test('should validate required fields', () => {
            const result = pipelineService.validateEventDetails(null);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Event details are required');
        });

        test('should validate occasion field', () => {
            const result = pipelineService.validateEventDetails({});
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Occasion is required and must be a string');
        });

        test('should validate dress code options', () => {
            const result = pipelineService.validateEventDetails({
                occasion: 'test event',
                dressCode: 'invalid-dress-code'
            });
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('Dress code must be one of'))).toBe(true);
        });

        test('should accept valid event details', () => {
            const validDetails = {
                occasion: 'business conference',
                duration: 3,
                startDate: '2024-12-01',
                dressCode: 'business'
            };

            const result = pipelineService.validateEventDetails(validDetails);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle errors and update state', () => {
            const sessionId = 'test-session';
            const errorMessage = 'Test error message';

            const result = pipelineService.handleError(
                sessionId,
                PIPELINE_ERRORS.EXTRACTION_ERROR,
                errorMessage
            );

            expect(result.success).toBe(false);
            expect(result.state.stage).toBe(PIPELINE_STAGES.ERROR);
            expect(result.error.type).toBe(PIPELINE_ERRORS.EXTRACTION_ERROR);
            expect(result.error.message).toBe(errorMessage);
        });
    });

    describe('Pipeline Reset', () => {
        test('should reset pipeline to initial state', () => {
            const sessionId = 'test-session';
            const resetState = pipelineService.resetPipeline(sessionId);

            expect(resetState).toMatchObject({
                sessionId,
                stage: PIPELINE_STAGES.INPUT_PROCESSING,
                eventDetails: null,
                contextData: null,
                outfitRecommendations: null,
                error: null
            });
        });
    });

    describe('Stage Information', () => {
        test('should provide stage display information', () => {
            const stageInfo = pipelineService.getStageInfo(PIPELINE_STAGES.CONFIRMATION_PENDING);

            expect(stageInfo).toMatchObject({
                title: 'Confirm Details',
                description: 'Please review and confirm your event details',
                loading: false
            });
        });

        test('should handle unknown stages', () => {
            const stageInfo = pipelineService.getStageInfo('unknown-stage');

            expect(stageInfo).toMatchObject({
                title: 'Unknown Stage',
                description: 'Processing...',
                loading: false
            });
        });
    });
});