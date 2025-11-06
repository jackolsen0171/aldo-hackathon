# Product Context - AI Outfit & Packing Assistant

## Product Overview

This is an AI-powered outfit planning and packing assistant that helps users create complete outfits and packing lists for specific occasions, events, or trips. The system considers multiple factors including weather, dress code, budget constraints, and personal style preferences.

## Core Functionality

### Primary Use Case
Users input details about an upcoming event/trip (e.g., "3-day conference in rainy weather; smart-casual dress code") and receive:
- Complete outfit recommendations per day/event
- Optimized packing list with item reuse across looks
- Budget-conscious suggestions with rationale
- Weather-appropriate clothing choices

### AI Agent Roles
1. **Planner**: Extracts occasion, duration, dress code, and constraints
2. **Context Tool-User**: Retrieves weather data and dress code rules
3. **Curator/Bundler**: Creates outfits per day/event with cross-look reuse
4. **Constraint Verifier/Critic**: Ensures budget, weather, and dress code compliance
5. **Explainer**: Provides concise justifications and packing tips

## Technical Architecture

### AWS Bedrock Integration
- **Bedrock Agents**: Handle conversational logic and tool orchestration
- **Knowledge Bases**: Store clothing data, style rules, and outfit combinations
- **Nova Lite Model**: Primary conversational AI for user interactions

### Data Sources
- **Kaggle Clothing Dataset**: Comprehensive product catalog with attributes
- **Weather APIs**: Real-time weather data for location-based recommendations
- **Style Guidelines**: Dress code rules and occasion-appropriate styling

### Key Features
- Event-specific outfit planning
- Multi-day itinerary support
- Budget optimization
- Weather-aware recommendations
- Item reuse maximization
- Packing list generation
- Style justifications

## User Journey
1. User describes event/trip details
2. AI extracts key parameters (location, duration, dress code, budget)
3. System retrieves relevant data (weather, clothing options)
4. AI generates optimized outfits and packing list
5. User receives recommendations with explanations