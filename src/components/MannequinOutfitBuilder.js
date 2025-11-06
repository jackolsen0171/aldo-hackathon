import React, { useState } from 'react';
import './MannequinOutfitBuilder.css';

const MannequinOutfitBuilder = ({ selectedTrip, selectedOutfit }) => {
  const [currentItems, setCurrentItems] = useState({
    hat: 0,
    top: 0,
    bottom: 0,
    shoes: 0
  });

  // Mock clothing data - replace with real data later
  const clothingData = {
    hat: [
      { id: 1, name: 'Baseball Cap', color: 'Blue' },
      { id: 2, name: 'Beanie', color: 'Black' },
      { id: 3, name: 'Sun Hat', color: 'Beige' },
      { id: 4, name: 'Fedora', color: 'Brown' }
    ],
    top: [
      { id: 1, name: 'White T-Shirt', color: 'White' },
      { id: 2, name: 'Blue Blouse', color: 'Blue' },
      { id: 3, name: 'Black Sweater', color: 'Black' },
      { id: 4, name: 'Red Tank Top', color: 'Red' }
    ],
    bottom: [
      { id: 1, name: 'Blue Jeans', color: 'Blue' },
      { id: 2, name: 'Black Skirt', color: 'Black' },
      { id: 3, name: 'Khaki Pants', color: 'Khaki' },
      { id: 4, name: 'White Shorts', color: 'White' }
    ],
    shoes: [
      { id: 1, name: 'White Sneakers', color: 'White' },
      { id: 2, name: 'Black Heels', color: 'Black' },
      { id: 3, name: 'Brown Boots', color: 'Brown' },
      { id: 4, name: 'Sandals', color: 'Tan' }
    ]
  };

  const handleItemChange = (category, direction) => {
    setCurrentItems(prev => {
      const items = clothingData[category];
      const currentIndex = prev[category];
      let newIndex;
      
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % items.length;
      } else {
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
      }
      
      return {
        ...prev,
        [category]: newIndex
      };
    });
  };

  const getCurrentItem = (category) => {
    return clothingData[category][currentItems[category]];
  };

  const handleSaveOutfit = () => {
    const outfit = {
      trip: selectedTrip?.name || 'Current Trip',
      outfitNumber: selectedOutfit,
      items: {
        hat: getCurrentItem('hat'),
        top: getCurrentItem('top'),
        bottom: getCurrentItem('bottom'),
        shoes: getCurrentItem('shoes')
      }
    };
    console.log('Saving outfit:', outfit);
    // TODO: Implement actual save functionality
  };

  return (
    <div className="mannequin-builder">
      <div className="builder-content">
        {/* Left Side - Outfit Name and Info */}
        <div className="outfit-info-panel">
          <div className="outfit-details">
            <h3>Current Outfit</h3>
            <div className="trip-info">
              <strong>Trip:</strong> {selectedTrip?.name || 'Select a trip'}
            </div>
            <div className="outfit-info">
              <strong>Outfit:</strong> {selectedOutfit}
            </div>
            <input 
              type="text" 
              placeholder="Enter outfit name..."
              className="outfit-name-input"
              defaultValue={`${selectedTrip?.name || 'Trip'} - Outfit ${selectedOutfit}`}
            />
          </div>
          
          <div className="outfit-actions">
            <button className="save-btn" onClick={handleSaveOutfit}>
              {/* TODO: REPLACE WITH SAVE ICON IMAGE */}
              {/* Replace emoji with: <img src="/images/icons/save-icon.png" alt="Save" className="button-icon" /> */}
              💾 Save Outfit
            </button>
            <button className="clear-btn" onClick={() => setCurrentItems({ hat: 0, top: 0, bottom: 0, shoes: 0 })}>
              {/* TODO: REPLACE WITH DELETE/TRASH ICON IMAGE */}
              {/* Replace emoji with: <img src="/images/icons/trash-icon.png" alt="Clear" className="button-icon" /> */}
              🗑️ Clear All
            </button>
          </div>
        </div>

        {/* Center - Mannequin */}
        <div className="mannequin-container">
          <div className="mannequin">
            {/* Hat Section */}
            <div className="clothing-section hat-section">
              <button 
                className="nav-arrow left-arrow"
                onClick={() => handleItemChange('hat', 'prev')}
              >
                ←
              </button>
              <div className="clothing-item hat-item">
                <div className="item-display">
                  {/* TODO: REPLACE WITH ACTUAL HAT IMAGE */}
                  {/* Replace span with: <img src={`/images/clothing/hats/${getCurrentItem('hat').id}.png`} alt={getCurrentItem('hat').name} className="clothing-image" /> */}
                  <span className="item-icon">🎩</span>
                  <div className="item-info">
                    {/* TODO: REMOVE TEXT - Keep only image */}
                    <div className="item-name">{getCurrentItem('hat').name}</div>
                    <div className="item-color">{getCurrentItem('hat').color}</div>
                  </div>
                </div>
              </div>
              <button 
                className="nav-arrow right-arrow"
                onClick={() => handleItemChange('hat', 'next')}
              >
                →
              </button>
            </div>

            {/* Mannequin Head */}
            <div className="mannequin-head"></div>

            {/* Top Section */}
            <div className="clothing-section top-section">
              <button 
                className="nav-arrow left-arrow"
                onClick={() => handleItemChange('top', 'prev')}
              >
                ←
              </button>
              <div className="clothing-item top-item">
                <div className="item-display">
                  {/* TODO: REPLACE WITH ACTUAL TOP/SHIRT IMAGE */}
                  {/* Replace span with: <img src={`/images/clothing/tops/${getCurrentItem('top').id}.png`} alt={getCurrentItem('top').name} className="clothing-image" /> */}
                  <span className="item-icon">👕</span>
                  <div className="item-info">
                    {/* TODO: REMOVE TEXT - Keep only image */}
                    <div className="item-name">{getCurrentItem('top').name}</div>
                    <div className="item-color">{getCurrentItem('top').color}</div>
                  </div>
                </div>
              </div>
              <button 
                className="nav-arrow right-arrow"
                onClick={() => handleItemChange('top', 'next')}
              >
                →
              </button>
            </div>

            {/* Mannequin Body */}
            <div className="mannequin-body"></div>

            {/* Bottom Section */}
            <div className="clothing-section bottom-section">
              <button 
                className="nav-arrow left-arrow"
                onClick={() => handleItemChange('bottom', 'prev')}
              >
                ←
              </button>
              <div className="clothing-item bottom-item">
                <div className="item-display">
                  {/* TODO: REPLACE WITH ACTUAL BOTTOM/PANTS IMAGE */}
                  {/* Replace span with: <img src={`/images/clothing/bottoms/${getCurrentItem('bottom').id}.png`} alt={getCurrentItem('bottom').name} className="clothing-image" /> */}
                  <span className="item-icon">👖</span>
                  <div className="item-info">
                    {/* TODO: REMOVE TEXT - Keep only image */}
                    <div className="item-name">{getCurrentItem('bottom').name}</div>
                    <div className="item-color">{getCurrentItem('bottom').color}</div>
                  </div>
                </div>
              </div>
              <button 
                className="nav-arrow right-arrow"
                onClick={() => handleItemChange('bottom', 'next')}
              >
                →
              </button>
            </div>

            {/* Mannequin Legs */}
            <div className="mannequin-legs"></div>

            {/* Shoes Section */}
            <div className="clothing-section shoes-section">
              <button 
                className="nav-arrow left-arrow"
                onClick={() => handleItemChange('shoes', 'prev')}
              >
                ←
              </button>
              <div className="clothing-item shoes-item">
                <div className="item-display">
                  {/* TODO: REPLACE WITH ACTUAL SHOES IMAGE */}
                  {/* Replace span with: <img src={`/images/clothing/shoes/${getCurrentItem('shoes').id}.png`} alt={getCurrentItem('shoes').name} className="clothing-image" /> */}
                  <span className="item-icon">👠</span>
                  <div className="item-info">
                    {/* TODO: REMOVE TEXT - Keep only image */}
                    <div className="item-name">{getCurrentItem('shoes').name}</div>
                    <div className="item-color">{getCurrentItem('shoes').color}</div>
                  </div>
                </div>
              </div>
              <button 
                className="nav-arrow right-arrow"
                onClick={() => handleItemChange('shoes', 'next')}
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Current Selections Summary */}
        <div className="selections-panel">
          <h3>Current Selection</h3>
          <div className="selections-list">
            <div className="selection-item">
              {/* TODO: REPLACE WITH ACTUAL HAT THUMBNAIL IMAGE */}
              {/* Replace span with: <img src={`/images/clothing/hats/${getCurrentItem('hat').id}-thumb.png`} alt={getCurrentItem('hat').name} className="selection-thumbnail" /> */}
              <span className="selection-icon">🎩</span>
              <div className="selection-details">
                {/* TODO: REMOVE TEXT - Keep only image */}
                <div className="selection-name">{getCurrentItem('hat').name}</div>
                <div className="selection-color">{getCurrentItem('hat').color}</div>
              </div>
            </div>
            <div className="selection-item">
              {/* TODO: REPLACE WITH ACTUAL TOP THUMBNAIL IMAGE */}
              {/* Replace span with: <img src={`/images/clothing/tops/${getCurrentItem('top').id}-thumb.png`} alt={getCurrentItem('top').name} className="selection-thumbnail" /> */}
              <span className="selection-icon">👕</span>
              <div className="selection-details">
                {/* TODO: REMOVE TEXT - Keep only image */}
                <div className="selection-name">{getCurrentItem('top').name}</div>
                <div className="selection-color">{getCurrentItem('top').color}</div>
              </div>
            </div>
            <div className="selection-item">
              {/* TODO: REPLACE WITH ACTUAL BOTTOM THUMBNAIL IMAGE */}
              {/* Replace span with: <img src={`/images/clothing/bottoms/${getCurrentItem('bottom').id}-thumb.png`} alt={getCurrentItem('bottom').name} className="selection-thumbnail" /> */}
              <span className="selection-icon">👖</span>
              <div className="selection-details">
                {/* TODO: REMOVE TEXT - Keep only image */}
                <div className="selection-name">{getCurrentItem('bottom').name}</div>
                <div className="selection-color">{getCurrentItem('bottom').color}</div>
              </div>
            </div>
            <div className="selection-item">
              {/* TODO: REPLACE WITH ACTUAL SHOES THUMBNAIL IMAGE */}
              {/* Replace span with: <img src={`/images/clothing/shoes/${getCurrentItem('shoes').id}-thumb.png`} alt={getCurrentItem('shoes').name} className="selection-thumbnail" /> */}
              <span className="selection-icon">👠</span>
              <div className="selection-details">
                {/* TODO: REMOVE TEXT - Keep only image */}
                <div className="selection-name">{getCurrentItem('shoes').name}</div>
                <div className="selection-color">{getCurrentItem('shoes').color}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MannequinOutfitBuilder;