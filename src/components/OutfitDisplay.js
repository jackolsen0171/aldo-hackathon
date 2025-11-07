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
const DailyOutfitCard = ({ dailyOutfit, reusabilityMap }) => {
    const { day, date, occasion, outfit, styling } = dailyOutfit;

    const formatDate = (dateString) => {
        if (!dateString) return null;
        try {
            const parsed = new Date(dateString);
            return parsed.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const mainItems = ['topwear', 'outerwear', 'bottomwear', 'footwear'];
    const accessories = outfit.accessories || [];
    const simplifiedItems = [
        ...mainItems.map(category => outfit[category] ? { category, item: outfit[category] } : null).filter(Boolean),
        ...accessories.map(item => ({ category: 'accessory', item }))
    ];

    const totalItems = simplifiedItems.length;
    const reusedItemsCount = simplifiedItems.filter(({ item }) =>
        item && reusabilityMap[item.sku] && reusabilityMap[item.sku].length > 1
    ).length;

    return (
        <div className="daily-outfit-card simplified">
            <div className="outfit-card-header">
                <div className="day-info">
                    <h3 className="day-title">Day {day}</h3>
                    {date && <span className="day-date">{formatDate(date)}</span>}
                    {occasion && <span className="day-occasion">{occasion}</span>}
                </div>
                {totalItems > 0 && (
                    <div className="outfit-stats">
                        <span className="item-count">{totalItems} pieces</span>
                        {reusedItemsCount > 0 && (
                            <span className="reused-count">🔄 {reusedItemsCount} reused</span>
                        )}
                    </div>
                )}
            </div>

            <div className="hover-hint">
                Hover over any item to see why Cher picked it.
            </div>

            <div className="simplified-outfit-grid">
                {simplifiedItems.length === 0 ? (
                    <div className="empty-outfit-state">
                        <span>Nothing to show yet.</span>
                    </div>
                ) : (
                    simplifiedItems.map(({ category, item }, index) => {
                        const reuseDays = reusabilityMap[item.sku] || [];
                        const isReused = reuseDays.length > 1;

                        return (
                            <HoverRationaleItem
                                key={`${category}-${item.sku || index}`}
                                category={category}
                                item={item}
                                isReused={isReused}
                                reuseDays={reuseDays}
                                styling={styling}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

const HoverRationaleItem = ({ category, item, isReused, reuseDays, styling }) => {
    const imageUrl = getSkuImagePath(item.sku);
    const rationale = getItemRationale(styling?.rationale, category, item);

    return (
        <div className={`hover-item-card ${isReused ? 'reused' : ''}`}>
            <div className="hover-item-visual">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={item.name}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : (
                    <div className="hover-item-placeholder">
                        <span>{CATEGORY_ICONS[category] || '👗'}</span>
                    </div>
                )}

                {isReused && (
                    <div className="hover-item-reuse">
                        🔄 Days {reuseDays.join(', ')}
                    </div>
                )}

                <div className="hover-rationale">
                    <h5>Why it works</h5>
                    <p>{rationale}</p>
                </div>
            </div>

            <div className="hover-item-label">
                <span className="hover-item-category">{CATEGORY_NAMES[category] || 'Accessory'}</span>
                <span className="hover-item-name">{item.name}</span>
            </div>
        </div>
    );
};

const CATEGORY_NAMES = {
    topwear: 'Top',
    outerwear: 'Layer',
    bottomwear: 'Bottom',
    footwear: 'Shoes',
    accessory: 'Accessory'
};

const CATEGORY_ICONS = {
    topwear: '👕',
    outerwear: '🧥',
    bottomwear: '👖',
    footwear: '👟',
    accessory: '💍'
};

const getSkuImagePath = (sku) => {
    if (!sku) return null;
    const match = sku.match(/SKU(\d+)/);
    if (match) {
        const imageNumber = match[1].padStart(3, '0');
        return `/Images/${imageNumber}.png`;
    }
    return null;
};

const getDefaultRationale = (category, item) => {
    const pieceName = item?.name || CATEGORY_NAMES[category] || 'piece';
    return `Keeps the look cohesive and event-ready with the ${pieceName.toLowerCase()}.`;
};

// Helper function to extract item-specific rationale
const getItemRationale = (fullRationale, category, item) => {
    if (!fullRationale || typeof fullRationale !== 'string') {
        return getDefaultRationale(category, item);
    }

    const categoryKeywords = {
        topwear: ['shirt', 'top', 'blouse', 'sweater'],
        bottomwear: ['pants', 'jeans', 'skirt', 'trousers'],
        outerwear: ['jacket', 'blazer', 'coat', 'cardigan'],
        footwear: ['shoes', 'boots', 'heels', 'sneakers'],
        accessory: ['bag', 'belt', 'earrings', 'necklace', 'bracelet']
    };

    const sentences = fullRationale.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return categoryKeywords[category]?.some(keyword => lowerSentence.includes(keyword)) ||
            lowerSentence.includes(item.name?.toLowerCase());
    });

    if (relevantSentences.length === 0) {
        return getDefaultRationale(category, item);
    }

    return `${relevantSentences.join('. ').trim()}.`;
};

export default OutfitDisplay;
