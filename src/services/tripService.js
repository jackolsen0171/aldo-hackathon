// Trip management utilities

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
 * Updates a trip's metadata
 * @param {Object} trip - The trip to update
 * @param {Object} updates - The updates to apply
 * @returns {Object} Updated trip object
 */
export const updateTrip = (trip, updates) => {
    return {
        ...trip,
        ...updates,
        updatedAt: new Date().toISOString()
    };
};