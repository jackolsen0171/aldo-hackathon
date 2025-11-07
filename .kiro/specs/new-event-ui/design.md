# Design Document

## Overview

This design transforms the new event creation experience from a cluttered interface showing empty outfit slots and tabs to a clean, focused input experience. The new design centers around a single input box that guides users to describe their trip details, progressively revealing outfit planning features only when relevant.

## Architecture

### Component Hierarchy

```
CombinedWorkshopPage
├── SavedTripsSidebar (unchanged)
└── MainContent
    ├── ConditionalOutfitTabs (hidden for new events)
    └── ConditionalMainArea
        ├── NewEventInputInterface (new events)
        └── MannequinOutfitBuilder (existing events with outfits)
```

### State Management

The design leverages existing React state management patterns:

- **Trip State**: Existing `selectedTrip` and `trips` state in `CombinedWorkshopPage`
- **New Event Detection**: Logic to determine if current trip is new/empty
- **UI State**: New state to track input focus and progressive disclosure

## Components and Interfaces

### 1. NewEventInputInterface (New Component)

**Purpose**: Provides the clean, centered input experience for new events

**Props**:
```javascript
{
  tripId: string,           // Current trip ID
  onTripDescriptionSubmit: function,  // Handler for trip description
  loading: boolean,         // Loading state during processing
  placeholder: string       // Input placeholder text
}
```

**Key Features**:
- Large, centered input box with clear placeholder text
- Subtle visual cues about expected information
- Integration with existing chat functionality
- Smooth transition to outfit planning interface

### 2. ConditionalOutfitTabs (Modified Component)

**Purpose**: Shows/hides outfit tabs based on trip state

**Logic**:
```javascript
const shouldShowTabs = currentTrip && 
  (currentTrip.outfits && Object.keys(currentTrip.outfits).length > 0);
```

### 3. ConditionalMainArea (New Component)

**Purpose**: Renders appropriate interface based on trip state

**Rendering Logic**:
- New/empty trip → `NewEventInputInterface`
- Trip with outfits → `MannequinOutfitBuilder`
- Loading state → Loading indicator

## Data Models

### Trip State Detection

```javascript
// Determine if trip is new/empty
const isNewTrip = (trip) => {
  return !trip || 
         !trip.outfits || 
         Object.keys(trip.outfits).length === 0;
};

// Enhanced trip creation
const createNewTrip = (options = {}) => {
  return {
    id: generateTripId(),
    name: options.name || 'New Trip',
    destination: options.destination || 'Add destination',
    totalDays: options.totalDays || 7,
    outfits: {}, // Empty outfits object
    isNew: true, // Explicit flag for new trips
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};
```

### UI State Model

```javascript
const [uiState, setUiState] = useState({
  showOutfitTabs: false,
  showOutfitBuilder: false,
  inputFocused: false,
  processingInput: false
});
```

## Error Handling

### Input Validation
- Validate trip description before processing
- Provide clear error messages for invalid input
- Graceful fallback to input state on errors

### Service Integration
- Handle chat service unavailability
- Retry mechanisms for failed requests
- Clear error states when user retries

### State Recovery
- Preserve user input during errors
- Maintain trip context across failures
- Reset to clean state when appropriate

## Testing Strategy

### Unit Tests
- `NewEventInputInterface` component rendering
- Trip state detection logic
- Conditional rendering logic
- Input validation functions

### Integration Tests
- New trip creation flow
- Transition from input to outfit planning
- Chat service integration
- State management across components

### User Experience Tests
- Input focus and placeholder behavior
- Progressive disclosure timing
- Smooth transitions between states
- Error state handling

## Implementation Approach

### Phase 1: Component Creation
1. Create `NewEventInputInterface` component
2. Implement trip state detection logic
3. Add conditional rendering to `CombinedWorkshopPage`

### Phase 2: Integration
1. Connect input to existing chat functionality
2. Implement progressive disclosure logic
3. Handle state transitions

### Phase 3: Polish
1. Add smooth animations
2. Implement loading states
3. Add error handling
4. Style refinements

## Visual Design

### NewEventInputInterface Layout

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│           ┌─────────────────┐           │
│           │                 │           │
│           │  Tell Cher      │           │
│           │  about your     │           │
│           │  trip...        │           │
│           │                 │           │
│           └─────────────────┘           │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

### Progressive Disclosure Flow

1. **Initial State**: Clean input box only
2. **Processing State**: Input box + loading indicator
3. **Transition State**: Fade in outfit tabs and builder
4. **Complete State**: Full outfit planning interface

## Styling Considerations

### CSS Classes
- `.new-event-input-interface`: Main container
- `.trip-input-box`: Centered input field
- `.input-focused`: Active input state
- `.processing-input`: Loading state
- `.transition-to-outfits`: Animation state

### Responsive Design
- Mobile: Full-width input with appropriate padding
- Tablet: Centered with max-width constraints
- Desktop: Centered with generous whitespace

### Accessibility
- Proper ARIA labels for input
- Keyboard navigation support
- Screen reader announcements for state changes
- High contrast support