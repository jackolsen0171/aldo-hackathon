// Quick test for outfit planning extraction
import bedrockService from './src/services/bedrockService.js';

async function testOutfitExtraction() {
    console.log('Testing outfit planning extraction...\n');

    const testCases = [
        "3-day conference in NYC next week, need professional outfits",
        "wedding this Saturday in Chicago, formal dress required",
        "job interview tomorrow, business attire needed",
        "vacation in Miami for 5 days starting Monday, casual beachwear"
    ];

    for (const testCase of testCases) {
        console.log(`Input: "${testCase}"`);
        try {
            const result = await bedrockService.processOutfitRequest(testCase);
            if (result.success) {
                console.log('Extracted data:', JSON.stringify(result.data.eventContext, null, 2));
                console.log('Summary:', result.data.response);
            } else {
                console.log('Error:', result.error.message);
            }
        } catch (error) {
            console.log('Test error:', error.message);
        }
        console.log('---\n');
    }
}

// Uncomment to run test
// testOutfitExtraction();