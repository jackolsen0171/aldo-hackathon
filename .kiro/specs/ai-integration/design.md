# Design Document

## Overview

This design outlines the integration of existing AI outfit planning capabilities into the new UI branch. The system will connect the current React UI (HomePage, CombinedWorkshopPage, ClosetPage) with the existing AI services (BedrockService, ChatService, useChat hook) to provide seamless AI-powered outfit recommendations.

The integration focuses on adding the ChatWidget component to the main application flow while preserving all existing functionality and navigation patterns.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │    │   Chat Layer     │    │   AI Services   │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ HomePage    │ │    │ │ ChatWidget   │ │    │ │ BedrockSvc  │ │
│ │ WorkshopPage│ │◄──►│ │ useChat hook │ │◄──►│ │ ChatService │ │
│ │ ClosetPage  │ │    │ │ MessageList  │ │    │ │ WeatherSvc  │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Integration Strategy

The ChatWidget will be integrated as a **floating/overlay component** that can be accessed from any page without disrupting the existing navigation flow.

## Components and Interfaces

### 1. App.js Modifications

**Current State:**
- Simple page routing between HomePage, CombinedWorkshopPage, ClosetPage
- No AI integration

**Enhanced State:**
- Add ChatWidget as a global overlay component
- Add chat toggle state management
- Preserve existing page navigation

```javascript
// New state additions
const [showChat, setShowChat] = useState(false);
const [chatMinimized, setChatMinimized] = useState(false);
```

### 2. ChatToggleButton Component

**Purpose:** Provide access to AI chat from any page
**Location:** Fixed position button (bottom-right corner)
**Functionality:**
- Toggle chat visibility
- Show notification indicators for new messages
- Maintain consistent styling with existing UI

### 3. ChatWidget Integration

**Current State:** Standalone component with full AI functionality
**Integration Approach:** 
- Render as overlay/modal when activated
- Maintain existing functionality (useChat hook, MessageList, EventDetailsForm)
- Add minimize/maximize capabilities
- Ensure responsive design across all pages

### 4. Service Layer (No Changes Required)

The existing services are already well-architected:
- **BedrockService**: Handles Nova Lite model communication
- **ChatService**: Orchestrates AI interactions
- **useChat**: Manages chat state and message flow
- **WeatherService**: Provides weather data integration

## Data Models

### Chat State Management

```javascript
// Global chat state (in App.js)
const chatState = {
  isVisible: boolean,
  isMinimized: boolean,
  hasUnreadMessages: boolean,
  currentPage: string // Track which page user is on
}

// Chat session data (existing in useChat)
const sessionData = {
  messages: Array<Message>,
  sessionId: string,
  conversationType: string,
  loading: boolean,
  error: string
}
```

### Event Context Data (Existing)

```javascript
// Already implemented in BedrockService
const eventContext = {
  occasion: string,
  location: string | null,
  startDate: string | null,
  duration: number,
  dressCode: 'casual' | 'smart-casual' | 'business' | 'formal' | 'black-tie',
  budget: number | null,
  specialRequirements: string[],
  needsClarification: string[],
  confidence: number,
  weather: WeatherData | null
}
```

## Integration Points

### 1. Chat Access Points

**Primary Access:** Floating chat toggle button
- Position: Fixed bottom-right
- Visibility: All pages
- States: Hidden, visible, minimized

**Secondary Access:** Optional inline integration
- HomePage: Could add chat prompt in avatar section
- CombinedWorkshopPage: Could integrate with trip planning
- ClosetPage: Could add styling advice chat

### 2. State Persistence

**Chat State:** Persist across page navigation
- Use React Context or lift state to App.js
- Maintain conversation history during session
- Preserve minimized/maximized state

**Session Management:** 
- Maintain AI session across page changes
- Clear session on app refresh (existing behavior)
- Handle service availability checks

### 3. Responsive Design

**Desktop:** 
- Floating chat panel (400px width)
- Overlay positioning to avoid content interference

**Mobile:**
- Full-screen chat modal
- Slide-up animation from bottom
- Preserve mobile navigation

## Error Handling

### Service Availability

**AWS Configuration Issues:**
- Display clear setup instructions
- Provide configuration status indicators
- Graceful degradation to UI-only mode

**Network Connectivity:**
- Retry mechanisms with exponential backoff
- Offline indicators
- Queue messages for retry when connection restored

**AI Service Errors:**
- User-friendly error messages
- Fallback to basic conversation
- Error logging for debugging

### User Experience

**Loading States:**
- Typing indicators during AI processing
- Progress indicators for weather data fetching
- Skeleton loading for message rendering

**Error Recovery:**
- Retry buttons for failed messages
- Clear error dismissal
- Session recovery options

## Testing Strategy

### Unit Testing (Existing)

Current test coverage includes:
- ChatWidget integration tests
- useChat hook functionality
- Service layer error handling
- Data validation (Zod schemas)

### Integration Testing (New)

**Chat Integration Tests:**
- Chat visibility across different pages
- State persistence during navigation
- Service integration with UI components
- Error handling in integrated environment

**User Flow Tests:**
- Complete outfit planning workflow
- Chat toggle and minimize functionality
- Cross-page conversation continuity
- Mobile responsive behavior

### Manual Testing Scenarios

1. **Basic Integration:** Chat access from all pages
2. **Conversation Flow:** Complete outfit planning session
3. **Error Scenarios:** Service unavailable, network issues
4. **Navigation:** Chat state during page changes
5. **Responsive:** Mobile and desktop layouts

## Implementation Phases

### Phase 1: Basic Integration
- Add ChatToggleButton to App.js
- Integrate ChatWidget as overlay component
- Ensure chat works from all pages
- Test basic AI functionality

### Phase 2: Enhanced UX
- Add minimize/maximize functionality
- Implement responsive design
- Add notification indicators
- Polish animations and transitions

### Phase 3: Advanced Features
- Cross-page state persistence
- Enhanced error handling
- Performance optimizations
- Analytics integration

## Configuration Requirements

### Environment Variables (Existing)

```bash
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_ACCESS_KEY_ID=your_access_key
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key
```

### Service Dependencies

- AWS Bedrock Nova Lite model access
- Weather API integration (existing)
- Zod schema validation (existing)

## Performance Considerations

### Lazy Loading
- Load ChatWidget only when first accessed
- Lazy load AI services on demand
- Minimize initial bundle size impact

### Memory Management
- Limit message history length
- Clean up event listeners on unmount
- Optimize re-renders with React.memo

### Network Optimization
- Debounce user input for AI requests
- Cache weather data for repeated locations
- Implement request cancellation for navigation

## Security Considerations

### AWS Credentials
- Environment variable validation
- Secure credential storage
- Error message sanitization

### User Data
- No persistent storage of conversations
- Session-only data retention
- Sanitize user inputs before AI processing

This design maintains the existing UI structure while seamlessly integrating AI capabilities through a non-intrusive overlay approach.