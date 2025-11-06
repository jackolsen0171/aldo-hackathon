import React from 'react';
import './ClosetPage.css';

const ClosetPage = ({ onNavigate }) => {
  return (
    <div className="closet-page">
      {/* Navigation Header */}
      <header className="closet-header">
        <nav className="closet-nav">
          <button 
            className="nav-button"
            onClick={() => onNavigate('home')}
          >
            ← Back to Home
          </button>
          <h1>My Closet</h1>
          <button 
            className="nav-button"
            onClick={() => onNavigate('combined-workshop')}
          >
            Outfit Planner
          </button>
        </nav>
      </header>

      {/* Closet Content */}
      <main className="closet-main">
        <div className="closet-categories">
          <div className="category-section">
            <h2>Tops</h2>
            <div className="clothing-grid">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="clothing-card">
                  <div className="clothing-image-placeholder">
                    {/* TODO: REPLACE WITH ACTUAL CLOTHING IMAGES */}
                    {/* Replace with: <img src={`/images/clothing/tops/${item}.png`} alt={`Top ${item}`} className="clothing-img" /> */}
                    <span className="clothing-emoji">👕</span>
                  </div>
                  <p className="clothing-name">Top {item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="category-section">
            <h2>Bottoms</h2>
            <div className="clothing-grid">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="clothing-card">
                  <div className="clothing-image-placeholder">
                    {/* TODO: REPLACE WITH ACTUAL CLOTHING IMAGES */}
                    {/* Replace with: <img src={`/images/clothing/bottoms/${item}.png`} alt={`Bottom ${item}`} className="clothing-img" /> */}
                    <span className="clothing-emoji">👖</span>
                  </div>
                  <p className="clothing-name">Bottom {item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="category-section">
            <h2>Shoes</h2>
            <div className="clothing-grid">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="clothing-card">
                  <div className="clothing-image-placeholder">
                    {/* TODO: REPLACE WITH ACTUAL CLOTHING IMAGES */}
                    {/* Replace with: <img src={`/images/clothing/shoes/${item}.png`} alt={`Shoe ${item}`} className="clothing-img" /> */}
                    <span className="clothing-emoji">👠</span>
                  </div>
                  <p className="clothing-name">Shoe {item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="category-section">
            <h2>Accessories</h2>
            <div className="clothing-grid">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="clothing-card">
                  <div className="clothing-image-placeholder">
                    {/* TODO: REPLACE WITH ACTUAL CLOTHING IMAGES */}
                    {/* Replace with: <img src={`/images/clothing/accessories/${item}.png`} alt={`Accessory ${item}`} className="clothing-img" /> */}
                    <span className="clothing-emoji">🎩</span>
                  </div>
                  <p className="clothing-name">Accessory {item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClosetPage;