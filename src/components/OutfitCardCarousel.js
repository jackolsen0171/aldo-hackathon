import React, { useMemo, useState, useEffect } from 'react';
import './OutfitCardCarousel.css';

const CATEGORY_LABELS = {
    topwear: 'Top',
    outerwear: 'Layer',
    bottomwear: 'Bottom',
    footwear: 'Shoes',
    accessory: 'Accessory'
};

const ORDERED_MAIN_CATEGORIES = ['topwear', 'outerwear', 'bottomwear', 'footwear'];

const getSkuImagePath = (sku) => {
    if (!sku) return null;
    const match = sku.match(/SKU(\d+)/i);
    if (match) {
        const imageNumber = match[1].padStart(3, '0');
        return `/Images/${imageNumber}.png`;
    }
    return null;
};

const getDefaultRationale = (category, item) => {
    const pieceName = item?.name || CATEGORY_LABELS[category] || 'piece';
    return `Completes the look with the ${pieceName.toLowerCase()} while staying true to the dress code.`;
};

const getItemRationale = (stylingNotes, category, item) => {
    if (!stylingNotes) {
        return getDefaultRationale(category, item);
    }

    const categoryKeywords = {
        topwear: ['shirt', 'top', 'blouse', 'sweater', 'tee'],
        bottomwear: ['pants', 'jeans', 'skirt', 'trousers'],
        outerwear: ['jacket', 'coat', 'blazer', 'cardigan'],
        footwear: ['shoes', 'boots', 'heels', 'sneakers'],
        accessory: ['bag', 'belt', 'earrings', 'scarf', 'necklace']
    };

    const sentences = stylingNotes.split(/[.!?]+/);
    const match = sentences.find(sentence => {
        const text = sentence.toLowerCase();
        return (
            (item?.name && text.includes(item.name.toLowerCase())) ||
            categoryKeywords[category]?.some(keyword => text.includes(keyword))
        );
    });

    if (!match || !match.trim()) {
        return getDefaultRationale(category, item);
    }

    return match.trim() + '.';
};

const OutfitCardCarousel = ({ trip }) => {
    const outfits = useMemo(() => {
        if (!trip?.outfits) {
            return [];
        }

        return Object.entries(trip.outfits)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([key, outfit], index) => ({
                key,
                index,
                ...outfit
            }));
    }, [trip]);

    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setCurrentIndex(0);
    }, [trip?.id, outfits.length]);

    if (!outfits.length) {
        return (
            <div className="outfit-carousel-empty">
                <p>No outfits have been generated yet.</p>
            </div>
        );
    }

    const currentOutfit = outfits[currentIndex];
    const outfitItems = currentOutfit.items || {};

    const showPrev = () => {
        setCurrentIndex(prev => (prev === 0 ? outfits.length - 1 : prev - 1));
    };

    const showNext = () => {
        setCurrentIndex(prev => (prev + 1) % outfits.length);
    };

    const accessories = Array.isArray(outfitItems.accessories) ? outfitItems.accessories : [];

    return (
        <div className="outfit-carousel">
            <header className="carousel-header">
                <div>
                    <p className="eyebrow">Day {currentOutfit.day || currentIndex + 1}</p>
                    <h3>{currentOutfit.occasion || trip?.eventData?.occasion || 'Styled look'}</h3>
                </div>
                <div className="header-meta">
                    {trip?.destination && <span>{trip.destination}</span>}
                    <span className="divider">•</span>
                    <span>{currentIndex + 1} / {outfits.length}</span>
                </div>
            </header>

            <div className="carousel-card">
                <div className="carousel-items">
                    {ORDERED_MAIN_CATEGORIES.map(category => {
                        const item = outfitItems[category];
                        if (!item) return null;

                        return (
                            <OutfitImageCard
                                key={category}
                                category={category}
                                item={item}
                                rationale={getItemRationale(currentOutfit.styling?.rationale, category, item)}
                            />
                        );
                    })}
                </div>

                {accessories.length > 0 && (
                    <div className="accessories-block">
                        <span className="chip-label">Accessories</span>
                        <ul>
                            {accessories.map((accessory, idx) => (
                                <li key={`${accessory.sku || idx}`}>
                                    <strong>{accessory.name}</strong>
                                    {accessory.colors && <span> • {accessory.colors}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {currentOutfit.styling?.rationale && (
                    <div className="rationale">
                        <h4>Styling notes</h4>
                        <p>{currentOutfit.styling.rationale}</p>
                    </div>
                )}
            </div>

            <div className="carousel-controls">
                <button className="control-btn" onClick={showPrev} aria-label="Previous outfit">
                    ←
                </button>
                <button className="control-btn" onClick={showNext} aria-label="Next outfit">
                    →
                </button>
            </div>
        </div>
    );
};

export default OutfitCardCarousel;

const OutfitImageCard = ({ category, item, rationale }) => {
    const imageUrl = getSkuImagePath(item.sku);
    const label = CATEGORY_LABELS[category] || category;

    return (
        <div className="outfit-flip-card">
            <div className="flip-inner" tabIndex={0}>
                <div className="flip-face flip-face-front">
                    <div className="image-frame">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={item.name}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                        ) : (
                            <div className="image-fallback">
                                {label}
                            </div>
                        )}
                        <div className="image-fallback" style={{ display: 'none' }}>
                            {label}
                        </div>
                    </div>
                    <div className="item-meta">
                        <span className="chip-label">{label}</span>
                        <strong className="chip-value">{item.name || 'Selected piece'}</strong>
                        {item.colors && <span className="chip-meta">{item.colors}</span>}
                    </div>
                </div>
                <div className="flip-face flip-face-back">
                    <h5>Why Cher picked it</h5>
                    <p>{rationale}</p>
                </div>
            </div>
        </div>
    );
};
