import React, { useMemo, useState, useEffect, useRef } from 'react';
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

const OutfitCardCarousel = ({
    trip,
    savedSkus = new Set(),
    onSaveItems = () => {},
    getClosetCenter = () => ({ x: 0, y: 0 }),
    dailyPlans = []
}) => {
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
                    <h3>{dailyPlans?.[currentIndex]?.activity || currentOutfit.occasion || trip?.eventData?.occasion || 'Styled look'}</h3>
                </div>
                <div className="header-meta">
                    {trip?.destination && <span>{trip.destination}</span>}
                    <span className="divider">•</span>
                    <span>{currentIndex + 1} / {outfits.length}</span>
                </div>
            </header>
            <div className="day-pagination" aria-label="Day selector">
                {outfits.map((outfit, index) => (
                    <button
                        key={outfit.key || index}
                        className={`day-pill ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => setCurrentIndex(index)}
                        type="button"
                        aria-current={index === currentIndex ? 'true' : 'false'}
                    >
                        Day {outfit.day || index + 1}
                        {dailyPlans?.[index]?.activity ? ` · ${dailyPlans[index].activity}` : ''}
                    </button>
                ))}
            </div>

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
                                saved={savedSkus.has(item.sku)}
                                onSave={() => item?.sku && !savedSkus.has(item.sku) && onSaveItems([item])}
                                getClosetCenter={getClosetCenter}
                            />
                        );
                    })}
                </div>

                {accessories.length > 0 && (
                    <div className="accessories-block">
                        <span className="chip-label">Accessories</span>
                        <div className="accessories-grid">
                            {accessories.map((accessory, idx) => (
                                <div key={`${accessory.sku || idx}`} className="accessory-card">
                                    <div className="accessory-image">
                                        <img
                                            src={getSkuImagePath(accessory.sku)}
                                            alt={accessory.name}
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                        />
                                        <div className="accessory-image-fallback">{accessory.name?.[0]}</div>
                                    </div>
                                    <strong>{accessory.name}</strong>
                                    {accessory.colors && <span>{accessory.colors}</span>}
                                </div>
                            ))}
                        </div>
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

const OutfitImageCard = ({ category, item, rationale, saved, onSave, getClosetCenter }) => {
    const imageUrl = getSkuImagePath(item.sku);
    const label = CATEGORY_LABELS[category] || category;
    const [animating, setAnimating] = useState(false);
    const [freezeFlip, setFreezeFlip] = useState(false);
    const imageRef = useRef(null);

    const handleSaveClick = () => {
        if (saved || animating || !onSave) {
            return;
        }

        const imgEl = imageRef.current;
        const closetCenter = getClosetCenter?.();

        onSave();

        if (!imgEl || !closetCenter) {
            return;
        }

        const rect = imgEl.getBoundingClientRect();
        const clone = imgEl.cloneNode(true);
        clone.classList.add('flying-item');
        clone.style.position = 'fixed';
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.zIndex = '9999';
        document.body.appendChild(clone);

        setAnimating(true);

        requestAnimationFrame(() => {
            const translateX = closetCenter.x - (rect.left + rect.width / 2);
            const translateY = closetCenter.y - (rect.top + rect.height / 2);
            clone.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.2)`;
            clone.style.opacity = '0';
        });

        setTimeout(() => {
            clone.remove();
            setAnimating(false);
        }, 700);
    };

    return (
        <div className={`outfit-flip-card ${freezeFlip ? 'freeze' : ''}`}>
            <div className="flip-inner" tabIndex={0}>
                <div className="flip-face flip-face-front">
                    <div className="image-frame">
                        {imageUrl ? (
                            <img
                                ref={imageRef}
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
            <button
                className={`save-item-btn ${saved ? 'saved' : ''}`}
                onClick={handleSaveClick}
                type="button"
                disabled={saved}
                onMouseEnter={() => setFreezeFlip(true)}
                onMouseLeave={() => setFreezeFlip(false)}
                onFocus={() => setFreezeFlip(true)}
                onBlur={() => setFreezeFlip(false)}
            >
                {saved ? 'Added to closet' : 'Save to closet'}
            </button>
        </div>
    );
};
