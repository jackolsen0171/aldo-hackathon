import React from 'react';
import './HomePage.css';

const HomePage = ({ onNavigate }) => {
  return (
    <div className="home-page">
      {/* Navigation Header */}
      <header className="home-header">
        <nav className="home-nav">
          <button 
            className="nav-button active"
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button 
            className="nav-button"
            onClick={() => onNavigate('combined-workshop')}
          >
            Outfit Planner
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="home-main">
        {/* Left Side - Empty for now */}
        <div className="home-left">
          {/* Future space for additional content */}
        </div>

        {/* Center - Cher Avatar */}
        <div className="home-center">
          <div className="avatar-container">
            <div className="avatar-placeholder">
              <div className="avatar-image">
                {/* TODO: REPLACE WITH CHER AVATAR IMAGE */}
                {/* Replace this div with: <img src="/images/cher-avatar.png" alt="Cher Avatar" className="avatar-img" /> */}
                <div className="avatar-icon">👩‍🦱</div>
                {/* TODO: REMOVE TEXT BELOW - Replace with image only */}
                <p>Cher Avatar</p>
                <small>(Upload your avatar image)</small>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Closet */}
        <div className="home-right">
          <div className="closet-container">
            <h2 className="closet-title">My Closet</h2>
            <div className="closet-content">
              <div className="closet-image-placeholder">
                {/* TODO: REPLACE WITH CLOSET IMAGE */}
                {/* Replace this div with: <img src="/images/closet.png" alt="Closet" className="closet-img" /> */}
                <div className="closet-icon">🚪</div>
                {/* TODO: REMOVE TEXT BELOW - Replace with image only */}
                <p>Closet Image</p>
                <small>(Upload closet image)</small>
              </div>
              
              <div className="outfits-list">
                <h3>All Saved Outfits</h3>
                <div className="outfits-grid">
                  {/* Sample outfit entries */}
                  {[
                    { trip: 'Business Trip', outfit: 1 },
                    { trip: 'Business Trip', outfit: 2 },
                    { trip: 'Weekend Getaway', outfit: 1 },
                    { trip: 'Date Night', outfit: 1 },
                    { trip: 'Conference', outfit: 1 },
                    { trip: 'Conference', outfit: 2 },
                  ].map((item, index) => (
                    <div key={index} className="outfit-item">
                      <div className="outfit-thumbnail">
                        {/* TODO: REPLACE WITH OUTFIT THUMBNAIL IMAGE */}
                        {/* Replace span with: <img src="/images/outfits/outfit-thumbnail.png" alt="Outfit" className="outfit-thumbnail-img" /> */}
                        <span className="outfit-icon">👗</span>
                      </div>
                      <div className="outfit-info">
                        <div className="outfit-trip">{item.trip}</div>
                        <div className="outfit-number">Outfit {item.outfit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;