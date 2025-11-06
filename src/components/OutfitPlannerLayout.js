import React, { useState } from 'react';
import SavedTripsSidebar from './SavedTripsSidebar';
import DaySelector from './DaySelector';
import OutfitVisualization from './OutfitVisualization';
import ClothingCategories from './ClothingCategories';
import SlidingChatPanel from './SlidingChatPanel';
import ChatWidgetPanel from './ChatWidgetPanel';
import ChatToggleButton from './ChatToggleButton';
import { initialAppState, mockTrips } from '../data/mockData';
import { createNewTrip } from '../services/tripService';
import './OutfitPlannerLayout.css';

const OutfitPlannerLayout = ({ onNavigate }) => {
    // Basic state management using React useState
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(initialAppState.isChatPanelOpen);
    const [selectedTrip, setSelectedTrip] = useState(initialAppState.selectedTrip);
    const [selectedDay, setSelectedDay] = useState(initialAppState.selectedDay);
    const [trips, setTrips] = useState(mockTrips);
    const [selectedItems, setSelectedItems] = useState({});

    // Get current trip data
    const currentTrip = trips.find(trip => trip.id === selectedTrip);
    const currentOutfit = currentTrip?.outfits?.[selectedDay];

    // Methods for toggling chat panel and switching selections
    const toggleChatPanel = () => {
        setIsChatPanelOpen(prev => !prev);
    };

    const handleTripSelect = (tripId) => {
        setSelectedTrip(tripId);
        // Reset to day 1 when switching trips
        setSelectedDay(1);
        // Clear selected items when switching trips
        setSelectedItems({});
    };

    const handleDaySelect = (dayNumber) => {
        setSelectedDay(dayNumber);
        // Load outfit items for the selected day if they exist
        const dayOutfit = currentTrip?.outfits?.[dayNumber];
        if (dayOutfit?.items) {
            setSelectedItems(dayOutfit.items);
        } else {
            setSelectedItems({});
        }
    };

    const handleNewTrip = () => {
        // Create a blank trip using the service
        const newTrip = createNewTrip();

        // Add the new trip to the trips array
        setTrips(prevTrips => [...prevTrips, newTrip]);

        // Select the new trip
        setSelectedTrip(newTrip.id);
        setSelectedDay(1);

        // Clear selected items when creating a new trip
        setSelectedItems({});

        console.log('Created new trip:', newTrip);
    };

    const handleItemSelect = (category, item) => {
        setSelectedItems(prev => ({
            ...prev,
            [category]: item
        }));
    };

    const handleSaveOutfit = (outfitData) => {
        // Placeholder for outfit saving
        console.log('Save outfit:', outfitData);
    };

    const handleOutfitNameChange = (newName) => {
        // Placeholder for outfit name change
        console.log('Outfit name changed to:', newName);
    };

    const closeChatPanel = () => {
        setIsChatPanelOpen(false);
    };

    return (
        <div className="outfit-planner-layout">
            {/* Back to Home Button */}
            {onNavigate && (
                <button
                    className="back-to-home-btn"
                    onClick={() => onNavigate('home')}
                >
                    ← Back to Home
                </button>
            )}

            {/* Left Sidebar - Saved Trips */}
            <div className="layout-sidebar">
                <SavedTripsSidebar
                    trips={trips}
                    selectedTrip={selectedTrip}
                    onTripSelect={handleTripSelect}
                    onNewTrip={handleNewTrip}
                />
            </div>

            {/* Main Content Area */}
            <div className="layout-main">
                {/* Day Selection */}
                <div className="day-selection-section">
                    <DaySelector
                        selectedDay={selectedDay}
                        totalDays={currentTrip?.totalDays || 5}
                        onDaySelect={handleDaySelect}
                    />
                </div>

                {/* Outfit Visualization */}
                <div className="outfit-visualization-section">
                    <OutfitVisualization
                        selectedItems={selectedItems}
                        outfitName={currentOutfit?.name || "New Outfit"}
                        onSaveOutfit={handleSaveOutfit}
                        onOutfitNameChange={handleOutfitNameChange}
                    />
                </div>

                {/* Clothing Categories */}
                <div className="clothing-categories-section">
                    <ClothingCategories
                        selectedItems={selectedItems}
                        onItemSelect={handleItemSelect}
                    />
                </div>
            </div>

            {/* Chat Panel Toggle Button */}
            <ChatToggleButton
                isOpen={isChatPanelOpen}
                onClick={toggleChatPanel}
            />

            {/* Sliding AI Chat Panel */}
            <SlidingChatPanel
                isOpen={isChatPanelOpen}
                onClose={closeChatPanel}
            >
                <ChatWidgetPanel />
            </SlidingChatPanel>
        </div>
    );
};

export default OutfitPlannerLayout;