# Design Document

## Overview

The outfit generation feature creates complete daily outfit recommendations after users confirm their event details form. The system leverages the existing context accumulation pipeline, integrates with AWS Bedrock AI services, and processes the clothing dataset to generate practical, reusable outfit combinations that meet all specified constraints.

## Architecture

### High-Level Flow
```
EventDetailsForm (Confirmed) → OutfitGenerationService → BedrockAgentService → OutfitDisplay
                                        ↓
                              ContextAccumulator + ClothingDataset
```

### Core Components
1. **OutfitGenerationService**: Orchestrates the outfit generation process
2. **CSVLoader**: Simple utility to load and format the clothing dataset
3. **BedrockAgentService**: Handles AI communication (existing, enhanced)
4. **ContextAccumulator**: Provides accumulated trip context (existing)
5. **OutfitDisplayComponent**: Renders generated outfits in the UI

## Components and Interfaces

### OutfitGenerationService
```javascript
class OutfitGenerationService {
    async generateOutfits(sessionId, confirmedDetails)
    async loadClothingDataset()
    async buildAIPrompt(contextSummary, csvData, duration)
    async parseAIResponse(response)
    validateOutfitRecommendations(outfits)
}
```

**Key Methods:**
- `generateOutfits()`: Main orchestration method
- `loadClothingDataset()`: Simple CSV loading and formatting
- `buildAIPrompt()`: Creates comprehensive prompt with context and raw CSV data
- `parseAIResponse()`: Extracts structured outfit data from AI response

### CSVLoader
```javascript
class CSVLoader {
    async loadCSV(filePath)
    formatForAI(csvContent)
}
```

**Responsibilities:**
- Load clothing_dataset.csv as raw text
- Format CSV content for AI consumption (keeping all structured data intact)
- No filtering - let AI handle all constraint-based selection

### Enhanced BedrockAgentService
```javascript
// Extension to existing service
class BedrockAgentService {
    async generateOutfitRecommendations(prompt, sessionId)
    formatOutfitPrompt(contextSummary, csvData, duration)
    parseOutfitResponse(response)
}
```

### OutfitDisplayComponent
```javascript
const OutfitDisplay = ({ 
    outfits, 
    tripDetails, 
    reusabilityMap, 
    loading 
}) => {
    // Renders daily outfits with reusability indicators
}
```

## Data Models

### Outfit Structure
```javascript
const OutfitRecommendation = {
    tripId: string,
    sessionId: string,
    generatedAt: timestamp,
    tripDetails: {
        occasion: string,
        duration: number,
        location: string,
        dressCode: string,
        budget: number
    },
    dailyOutfits: [
        {
            day: number,
            date: string,
            occasion: string, // "Day 1 - Conference Opening"
            outfit: {
                topwear: ClothingItem,
                bottomwear: ClothingItem,
                outerwear: ClothingItem | null,
                footwear: ClothingItem,
                accessories: [ClothingItem]
            },
            styling: {
                rationale: string,
                weatherConsiderations: string,
                dresscodeCompliance: string
            }
        }
    ],
    reusabilityAnalysis: {
        totalItems: number,
        reusedItems: number,
        reusabilityPercentage: number,
        reusabilityMap: {
            [itemSku]: [dayNumbers]
        }
    },
    constraints: {
        weather: WeatherConstraints,
        budget: BudgetConstraints,
        dressCode: string
    }
}

const ClothingItem = {
    sku: string,
    name: string,
    category: string,
    price: number,
    colors: string,
    weatherSuitability: string,
    formality: string,
    layering: string,
    tags: [string],
    notes: string
}
```

### AI Prompt Structure
```javascript
const AIPromptData = {
    context: {
        event: EventDetails,
        weather: WeatherData,
        constraints: Constraints
    },
    clothingDataset: string, // Raw CSV content with all clothing items
    requirements: {
        duration: number,
        reusabilityTarget: number, // 60% for trips > 3 days
        practicalityPriority: boolean,
        instructions: "Select items from the provided CSV dataset that match the constraints"
    }
}
```

## Error Handling

