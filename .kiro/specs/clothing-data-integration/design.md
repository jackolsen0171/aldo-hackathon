# Design Document

## Overview

The clothing data integration feature transforms the AI outfit assistant from a conceptual recommendation system into a practical tool that works with real clothing items. The system will parse the local CSV dataset, match clothing attributes to user requirements, and generate visual outfit recommendations using the corresponding images.

## Architecture

### Data Layer
- **ClothingDataLoader**: Simple utility to read CSV file as text for AI model input
- **ImageMappingService**: Maps clothing SKUs to their corresponding image files (001.png maps to SKU001, etc.)

### AI Integration Layer
- **OutfitGenerationService**: Sends CSV data + user requirements to Bedrock model, receives SKU recommendations
- **PromptTemplateService**: Formats clothing data and user requirements into structured prompts
- **ResponseParsingService**: Extracts SKU lists and reasoning from AI model responses

### Presentation Layer
- **VisualOutfitDisplay**: React component for showing outfit recommendations with images
- **OutfitSummaryCard**: Component displaying outfit details, pricing, and reasoning
- **ClothingItemCard**: Individual clothing item display with image and attributes

## Components and Interfaces

### ClothingDataLoader
```javascript
class ClothingDataLoader {
  async loadClothingCSV() // Returns raw CSV text
  getImagePathForSku(sku) // Maps SKU001 -> Images/001.png
}
```

### OutfitGenerationService
```javascript
class OutfitGenerationService {
  async generateOutfit(userRequirements, csvData)
  async generateMultiDayOutfits(userRequirements, csvData, dayCount)
  parseSkuResponse(aiResponse) // Extracts SKU list from AI response
  lookupItemDetails(skus, csvData) // Gets item details for display
}
```

### PromptTemplateService
```javascript
class PromptTemplateService {
  buildOutfitPrompt(userRequirements, csvData)
  buildMultiDayPrompt(userRequirements, csvData, dayCount)
  buildTripDurationPrompt(tripContext, csvData) // New: handles trip duration logic
  formatClothingDataForPrompt(csvData)
  generateSystemPromptInstructions(tripDuration, eventType) // New: system prompt logic
}
```

### VisualOutfitDisplay Component
```javascript
const VisualOutfitDisplay = ({ 
  outfits, 
  showPricing, 
  highlightReusedItems 
}) => {
  // Renders outfit grid with images and details
}
```

## Data Models

### ClothingItem
```javascript
{
  sku: string,
  name: string,
  category: 'Topwear' | 'Bottomwear' | 'Outerwear' | 'Footwear' | 'Accessories' | 'Dresses',
  tags: string[],
  weatherSuitability: 'warm' | 'mild' | 'cold' | 'rain',
  price: number,
  colors: string[],
  layering: 'base' | 'mid' | 'outer' | 'accessory',
  formality: 'casual' | 'smart-casual' | 'formal',
  notes: string,
  imagePath: string
}
```

### OutfitRecommendation
```javascript
{
  id: string,
  items: ClothingItem[],
  totalPrice: number,
  weatherMatch: number, // 0-1 score
  formalityMatch: number, // 0-1 score
  reasoning: string,
  reusedItems?: string[] // SKUs of items used in other outfits
}
```

### OutfitGenerationRequest
```javascript
{
  weatherConditions: string,
  formalityLevel: string,
  occasion?: string,
  budgetMax?: number,
  dayCount?: number,
  preferredColors?: string[],
  avoidCategories?: string[]
}
```

## Error Handling

### Data Loading Errors
- Graceful fallback when CSV file is missing or corrupted
- Validation of required fields in clothing data
- Warning messages for missing image files

### Outfit Generation Errors
- Fallback recommendations when no perfect matches exist
- Clear messaging when budget constraints cannot be met
- Alternative suggestions when specific categories are unavailable

### Image Display Errors
- Placeholder images for missing clothing photos
- Lazy loading with error boundaries for image components
- Fallback to text descriptions when images fail to load

## Testing Strategy

### Unit Tests
- ClothingDataService CSV parsing and filtering
- OutfitGenerationEngine logic for different scenarios
- ContextMatchingService attribute matching algorithms
- BudgetOptimizationService cost calculations

### Integration Tests
- End-to-end outfit generation with real dataset
- Image loading and display functionality
- Multi-day outfit planning with reuse optimization
- Weather and formality filtering combinations

### Visual Tests
- Outfit display component rendering
- Image grid layout responsiveness
- Pricing and summary information display
- Error state handling in UI components

## Implementation Approach

### Phase 1: AI-Driven Data Integration
1. Create ClothingDataLoader to read CSV as text
2. Implement simple SKU-to-image mapping (SKU001 -> 001.png)
3. Build PromptTemplateService to format CSV data for AI model
4. Add basic error handling for missing files

### Phase 2: AI Outfit Generation
1. Develop OutfitGenerationService that sends CSV + requirements to Bedrock
2. Create prompt templates that instruct AI to return matching SKUs
3. Implement response parsing to extract SKU lists and reasoning
4. Add item detail lookup using returned SKUs

### Phase 3: Visual Components
1. Build VisualOutfitDisplay React component
2. Implement ClothingItemCard with image display
3. Add OutfitSummaryCard with pricing and reasoning
4. Integrate components with existing chat interface

### Phase 4: Enhanced AI Features
1. Multi-day outfit planning prompts with reuse optimization
2. Budget constraint instructions in AI prompts
3. Enhanced reasoning extraction from AI responses
4. Fallback handling when AI returns invalid SKUs

## Trip Duration & Downtime Logic

### System Prompt Instructions
The AI model will receive specific instructions based on trip duration and event type:

**Trip Duration Rules:**
- **1 Day**: Recommend 1 outfit focused on the main event
- **2-3 Days**: Recommend X outfits (1 per day) + 1 casual comfort outfit for downtime
- **4+ Days**: Recommend X outfits + 2 casual outfits, maximize reuse of versatile pieces

**Event Context Considerations:**
- **Business Trip**: Include professional outfits + comfortable travel/evening wear
- **Vacation**: Balance activity-appropriate + relaxation clothing
- **Conference**: Formal event wear + networking casual + comfortable walking options
- **Wedding**: Event-specific formal + travel comfort + potential multiple events

**System Prompt Template:**
```
TRIP DURATION: {duration} days
EVENT TYPE: {eventType}
INSTRUCTION: Recommend {duration} complete outfits with the following breakdown:
- {eventOutfitCount} outfits for {eventType} activities (formality: {formalityLevel})
- {casualOutfitCount} casual comfort outfits for downtime/travel
- Maximize reuse of versatile items across outfits
- Consider user will need clothing for non-event time (meals, travel, relaxation)
- Ensure weather appropriateness for all recommended items
```

### Outfit Categorization
Each recommended outfit will be categorized as:
- **Event Outfit**: Matches primary occasion formality and requirements
- **Casual Outfit**: Comfortable clothing for downtime, travel, meals
- **Transition Outfit**: Versatile pieces that work for both contexts

## Integration Points

### Existing Bedrock Service
- Enhance prompt templates to include full CSV clothing dataset
- Modify response parsing to extract SKU lists from AI responses
- Add clothing context and selected items to conversation history
- Instruct AI model to work directly with CSV data and return matching SKUs

### Chat Interface
- Extend ChatWidget to display visual outfit recommendations
- Add outfit interaction capabilities (save, modify, share)
- Integrate with existing event extraction and context services

### Data Pipeline
- Connect ClothingDataService to existing pipeline architecture
- Add clothing data to context accumulation process
- Ensure compatibility with weather and event context services