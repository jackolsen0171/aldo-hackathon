import React from 'react';
import './HomePage.css';

const HomePage = ({ onNavigate }) => {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>AI Outfit & Packing Assistant</h1>
        <p>Your personal stylist for every occasion</p>
      </header>

      <main className="home-main">
        <div className="main-actions">
          {/* My Trips Section */}
          <div className="action-card trips-card">
            <div className="card-icon">
              <div className="suitcase-icon">🧳</div>
            </div>
            <h2>My Trips</h2>
            <p>View and manage your saved trips and outfits</p>
            <button 
              className="action-button"
              onClick={() => onNavigate('my-trips')}
            >
              View Trips
            </button>
          </div>

          {/* Home/Closet Section */}
          <div className="action-card home-card">
            <div className="card-icon">
              <div className="home-icon">🏠</div>
            </div>
            <h2>HOME</h2>
            <p>Explore your closet and create new outfits</p>
            <button 
              className="action-button"
              onClick={() => onNavigate('stylist-workshop')}
            >
              Explore Closet
            </button>
          </div>
        </div>

        {/* Helper Section */}
        <div className="helper-section">
          <div className="helper-card">
            <div className="helper-icon">👗</div>
            <h3>All Outfits Saved into Closet</h3>
            <p>Labeled by trip and day/event</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;