### Validation Layers
1. **Input Validation**: Ensure confirmed details are complete
2. **Dataset Validation**: Verify clothing data is available and properly formatted
3. **AI Response Validation**: Validate AI response structure and content
4. **Constraint Validation**: Ensure outfits meet all specified requirements

### Error Recovery
- **Insufficient Clothing Data**: Provide generic recommendations with explanation
- **AI Service Failure**: Fall back to rule-based outfit generation
- **Constraint Conflicts**: Prioritize safety/weather over style preferences
- **Parsing Errors**: Request AI to regenerate response in correct format

### Error States
```javascript
const ErrorStates = {
    DATASET_UNAVAILABLE: 'Clothing data temporarily unavailable',
    AI_SERVICE_ERROR: 'AI service temporarily unavailable',
    INSUFFICIENT_OPTIONS: 'Limited clothing options for your constraints',
    CONSTRAINT_CONFLICT: 'Some constraints cannot be fully satisfied',
    PARSING_ERROR: 'Error processing AI recommendations'
}
```

## Testing Strategy

### Unit Tests
- **OutfitGenerationService**: Test outfit generation logic and error handling
- **ClothingDatasetProcessor**: Test filtering and categorization logic
- **AI Prompt Building**: Test prompt construction with various inputs
- **Response Parsing**: Test parsing of AI responses with different formats

### Integration Tests
- **End-to-End Flow**: Test complete flow from form confirmation to outfit display
- **Context Integration**: Test integration with ContextAccumulator
- **AI Service Integration**: Test BedrockAgentService communication
- **Dataset Processing**: Test CSV loading and processing

### Performance Tests
- **Dataset Loading**: Ensure CSV processing completes within acceptable time
- **AI Response Time**: Monitor AI service response times
- **Memory Usage**: Test memory efficiency with large clothing datasets

## Implementation Approach

### Phase 1: Core Infrastructure
1. Create OutfitGenerationService with basic structure
2. Implement ClothingDatasetProcessor for CSV handling
3. Enhance BedrockAgentService with outfit-specific methods
4. Create basic OutfitDisplay component

### Phase 2: AI Integration
1. Design and test AI prompt templates
2. Implement response parsing logic
3. Add validation and error handling
4. Test with various constraint combinations

### Phase 3: UI Enhancement
1. Create comprehensive outfit display interface
2. Add reusability visualization
3. Implement loading states and error handling
4. Add outfit explanation and styling tips

### Phase 4: Optimization
1. Optimize dataset filtering performance
2. Implement caching for repeated requests
3. Add advanced reusability algorithms
4. Performance testing and optimization

## Technical Considerations

### CSV Processing
- Load clothing_dataset.csv as raw text asynchronously
- Pass complete CSV content directly to AI for intelligent filtering
- Cache raw CSV data in memory for session duration
- Let AI handle all constraint-based filtering using structured CSV columns

### AI Prompt Engineering
- Design prompts that encourage practical, reusable recommendations
- Include the complete CSV dataset with clear column explanations
- Instruct AI to filter items based on weather_suitability, formality, price, and other CSV columns
- Include clear formatting instructions for structured JSON responses
- Provide examples of desired output format
- Let AI intelligently handle constraint conflicts using the structured data

### Reusability Algorithm
- Prioritize versatile items that work across multiple occasions
- Consider layering possibilities for weather adaptability
- Balance reusability with appropriate variety
- Account for laundry/care requirements during multi-day trips

### Performance Optimization
- Load CSV data once and cache in memory
- Implement request debouncing for rapid form changes
- Cache AI responses for identical constraint combinations
- Optimize rendering of large outfit lists
- Minimal client-side processing - let AI do the heavy lifting

## Security and Privacy

### Data Handling
- Load clothing dataset client-side as static CSV file
- Pass raw CSV content to AI without client-side processing
- Ensure user preferences are not permanently stored
- Sanitize all inputs before sending to AI services
- Implement proper error logging without exposing sensitive data

### AI Service Security
- Validate all AI responses before processing
- Implement rate limiting for AI service calls
- Handle authentication errors gracefully
- Ensure no personal data is included in AI prompts beyond necessary context