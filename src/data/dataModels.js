// Data model definitions for outfit planner
// These define the structure of data objects used throughout the application

/**
 * ClothingItem Model
 * Represents an individual clothing item
 */
export const createClothingItem = ({
    id,
    name,
    category,
    color,
    style,
    imageUrl = null,
    description = '',
    tags = []
}) => ({
    id,
    name,
    category, // 'hat' | 'shirt' | 'outerwear' | 'pants' | 'shoes' | 'jewelry' | 'belt'
    color,
    style,
    imageUrl,
    description,
    tags
});

/**
 * ClothingCategory Model
 * Represents a category of clothing items
 */
export const createClothingCategory = ({
    id,
    name,
    displayName,
    items = [],
    icon = ''
}) => ({
    id,
    name,
    displayName,
    items,
    icon
});

/**
 * Outfit Model
 * Represents a complete outfit for a specific day
 */
export const createOutfit = ({
    id,
    name,
    day,
    tripId,
    items = {},
    isSaved = false,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
}) => ({
    id,
    name,
    day,
    tripId,
    items: {
        hat: items.hat || null,
        shirt: items.shirt || null,
        outerwear: items.outerwear || null,
        pants: items.pants || null,
        shoes: items.shoes || null,
        jewelry: items.jewelry || null,
        belt: items.belt || null
    },
    isSaved,
    createdAt,
    updatedAt
});

/**
 * Trip Model
 * Represents a trip with multiple days and outfits
 */
export const createTrip = ({
    id,
    name,
    destination,
    startDate,
    endDate,
    totalDays,
    outfits = {},
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
}) => ({
    id,
    name,
    destination,
    startDate,
    endDate,
    totalDays,
    outfits,
    createdAt,
    updatedAt
});

/**
 * Application State Model
 * Represents the main application state
 */
export const createAppState = ({
    selectedTrip = null,
    selectedDay = 1,
    isChatPanelOpen = false,
    trips = [],
    clothingCategories = []
}) => ({
    selectedTrip,
    selectedDay,
    isChatPanelOpen,
    trips,
    clothingCategories
});

// Utility functions for working with data models

/**
 * Get outfit for specific trip and day
 */
export const getOutfitForDay = (trip, day) => {
    return trip.outfits[day] || null;
};

/**
 * Get all items from a clothing category
 */
export const getItemsFromCategory = (categories, categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.items : [];
};

/**
 * Create empty outfit for a trip and day
 */
export const createEmptyOutfit = (tripId, day) => {
    return createOutfit({
        id: `outfit-${tripId}-${day}-${Date.now()}`,
        name: `Day ${day} outfit`,
        day,
        tripId,
        items: {}
    });
};

/**
 * Validate clothing item structure
 */
export const isValidClothingItem = (item) => {
    return item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.category === 'string' &&
        typeof item.color === 'string' &&
        typeof item.style === 'string';
};

/**
 * Validate trip structure
 */
export const isValidTrip = (trip) => {
    return trip &&
        typeof trip.id === 'string' &&
        typeof trip.name === 'string' &&
        typeof trip.destination === 'string' &&
        typeof trip.startDate === 'string' &&
        typeof trip.endDate === 'string' &&
        typeof trip.totalDays === 'number' &&
        typeof trip.outfits === 'object';
};