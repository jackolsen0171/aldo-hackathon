import React, { useState } from 'react';
import OutfitVisualization from './OutfitVisualization';

const OutfitVisualizationDemo = () => {
    const [outfitName, setOutfitName] = useState("Boat day sunset outfit");
    const [selectedItems, setSelectedItems] = useState({
        hat: { name: "Sun Hat", color: "beige" },
        shirt: { name: "Linen Shirt", color: "white" },
        pants: { name: "Chino Shorts", color: "navy" },
        shoes: { name: "Canvas Sneakers", color: "white" },
        jewelry: { name: "Gold Necklace", color: "gold" }
    });

    const handleSaveOutfit = (outfit) => {
        console.log('Saving outfit:', outfit);
        alert(`Saved outfit: ${outfit.name}`);
    };

    const handleOutfitNameChange = (newName) => {
        console.log('Outfit name changed to:', newName);
        setOutfitName(newName);
    };

    const toggleItem = (category) => {
        setSelectedItems(prev => {
            const newItems = { ...prev };
            if (newItems[category]) {
                delete newItems[category];
            } else {
                // Add sample items for demo
                const sampleItems = {
                    hat: { name: "Sun Hat", color: "beige" },
                    shirt: { name: "Linen Shirt", color: "white" },
                    outerwear: { name: "Light Cardigan", color: "cream" },
                    pants: { name: "Chino Shorts", color: "navy" },
                    shoes: { name: "Canvas Sneakers", color: "white" },
                    jewelry: { name: "Gold Necklace", color: "gold" },
                    belt: { name: "Leather Belt", color: "brown" }
                };
                newItems[category] = sampleItems[category];
            }
            return newItems;
        });
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>OutfitVisualization Component Demo</h2>

            <div style={{ marginBottom: '20px' }}>
                <h3>Toggle Clothing Items:</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['hat', 'shirt', 'outerwear', 'pants', 'shoes', 'jewelry', 'belt'].map(category => (
                        <button
                            key={category}
                            onClick={() => toggleItem(category)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: selectedItems[category] ? '#ff6b9d' : '#e9ecef',
                                color: selectedItems[category] ? 'white' : '#333',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                            }}
                        >
                            {category} {selectedItems[category] ? '✓' : ''}
                        </button>
                    ))}
                </div>
            </div>

            <h3>With Selected Items</h3>
            <OutfitVisualization
                selectedItems={selectedItems}
                outfitName={outfitName}
                onSaveOutfit={handleSaveOutfit}
                onOutfitNameChange={handleOutfitNameChange}
            />

            <h3>Empty State</h3>
            <OutfitVisualization
                selectedItems={{}}
                outfitName="New Outfit"
                onSaveOutfit={handleSaveOutfit}
                onOutfitNameChange={() => { }}
            />
        </div>
    );
};

export default OutfitVisualizationDemo;