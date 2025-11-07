import React, { useState, useMemo } from 'react';
import InteractiveCloset from '../components/InteractiveCloset';
import NewEventInputInterface from '../components/NewEventInputInterface';
import EventConfirmationForm from '../components/EventConfirmationForm';
import OutfitCardCarousel from '../components/OutfitCardCarousel';
import { initialAppState, mockTrips } from '../data/mockData';
import { createNewTrip, isNewTrip, updateTrip } from '../services/tripService';
import chatService from '../services/chatService';
import './CombinedWorkshopPage.css';

const CombinedWorkshopPage = () => {
  const [selectedTrip, setSelectedTrip] = useState(initialAppState.selectedTrip);
  const [trips, setTrips] = useState(mockTrips);
  const [processingTrip, setProcessingTrip] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [showConfirmationForm, setShowConfirmationForm] = useState(false);
  const [extractedEventData, setExtractedEventData] = useState(null);

  const currentTrip = useMemo(
    () => trips.find(trip => trip.id === selectedTrip),
    [trips, selectedTrip]
  );

  const hasGeneratedOutfits = !!(
    currentTrip &&
    !isNewTrip(currentTrip) &&
    currentTrip.outfits &&
    Object.keys(currentTrip.outfits).length > 0
  );

  const ensureTrip = () => {
    if (currentTrip) {
      return currentTrip;
    }
    const newTrip = createNewTrip();
    setTrips(prev => [...prev, newTrip]);
    setSelectedTrip(newTrip.id);
    return newTrip;
  };

  const handleNewTrip = () => {
    const newTrip = createNewTrip();
    setTrips(prevTrips => [...prevTrips, newTrip]);
    setSelectedTrip(newTrip.id);
    setShowConfirmationForm(false);
    setExtractedEventData(null);
    setProcessingError(null);
  };

  const clearProcessingError = () => {
    setProcessingError(null);
  };

  const handleTripDescriptionSubmit = async (tripDescription) => {
    if (!tripDescription.trim() || processingTrip) {
      return;
    }

    setProcessingTrip(true);
    setProcessingError(null);

    try {
      const activeTrip = ensureTrip();
      const result = await chatService.sendMessage(tripDescription);

      if (result?.success && result.eventContext) {
        const eventData = result.eventContext;
        const updatedTrip = updateTrip(activeTrip, {
          name: eventData.occasion || eventData.eventType || activeTrip.name,
          destination: eventData.location || activeTrip.destination,
          startDate: eventData.startDate || activeTrip.startDate,
          endDate: eventData.endDate || activeTrip.endDate,
          totalDays: eventData.duration || activeTrip.totalDays,
          description: tripDescription,
          eventData,
          lastProcessed: new Date().toISOString()
        });

        setTrips(prevTrips =>
          prevTrips.map(trip =>
            trip.id === updatedTrip.id ? updatedTrip : trip
          )
        );

        setExtractedEventData(eventData);
        setShowConfirmationForm(true);
      } else {
        setProcessingError('Could not extract event details. Try adding more specifics about the location and timing.');
      }
    } catch (error) {
      console.error('Error processing trip description:', error);
      setProcessingError(error.message || 'Failed to process trip description. Please try again.');
    } finally {
      setProcessingTrip(false);
    }
  };

  const handleConfirmEventDetails = async (confirmedDetails) => {
    if (!currentTrip) {
      return;
    }

    setProcessingTrip(true);
    setProcessingError(null);

    try {
      const updatedTrip = updateTrip(currentTrip, {
        name: confirmedDetails.occasion || currentTrip.name,
        destination: confirmedDetails.location || currentTrip.destination,
        startDate: confirmedDetails.startDate || currentTrip.startDate,
        endDate: confirmedDetails.endDate || currentTrip.endDate,
        totalDays: confirmedDetails.duration || currentTrip.totalDays,
        eventData: {
          ...extractedEventData,
          ...confirmedDetails,
          confirmed: true,
          confirmedAt: new Date().toISOString()
        }
      });

      setTrips(prevTrips =>
        prevTrips.map(trip =>
          trip.id === updatedTrip.id ? updatedTrip : trip
        )
      );

      setShowConfirmationForm(false);
      setExtractedEventData(null);

      try {
        await generateOutfits(updatedTrip);
      } catch (outfitError) {
        console.error('Outfit generation failed:', outfitError);
        setProcessingError(`Failed to generate outfits: ${outfitError.message}`);
      }
    } catch (error) {
      console.error('Error processing confirmed details:', error);
      setProcessingError(error.message || 'Failed to process confirmed details. Please try again.');
    } finally {
      setProcessingTrip(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmationForm(false);
    setExtractedEventData(null);
    setProcessingError(null);
  };

  const generateOutfits = async (trip) => {
    const { default: outfitGenerationService } = await import('../services/OutfitGenerationService');
    const { default: contextAccumulator } = await import('../services/contextAccumulator');

    contextAccumulator.initializeContextFile(trip.id, {
      originalMessage: trip.description
    });

    contextAccumulator.addConfirmedDetails(trip.id, {
      occasion: trip.eventData?.occasion || trip.name || 'Trip',
      location: trip.destination || trip.eventData?.location,
      startDate: trip.startDate,
      duration: trip.totalDays || 3,
      dressCode: trip.eventData?.dressCode || 'smart-casual',
      budget: trip.eventData?.budget || null,
      specialRequirements: trip.eventData?.specialRequirements || []
    });

    const generationResult = await outfitGenerationService.generateOutfits(trip.id, {
      duration: trip.totalDays || 3,
      occasion: trip.eventData?.occasion || trip.name || 'Trip',
      location: trip.destination || trip.eventData?.location,
      startDate: trip.startDate,
      endDate: trip.endDate,
      dressCode: trip.eventData?.dressCode || 'smart-casual',
      budget: trip.eventData?.budget || null
    });

    if (!generationResult.success) {
      throw new Error(generationResult.error?.message || 'Failed to generate outfits');
    }

    const tripWithOutfits = updateTrip(trip, {
      outfits: generationResult.data.outfits,
      aiGenerationData: {
        reusabilityAnalysis: generationResult.data.reusabilityAnalysis,
        generatedAt: generationResult.data.generatedAt,
        contextSummary: generationResult.data.contextSummary,
        fallback: false
      }
    });

    setTrips(prevTrips =>
      prevTrips.map(t =>
        t.id === trip.id ? tripWithOutfits : t
      )
    );
  };

  const renderMiddleColumn = () => {
    if (showConfirmationForm && extractedEventData) {
      return (
        <EventConfirmationForm
          eventData={extractedEventData}
          onConfirm={handleConfirmEventDetails}
          onCancel={handleCancelConfirmation}
          loading={processingTrip}
        />
      );
    }

    if (processingTrip) {
      return (
        <div className="middle-placeholder loading">
          <div className="loading-ring"></div>
          <p>Cher is working on your request...</p>
        </div>
      );
    }

    if (hasGeneratedOutfits && currentTrip) {
      return <OutfitCardCarousel trip={currentTrip} />;
    }

    return (
      <div className="middle-placeholder">
        <h3>Answer a few quick questions</h3>
        <p>Type a trip description on the left to generate a smart form. Once you confirm the details, Cher will craft outfits here.</p>
      </div>
    );
  };

  return (
    <div className="unified-workshop-page">
      <div className="unified-columns">
        <section className="unified-column left-column">
          <div className="column-header">
            <div>
              <p className="eyebrow-text">Step 1</p>
              <h2>Tell Cher about your plans</h2>
            </div>
            <button
              className="ghost-button"
              onClick={handleNewTrip}
              disabled={processingTrip}
            >
              Start fresh
            </button>
          </div>
          <div className="input-panel">
            <NewEventInputInterface
              tripId={selectedTrip}
              onTripDescriptionSubmit={handleTripDescriptionSubmit}
              loading={processingTrip}
              error={processingError}
              onClearError={clearProcessingError}
              placeholder={'e.g. "3-day conference in Chicago next week"'}
            />
          </div>
        </section>

        <section className="unified-column middle-column">
          <div className="column-header">
            <div>
              <p className="eyebrow-text">Step 2</p>
              <h2>Confirm & style</h2>
            </div>
            {currentTrip?.eventData?.occasion && (
              <span className="pill">
                {currentTrip.eventData.occasion} • {currentTrip.eventData.duration || currentTrip.totalDays || 1} days
              </span>
            )}
          </div>
          <div className="middle-content">
            {renderMiddleColumn()}
          </div>
        </section>

        <section className="unified-column right-column">
          <div className="column-header">
            <div>
              <p className="eyebrow-text">Step 3</p>
              <h2>Shop your closet</h2>
            </div>
          </div>
          <div className="closet-panel">
            <InteractiveCloset onClick={() => {}} />
            <p className="closet-hint">Tap the wardrobe to browse your saved pieces once outfits are ready.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CombinedWorkshopPage;
