import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatWidget from '../ChatWidget';

// Mock scrollIntoView for testing environment
Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: jest.fn(),
    writable: true
});

// Mock the chat service
jest.mock('../../services/chatService', () => ({
    sendMessage: jest.fn(),
    isServiceAvailable: jest.fn(),
    getErrorMessage: jest.fn()
}));

import chatService from '../../services/chatService';

describe('ChatWidget Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        chatService.isServiceAvailable.mockResolvedValue(true);
        chatService.getErrorMessage.mockReturnValue('Test error message');
    });

    it('should render chat widget with initial message', async () => {
        await act(async () => {
            render(<ChatWidget />);
        });

        expect(screen.getByText('Weather Assistant')).toBeInTheDocument();
        expect(screen.getByText(/Hello! I can help you get weather information/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Ask me about the weather/)).toBeInTheDocument();
    });

    it('should send message when user types and clicks send', async () => {
        chatService.sendMessage.mockResolvedValue({
            success: true,
            response: 'The weather in Paris is sunny',
            timestamp: '2023-01-01T00:00:00.000Z'
        });

        await act(async () => {
            render(<ChatWidget />);
        });

        const input = screen.getByPlaceholderText(/Ask me about the weather/);
        const sendButton = screen.getByRole('button', { name: /➤/ });

        await act(async () => {
            fireEvent.change(input, { target: { value: 'What is the weather in Paris?' } });
            fireEvent.click(sendButton);
        });

        await waitFor(() => {
            expect(chatService.sendMessage).toHaveBeenCalledWith('What is the weather in Paris?');
        });

        await waitFor(() => {
            expect(screen.getByText('The weather in Paris is sunny')).toBeInTheDocument();
        });
    });

    it('should send message when user presses Enter', async () => {
        chatService.sendMessage.mockResolvedValue({
            success: true,
            response: 'Weather response',
            timestamp: '2023-01-01T00:00:00.000Z'
        });

        await act(async () => {
            render(<ChatWidget />);
        });

        const input = screen.getByPlaceholderText(/Ask me about the weather/);

        await act(async () => {
            fireEvent.change(input, { target: { value: 'Test message' } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        });

        await waitFor(() => {
            expect(chatService.sendMessage).toHaveBeenCalledWith('Test message');
        });
    });

    it('should handle chat service errors', async () => {
        const error = new Error('Service unavailable');
        chatService.sendMessage.mockRejectedValue(error);
        chatService.getErrorMessage.mockReturnValue('Service is currently unavailable');

        await act(async () => {
            render(<ChatWidget />);
        });

        const input = screen.getByPlaceholderText(/Ask me about the weather/);
        const sendButton = screen.getByRole('button', { name: /➤/ });

        await act(async () => {
            fireEvent.change(input, { target: { value: 'Test message' } });
            fireEvent.click(sendButton);
        });

        await waitFor(() => {
            expect(screen.getAllByText('Service is currently unavailable')).toHaveLength(2);
        });
    });

    it('should clear chat when clear button is clicked', async () => {
        await act(async () => {
            render(<ChatWidget />);
        });

        const clearButton = screen.getByTitle('Clear conversation');

        await act(async () => {
            fireEvent.click(clearButton);
        });

        // Should still show the initial greeting message
        expect(screen.getByText(/Hello! I can help you get weather information/)).toBeInTheDocument();
    });
});