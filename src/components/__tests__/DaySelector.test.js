import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DaySelector from '../DaySelector';

describe('DaySelector', () => {
    test('renders day tabs with default props', () => {
        render(<DaySelector />);

        // Should render 5 days by default
        expect(screen.getByText('Day 1')).toBeInTheDocument();
        expect(screen.getByText('Day 2')).toBeInTheDocument();
        expect(screen.getByText('Day 3')).toBeInTheDocument();
        expect(screen.getByText('Day 4')).toBeInTheDocument();
        expect(screen.getByText('Day 5')).toBeInTheDocument();
    });

    test('renders correct number of days based on totalDays prop', () => {
        render(<DaySelector totalDays={3} />);

        expect(screen.getByText('Day 1')).toBeInTheDocument();
        expect(screen.getByText('Day 2')).toBeInTheDocument();
        expect(screen.getByText('Day 3')).toBeInTheDocument();
        expect(screen.queryByText('Day 4')).not.toBeInTheDocument();
    });

    test('highlights selected day', () => {
        render(<DaySelector selectedDay={2} />);

        const day2Button = screen.getByText('Day 2');
        expect(day2Button).toHaveClass('selected');

        const day1Button = screen.getByText('Day 1');
        expect(day1Button).not.toHaveClass('selected');
    });

    test('calls onDaySelect when day is clicked', () => {
        const mockOnDaySelect = jest.fn();
        render(<DaySelector onDaySelect={mockOnDaySelect} />);

        const day3Button = screen.getByText('Day 3');
        fireEvent.click(day3Button);

        expect(mockOnDaySelect).toHaveBeenCalledWith(3);
    });

    test('updates selected day when clicked', () => {
        render(<DaySelector selectedDay={1} />);

        // Initially Day 1 should be selected
        expect(screen.getByText('Day 1')).toHaveClass('selected');
        expect(screen.getByText('Day 3')).not.toHaveClass('selected');

        // Click Day 3
        fireEvent.click(screen.getByText('Day 3'));

        // Now Day 3 should be selected
        expect(screen.getByText('Day 3')).toHaveClass('selected');
        expect(screen.getByText('Day 1')).not.toHaveClass('selected');
    });

    test('has proper accessibility attributes', () => {
        render(<DaySelector />);

        const day1Button = screen.getByText('Day 1');
        expect(day1Button).toHaveAttribute('aria-pressed', 'true');
        expect(day1Button).toHaveAttribute('aria-label', 'Select Day 1');

        const day2Button = screen.getByText('Day 2');
        expect(day2Button).toHaveAttribute('aria-pressed', 'false');
        expect(day2Button).toHaveAttribute('aria-label', 'Select Day 2');
    });
});