import React, { useState } from 'react';
import './CategorySection.css';

const CategorySection = ({
    category,
    items = [],
    selectedItem,
    onItemSelect = () => { }
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const navigateLeft = () => {
        if (items.length > 0) {
            const newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            setCurrentIndex(newIndex);
        }
    };

    const navigateRight = () => {
        if (items.length > 0) {
            const newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            setCurrentIndex(newIndex);
        }
    };

    const handleItemSelect = () => {
        if (items.length > 0 && items[currentIndex]) {
            onItemSelect(items[currentIndex]);
        }
    };

    const currentItem = items.length > 0 ? items[currentIndex] : null;
    const isSelected = selectedItem && currentItem && selectedItem.id === currentItem.id;

    return (
        <div className="category-section">
            <div className="category-header">
                <h3 className="category-name">
                    {category.icon && <span className="category-icon">{category.icon}</span>}
                    {category.displayName}
                </h3>
            </div>

            <div className="category-content">
                <button
                    className="nav-arrow nav-arrow-left"
                    onClick={navigateLeft}
                    disabled={items.length === 0}
                    aria-label={`Previous ${category.displayName}`}
                >
                    ◀
                </button>

                <div className="item-display">
                    {currentItem ? (
                        <div
                            className={`item-card ${isSelected ? 'selected' : ''}`}
                            onClick={handleItemSelect}
                        >
                            <div className="item-info">
                                <h4 className="item-name">{currentItem.name}</h4>
                                <p className="item-details">
                                    {currentItem.color} • {currentItem.style}
                                </p>
                                <p className="item-description">{currentItem.description}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="item-card empty">
                            <p>No items available</p>
                        </div>
                    )}
                </div>

                <button
                    className="nav-arrow nav-arrow-right"
                    onClick={navigateRight}
                    disabled={items.length === 0}
                    aria-label={`Next ${category.displayName}`}
                >
                    ▶
                </button>
            </div>

            {items.length > 1 && (
                <div className="item-indicator">
                    {currentIndex + 1} of {items.length}
                </div>
            )}
        </div>
    );
};

export default CategorySection;