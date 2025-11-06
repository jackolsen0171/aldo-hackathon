import React, { useState } from 'react';
import './StylistWorkshop.css';

const StylistWorkshop = ({ onNavigate }) => {
  const [selectedClothingType, setSelectedClothingType] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  
  const clothingTypes = [
    { id: 'tops', label: 'Tops', icon: '👕' },
    { id: 'bottoms', label: 'Bottoms', icon: '👖' },
    { id: 'dresses', label: 'Dresses', icon: '👗' },
    { id: 'outerwear', label: 'Outerwear', icon: '🧥' },
    { id: 'shoes', label: 'Shoes', icon: '👠' },
    { id: 'accessories', label: 'Accessories', icon: '👜' }
  ];

  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];

  return (
    <div className="stylist-workshop">
      <div className="workshop-title">
        <h1>Stylist Workshop</h1>
        <p>Create and customize your perfect outfits</p>
      </div>

      <div className="workshop-container">
        {/* Left Panel - Clothing Selection */}
        <div className="clothing-panel">
          <h2>Select Clothing Type</h2>
          <div className="clothing-grid">
            {clothingTypes.map((type) => (
              <button
                key={type.id}
                className={`clothing-type-btn ${selectedClothingType === type.id ? 'selected' : ''}`}
                onClick={() => setSelectedClothingType(type.id)}
              >
                <span className="clothing-icon">{type.icon}</span>
                <span className="clothing-label">{type.label}</span>
              </button>
            ))}
          </div>

          {selectedClothingType && (
            <div className="clothing-items">
              <h3>Available {clothingTypes.find(t => t.id === selectedClothingType)?.label}</h3>
              <div className="items-grid">
                {/* Placeholder items */}
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="clothing-item">
                    <div className="item-placeholder">
                      <span>Item {item}</span>
                    </div>
                    <button className="add-item-btn">+</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Panel - Outfit Visualization */}
        <div className="outfit-panel">
          <h2>Current Outfit</h2>
          <div className="outfit-display">
            <div className="avatar-container">
              <div className="avatar-placeholder">
                <div className="avatar-head"></div>
                <div className="avatar-body">
                  <div className="outfit-slot top-slot">
                    <span>Top</span>
                  </div>
                  <div className="outfit-slot bottom-slot">
                    <span>Bottom</span>
                  </div>
                </div>
                <div className="avatar-accessories">
                  <div className="outfit-slot shoes-slot">
                    <span>Shoes</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="outfit-actions">
              <button className="save-outfit-btn">Save Outfit</button>
              <button className="clear-outfit-btn">Clear All</button>
            </div>
          </div>
        </div>

        {/* Right Panel - Day Selection & Saved Outfits */}
        <div className="day-panel">
          <h2>Select Day/Event</h2>
          <div className="day-selector">
            {days.map((day) => (
              <button
                key={day}
                className={`day-btn ${selectedDay === day ? 'selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            ))}
            <button className="add-day-btn">+ Add Day</button>
          </div>

          {selectedDay && (
            <div className="saved-outfits">
              <h3>Outfits for {selectedDay}</h3>
              <div className="outfit-thumbnails">
                {/* Placeholder saved outfits */}
                {[1, 2].map((outfit) => (
                  <div key={outfit} className="outfit-thumbnail">
                    <div className="thumbnail-placeholder">
                      <span>Outfit {outfit}</span>
                    </div>
                    <div className="thumbnail-actions">
                      <button className="edit-btn">✏️</button>
                      <button className="delete-btn">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StylistWorkshop;