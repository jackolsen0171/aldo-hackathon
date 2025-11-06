// Mock data for outfit planner UI
// This file contains hardcoded sample data for initial layout display

// Mock clothing items for different categories
export const mockClothingItems = {
    hat: [
        {
            id: 'hat-1',
            name: 'Baseball Cap',
            category: 'hat',
            color: 'Navy Blue',
            style: 'Casual',
            description: 'Classic navy baseball cap',
            tags: ['casual', 'sporty']
        },
        {
            id: 'hat-2',
            name: 'Sun Hat',
            category: 'hat',
            color: 'Beige',
            style: 'Summer',
            description: 'Wide-brim sun protection hat',
            tags: ['summer', 'beach', 'protection']
        },
        {
            id: 'hat-3',
            name: 'Beanie',
            category: 'hat',
            color: 'Gray',
            style: 'Winter',
            description: 'Warm knit beanie',
            tags: ['winter', 'warm', 'casual']
        }
    ],
    shirt: [
        {
            id: 'shirt-1',
            name: 'White Button-Down',
            category: 'shirt',
            color: 'White',
            style: 'Business Casual',
            description: 'Classic white dress shirt',
            tags: ['formal', 'versatile', 'classic']
        },
        {
            id: 'shirt-2',
            name: 'Striped T-Shirt',
            category: 'shirt',
            color: 'Navy/White',
            style: 'Casual',
            description: 'Navy and white striped tee',
            tags: ['casual', 'comfortable', 'everyday']
        },
        {
            id: 'shirt-3',
            name: 'Floral Blouse',
            category: 'shirt',
            color: 'Pink',
            style: 'Feminine',
            description: 'Light pink floral print blouse',
            tags: ['feminine', 'spring', 'dressy']
        }
    ],
    outerwear: [
        {
            id: 'outerwear-1',
            name: 'Denim Jacket',
            category: 'outerwear',
            color: 'Blue',
            style: 'Casual',
            description: 'Classic blue denim jacket',
            tags: ['casual', 'versatile', 'layering']
        },
        {
            id: 'outerwear-2',
            name: 'Blazer',
            category: 'outerwear',
            color: 'Black',
            style: 'Professional',
            description: 'Tailored black blazer',
            tags: ['professional', 'formal', 'structured']
        },
        {
            id: 'outerwear-3',
            name: 'Cardigan',
            category: 'outerwear',
            color: 'Cream',
            style: 'Cozy',
            description: 'Soft cream knit cardigan',
            tags: ['cozy', 'comfortable', 'layering']
        }
    ],
    pants: [
        {
            id: 'pants-1',
            name: 'Dark Jeans',
            category: 'pants',
            color: 'Dark Blue',
            style: 'Casual',
            description: 'Dark wash skinny jeans',
            tags: ['casual', 'versatile', 'everyday']
        },
        {
            id: 'pants-2',
            name: 'Black Trousers',
            category: 'pants',
            color: 'Black',
            style: 'Professional',
            description: 'Tailored black dress pants',
            tags: ['professional', 'formal', 'work']
        },
        {
            id: 'pants-3',
            name: 'Flowy Skirt',
            category: 'pants',
            color: 'Coral',
            style: 'Feminine',
            description: 'Coral midi skirt',
            tags: ['feminine', 'flowy', 'dressy']
        }
    ],
    shoes: [
        {
            id: 'shoes-1',
            name: 'White Sneakers',
            category: 'shoes',
            color: 'White',
            style: 'Casual',
            description: 'Clean white leather sneakers',
            tags: ['casual', 'comfortable', 'versatile']
        },
        {
            id: 'shoes-2',
            name: 'Black Heels',
            category: 'shoes',
            color: 'Black',
            style: 'Professional',
            description: 'Classic black pumps',
            tags: ['professional', 'formal', 'elegant']
        },
        {
            id: 'shoes-3',
            name: 'Brown Sandals',
            category: 'shoes',
            color: 'Brown',
            style: 'Summer',
            description: 'Leather strappy sandals',
            tags: ['summer', 'casual', 'comfortable']
        }
    ],
    jewelry: [
        {
            id: 'jewelry-1',
            name: 'Pearl Necklace',
            category: 'jewelry',
            color: 'White',
            style: 'Classic',
            description: 'Single strand pearl necklace',
            tags: ['classic', 'elegant', 'formal']
        },
        {
            id: 'jewelry-2',
            name: 'Gold Hoops',
            category: 'jewelry',
            color: 'Gold',
            style: 'Everyday',
            description: 'Medium gold hoop earrings',
            tags: ['everyday', 'versatile', 'classic']
        },
        {
            id: 'jewelry-3',
            name: 'Statement Bracelet',
            category: 'jewelry',
            color: 'Silver',
            style: 'Bold',
            description: 'Chunky silver chain bracelet',
            tags: ['bold', 'statement', 'modern']
        }
    ],
    belt: [
        {
            id: 'belt-1',
            name: 'Black Leather Belt',
            category: 'belt',
            color: 'Black',
            style: 'Classic',
            description: 'Genuine black leather belt',
            tags: ['classic', 'professional', 'versatile']
        },
        {
            id: 'belt-2',
            name: 'Brown Woven Belt',
            category: 'belt',
            color: 'Brown',
            style: 'Casual',
            description: 'Braided brown leather belt',
            tags: ['casual', 'textured', 'bohemian']
        },
        {
            id: 'belt-3',
            name: 'Chain Belt',
            category: 'belt',
            color: 'Gold',
            style: 'Statement',
            description: 'Gold chain link belt',
            tags: ['statement', 'trendy', 'accent']
        }
    ]
};

