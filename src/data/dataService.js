// Simple data service for managing mock data
// Provides basic CRUD operations without complex services

import {
    mockTrips,
    mockClothingCategories,
    initialAppState
} from './mockData.js';
import {
    createTrip,
    createOutfit,
    getOutfitForDay,
    getItemsFromCategory
} from './dataModels.js';

/**
 * Simple data service class for managing application data
 * Uses in-memory storage with mock data for initial implementation
 */
class DataService {
    constructor() {
        // Initialize with mock data
        this.trips = [...mockTrips];
        this.clothingCategories = [...mockClothingCategories];
        this.appState = { ...initialAppState };
    }

    // Trip management methods
    getAllTrips() {
        return this.trips;
    }

    getTripById(tripId) {
        return this.trips.find(trip => trip.id === tripId);
    }

    addTrip(tripData) {
        const newTrip = createTrip({
            id: `trip-${Date.now()}`,
            ...tripData
        });
        this.trips.push(newTrip);
        return newTrip;
    }

    updateTrip(tripId, updates) {
        const tripIndex = this.trips.findIndex(trip => trip.id === tripId);
        if (tripIndex !== -1) {
            this.trips[tripIndex] = {
                ...this.trips[tripIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            return this.trips[tripIndex];
        }
        return null;
    }

    // Outfit management methods
    getOutfitForTripDay(tripId, day) {
        const trip = this.getTripById(tripId);
        return trip ? getOutfitForDay(trip, day) : null;
    }

    saveOutfitForTripDay(tripId, day, outfitData) {
        const trip = this.getTripById(tripId);
        if (trip) {
            const outfit = createOutfit({
                id: `outfit-${tripId}-${day}-${Date.now()}`,
                day,
                tripId,
                ...outfitData,
                isSaved: true
            });

            trip.outfits[day] = outfit;
            trip.updatedAt = new Date().toISOString();
            return outfit;
        }
        return null;
    }

    // Clothing category methods
    getAllClothingCategories() {
        return this.clothingCategories;
    }

    getClothingCategory(categoryName) {
        return this.clothingCategories.find(cat => cat.name === categoryName);
    }

    getItemsFromCategory(categoryName) {
        return getItemsFromCategory(this.clothingCategories, categoryName);
    }

    // App state management methods
    getAppState() {
        return this.appState;
    }

    updateAppState(updates) {
        this.appState = {
            ...this.appState,
            ...updates
        };
        return this.appState;
    }

    setSelectedTrip(tripId) {
        this.appState.selectedTrip = tripId;
        return this.appState;
    }

    setSelectedDay(day) {
        this.appState.selectedDay = day;
        return this.appState;
    }

    toggleChatPanel() {
        this.appState.isChatPanelOpen = !this.appState.isChatPanelOpen;
        return this.appState;
    }

    setChatPanelOpen(isOpen) {
        this.appState.isChatPanelOpen = isOpen;
        return this.appState;
    }

    // Utility methods
    getCurrentTrip() {
        return this.getTripById(this.appState.selectedTrip);
    }

    getCurrentOutfit() {
        const currentTrip = this.getCurrentTrip();
        if (currentTrip) {
            return getOutfitForDay(currentTrip, this.appState.selectedDay);
        }
        return null;
    }

    // Reset data to initial state (useful for testing)
    reset() {
        this.trips = [...mockTrips];
        this.clothingCategories = [...mockClothingCategories];
        this.appState = { ...initialAppState };
    }
}

// Create and export a singleton instance
export const dataService = new DataService();

// Export the class for testing purposes
export { DataService };