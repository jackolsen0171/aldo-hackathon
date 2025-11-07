import React, { useState, useMemo, useRef } from 'react';
import InteractiveCloset from '../components/InteractiveCloset';
import NewEventInputInterface from '../components/NewEventInputInterface';
import EventConfirmationForm from '../components/EventConfirmationForm';
import OutfitCardCarousel from '../components/OutfitCardCarousel';
import { createNewTrip, isNewTrip, updateTrip } from '../services/tripService';
import chatService from '../services/chatService';
import './CombinedWorkshopPage.css';

const generateWallpaperColumns = () => {
  const images = Array.from({ length: 30 }, (_, i) =>
    `/Images/${String(i + 1).padStart(3, '0')}.png`
  );

  const columns = [[], [], [], [], []];
  images.forEach((img, idx) => {
    columns[idx % 5].push(img);
  });

  return columns;
};

const CombinedWorkshopPage = () => {
  const starterTripRef = useRef(createNewTrip({ name: 'New Trip' }));
  const [trips, setTrips] = useState([starterTripRef.current]);
  const [selectedTrip, setSelectedTrip] = useState(starterTripRef.current.id);
  const [processingTrip, setProcessingTrip] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [showConfirmationForm, setShowConfirmationForm] = useState(false);
  const [extractedEventData, setExtractedEventData] = useState(null);
  const [savedSkus, setSavedSkus] = useState(() => new Set());
  const [savedItems, setSavedItems] = useState([]);
  const [showClosetInventory, setShowClosetInventory] = useState(false);
  const [showPackingList, setShowPackingList] = useState(false);
  const closetRef = useRef(null);

  const currentTrip = useMemo(
    () => trips.find(trip => trip.id === selectedTrip),
    [trips, selectedTrip]
  );

  const wallpaperColumns = useMemo(() => generateWallpaperColumns(), []);

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
          dressCode: confirmedDetails.dailyPlans?.[0]?.dressCode || confirmedDetails.dressCode || currentTrip.eventData?.dressCode || 'smart-casual',
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

  const handleSaveItems = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return;

    const uniqueItems = items.filter(item => item?.sku && !savedSkus.has(item.sku));

    if (uniqueItems.length === 0) {
      return;
    }

    setSavedSkus(prev => {
      const updated = new Set(prev);
      uniqueItems.forEach(item => updated.add(item.sku));
      return updated;
    });

    setSavedItems(prev => {
      const merged = [...prev, ...uniqueItems];
      return merged.filter(
        (item, index, self) => self.findIndex(other => other.sku === item.sku) === index
      );
    });

    closetRef.current?.triggerClosetAnimation();
  };

  const toggleClosetInventory = () => {
    setShowClosetInventory(prev => !prev);
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
      specialRequirements: trip.eventData?.specialRequirements || [],
      dailyPlans: trip.eventData?.dailyPlans || []
    });

    const generationResult = await outfitGenerationService.generateOutfits(trip.id, {
      duration: trip.totalDays || 3,
      occasion: trip.eventData?.occasion || trip.name || 'Trip',
      location: trip.destination || trip.eventData?.location,
      startDate: trip.startDate,
      endDate: trip.endDate,
      dressCode: trip.eventData?.dressCode || 'smart-casual',
      budget: trip.eventData?.budget || null,
      dayPlans: trip.eventData?.dailyPlans || []
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
      return (
        <OutfitCardCarousel
          trip={currentTrip}
          savedSkus={savedSkus}
          onSaveItems={handleSaveItems}
          getClosetCenter={() => closetRef.current?.getClosetCenter?.()}
          dailyPlans={currentTrip.eventData?.dailyPlans}
        />
      );
    }

    return (
      <div className="middle-placeholder">
        <h3>Answer a few quick questions</h3>
        <p>Describe your trip on the left to build a day-by-day plan. Once each day has an activity and dress code, Cher will craft tailored outfits here.</p>
      </div>
    );
  };

  return (
    <div className="unified-workshop-page">
      <div className="wallpaper-clothing" aria-hidden="true">
        {wallpaperColumns.map((column, colIndex) => (
          <div
            key={colIndex}
            className={`wallpaper-column column-${colIndex}`}
            style={{ animationDelay: `${colIndex * -2}s` }}
          >
            {[...column, ...column].map((imgPath, imgIndex) => (
              <div key={imgIndex} className="wallpaper-image-wrapper">
                <img src={imgPath} alt="" loading="lazy" className="wallpaper-image" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <header className="unified-top-bar">
        <div className="brand-mark">
          <span className="brand-aldotext">ALDO</span>
          <span className="brand-subline">OUTFIT LAB</span>
        </div>
        <div className="profile-widget">
          <div className="profile-avatar">JO</div>
          <div className="profile-info">
            <span className="profile-name">Jack Olsen</span>
          </div>
          <div className="profile-integrations">
            <span className="integrations-label">Integrations</span>
            <div className="integration-placeholder">
              <span>Brand images coming soon</span>
            </div>
          </div>
        </div>
      </header>
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
            {showPackingList ? (
              <>
                <PackingList
                  trip={currentTrip}
                  savedSkus={savedSkus}
                  savedItems={savedItems}
                />
                <div className="finalize-bar">
                  <button className="finalize-btn" onClick={() => setShowPackingList(false)}>
                    ← Back to outfits
                  </button>
                </div>
              </>
            ) : (
              <>
                {renderMiddleColumn()}
                {hasGeneratedOutfits && (
                  <div className="finalize-bar">
                    <button className="finalize-btn" onClick={() => setShowPackingList(true)}>
                      View packing list →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="unified-column right-column">
          <div className="column-header">
            <div>
              <p className="eyebrow-text">Step 3</p>
              <h2>Shop your closet</h2>
            </div>
          </div>
          <div className={`closet-panel ${showClosetInventory ? 'inventory-open' : ''}`}>
            {showClosetInventory ? (
              <div className="closet-inventory full">
                <div className="closet-inventory-header">
                  <button className="closet-back-btn" onClick={toggleClosetInventory}>
                    ← Back to closet
                  </button>
                  <h4>My saved items ({savedItems.length})</h4>
                </div>
                {savedItems.length === 0 ? (
                  <p className="closet-empty">You haven&apos;t saved any items yet.</p>
                ) : (
                  <div className="closet-grid">
                    {savedItems.map(item => (
                      <div key={item.sku} className="closet-item-card">
                        <div className="closet-item-image">
                          <img
                            src={getSkuImagePath(item.sku)}
                            alt={item.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="closet-image-fallback">{item.name?.[0]}</div>
                        </div>
                        <div className="closet-item-meta">
                          <strong>{item.name}</strong>
                          {item.colors && <span>{item.colors}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <InteractiveCloset ref={closetRef} onClick={toggleClosetInventory} />
                <p className="closet-hint">Tap the wardrobe to browse your saved pieces once outfits are ready.</p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const getSkuImagePath = (sku) => {
  if (!sku) return null;
  const match = sku.match(/SKU(\d+)/i);
  if (match) {
    const imageNumber = match[1].padStart(3, '0');
    return `/Images/${imageNumber}.png`;
  }
  return null;
};

export default CombinedWorkshopPage;
const summarizePackingList = (trip, savedSkus) => {
  if (!trip?.outfits) return { items: [], totals: { closet: 0, catalog: 0, price: 0 } };

  const seen = new Map();
  Object.values(trip.outfits).forEach(outfit => {
    const addItem = (item, type) => {
      if (!item || !item.sku) return;
      const key = item.sku;
      if (!seen.has(key)) {
        seen.set(key, { ...item, count: 1, types: new Set([type]) });
      } else {
        const entry = seen.get(key);
        entry.count += 1;
        entry.types.add(type);
      }
    };

    addItem(outfit.items?.topwear, 'topwear');
    addItem(outfit.items?.outerwear, 'outerwear');
    addItem(outfit.items?.bottomwear, 'bottomwear');
    addItem(outfit.items?.footwear, 'footwear');
    outfit.items?.accessories?.forEach(acc => addItem(acc, 'accessories'));
  });

  let closet = 0;
  let catalog = 0;
  let price = 0;
  const items = Array.from(seen.values()).map(entry => {
    const fromCloset = savedSkus.has(entry.sku);
    if (fromCloset) closet += 1; else catalog += 1;
    const numericPrice = entry.price ? Number(entry.price) : 0;
    price += numericPrice;
    return {
      ...entry,
      types: Array.from(entry.types),
      fromCloset
    };
  });

  return {
    items,
    totals: {
      closet,
      catalog,
      price: Math.round(price)
    }
  };
};

const PackingList = ({ trip, savedSkus, savedItems }) => {
  const data = summarizePackingList(trip, savedSkus);

  if (!data.items.length) {
    return (
      <div className="packing-list empty">
        <p>No packing list available yet. Generate outfits first.</p>
      </div>
    );
  }

  return (
    <div className="packing-list">
      <div className="packing-summary">
        <div>
          <h4>Total items</h4>
          <strong>{data.items.length}</strong>
        </div>
        <div>
          <h4>Closet</h4>
          <strong>{data.totals.closet}</strong>
        </div>
        <div>
          <h4>Catalog</h4>
          <strong>{data.totals.catalog}</strong>
        </div>
        <div>
          <h4>Est. cost</h4>
          <strong>${data.totals.price}</strong>
        </div>
      </div>
      <div className="packing-grid">
        {data.items.map(item => (
          <div key={item.sku} className="packing-card">
            <div className="packing-image">
              <img src={getSkuImagePath(item.sku)} alt={item.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              <div className="packing-image-fallback">{item.name?.[0]}</div>
            </div>
            <div className="packing-meta">
              <strong>{item.name}</strong>
              {item.colors && <span>{item.colors}</span>}
              <span className="packing-tags">{item.types.join(', ')}</span>
              <span className={`packing-source ${item.fromCloset ? 'closet' : 'catalog'}`}>
                {item.fromCloset ? 'In closet' : 'Add to cart'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
