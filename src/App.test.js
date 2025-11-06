import { render, screen } from '@testing-library/react';
import App from './App';

test('renders outfit planner layout', () => {
  render(<App />);
  const outfitPlannerLayout = document.querySelector('.outfit-planner-layout');
  expect(outfitPlannerLayout).toBeInTheDocument();
});

test('renders saved trips sidebar', () => {
  render(<App />);
  const savedTripsHeader = screen.getByText(/Saved Trips/i);
  expect(savedTripsHeader).toBeInTheDocument();
});

test('renders day selector', () => {
  render(<App />);
  const dayTab = screen.getByRole('button', { name: /Select Day 1/i });
  expect(dayTab).toBeInTheDocument();
});

test('renders chat toggle button', () => {
  render(<App />);
  const chatToggleButton = screen.getByRole('button', { name: /Open chat panel/i });
  expect(chatToggleButton).toBeInTheDocument();
});
