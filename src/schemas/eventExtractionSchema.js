import { z } from 'zod';

/**
 * Zod schema for event extraction response
 * This defines the exact structure the AI should return
 */
export const EventExtractionSchema = z.object({
    success: z.boolean(),
    data: z.object({
        occasion: z.string().describe("Specific event type (e.g., 'business conference', 'wedding', 'vacation', 'job interview')"),
        location: z.string().nullable().describe("City/location name or null if not specified"),
        startDate: z.string().nullable().describe("Start date in YYYY-MM-DD format or null if not specified"),
        duration: z.number().int().min(1).max(365).describe("Duration in days (default 1)"),
        dressCode: z.enum(['casual', 'smart-casual', 'business', 'formal', 'black-tie']).describe("Appropriate dress code for the occasion"),
        budget: z.number().nullable().describe("Budget amount in dollars or null if not specified"),
        specialRequirements: z.array(z.string()).describe("Array of special requirements mentioned by user"),
        needsClarification: z.array(z.string()).describe("Array of information that needs clarification from user"),
        confidence: z.number().min(0).max(1).describe("Confidence score from 0.0 to 1.0"),
        dailyPlans: z.array(z.object({
            day: z.number().int().min(1),
            activity: z.string().describe("Short description of what happens that day"),
            dressCode: z.enum(['casual', 'smart-casual', 'business', 'formal', 'black-tie'])
        })).optional().describe("Per-day activity + dress code suggestions when duration > 1")
    })
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type EventExtractionResponse = z.infer<typeof EventExtractionSchema>;

/**
 * Generate a JSON schema string for the AI prompt
 * This converts the Zod schema to a format the AI can understand
 */
export function getEventExtractionSchemaForAI() {
    return `{
  "success": boolean,
  "data": {
    "occasion": string, // Specific event type (e.g., "business conference", "wedding", "vacation", "job interview")
    "location": string | null, // City/location name or null if not specified
    "startDate": string | null, // Start date in YYYY-MM-DD format or null if not specified  
    "duration": number, // Duration in days (default 1, min 1, max 365)
    "dressCode": "casual" | "smart-casual" | "business" | "formal" | "black-tie", // Appropriate dress code
    "budget": number | null, // Budget amount in dollars or null if not specified
    "specialRequirements": string[], // Array of special requirements mentioned by user
    "needsClarification": string[], // Array of information that needs clarification
    "confidence": number, // Confidence score from 0.0 to 1.0
    "dailyPlans": [
      {
        "day": number, // Day index starting at 1
        "activity": string, // Description of activity for that day
        "dressCode": "casual" | "smart-casual" | "business" | "formal" | "black-tie" // Dress code specific to that day
      }
    ]
  }
}`;
}

/**
 * Dress code mapping rules for AI
 */
export const DRESS_CODE_RULES = {
    'casual': ['vacation', 'weekend trip', 'casual outing', 'festival', 'beach', 'hiking', 'sightseeing'],
    'smart-casual': ['business conference', 'work event', 'networking', 'dinner out', 'date night'],
    'business': ['job interview', 'business meeting', 'corporate event', 'presentation', 'client meeting'],
    'formal': ['wedding', 'gala', 'formal dinner', 'awards ceremony', 'graduation', 'opera'],
    'black-tie': ['black-tie event', 'evening gala', 'formal wedding', 'charity ball', 'premiere']
};

/**
 * Date parsing examples for AI
 */
export const DATE_PARSING_EXAMPLES = {
    'tomorrow': () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    },
    'next week': () => {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString().split('T')[0];
    },
    'this weekend': () => {
        const today = new Date();
        const daysUntilSaturday = (6 - today.getDay()) % 7 || 7;
        const saturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
        return saturday.toISOString().split('T')[0];
    }
};

/**
 * Validate extracted data against the schema
 */
export function validateEventExtraction(data) {
    try {
        const validated = EventExtractionSchema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        return {
            success: false,
            error: error.errors || error.message,
            data: null
        };
    }
}
