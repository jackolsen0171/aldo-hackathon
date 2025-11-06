import React, { useState } from 'react';
import HomePage from './pages/HomePage';
import CombinedWorkshopPage from './pages/CombinedWorkshopPage';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'combined-workshop':
        return <CombinedWorkshopPage onNavigate={setCurrentPage} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="App">
      <ErrorBoundary>
        {renderPage()}
      </ErrorBoundary>
    </div>
  );
}

export default App;
