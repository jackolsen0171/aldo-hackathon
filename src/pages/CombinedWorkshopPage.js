import React, { useState, useEffect, useRef } from 'react';
import SavedTripsSidebar from '../components/SavedTripsSidebar';
import MannequinOutfitBuilder from '../components/MannequinOutfitBuilder';
import NewEventInputInterface from '../components/NewEventInputInterface';
import EventConfirmationForm from '../components/EventConfirmationForm';
import { initialAppState, mockTrips } from '../data/mockData';
import { createNewTrip, isNewTrip, updateTrip, hasTransitionedToPopulated } from '../services/tripService';
import chatService from '../services/chatService';
import './CombinedWorkshopPage.css';

const CombinedWorkshopPage = ({ onNavigate }) => {
  const [selectedTrip, setSelectedTrip] = useState(initialAppState.selectedTrip);
  const [selectedOutfit, setSelectedOutfit] = useState(1);
  const [trips, setTrips] = useState(mockTrips);
  const [processingTrip, setProcessingTrip] = useState(false);
  const [processingError, setProcessingError] = useState(null);

  // Progressive disclosure state
  const [showOutfitTabs, setShowOutfitTabs] = useState(false);
  const [showOutfitBuilder, setShowOutfitBuilder] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Confirmation form state
  const [showConfirmationForm, setShowConfirmationForm] = useState(false);
  const [extractedEventData, setExtractedEventData] = useState(null);

  // Keep track of previous trip state for transition detection
  const previousTripRef = useRef(null);

  // Get current trip data
  const currentTrip = trips.find(trip => trip.id === selectedTrip);

  // Determine if current trip is new/empty
  const isCurrentTripNew = isNewTrip(currentTrip);

  // Progressive disclosure effect - handle trip state changes
  useEffect(() => {
    if (!currentTrip) {
      // No trip selected - hide everything
      setShowOutfitTabs(false);
      setShowOutfitBuilder(false);
      setIsTransitioning(false);
      return;
    }

    const previousTrip = previousTripRef.current;

    // Check if trip has transitioned from new to populated
    if (hasTransitionedToPopulated(previousTrip, currentTrip)) {
      console.log('Trip transitioned from new to populated, starting progressive disclosure');
      setIsTransitioning(true);

      // First reveal outfit tabs with a slight delay
      setTimeout(() => {
        setShowOutfitTabs(true);

        // Then reveal outfit builder after tabs are shown
        setTimeout(() => {
          setShowOutfitBuilder(true);
          setIsTransitioning(false);
        }, 300);
      }, 200);
    } else if (!isCurrentTripNew) {
      // Trip already has outfits - show everything immediately
      setShowOutfitTabs(true);
      setShowOutfitBuilder(true);
      setIsTransitioning(false);
    } else {
      // Trip is new/empty - hide outfit interface
      setShowOutfitTabs(false);
      setShowOutfitBuilder(false);
      setIsTransitioning(false);
    }

    // Update previous trip reference
    previousTripRef.current = currentTrip;
  }, [currentTrip, isCurrentTripNew]);

  // Reset progressive disclosure state when switching trips
  useEffect(() => {
    if (currentTrip) {
      const isNew = isNewTrip(currentTrip);
      if (isNew) {
        setShowOutfitTabs(false);
        setShowOutfitBuilder(false);
        setIsTransitioning(false);
      } else {
        setShowOutfitTabs(true);
        setShowOutfitBuilder(true);
        setIsTransitioning(false);
      }
    }
  }, [selectedTrip]);

  const handleTripSelect = (tripId) => {
    setSelectedTrip(tripId);
    setSelectedOutfit(1); // Reset to outfit 1 when switching trips

    // Reset confirmation form state when switching trips
    setShowConfirmationForm(false);
    setExtractedEventData(null);
    setProcessingError(null);
  };

  const handleNewTrip = () => {
    // Create a blank trip using the service
    const newTrip = createNewTrip();

    // Add the new trip to the trips array
    setTrips(prevTrips => [...prevTrips, newTrip]);

    // Select the new trip
    setSelectedTrip(newTrip.id);
    setSelectedOutfit(1);

    // Reset confirmation form state for new trip
    setShowConfirmationForm(false);
    setExtractedEventData(null);
    setProcessingError(null);

    console.log('Created new trip:', newTrip);
  };

  const handleOutfitSelect = (outfitNumber) => {
    setSelectedOutfit(outfitNumber);
  };

  const clearProcessingError = () => {
    setProcessingError(null);
  };

  const handleConfirmEventDetails = async (confirmedDetails) => {
    setProcessingTrip(true);
    setProcessingError(null);

    try {
      console.log('Confirmed event details:', confirmedDetails);

      // Update the current trip with confirmed details
      const updatedTrip = updateTrip(currentTrip, {
        name: confirmedDetails.occasion || currentTrip.name,
        destination: confirmedDetails.location || currentTrip.destination,
        startDate: confirmedDetails.startDate || currentTrip.startDate,
        totalDays: confirmedDetails.duration || currentTrip.totalDays,
        eventData: {
          ...extractedEventData,
          ...confirmedDetails,
          confirmed: true,
          confirmedAt: new Date().toISOString()
        }
      });

      // Update the trips array
      setTrips(prevTrips =>
        prevTrips.map(trip =>
          trip.id === selectedTrip ? updatedTrip : trip
        )
      );

      console.log('Trip updated with confirmed details:', updatedTrip);

      // Hide confirmation form
      setShowConfirmationForm(false);
      setExtractedEventData(null);

      // Now generate outfits with confirmed details
      console.log('Starting outfit generation with confirmed details...');
      try {
        await generateOutfits(updatedTrip);
        console.log('Outfit generation completed successfully');
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
    // Go back to input interface
    setShowConfirmationForm(false);
    setExtractedEventData(null);
    setProcessingError(null);
  };

  const handleTripDescriptionSubmit = async (tripDescription) => {
    if (!tripDescription.trim() || processingTrip) {
      return;
    }

    setProcessingTrip(true);
    setProcessingError(null);

    try {
      console.log('Processing trip description:', tripDescription);

      // Send the trip description to the chat service for processing
      const result = await chatService.sendMessage(tripDescription);

      if (result && result.success) {
        console.log('Chat service result:', result);

        // If we got event context data, show confirmation form
        if (result.eventContext) {
          const eventData = result.eventContext;

          console.log('Event context received:', eventData);

          // Store the extracted event data for confirmation
          setExtractedEventData(eventData);

          // Update the current trip with basic information (but don't generate outfits yet)
          const updatedTrip = updateTrip(currentTrip, {
            name: eventData.occasion || eventData.eventType || currentTrip.name,
            destination: eventData.location || currentTrip.destination,
            startDate: eventData.startDate || currentTrip.startDate,
            endDate: eventData.endDate || currentTrip.endDate,
            totalDays: eventData.duration || currentTrip.totalDays,
            description: tripDescription,
            eventData: eventData, // Store the full event context
            lastProcessed: new Date().toISOString()
          });

          // Update the trips array with the modified trip
          setTrips(prevTrips =>
            prevTrips.map(trip =>
              trip.id === selectedTrip ? updatedTrip : trip
            )
          );

          console.log('Trip updated with event data:', updatedTrip);

          // Show confirmation form instead of immediately generating outfits
          setShowConfirmationForm(true);

        } else {
          console.warn('No event context received from chat service');
          setProcessingError('Could not extract event details from your description. Please try being more specific.');
        }

        // The chat service handles the AI response, so we don't need to do anything else here
        // The user can continue the conversation through the chat interface if needed

      } else {
        throw new Error('Failed to process trip description');
      }

    } catch (error) {
      console.error('Error processing trip description:', error);
      setProcessingError(error.message || 'Failed to process trip description. Please try again.');
    } finally {
      setProcessingTrip(false);
    }
  };

  // Generate outfits using Bedrock via outfitGenerationService
  const generateOutfits = async (trip) => {
    console.log('Starting outfit generation for trip:', trip?.id);
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

    console.log('Outfits successfully generated and saved:', tripWithOutfits);
  };

  return (
    <div className="combined-workshop-page">
      {/* Navigation Header */}
      <header className="combined-header">
        <nav className="combined-nav">
          <button
            className="nav-button"
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button
            className="nav-button active"
            onClick={() => onNavigate('combined-workshop')}
          >
            Outfit Planner
          </button>
        </nav>
      </header>

      <div className="combined-content">
        {/* Left Sidebar - Saved Trips */}
        <div className="combined-sidebar">
          <SavedTripsSidebar
            trips={trips}
            selectedTrip={selectedTrip}
            onTripSelect={handleTripSelect}
            onNewTrip={handleNewTrip}
          />
        </div>

        {/* Main Content - Conditional Interface */}
        <div className="combined-main">
          {/* Progressive Disclosure: Outfit Tabs */}
          {showOutfitTabs && currentTrip && currentTrip.outfits && (
            <div className={`outfit-tabs ${isTransitioning ? 'transitioning' : ''}`}>
              {Object.keys(currentTrip.outfits).map((outfitKey) => {
                const outfitNum = parseInt(outfitKey);
                return (
                  <button
                    key={outfitKey}
                    className={`outfit-tab ${selectedOutfit === outfitNum ? 'active' : ''}`}
                    onClick={() => handleOutfitSelect(outfitNum)}
                  >
                    Outfit {outfitNum}
                  </button>
                );
              })}
            </div>
          )}

          {/* Conditional Main Area with Progressive Disclosure */}
          <div className="main-content-area">
            {showConfirmationForm ? (
              /* Event Confirmation Form */
              <EventConfirmationForm
                eventData={extractedEventData}
                onConfirm={handleConfirmEventDetails}
                onCancel={handleCancelConfirmation}
                loading={processingTrip}
              />
            ) : isCurrentTripNew || (!showOutfitBuilder && !isTransitioning) ? (
              /* New Event Input Interface for new/empty trips or during processing */
              <NewEventInputInterface
                tripId={selectedTrip}
                onTripDescriptionSubmit={handleTripDescriptionSubmit}
                loading={processingTrip}
                error={processingError}
                onClearError={clearProcessingError}
                placeholder="Tell Cher about your trip..."
              />
            ) : showOutfitBuilder ? (
              /* Mannequin Outfit Builder for trips with outfits */
              <div className={`outfit-builder-container ${isTransitioning ? 'transitioning' : ''}`}>
                <MannequinOutfitBuilder
                  selectedTrip={currentTrip}
                  selectedOutfit={selectedOutfit}
                />
              </div>
            ) : (
              /* Loading state during transition */
              <div className="transition-loading">
                <div className="loading-spinner"></div>
                <p>Generating your outfits...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinedWorkshopPage;
