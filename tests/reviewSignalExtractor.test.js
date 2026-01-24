const { extractSignals } = require('../tools/reviewSignalExtractor');

describe('extractSignals', () => {
    const mockAnalyzedReviews = [
        { intent: 'praise', issues: ['great_ui', 'fast_performance'], text: 'Love this app!' },
        { intent: 'praise', issues: ['great_ui', 'easy_to_use'], text: 'Best app ever' },
        { intent: 'complaint', issues: ['crashes_often', 'slow_loading'], text: 'App keeps crashing' },
        { intent: 'complaint', issues: ['crashes_often'], text: 'Too many bugs after update' },
        { intent: 'feature_request', issues: ['dark_mode', 'export_feature'], text: 'Please add dark mode' },
        { intent: 'feature_request', issues: ['dark_mode'], text: 'Need dark mode badly' }
    ];

    test('should return object with required structure', () => {
        const result = extractSignals(mockAnalyzedReviews);

        expect(result).toHaveProperty('liked');
        expect(result).toHaveProperty('disliked');
        expect(result).toHaveProperty('askedFor');
        expect(result).toHaveProperty('likelyShipped');
    });

    test('should extract liked items from praise intent', () => {
        const result = extractSignals(mockAnalyzedReviews);

        expect(Array.isArray(result.liked)).toBe(true);
        expect(result.liked.length).toBeGreaterThan(0);

        const likedTexts = result.liked.map(item => item.text);
        expect(likedTexts).toContain('great_ui');
    });

    test('should extract disliked items from complaint intent', () => {
        const result = extractSignals(mockAnalyzedReviews);

        expect(Array.isArray(result.disliked)).toBe(true);
        expect(result.disliked.length).toBeGreaterThan(0);

        const dislikedTexts = result.disliked.map(item => item.text);
        expect(dislikedTexts).toContain('crashes_often');
    });

    test('should extract feature requests from feature_request intent', () => {
        const result = extractSignals(mockAnalyzedReviews);

        expect(Array.isArray(result.askedFor)).toBe(true);
        expect(result.askedFor.length).toBeGreaterThan(0);

        const askedForTexts = result.askedFor.map(item => item.text);
        expect(askedForTexts).toContain('dark_mode');
    });

    test('should count occurrences correctly', () => {
        const result = extractSignals(mockAnalyzedReviews);

        const greatUi = result.liked.find(item => item.text === 'great_ui');
        expect(greatUi).toBeDefined();
        expect(greatUi.count).toBe(2);

        const crashesOften = result.disliked.find(item => item.text === 'crashes_often');
        expect(crashesOften).toBeDefined();
        expect(crashesOften.count).toBe(2);

        const darkMode = result.askedFor.find(item => item.text === 'dark_mode');
        expect(darkMode).toBeDefined();
        expect(darkMode.count).toBe(2);
    });

    test('should sort by count descending', () => {
        const result = extractSignals(mockAnalyzedReviews);

        for (const category of [result.liked, result.disliked, result.askedFor]) {
            for (let i = 1; i < category.length; i++) {
                expect(category[i].count).toBeLessThanOrEqual(category[i - 1].count);
            }
        }
    });

    test('should limit results to 5 items', () => {
        const manyReviews = [];
        for (let i = 0; i < 20; i++) {
            manyReviews.push({
                intent: 'praise',
                issues: [`issue_${i}`],
                text: `Review ${i}`
            });
        }

        const result = extractSignals(manyReviews);
        expect(result.liked.length).toBeLessThanOrEqual(5);
    });

    test('should detect likely shipped features', () => {
        const reviewsWithShipped = [
            { intent: 'praise', issues: [], text: 'After the update, everything works great!' },
            { intent: 'praise', issues: [], text: 'The new version fixed all my issues' },
            { intent: 'praise', issues: [], text: 'They finally added dark mode!' }
        ];

        const result = extractSignals(reviewsWithShipped);
        expect(result.likelyShipped.length).toBeGreaterThan(0);
    });

    test('should handle empty reviews array', () => {
        const result = extractSignals([]);

        expect(result.liked).toEqual([]);
        expect(result.disliked).toEqual([]);
        expect(result.askedFor).toEqual([]);
        expect(result.likelyShipped).toEqual([]);
    });

    test('should handle reviews with missing issues array', () => {
        const reviewsWithMissing = [
            { intent: 'praise', text: 'Good app' },
            { intent: 'complaint', issues: ['bug'], text: 'Has bugs' }
        ];

        const result = extractSignals(reviewsWithMissing);
        expect(result.disliked.length).toBe(1);
    });
});
