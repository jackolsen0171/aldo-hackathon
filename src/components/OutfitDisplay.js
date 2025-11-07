import './OutfitDisplay.css';

const OutfitDisplay = ({
    outfits = null,
    tripDetails = null,
    reusabilityAnalysis = null,
    loading = false,
    error = null,
    onRetry = null
}) => {
    // Loading state
    if (loading) {
        return (
            <div className="outfit-display">
                <div className="outfit-display-loading">
                    <div className="loading-spinner"></div>
                    <h3>Generating Your Outfits</h3>
                    <p>Creating personalized outfit recommendations based on your preferences...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="outfit-display">
                <div className="outfit-display-error">
                    <div className="error-icon">⚠️</div>
                    <h3>Unable to Generate Outfits</h3>
                    <p className="error-message">{error}</p>
                    {onRetry && (
                        <button onClick={onRetry} className="retry-button">
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // No outfits state
    if (!outfits || !outfits.dailyOutfits || outfits.dailyOutfits.length === 0) {
        return (
            <div className="outfit-display">
                <div className="outfit-display-empty">
                    <div className="empty-icon">👗</div>
                    <h3>No Outfits Generated</h3>
                    <p>Please confirm your event details to generate outfit recommendations.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="outfit-display">
            {/* Header with trip summary */}
            <div className="outfit-display-header">
                <h2>Your Outfit Recommendations</h2>
                {tripDetails && (
                    <div className="trip-summary">
                        <div className="trip-info">
                            <span className="trip-occasion">{tripDetails.occasion}</span>
                            {tripDetails.location && (
                                <span className="trip-location">📍 {tripDetails.location}</span>
                            )}
                            <span className="trip-duration">📅 {tripDetails.duration} days</span>
                            <span className="trip-dress-code">👔 {tripDetails.dressCode}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Reusability summary */}
            {reusabilityAnalysis && (
                <ReusabilityAnalysisCard
                    reusabilityAnalysis={reusabilityAnalysis}
                    outfits={outfits}
                />
            )}

            {/* Daily outfits */}
            <div className="daily-outfits">
                {outfits.dailyOutfits.map((dailyOutfit, index) => (
                    <DailyOutfitCard
                        key={index}
                        dailyOutfit={dailyOutfit}
                        reusabilityMap={reusabilityAnalysis?.reusabilityMap || {}}
                    />
                ))}
            </div>
        </div>
    );
};

const ReusabilityAnalysisCard = ({ reusabilityAnalysis, outfits }) => {
    const { totalItems, reusedItems, reusabilityPercentage, reusabilityMap } = reusabilityAnalysis;

    // Calculate packing benefits
    const totalDays = outfits.dailyOutfits.length;
    const itemsWithoutReuse = totalDays * (totalItems / totalDays);
    const itemsSaved = Math.max(0, itemsWithoutReuse - totalItems);

    // Get most reused items
    const mostReusedItems = Object.entries(reusabilityMap)
        .filter(([sku, days]) => days.length > 1)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 3);

    return (
        <div className="reusability-summary">
            <div className="reusability-header">
                <h3>🎒 Packing Optimization</h3>
                <div className="reusability-percentage">
                    {Math.round(reusabilityPercentage)}% reusability
                </div>
            </div>

            <div className="reusability-stats">
                <div className="stat-item">
                    <span className="stat-number">{totalItems}</span>
                    <span className="stat-label">Total Items</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{reusedItems}</span>
                    <span className="stat-label">Reused Items</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{itemsSaved}</span>
                    <span className="stat-label">Items Saved</span>
                </div>
            </div>

            <p className="reusability-description">
                Smart packing! You'll need {totalItems} items total, with {reusedItems} items
                being reused across multiple days. This saves you {itemsSaved} items compared to unique outfits each day.
            </p>

            {mostReusedItems.length > 0 && (
                <div className="most-reused-items">
                    <h4>Most Versatile Items</h4>
                    <div className="reused-items-list">
                        {mostReusedItems.map(([sku, days]) => {
                            // Find the item details from outfits
                            const item = findItemBySku(outfits, sku);
                            return (
                                <div key={sku} className="reused-item-highlight">
                                    <span className="item-name">{item?.name || 'Unknown Item'}</span>
                                    <span className="reuse-count">
                                        Used {days.length} times (Days {days.join(', ')})
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to find item by SKU in outfits
const findItemBySku = (outfits, sku) => {
    for (const dailyOutfit of outfits.dailyOutfits) {
        for (const item of Object.values(dailyOutfit.outfit)) {
            if (item && item.sku === sku) {
                return item;
            }
        }
    }
    return null;
};

const DailyOutfitCard = ({ dailyOutfit, reusabilityMap }) => {
    const { day, date, occasion, outfit, styling } = dailyOutfit;

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    // Count total items in outfit
    const totalItems = Object.values(outfit).filter(item => item !== null).length;
    const reusedItemsCount = Object.values(outfit).filter(item =>
        item && reusabilityMap[item.sku] && reusabilityMap[item.sku].length > 1
    ).length;

    return (
        <div className="daily-outfit-card">
            <div className="outfit-card-header">
                <div className="day-info">
                    <h3 className="day-title">Day {day}</h3>
                    {date && <span className="day-date">{formatDate(date)}</span>}
                    {occasion && <span className="day-occasion">{occasion}</span>}
                </div>
                <div className="outfit-stats">
                    <span className="item-count">{totalItems} items</span>
                    {reusedItemsCount > 0 && (
                        <span className="reused-count">
                            🔄 {reusedItemsCount} reused
                        </span>
                    )}
                </div>
            </div>

            <div className="outfit-card-content">
                {/* Outfit items organized by category */}
                <div className="outfit-items">
                    {renderOutfitByCategory(outfit, reusabilityMap)}
                </div>

                {/* Styling rationale */}
                {styling && (
                    <div className="styling-info">
                        <h4>Styling Notes</h4>
                        {styling.rationale && (
                            <div className="styling-section">
                                <h5>Why This Outfit Works</h5>
                                <p className="styling-rationale">{styling.rationale}</p>
                            </div>
                        )}
                        {styling.weatherConsiderations && (
                            <div className="styling-section">
                                <h5>Weather Considerations</h5>
                                <div className="weather-considerations">
                                    <span className="weather-icon">🌤️</span>
                                    <span>{styling.weatherConsiderations}</span>
                                </div>
                            </div>
                        )}
                        {styling.dresscodeCompliance && (
                            <div className="styling-section">
                                <h5>Dress Code Compliance</h5>
                                <div className="dresscode-compliance">
                                    <span className="dresscode-icon">👔</span>
                                    <span>{styling.dresscodeCompliance}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function to render outfit items organized by category
const renderOutfitByCategory = (outfit, reusabilityMap) => {
    const categoryOrder = ['topwear', 'outerwear', 'bottomwear', 'footwear', 'accessories'];
    const categoryGroups = {
        topwear: [],
        outerwear: [],
        bottomwear: [],
        footwear: [],
        accessories: []
    };

    // Group items by category
    Object.entries(outfit).forEach(([category, item]) => {
        if (item) {
            if (categoryGroups[category]) {
                categoryGroups[category].push({ category, item });
            } else {
                // Handle accessories array or other categories
                if (category === 'accessories' && Array.isArray(item)) {
                    item.forEach(accessory => {
                        categoryGroups.accessories.push({ category: 'accessory', item: accessory });
                    });
                } else {
                    categoryGroups.accessories.push({ category, item });
                }
            }
        }
    });

    // Render items in order
    return categoryOrder.map(categoryKey => {
        const items = categoryGroups[categoryKey];
        if (items.length === 0) return null;

        return (
            <div key={categoryKey} className="category-group">
                <h5 className="category-title">
                    {getCategoryIcon(categoryKey)} {getCategoryDisplayName(categoryKey)}
                </h5>
                <div className="category-items">
                    {items.map((itemData, index) => {
                        const { category, item } = itemData;
                        const isReused = reusabilityMap[item.sku] && reusabilityMap[item.sku].length > 1;
                        const reuseDays = reusabilityMap[item.sku] || [];

                        return (
                            <OutfitItem
                                key={`${category}-${index}`}
                                category={category}
                                item={item}
                                isReused={isReused}
                                reuseDays={reuseDays}
                                compact={true}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }).filter(Boolean);
};

// Helper functions
const getCategoryIcon = (category) => {
    const icons = {
        topwear: '👕',
        outerwear: '🧥',
        bottomwear: '👖',
        footwear: '👟',
        accessories: '👜'
    };
    return icons[category] || '👔';
};

const getCategoryDisplayName = (category) => {
    const names = {
        topwear: 'Tops',
        outerwear: 'Outerwear',
        bottomwear: 'Bottoms',
        footwear: 'Shoes',
        accessories: 'Accessories'
    };
    return names[category] || category;
};

const OutfitItem = ({ category, item, isReused, reuseDays, compact = false }) => {
    const categoryIcons = {
        topwear: '👕',
        bottomwear: '👖',
        outerwear: '🧥',
        footwear: '👟',
        accessories: '👜',
        accessory: '💍'
    };

    const formatPrice = (price) => {
        if (!price) return '';
        const numPrice = parseFloat(price);
        return `$${numPrice.toFixed(2)}`;
    };

    // Generate image URL from SKU
    const getImageUrl = (sku) => {
        if (!sku) return null;
        // Extract number from SKU (e.g., "SKU007" -> "007")
        const match = sku.match(/SKU(\d+)/);
        if (match) {
            const imageNumber = match[1].padStart(3, '0'); // Ensure 3 digits
            return `/Images/${imageNumber}.png`;
        }
        return null;
    };

    const imageUrl = getImageUrl(item.sku);

    const formatWeatherSuitability = (weather) => {
        if (!weather) return '';
        return weather.split(',').map(w => w.trim()).join(', ');
    };

    const formatFormality = (formality) => {
        if (!formality) return '';
        const formalityMap = {
            'casual': 'Casual',
            'smart-casual': 'Smart Casual',
            'business': 'Business',
            'formal': 'Formal',
            'black-tie': 'Black Tie'
        };
        return formalityMap[formality.toLowerCase()] || formality;
    };

    return (
        <div className={`outfit-item ${isReused ? 'reused' : ''} ${compact ? 'compact' : ''}`}>
            <div className="item-header">
                <span className="item-category">
                    {categoryIcons[category] || '👔'} {compact ? '' : category}
                </span>
                {isReused && (
                    <div className="reuse-indicator">
                        <span className="reuse-icon">🔄</span>
                        <span className="reuse-text">
                            Day{reuseDays.length > 2 ? 's' : ''} {reuseDays.join(', ')}
                        </span>
                    </div>
                )}
            </div>

            <div className="item-content">
                {/* Item Image */}
                {imageUrl && (
                    <div className="item-image">
                        <img
                            src={imageUrl}
                            alt={item.name}
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                <div className="item-details">
                    <h5 className="item-name">{item.name}</h5>

                    <div className="item-attributes">
                        {item.price && (
                            <span className="item-price">{formatPrice(item.price)}</span>
                        )}
                        {item.colors && (
                            <span className="item-colors">
                                <span className="attribute-label">Color:</span> {item.colors}
                            </span>
                        )}
                        {item.weatherSuitability && (
                            <span className="item-weather">
                                <span className="attribute-label">Weather:</span> {formatWeatherSuitability(item.weatherSuitability)}
                            </span>
                        )}
                        {item.formality && (
                            <span className="item-formality">
                                <span className="attribute-label">Style:</span> {formatFormality(item.formality)}
                            </span>
                        )}
                        {item.layering && (
                            <span className="item-layering">
                                <span className="attribute-label">Layering:</span> {item.layering}
                            </span>
                        )}
                    </div>

                    {item.tags && item.tags.length > 0 && (
                        <div className="item-tags">
                            {item.tags.map((tag, index) => (
                                <span key={index} className="item-tag">{tag}</span>
                            ))}
                        </div>
                    )}

                    {item.notes && !compact && (
                        <p className="item-notes">{item.notes}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OutfitDisplay;