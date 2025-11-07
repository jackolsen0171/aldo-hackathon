// Trip management utilities

/**
 * Determines if a trip is new/empty based on its outfits
 * @param {Object} trip - The trip object to check
 * @returns {boolean} True if trip is new/empty, false otherwise
 */
export const isNewTrip = (trip) => {
    if (!trip) {
        return true;
    }

    // Check if outfits object exists and has any outfits
    if (!trip.outfits || typeof trip.outfits !== 'object') {
        return true;
    }

    // Check if outfits object is empty
    const outfitKeys = Object.keys(trip.outfits);
    if (outfitKeys.length === 0) {
        return true;
    }

    // Check if any outfit has actual items
    const hasPopulatedOutfits = outfitKeys.some(key => {
        const outfit = trip.outfits[key];
        return outfit &&
            outfit.items &&
            typeof outfit.items === 'object' &&
            Object.keys(outfit.items).length > 0;
    });

    return !hasPopulatedOutfits;
};

/**
 * Determines if a trip has transitioned from new to populated
 * @param {Object} previousTrip - The previous state of the trip
 * @param {Object} currentTrip - The current state of the trip
 * @returns {boolean} True if trip transitioned from new to populated
 */
export const hasTransitionedToPopulated = (previousTrip, currentTrip) => {
    if (!previousTrip || !currentTrip) {
        return false;
    }

    const wasNew = isNewTrip(previousTrip);
    const isNowPopulated = !isNewTrip(currentTrip);

    return wasNew && isNowPopulated;
};

/**
 * Creates a new blank trip with default values
 * @param {Object} options - Optional trip configuration
 * @param {string} options.name - Trip name (default: 'New Trip')
 * @param {string} options.destination - Trip destination (default: 'Add destination')
 * @param {number} options.totalDays - Number of days (default: 7)
 * @returns {Object} New trip object
 */
export const createNewTrip = (options = {}) => {
    const {
        name = 'New Trip',
        destination = 'Add destination',
        totalDays = 7
    } = options;

    const newTripId = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + (totalDays - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
        id: newTripId,
        name,
        destination,
        startDate,
        endDate,
        totalDays,
        outfits: {}, // Completely empty outfits object for blank trip
        isNew: true, // Explicit flag for new trips
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

/**
 * Creates a new blank outfit for a specific day
 * @param {string} tripId - The trip ID
 * @param {number} day - The day number
 * @param {string} name - Optional outfit name
 * @returns {Object} New outfit object
 */
export const createNewOutfit = (tripId, day, name = `Day ${day} Outfit`) => {
    return {
        id: `outfit-${tripId}-${day}-${Date.now()}`,
        name,
        day,
        tripId,
        items: {},
        isSaved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

/**
 * Updates a trip's metadata and automatically manages the isNew flag
 * @param {Object} trip - The trip to update
 * @param {Object} updates - The updates to apply
 * @returns {Object} Updated trip object
 */
export const updateTrip = (trip, updates) => {
    const updatedTrip = {
        ...trip,
        ...updates,
        updatedAt: new Date().toISOString()
    };

    // Automatically update isNew flag based on trip state
    updatedTrip.isNew = isNewTrip(updatedTrip);

    return updatedTrip;
};/**

 * Adds or updates an outfit in a trip and manages the isNew flag
 * @param {Object} trip - The trip to update
 * @param {number|string} outfitKey - The outfit key (day number or identifier)
 * @param {Object} outfit - The outfit object to add/update
 * @returns {Object} Updated trip object
 */
export const updateTripWithOutfit = (trip, outfitKey, outfit) => {
    const updatedOutfits = {
        ...trip.outfits,
        [outfitKey]: outfit
    };

    return updateTrip(trip, { outfits: updatedOutfits });
};