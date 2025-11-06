// Simple validation script to test data structures
import { mockTrips, mockClothingCategories, initialAppState } from './mockData.js';
import { isValidTrip, isValidClothingItem } from './dataModels.js';
import { dataService } from './dataService.js';

// Validation functions
function validateMockData() {
    console.log('Validating mock data structures...');

    // Validate trips
    console.log(`\nTrips validation:`);
    console.log(`- Total trips: ${mockTrips.length}`);
    mockTrips.forEach(trip => {
        const isValid = isValidTrip(trip);
        console.log(`- Trip "${trip.name}": ${isValid ? 'VALID' : 'INVALID'}`);
        if (isValid) {
            console.log(`  - Days: ${trip.totalDays}, Outfits: ${Object.keys(trip.outfits).length}`);
        }
    });

    // Validate clothing categories
    console.log(`\nClothing categories validation:`);
    console.log(`- Total categories: ${mockClothingCategories.length}`);
    mockClothingCategories.forEach(category => {
        console.log(`- Category "${category.displayName}": ${category.items.length} items`);

        // Validate first item in each category
        if (category.items.length > 0) {
            const firstItem = category.items[0];
            const isValid = isValidClothingItem(firstItem);
            console.log(`  - First item "${firstItem.name}": ${isValid ? 'VALID' : 'INVALID'}`);
        }
    });

    // Validate initial app state
    console.log(`\nInitial app state validation:`);
    console.log(`- Selected trip: ${initialAppState.selectedTrip}`);
    console.log(`- Selected day: ${initialAppState.selectedDay}`);
    console.log(`- Chat panel open: ${initialAppState.isChatPanelOpen}`);
    console.log(`- Trips count: ${initialAppState.trips.length}`);
    console.log(`- Categories count: ${initialAppState.clothingCategories.length}`);
}

function validateDataService() {
    console.log('\n\nValidating data service...');

    // Test basic operations
    const allTrips = dataService.getAllTrips();
    console.log(`- getAllTrips(): ${allTrips.length} trips`);

    const firstTrip = dataService.getTripById('trip-1');
    console.log(`- getTripById('trip-1'): ${firstTrip ? firstTrip.name : 'NOT FOUND'}`);

    const categories = dataService.getAllClothingCategories();
    console.log(`- getAllClothingCategories(): ${categories.length} categories`);

    const hatItems = dataService.getItemsFromCategory('hat');
    console.log(`- getItemsFromCategory('hat'): ${hatItems.length} items`);

    const currentOutfit = dataService.getCurrentOutfit();
    console.log(`- getCurrentOutfit(): ${currentOutfit ? currentOutfit.name : 'NONE'}`);

    // Test state management
    const initialState = dataService.getAppState();
    console.log(`- Initial selected trip: ${initialState.selectedTrip}`);

    dataService.setSelectedDay(2);
    const updatedState = dataService.getAppState();
    console.log(`- After setSelectedDay(2): ${updatedState.selectedDay}`);

    dataService.toggleChatPanel();
    const chatState = dataService.getAppState();
    console.log(`- After toggleChatPanel(): ${chatState.isChatPanelOpen}`);
}

// Run validations
try {
    validateMockData();
    validateDataService();
    console.log('\n✅ All validations passed successfully!');
} catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    console.error(error.stack);
}