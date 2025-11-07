import { z } from 'zod';

const outfitSlotSchema = z.object({
    sku: z.string().min(1, 'SKU is required'),
    name: z.string().optional(),
    category: z.string().optional(),
    price: z.number().optional(),
    colors: z.string().optional(),
    weatherSuitability: z.string().optional(),
    formality: z.string().optional(),
    notes: z.string().optional()
});

const stylingSchema = z.object({
    rationale: z.string().min(1, 'Styling rationale is required'),
    weatherConsiderations: z.string().min(1, 'Weather considerations are required'),
    dresscodeCompliance: z.string().min(1, 'Dress code compliance is required')
});

const dailyOutfitSchema = z.object({
    day: z.number().int().positive(),
    date: z.string().optional(),
    occasion: z.string().optional(),
    outfit: z.object({
        topwear: outfitSlotSchema,
        bottomwear: outfitSlotSchema,
        footwear: outfitSlotSchema,
        outerwear: outfitSlotSchema.nullable().optional(),
        accessories: z.array(outfitSlotSchema).optional().default([])
    }),
    styling: stylingSchema
});

export const outfitRecommendationSchema = z.object({
    tripDetails: z.object({
        occasion: z.string().min(1),
        duration: z.number().int().positive(),
        location: z.string().optional().nullable(),
        dressCode: z.string().min(1),
        budget: z.number().optional().nullable()
    }),
    dailyOutfits: z.array(dailyOutfitSchema).min(1),
    reusabilityAnalysis: z.object({
        totalItems: z.number().optional(),
        reusedItems: z.number().optional(),
        reusabilityPercentage: z.number().optional(),
        reusabilityMap: z.record(z.array(z.number())).catch({}).optional()
    }).optional()
});

export default outfitRecommendationSchema;
