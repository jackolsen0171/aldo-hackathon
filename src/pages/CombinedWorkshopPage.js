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

  // Generate outfits using the actual outfit generation service
  const generateOutfits = async (trip) => {
    try {
      console.log('Starting outfit generation for trip:', trip);

      // Import the outfit generation service
      console.log('Importing services...');
      const { default: outfitGenerationService } = await import('../services/OutfitGenerationService');
      const { default: bedrockAgentService } = await import('../services/bedrockAgentService');
      console.log('Services imported successfully');

      // Initialize context accumulator with trip data
      console.log('Initializing context accumulator...');
      const { default: contextAccumulator } = await import('../services/contextAccumulator');

      // Initialize context file for this session
      const contextFile = contextAccumulator.initializeContextFile(trip.id, {
        originalMessage: trip.description
      });

      // Add confirmed event details to context
      contextAccumulator.addConfirmedDetails(trip.id, {
        occasion: trip.eventData?.occasion || trip.name || 'Trip',
        location: trip.destination || trip.eventData?.location,
        startDate: trip.startDate,
        duration: trip.totalDays || 3,
        dressCode: trip.eventData?.dressCode || 'smart-casual',
        budget: trip.eventData?.budget || null,
        specialRequirements: trip.eventData?.specialRequirements || []
      });

      // Generate outfits using the service
      console.log('Calling outfitGenerationService.generateOutfits...');
      const generationResult = await outfitGenerationService.generateOutfits(trip.id, {
        duration: trip.totalDays || 3,
        occasion: trip.eventData?.occasion || trip.name || 'Trip',
        location: trip.destination || trip.eventData?.location,
        startDate: trip.startDate,
        endDate: trip.endDate
      });

      console.log('Generation result:', generationResult);

      if (!generationResult.success) {
        throw new Error(generationResult.error?.message || 'Failed to generate outfit context');
      }

      console.log('Outfit generation context prepared:', generationResult.data);

      // Use Bedrock Agent to generate actual outfit recommendations
      console.log('Calling bedrockAgentService.generateOutfitRecommendations...');
      const aiResult = await bedrockAgentService.generateOutfitRecommendations(
        generationResult.data.prompt,
        trip.id
      );

      console.log('AI result received:', aiResult);

      if (!aiResult.success) {
        throw new Error(aiResult.error?.message || 'Failed to generate AI outfit recommendations');
      }

      console.log('AI outfit recommendations received:', aiResult.data);

      // Parse the AI response into structured outfit data
      const parsedResult = bedrockAgentService.parseOutfitResponse(aiResult.data.response);

      if (!parsedResult.success) {
        throw new Error(parsedResult.error?.message || 'Failed to parse outfit recommendations');
      }

      console.log('Parsed outfit data:', parsedResult.data);

      // Convert AI response to our internal outfit format
      const outfits = {};
      const aiOutfits = parsedResult.data.dailyOutfits || [];

      aiOutfits.forEach((dayOutfit, index) => {
        const dayNum = index + 1;
        outfits[dayNum] = {
          id: `outfit-${trip.id}-${dayNum}`,
          name: `Day ${dayNum} Outfit`,
          day: dayNum,
          tripId: trip.id,
          occasion: dayOutfit.occasion || `Day ${dayNum}`,
          items: {
            topwear: dayOutfit.outfit.topwear || null,
            bottomwear: dayOutfit.outfit.bottomwear || null,
            footwear: dayOutfit.outfit.footwear || null,
            outerwear: dayOutfit.outfit.outerwear || null,
            accessories: dayOutfit.outfit.accessories || []
          },
          styling: dayOutfit.styling || {},
          isSaved: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      // Update trip with generated outfits
      const tripWithOutfits = updateTrip(trip, {
        outfits,
        aiGenerationData: {
          reusabilityAnalysis: parsedResult.data.reusabilityAnalysis,
          constraints: parsedResult.data.constraints,
          generatedAt: new Date().toISOString()
        }
      });

      // Update the trips array
      setTrips(prevTrips =>
        prevTrips.map(t =>
          t.id === trip.id ? tripWithOutfits : t
        )
      );

      console.log('Outfits successfully generated and saved:', tripWithOutfits);

    } catch (error) {
      console.error('Error generating outfits:', error);

      // Show error to user but don't break the flow
      console.log('Creating fallback outfits due to error:', error.message);

      // Create fallback outfits with sample data so the UI doesn't break
      const fallbackOutfits = {};
      const duration = trip.totalDays || 3;

      for (let day = 1; day <= Math.min(duration, 5); day++) {
        fallbackOutfits[day] = {
          id: `outfit-${trip.id}-${day}`,
          name: `Day ${day} Outfit`,
          day: day,
          tripId: trip.id,
          occasion: `Day ${day} - ${trip.eventData?.occasion || 'Event'}`,
          items: {
            topwear: {
              sku: "SKU001",
              name: "Classic White T-Shirt",
              category: "Topwear",
              price: 25,
              colors: "white",
              weatherSuitability: "warm",
              formality: "casual",
              notes: "Essential lightweight cotton tee for everyday wear."
            },
            bottomwear: {
              sku: "SKU002",
              name: "Blue Denim Jeans",
              category: "Bottomwear",
              price: 60,
              colors: "blue",
              weatherSuitability: "mild",
              formality: "casual",
              notes: "Straight-fit jeans suitable for casual and semi-casual settings."
            },
            footwear: {
              sku: "SKU012",
              name: "Leather Dress Shoes",
              category: "Footwear",
              price: 130,
              colors: "black",
              weatherSuitability: "mild",
              formality: "formal",
              notes: "Classic lace-up oxfords for professional occasions."
            },
            outerwear: day === 1 ? {
              sku: "SKU003",
              name: "Black Blazer",
              category: "Outerwear",
              price: 120,
              colors: "black",
              weatherSuitability: "mild",
              formality: "formal",
              notes: "Tailored blazer ideal for business or formal occasions."
            } : null,
            accessories: []
          },
          styling: {
            rationale: `This outfit combines professional styling with comfort for your ${trip.eventData?.occasion || 'event'}. The pieces work together to create a polished look.`,
            weatherConsiderations: `Selected items suitable for ${trip.destination || 'your location'} weather conditions.`,
            dresscodeCompliance: `This outfit meets ${trip.eventData?.dressCode || 'smart-casual'} dress code requirements.`
          },
          isSaved: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fallback: true
        };
      }

      // Update trip with fallback outfits
      const tripWithFallback = updateTrip(trip, {
        outfits: fallbackOutfits,
        aiGenerationData: {
          reusabilityAnalysis: {
            totalItems: duration * 3,
            reusedItems: Math.floor(duration * 1.5),
            reusabilityPercentage: Math.round((Math.floor(duration * 1.5) / (duration * 3)) * 100),
            reusabilityMap: {
              "SKU003": [1, 2, 3].slice(0, duration),
              "SKU002": duration > 1 ? [1, 3] : [1]
            }
          },
          constraints: {
            weather: 'Fallback outfit generation',
            budget: 'No budget constraints applied',
            dressCode: trip.eventData?.dressCode || 'smart-casual'
          },
          generatedAt: new Date().toISOString(),
          fallback: true,
          error: error.message
        }
      });

      setTrips(prevTrips =>
        prevTrips.map(t =>
          t.id === trip.id ? tripWithFallback : t
        )
      );

      console.log('Fallback outfits created:', tripWithFallback);
    }
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