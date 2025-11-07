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
            {/* Daily outfits - Show these FIRST */}
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

    // Separate main items from accessories
    const mainItems = ['topwear', 'outerwear', 'bottomwear', 'footwear'];
    const accessories = outfit.accessories || [];

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

            <div className="outfit-card-content-new">
                {/* Left Column - Accessories */}
                <div className="accessories-column">
                    {accessories.length > 0 ? (
                        <>
                            <h4 className="column-title">👜 Accessories</h4>
                            <div className="accessories-list">
                                {accessories.map((accessory, index) => {
                                    const isReused = reusabilityMap[accessory.sku] && reusabilityMap[accessory.sku].length > 1;
                                    const reuseDays = reusabilityMap[accessory.sku] || [];
                                    return (
                                        <AccessoryItem
                                            key={`accessory-${index}`}
                                            item={accessory}
                                            isReused={isReused}
                                            reuseDays={reuseDays}
                                        />
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="no-accessories">
                            <span className="empty-icon">👜</span>
                            <span className="empty-text">No accessories</span>
                        </div>
                    )}
                </div>

                {/* Center Column - Main Outfit Items */}
                <div className="main-items-column">
                    {mainItems.map(category => {
                        const item = outfit[category];
                        if (!item) return null;

                        const isReused = reusabilityMap[item.sku] && reusabilityMap[item.sku].length > 1;
                        const reuseDays = reusabilityMap[item.sku] || [];

                        return (
                            <MainOutfitItem
                                key={category}
                                category={category}
                                item={item}
                                isReused={isReused}
                                reuseDays={reuseDays}
                                styling={styling}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Overall Styling Notes at Bottom */}
            {styling && (styling.weatherConsiderations || styling.dresscodeCompliance) && (
                <div className="overall-styling-notes">
                    {styling.weatherConsiderations && (
                        <div className="styling-note">
                            <span className="note-icon">🌤️</span>
                            <span className="note-text">{styling.weatherConsiderations}</span>
                        </div>
                    )}
                    {styling.dresscodeCompliance && (
                        <div className="styling-note">
                            <span className="note-icon">👔</span>
                            <span className="note-text">{styling.dresscodeCompliance}</span>
                        </div>
                    )}
                </div>
            )}
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

const MainOutfitItem = ({ category, item, isReused, reuseDays, styling }) => {
    const categoryIcons = {
        topwear: '👕',
        bottomwear: '👖',
        outerwear: '🧥',
        footwear: '👟'
    };

    const categoryNames = {
        topwear: 'Top',
        bottomwear: 'Bottom',
        outerwear: 'Outerwear',
        footwear: 'Shoes'
    };

    // Generate image URL from SKU
    const getImageUrl = (sku) => {
        if (!sku) return null;
        const match = sku.match(/SKU(\d+)/);
        if (match) {
            const imageNumber = match[1].padStart(3, '0');
            return `/Images/${imageNumber}.png`;
        }
        return null;
    };

    const imageUrl = getImageUrl(item.sku);

    const formatPrice = (price) => {
        if (!price) return '';
        return `$${parseFloat(price).toFixed(2)}`;
    };

    return (
        <div className={`main-outfit-item ${isReused ? 'reused' : ''}`}>
            {/* Left side - Large Image */}
            <div className="main-item-image-container">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={item.name}
                        className="main-item-image"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div className="image-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                    <span className="placeholder-icon">{categoryIcons[category]}</span>
                </div>

                {/* Reuse indicator on image */}
                {isReused && (
                    <div className="reuse-badge">
                        <span className="reuse-icon">🔄</span>
                        <span className="reuse-text">Days {reuseDays.join(', ')}</span>
                    </div>
                )}
            </div>

            {/* Right side - Item Details and Rationale */}
            <div className="main-item-details">
                <div className="item-header-main">
                    <h4 className="item-category-title">
                        {categoryIcons[category]} {categoryNames[category]}
                    </h4>
                    <span className="item-price-main">{formatPrice(item.price)}</span>
                </div>

                <h5 className="item-name-main">{item.name}</h5>

                <div className="item-specs">
                    {item.colors && (
                        <div className="spec-item">
                            <span className="spec-label">Color:</span>
                            <span className="spec-value">{item.colors}</span>
                        </div>
                    )}
                    {item.formality && (
                        <div className="spec-item">
                            <span className="spec-label">Style:</span>
                            <span className="spec-value">{item.formality}</span>
                        </div>
                    )}
                    {item.weatherSuitability && (
                        <div className="spec-item">
                            <span className="spec-label">Weather:</span>
                            <span className="spec-value">{item.weatherSuitability}</span>
                        </div>
                    )}
                </div>

                {/* Item-specific rationale */}
                {styling?.rationale && (
                    <div className="item-rationale">
                        <h6>Why this piece works:</h6>
                        <p>{getItemRationale(styling.rationale, category, item)}</p>
                    </div>
                )}

                {item.notes && (
                    <div className="item-notes-main">
                        <p>{item.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AccessoryItem = ({ item, isReused, reuseDays }) => {
    const getImageUrl = (sku) => {
        if (!sku) return null;
        const match = sku.match(/SKU(\d+)/);
        if (match) {
            const imageNumber = match[1].padStart(3, '0');
            return `/Images/${imageNumber}.png`;
        }
        return null;
    };

    const imageUrl = getImageUrl(item.sku);

    return (
        <div className={`accessory-item ${isReused ? 'reused' : ''}`}>
            <div className="accessory-image-container">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={item.name}
                        className="accessory-image"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div className="accessory-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                    <span className="placeholder-icon">💍</span>
                </div>

                {isReused && (
                    <div className="accessory-reuse-badge">
                        <span>🔄</span>
                    </div>
                )}
            </div>

            <div className="accessory-details">
                <h6 className="accessory-name">{item.name}</h6>
                <span className="accessory-price">${parseFloat(item.price || 0).toFixed(2)}</span>
                {isReused && (
                    <span className="accessory-reuse-text">Days {reuseDays.join(', ')}</span>
                )}
            </div>
        </div>
    );
};

// Helper function to extract item-specific rationale
const getItemRationale = (fullRationale, category, item) => {
    // This is a simplified version - in a real implementation, 
    // you might have item-specific rationales from the AI
    const categoryKeywords = {
        topwear: ['shirt', 'top', 'blouse', 'sweater'],
        bottomwear: ['pants', 'jeans', 'skirt', 'trousers'],
        outerwear: ['jacket', 'blazer', 'coat', 'cardigan'],
        footwear: ['shoes', 'boots', 'heels', 'sneakers']
    };

    // Extract sentences that mention this category or item
    const sentences = fullRationale.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return categoryKeywords[category]?.some(keyword => lowerSentence.includes(keyword)) ||
            lowerSentence.includes(item.name.toLowerCase());
    });

    return relevantSentences.length > 0
        ? relevantSentences.join('. ').trim() + '.'
        : `This ${category} provides the perfect balance of style and comfort for your occasion.`;
};