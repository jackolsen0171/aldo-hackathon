import React from 'react';
import './OutfitSummaryPanel.css';

const OutfitSummaryPanel = ({
    tripDetails,
    reusabilityAnalysis,
    outfits
}) => {
    if (!tripDetails && !reusabilityAnalysis) {
        return null;
    }

    return (
        <div className="outfit-summary-panel">
            {/* Trip Summary Header */}
            {tripDetails && (
                <div className="trip-summary-section">
                    <h3>Your Outfit Recommendations</h3>
                    <div className="trip-details">
                        <div className="trip-detail-item">
                            <span className="detail-icon">🎯</span>
                            <span className="detail-text">{tripDetails.occasion}</span>
                        </div>
                        {tripDetails.location && (
                            <div className="trip-detail-item">
                                <span className="detail-icon">📍</span>
                                <span className="detail-text">{tripDetails.location}</span>
                            </div>
                        )}
                        <div className="trip-detail-item">
                            <span className="detail-icon">📅</span>
                            <span className="detail-text">{tripDetails.duration} days</span>
                        </div>
                        <div className="trip-detail-item">
                            <span className="detail-icon">👔</span>
                            <span className="detail-text">{tripDetails.dressCode}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Reusability Analysis */}
            {reusabilityAnalysis && (
                <ReusabilityAnalysisCard
                    reusabilityAnalysis={reusabilityAnalysis}
                    outfits={outfits}
                />
            )}
        </div>
    );
};

const ReusabilityAnalysisCard = ({ reusabilityAnalysis, outfits }) => {
    const { totalItems, reusedItems, reusabilityPercentage, reusabilityMap } = reusabilityAnalysis;

    // Calculate packing benefits
    const totalDays = outfits?.dailyOutfits?.length || 1;
    const itemsWithoutReuse = totalDays * (totalItems / totalDays);
    const itemsSaved = Math.max(0, itemsWithoutReuse - totalItems);

    // Get most reused items
    const mostReusedItems = Object.entries(reusabilityMap || {})
        .filter(([sku, days]) => days.length > 1)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 3);

    return (
        <div className="reusability-summary-compact">
            <div className="reusability-header">
                <h4>🎒 Packing Optimization</h4>
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
                    <h5>Most Versatile Items</h5>
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
    if (!outfits?.dailyOutfits) return null;

    for (const dailyOutfit of outfits.dailyOutfits) {
        for (const item of Object.values(dailyOutfit.outfit)) {
            if (item && item.sku === sku) {
                return item;
            }
        }
    }
    return null;
};

export default OutfitSummaryPanel;