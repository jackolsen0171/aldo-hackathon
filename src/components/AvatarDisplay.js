import React from 'react';
import './AvatarDisplay.css';

const AvatarDisplay = ({ selectedItems = {} }) => {
    const renderClothingItem = (category, item) => {
        if (!item) return null;

        return (
            <div key={category} className={`clothing-item ${category}`}>
                <span className="item-label">{item.name || category}</span>
            </div>
        );
    };

    const hasAnyItems = Object.keys(selectedItems).length > 0;

    return (
        <div className="avatar-display">
            <div className="avatar-container">
                <div className="avatar-silhouette">
                    {/* Head */}
                    <div className="avatar-head">
                        {renderClothingItem('hat', selectedItems.hat)}
                    </div>

                    {/* Torso */}
                    <div className="avatar-torso">
                        {renderClothingItem('outerwear', selectedItems.outerwear)}
                        {renderClothingItem('shirt', selectedItems.shirt)}
                    </div>

                    {/* Waist */}
                    <div className="avatar-waist">
                        {renderClothingItem('belt', selectedItems.belt)}
                    </div>

                    {/* Legs */}
                    <div className="avatar-legs">
                        {renderClothingItem('pants', selectedItems.pants)}
                    </div>

                    {/* Feet */}
                    <div className="avatar-feet">
                        {renderClothingItem('shoes', selectedItems.shoes)}
                    </div>

                    {/* Accessories */}
                    <div className="avatar-accessories">
                        {renderClothingItem('jewelry', selectedItems.jewelry)}
                    </div>
                </div>

                {!hasAnyItems && (
                    <div className="avatar-placeholder">
                        <div className="placeholder-icon">👤</div>
                        <p className="placeholder-text">Select clothing items to see your outfit</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvatarDisplay;