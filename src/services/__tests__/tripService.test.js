import {
    isNewTrip,
    hasTransitionedToPopulated,
    createNewTrip,
    updateTrip,
    updateTripWithOutfit
} from '../tripService';

describe('Trip State Detection', () => {
    describe('isNewTrip', () => {
        test('returns true for null/undefined trip', () => {
            expect(isNewTrip(null)).toBe(true);
            expect(isNewTrip(undefined)).toBe(true);
        });

        test('returns true for trip with no outfits property', () => {
            const trip = { id: 'test', name: 'Test Trip' };
            expect(isNewTrip(trip)).toBe(true);
        });

        test('returns true for trip with empty outfits object', () => {
            const trip = { id: 'test', name: 'Test Trip', outfits: {} };
            expect(isNewTrip(trip)).toBe(true);
        });

        test('returns true for trip with outfits that have no items', () => {
            const trip = {
                id: 'test',
                name: 'Test Trip',
                outfits: {
                    1: { id: 'outfit-1', items: {} },
                    2: { id: 'outfit-2', items: {} }
                }
            };
            expect(isNewTrip(trip)).toBe(true);
        });

        test('returns false for trip with at least one outfit with items', () => {
            const trip = {
                id: 'test',
                name: 'Test Trip',
                outfits: {
                    1: {
                        id: 'outfit-1',
                        items: {
                            shirt: { id: 'shirt-1', name: 'Test Shirt' }
                        }
                    }
                }
            };
            expect(isNewTrip(trip)).toBe(false);
        });
    });

    describe('hasTransitionedToPopulated', () => {
        test('returns false for null/undefined trips', () => {
            expect(hasTransitionedToPopulated(null, null)).toBe(false);
            expect(hasTransitionedToPopulated(undefined, undefined)).toBe(false);
        });

        test('returns true when trip transitions from new to populated', () => {
            const previousTrip = { id: 'test', outfits: {} };
            const currentTrip = {
                id: 'test',
                outfits: {
                    1: {
                        id: 'outfit-1',
                        items: {
                            shirt: { id: 'shirt-1', name: 'Test Shirt' }
                        }
                    }
                }
            };
            expect(hasTransitionedToPopulated(previousTrip, currentTrip)).toBe(true);
        });

        test('returns false when trip was already populated', () => {
            const previousTrip = {
                id: 'test',
                outfits: {
                    1: {
                        id: 'outfit-1',
                        items: {
                            shirt: { id: 'shirt-1', name: 'Test Shirt' }
                        }
                    }
                }
            };
            const currentTrip = {
                id: 'test',
                outfits: {
                    1: {
                        id: 'outfit-1',
                        items: {
                            shirt: { id: 'shirt-1', name: 'Test Shirt' },
                            pants: { id: 'pants-1', name: 'Test Pants' }
                        }
                    }
                }
            };
            expect(hasTransitionedToPopulated(previousTrip, currentTrip)).toBe(false);
        });
    });

    describe('createNewTrip', () => {
        test('creates trip with isNew flag set to true', () => {
            const trip = createNewTrip();
            expect(trip.isNew).toBe(true);
            expect(trip.outfits).toEqual({});
            expect(isNewTrip(trip)).toBe(true);
        });
    });

    describe('updateTrip', () => {
        test('automatically updates isNew flag when trip becomes populated', () => {
            const trip = createNewTrip();
            expect(trip.isNew).toBe(true);

            const updatedTrip = updateTrip(trip, {
                outfits: {
                    1: {
                        id: 'outfit-1',
                        items: {
                            shirt: { id: 'shirt-1', name: 'Test Shirt' }
                        }
                    }
                }
            });

            expect(updatedTrip.isNew).toBe(false);
            expect(isNewTrip(updatedTrip)).toBe(false);
        });
    });

    describe('updateTripWithOutfit', () => {
        test('adds outfit and updates isNew flag', () => {
            const trip = createNewTrip();
            const outfit = {
                id: 'outfit-1',
                items: {
                    shirt: { id: 'shirt-1', name: 'Test Shirt' }
                }
            };

            const updatedTrip = updateTripWithOutfit(trip, 1, outfit);

            expect(updatedTrip.outfits[1]).toEqual(outfit);
            expect(updatedTrip.isNew).toBe(false);
            expect(isNewTrip(updatedTrip)).toBe(false);
        });
    });
});