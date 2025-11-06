import React, { useState } from 'react';
import SavedTripsSidebar from '../components/SavedTripsSidebar';
import MannequinOutfitBuilder from '../components/MannequinOutfitBuilder';
import { initialAppState, mockTrips } from '../data/mockData';
import './CombinedWorkshopPage.css';

const CombinedWorkshopPage = ({ onNavigate }) => {
  const [selectedTrip, setSelectedTrip] = useState(initialAppState.selectedTrip);
  const [selectedOutfit, setSelectedOutfit] = useState(1);
  const [trips] = useState(mockTrips);

  // Get current trip data
  const currentTrip = trips.find(trip => trip.id === selectedTrip);

  const handleTripSelect = (tripId) => {
    setSelectedTrip(tripId);
    setSelectedOutfit(1); // Reset to outfit 1 when switching trips
  };

  const handleNewTrip = () => {
    console.log('New trip creation - to be implemented');
  };

  const handleOutfitSelect = (outfitNumber) => {
    setSelectedOutfit(outfitNumber);
  };

  return (
    <div className="combined-workshop-page">
      {/* Navigation Header */}
      <header className="combined-header">
        <nav className="combined-nav">
          <button 
            className="nav-button"
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button 
            className="nav-button active"
            onClick={() => onNavigate('combined-workshop')}
          >
            Outfit Planner
          </button>
        </nav>
      </header>

      <div className="combined-content">
        {/* Left Sidebar - Saved Trips */}
        <div className="combined-sidebar">
          <SavedTripsSidebar
            trips={trips}
            selectedTrip={selectedTrip}
            onTripSelect={handleTripSelect}
            onNewTrip={handleNewTrip}
          />
        </div>

        {/* Main Content - Outfit Builder */}
        <div className="combined-main">
          {/* Outfit Selector Tabs */}
          <div className="outfit-tabs">
            {[1, 2, 3, 4, 5].map((outfitNum) => (
              <button
                key={outfitNum}
                className={`outfit-tab ${selectedOutfit === outfitNum ? 'active' : ''}`}
                onClick={() => handleOutfitSelect(outfitNum)}
              >
                Outfit {outfitNum}
              </button>
            ))}
          </div>

          {/* Mannequin Outfit Builder */}
          <MannequinOutfitBuilder
            selectedTrip={currentTrip}
            selectedOutfit={selectedOutfit}
          />
        </div>
      </div>
    </div>
  );
};

export default CombinedWorkshopPage;