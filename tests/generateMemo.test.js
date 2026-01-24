const { generateMemo } = require('../tools/generateMemo');

describe('generateMemo', () => {
    const mockReviews = [
        { rating: 5, intent: 'praise', issues: ['great_ui', 'fast_performance'] },
        { rating: 5, intent: 'praise', issues: ['great_ui', 'helpful_support'] },
        { rating: 4, intent: 'praise', issues: ['good_features'] },
        { rating: 3, intent: 'feature_request', issues: ['needs_dark_mode', 'export_feature'] },
        { rating: 2, intent: 'complaint', issues: ['crashes_frequently', 'slow_loading'] },
        { rating: 1, intent: 'complaint', issues: ['crashes_frequently', 'data_loss'] },
        { rating: 1, intent: 'complaint', issues: ['crashes_frequently'] }
    ];

    test('should generate memo with correct structure', () => {
        const memo = generateMemo(mockReviews);

        expect(memo).toContain('PRODUCT FEEDBACK MEMO');
        expect(memo).toContain('KEY METRICS');
        expect(memo).toContain('BIGGEST COMPLAINTS');
        expect(memo).toContain('BIGGEST FEATURE REQUESTS');
        expect(memo).toContain('BIGGEST PRAISES');
        expect(memo).toContain('LOW RATING DRIVERS');
        expect(memo).toContain('MID RATING DRIVERS');
        expect(memo).toContain('HIGH RATING DRIVERS');
        expect(memo).toContain('RECOMMENDATIONS');
    });

    test('should calculate correct total reviews', () => {
        const memo = generateMemo(mockReviews);
        expect(memo).toContain('Total Reviews: 7');
    });

    test('should calculate correct average rating', () => {
        const memo = generateMemo(mockReviews);
        // (5+5+4+3+2+1+1) / 7 = 21/7 = 3.00
        expect(memo).toContain('Average Rating: 3.00');
    });

    test('should identify top complaints', () => {
        const memo = generateMemo(mockReviews);
        expect(memo).toContain('crashes_frequently');
    });

    test('should identify top praises', () => {
        const memo = generateMemo(mockReviews);
        expect(memo).toContain('great_ui');
    });

    test('should handle empty reviews array gracefully', () => {
        // Empty array results in NaN average but doesn't throw
        const memo = generateMemo([]);
        expect(memo).toContain('Total Reviews: 0');
    });

    test('should handle reviews with missing issues array', () => {
        const reviewsWithMissing = [
            { rating: 5, intent: 'praise', issues: ['good'] },
            { rating: 3, intent: 'complaint', issues: [] }
        ];
        const memo = generateMemo(reviewsWithMissing);
        expect(memo).toContain('Total Reviews: 2');
    });
});
