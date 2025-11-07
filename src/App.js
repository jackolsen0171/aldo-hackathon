import React from 'react';
import CombinedWorkshopPage from './pages/CombinedWorkshopPage';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <CombinedWorkshopPage />
      </ErrorBoundary>
    </div>
  );
}

export default App;