// Mock clothing categories with display information
export const mockClothingCategories = [
    {
        id: 'hat',
        name: 'hat',
        displayName: 'Hat',
        items: mockClothingItems.hat,
        icon: '🎩'
    },
    {
        id: 'shirt',
        name: 'shirt',
        displayName: 'Shirt',
        items: mockClothingItems.shirt,
        icon: '👕'
    },
    {
        id: 'outerwear',
        name: 'outerwear',
        displayName: 'Outerwear',
        items: mockClothingItems.outerwear,
        icon: '🧥'
    },
    {
        id: 'pants',
        name: 'pants',
        displayName: 'Pants',
        items: mockClothingItems.pants,
        icon: '👖'
    },
    {
        id: 'shoes',
        name: 'shoes',
        displayName: 'Shoes',
        items: mockClothingItems.shoes,
        icon: '👟'
    },
    {
        id: 'jewelry',
        name: 'jewelry',
        displayName: 'Jewelry',
        items: mockClothingItems.jewelry,
        icon: '💎'
    },
    {
        id: 'belt',
        name: 'belt',
        displayName: 'Belt',
        items: mockClothingItems.belt,
        icon: '👜'
    }
];

// Mock outfits for different days
export const mockOutfits = {
    1: {
        id: 'outfit-1',
        name: 'Boat day sunset outfit',
        day: 1,
        tripId: 'trip-1',
        items: {
            hat: mockClothingItems.hat[1], // Sun Hat
            shirt: mockClothingItems.shirt[1], // Striped T-Shirt
            outerwear: mockClothingItems.outerwear[0], // Denim Jacket
            pants: mockClothingItems.pants[0], // Dark Jeans
            shoes: mockClothingItems.shoes[2], // Brown Sandals
            jewelry: mockClothingItems.jewelry[1], // Gold Hoops
            belt: mockClothingItems.belt[1] // Brown Woven Belt
        },
        isSaved: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
    },
    2: {
        id: 'outfit-2',
        name: 'Business casual meeting',
        day: 2,
        tripId: 'trip-1',
        items: {
            shirt: mockClothingItems.shirt[0], // White Button-Down
            outerwear: mockClothingItems.outerwear[1], // Blazer
            pants: mockClothingItems.pants[1], // Black Trousers
            shoes: mockClothingItems.shoes[1], // Black Heels
            jewelry: mockClothingItems.jewelry[0], // Pearl Necklace
            belt: mockClothingItems.belt[0] // Black Leather Belt
        },
        isSaved: false,
        createdAt: '2024-01-16T09:00:00Z',
        updatedAt: '2024-01-16T09:00:00Z'
    },
    3: {
        id: 'outfit-3',
        name: 'Casual brunch look',
        day: 3,
        tripId: 'trip-1',
        items: {
            shirt: mockClothingItems.shirt[2], // Floral Blouse
            outerwear: mockClothingItems.outerwear[2], // Cardigan
            pants: mockClothingItems.pants[2], // Flowy Skirt
            shoes: mockClothingItems.shoes[0], // White Sneakers
            jewelry: mockClothingItems.jewelry[2] // Statement Bracelet
        },
        isSaved: true,
        createdAt: '2024-01-17T11:00:00Z',
        updatedAt: '2024-01-17T11:00:00Z'
    }
};

// Mock trips with sample data
export const mockTrips = [
    {
        id: 'trip-1',
        name: 'Paris Weekend',
        destination: 'Paris, France',
        startDate: '2024-01-15',
        endDate: '2024-01-17',
        totalDays: 3,
        outfits: mockOutfits,
        createdAt: '2024-01-10T14:30:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'trip-2',
        name: 'NYC Business Trip',
        destination: 'New York, NY',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        totalDays: 5,
        outfits: {
            1: {
                id: 'outfit-4',
                name: 'Airport travel outfit',
                day: 1,
                tripId: 'trip-2',
                items: {
                    shirt: mockClothingItems.shirt[1],
                    outerwear: mockClothingItems.outerwear[0],
                    pants: mockClothingItems.pants[0],
                    shoes: mockClothingItems.shoes[0]
                },
                isSaved: true,
                createdAt: '2024-01-25T16:00:00Z',
                updatedAt: '2024-01-25T16:00:00Z'
            }
        },
        createdAt: '2024-01-20T09:15:00Z',
        updatedAt: '2024-01-25T16:00:00Z'
    },
    {
        id: 'trip-3',
        name: 'Tokyo Adventure',
        destination: 'Tokyo, Japan',
        startDate: '2024-03-10',
        endDate: '2024-03-17',
        totalDays: 7,
        outfits: {},
        createdAt: '2024-02-01T12:00:00Z',
        updatedAt: '2024-02-01T12:00:00Z'
    }
];

// Default/initial state data
export const initialAppState = {
    selectedTrip: 'trip-1',
    selectedDay: 1,
    isChatPanelOpen: false,
    trips: mockTrips,
    clothingCategories: mockClothingCategories
};