import React, { useState } from 'react';
import AvatarDisplay from './AvatarDisplay';
import './OutfitVisualization.css';

const OutfitVisualization = ({
    selectedItems = {},
    outfitName = "Boat day sunset outfit",
    onSaveOutfit,
    onOutfitNameChange
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(outfitName);

    const handleNameClick = () => {
        setIsEditing(true);
    };

    const handleNameSubmit = () => {
        setIsEditing(false);
        if (onOutfitNameChange) {
            onOutfitNameChange(editedName);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditedName(outfitName);
        }
    };

    const handleSaveClick = () => {
        if (onSaveOutfit) {
            onSaveOutfit({
                name: outfitName,
                items: selectedItems
            });
        }
    };

    return (
        <div className="outfit-visualization">
            <div className="outfit-container">
                <AvatarDisplay selectedItems={selectedItems} />

                <div className="outfit-details">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={handleKeyPress}
                            className="outfit-name-input"
                            autoFocus
                        />
                    ) : (
                        <h3
                            className="outfit-name"
                            onClick={handleNameClick}
                            title="Click to edit outfit name"
                        >
                            {outfitName}
                        </h3>
                    )}

                    <button
                        className="save-outfit-button"
                        onClick={handleSaveClick}
                        title="Save this outfit"
                    >
                        <span className="heart-icon">💖</span>
                        Save Outfit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OutfitVisualization;