import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewEventInputInterface from '../NewEventInputInterface';

// Mock the useChat hook
jest.mock('../../hooks/useChat', () => ({
    useChat: () => ({
        sendMessage: jest.fn(),
        loading: false,
        error: null,
        clearError: jest.fn()
    })
}));

describe('NewEventInputInterface Integration', () => {
    const mockProps = {
        tripId: 'test-trip-1',
        onTripDescriptionSubmit: jest.fn(),
        loading: false,
        error: null,
        onClearError: jest.fn(),
        placeholder: "Tell Cher about your trip..."
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders input interface correctly', () => {
        render(<NewEventInputInterface {...mockProps} />);

        expect(screen.getByText("Hi! I'm Cher, your AI style assistant")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Tell Cher about your trip...")).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('calls onTripDescriptionSubmit when form is submitted', async () => {
        render(<NewEventInputInterface {...mockProps} />);

        const input = screen.getByPlaceholderText("Tell Cher about your trip...");

        // First add text to enable the button
        fireEvent.change(input, { target: { value: 'Business trip to Chicago for 3 days' } });

        // Now get the button (it should be enabled)
        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockProps.onTripDescriptionSubmit).toHaveBeenCalledWith('Business trip to Chicago for 3 days');
        });
    });

    test('shows loading state when processing', () => {
        render(<NewEventInputInterface {...mockProps} loading={true} />);

        expect(screen.getByText('Cher is analyzing your trip details...')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
    });

    test('shows error message when error prop is provided', () => {
        const errorProps = { ...mockProps, error: 'Failed to process trip description' };
        render(<NewEventInputInterface {...errorProps} />);

        expect(screen.getByText('Failed to process trip description')).toBeInTheDocument();
    });

    test('clears error when user starts typing', () => {
        const errorProps = { ...mockProps, error: 'Test error' };
        render(<NewEventInputInterface {...errorProps} />);

        const input = screen.getByPlaceholderText("Tell Cher about your trip...");
        fireEvent.change(input, { target: { value: 'New input' } });

        expect(mockProps.onClearError).toHaveBeenCalled();
    });
});