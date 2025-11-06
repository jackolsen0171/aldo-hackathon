import React from 'react';
import StylistWorkshop from '../components/StylistWorkshop';
import './StylistWorkshopPage.css';

const StylistWorkshopPage = ({ onNavigate }) => {
  return (
    <div className="stylist-workshop-page">
      {/* Navigation Header */}
      <header className="workshop-header">
        <nav className="workshop-nav">
          <button 
            className="nav-button"
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button 
            className="nav-button"
            onClick={() => onNavigate('my-trips')}
          >
            My Trips
          </button>
          <button 
            className="nav-button active"
            onClick={() => onNavigate('stylist-workshop')}
          >
            Stylist Workshop
          </button>
        </nav>
      </header>

      {/* Workshop Content */}
      <div className="workshop-content">
        <StylistWorkshop onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default StylistWorkshopPage;