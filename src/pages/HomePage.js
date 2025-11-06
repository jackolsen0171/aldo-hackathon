import React from 'react';
import InteractiveCloset from '../components/InteractiveCloset';
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
        {/* Left Side - Cher Avatar */}
        <div className="home-left">
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

        {/* Right Side - Interactive Closet */}
        <div className="home-right">
          <InteractiveCloset onClick={() => onNavigate('closet')} />
          <div className="closet-instructions">
            <p>Click on the closet to explore your wardrobe!</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;