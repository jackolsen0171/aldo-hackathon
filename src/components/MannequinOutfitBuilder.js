import React, { useState, useEffect } from 'react';
import CherChatPanel from './CherChatPanel';
import OutfitDisplay from './OutfitDisplay';
import OutfitSummaryPanel from './OutfitSummaryPanel';
import './MannequinOutfitBuilder.css';

const MannequinOutfitBuilder = ({ selectedTrip, selectedOutfit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get the current outfit data from the trip
  const currentOutfit = selectedTrip?.outfits?.[selectedOutfit];

  // Check if outfit has actual AI-generated data or is just a placeholder
  const hasGeneratedOutfit = currentOutfit && currentOutfit.items &&
    (currentOutfit.items.topwear || currentOutfit.items.bottomwear || currentOutfit.items.footwear);

  // Prepare outfit data for OutfitDisplay component
  const getOutfitDisplayData = () => {
    if (!hasGeneratedOutfit) {
      return null;
    }

    // Convert our internal format to OutfitDisplay format
    return {
      dailyOutfits: [{
        day: selectedOutfit,
        date: currentOutfit.date || `Day ${selectedOutfit}`,
        occasion: currentOutfit.occasion || `Day ${selectedOutfit} Outfit`,
        outfit: {
          topwear: currentOutfit.items.topwear,
          bottomwear: currentOutfit.items.bottomwear,
          footwear: currentOutfit.items.footwear,
          outerwear: currentOutfit.items.outerwear,
          accessories: currentOutfit.items.accessories || []
        },
        styling: currentOutfit.styling || {}
      }]
    };
  };

  // Get trip details for display
  const getTripDetails = () => {
    if (!selectedTrip) return null;

    return {
      occasion: selectedTrip.eventData?.occasion || selectedTrip.name || 'Trip',
      location: selectedTrip.destination || selectedTrip.eventData?.location,
      duration: selectedTrip.totalDays || 1,
      dressCode: selectedTrip.eventData?.dressCode || 'Casual'
    };
  };

  // Get reusability analysis if available
  const getReusabilityAnalysis = () => {
    return selectedTrip?.aiGenerationData?.reusabilityAnalysis || null;
  };

  const handleRetryGeneration = async () => {
    setLoading(true);
    setError(null);

    try {
      // This would trigger outfit regeneration
      // For now, just simulate a retry
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, this would call the outfit generation service
      console.log('Retrying outfit generation for trip:', selectedTrip?.id);

    } catch (err) {
      setError('Failed to regenerate outfit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const builderClasses = `builder-content ${hasGeneratedOutfit ? 'builder-content--single-column' : ''}`;
  const displayContainerClasses = `outfit-display-container ${hasGeneratedOutfit ? 'outfit-display-container--full' : ''}`;
  const wrapperClasses = `mannequin-builder ${hasGeneratedOutfit ? 'mannequin-builder--condensed' : ''}`;

  return (
    <div className={wrapperClasses}>
      <div className={builderClasses}>
        {/* Main - Outfit Display */}
        <div className={displayContainerClasses}>
          {hasGeneratedOutfit ? (
            <OutfitDisplay
              outfits={getOutfitDisplayData()}
              tripDetails={getTripDetails()}
              reusabilityAnalysis={getReusabilityAnalysis()}
              loading={loading}
              error={error}
              onRetry={handleRetryGeneration}
            />
          ) : (
            <div className="no-outfit-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">👗</div>
                <h3>Outfit Not Generated</h3>
                <p>This outfit hasn't been generated yet or failed to generate properly.</p>
                <button
                  className="generate-outfit-btn"
                  onClick={handleRetryGeneration}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Outfit'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Summary and Chat Panel */}
        {!hasGeneratedOutfit && (
          <div className="chat-panel">
            {/* Outfit Summary Panel */}
            <OutfitSummaryPanel
              tripDetails={getTripDetails()}
              reusabilityAnalysis={getReusabilityAnalysis()}
              outfits={getOutfitDisplayData()}
            />

            {/* Cher Chat Panel */}
            <CherChatPanel
              selectedTrip={selectedTrip}
              selectedOutfit={selectedOutfit}
              currentOutfit={currentOutfit}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MannequinOutfitBuilder;
