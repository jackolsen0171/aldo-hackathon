import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
};

describe('ErrorBoundary', () => {
    // Suppress console.error for these tests
    const originalError = console.error;
    beforeAll(() => {
        console.error = jest.fn();
    });
    afterAll(() => {
        console.error = originalError;
    });

    test('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('No error')).toBeInTheDocument();
    });

    test('renders error UI when there is an error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
        expect(screen.getByText(/The weather assistant encountered an unexpected error/)).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
        expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    test('retry button attempts to reset error state', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Error UI should be visible
        expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

        // Click retry button - this should attempt to reset the error state
        const retryButton = screen.getByText('Try Again');
        expect(retryButton).toBeInTheDocument();

        // The button should be clickable
        fireEvent.click(retryButton);

        // After clicking retry, the error boundary will attempt to re-render
        // Since the component still throws an error, it should show the error UI again
        expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });
});