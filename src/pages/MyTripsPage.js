import React from 'react';
import OutfitPlannerLayout from '../components/OutfitPlannerLayout';
import './MyTripsPage.css';

const MyTripsPage = ({ onNavigate }) => {
  return (
    <div className="my-trips-page">
      {/* Navigation Header */}
      <header className="trips-header">
        <nav className="trips-nav">
          <button 
            className="nav-button"
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button 
            className="nav-button active"
            onClick={() => onNavigate('my-trips')}
          >
            My Trips
          </button>
          <button 
            className="nav-button"
            onClick={() => onNavigate('stylist-workshop')}
          >
            Stylist Workshop
          </button>
        </nav>
      </header>

      {/* Outfit Planner Content */}
      <div className="trips-content">
        <OutfitPlannerLayout onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default MyTripsPage;