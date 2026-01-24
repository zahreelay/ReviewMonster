const { ReviewAnalysisAgent } = require('../Agents/ReviewAnalysisAgent');

describe('ReviewAnalysisAgent', () => {
    let mockFetchReviews;
    let mockAnalyzeReview;
    let mockCache;
    let agent;

    beforeEach(() => {
        mockFetchReviews = jest.fn().mockResolvedValue([
            { text: 'Great app!', rating: 5, version: '1.0.0', date: '2024-01-15' },
            { text: 'Has bugs', rating: 2, version: '1.0.0', date: '2024-01-16' }
        ]);

        mockAnalyzeReview = jest.fn().mockResolvedValue(
            JSON.stringify({ intent: 'praise', issues: ['good'], summary: 'Good' })
        );

        mockCache = {
            makeReviewKey: jest.fn().mockImplementation(r => `key-${r.text}`),
            get: jest.fn(),
            set: jest.fn()
        };

        agent = new ReviewAnalysisAgent({
            fetchReviews: mockFetchReviews,
            analyzeReview: mockAnalyzeReview,
            cache: mockCache
        });
    });

    test('should fetch reviews with specified days', async () => {
        await agent.run({ days: 30 });

        expect(mockFetchReviews).toHaveBeenCalledWith(30);
    });

    test('should analyze each review', async () => {
        await agent.run({ days: 7 });

        expect(mockAnalyzeReview).toHaveBeenCalledTimes(2);
    });

    test('should return analyzed reviews with original data merged', async () => {
        mockAnalyzeReview.mockResolvedValue(
            JSON.stringify({ intent: 'complaint', issues: ['bug'], summary: 'Buggy' })
        );

        const results = await agent.run({ days: 7 });

        expect(results.length).toBe(2);
        expect(results[0]).toHaveProperty('text');
        expect(results[0]).toHaveProperty('rating');
        expect(results[0]).toHaveProperty('intent');
        expect(results[0]).toHaveProperty('issues');
    });

    test('should use cached analysis if available', async () => {
        mockCache.get.mockImplementation(key => {
            if (key === 'key-Great app!') {
                return JSON.stringify({ intent: 'praise', issues: ['cached'], summary: 'Cached' });
            }
            return undefined;
        });

        const results = await agent.run({ days: 7 });

        // Only one review should be analyzed
        expect(mockAnalyzeReview).toHaveBeenCalledTimes(1);

        // The cached review should have 'cached' in issues
        const cachedResult = results.find(r => r.text === 'Great app!');
        expect(cachedResult.issues).toContain('cached');
    });

    test('should cache new analyses', async () => {
        mockCache.get.mockReturnValue(undefined);

        await agent.run({ days: 7 });

        expect(mockCache.set).toHaveBeenCalledTimes(2);
    });

    test('should handle empty reviews', async () => {
        mockFetchReviews.mockResolvedValue([]);

        const results = await agent.run({ days: 7 });

        expect(results).toEqual([]);
        expect(mockAnalyzeReview).not.toHaveBeenCalled();
    });

    test('should generate correct cache key for each review', async () => {
        await agent.run({ days: 7 });

        expect(mockCache.makeReviewKey).toHaveBeenCalledTimes(2);
        expect(mockCache.makeReviewKey).toHaveBeenCalledWith(
            expect.objectContaining({ text: 'Great app!' })
        );
        expect(mockCache.makeReviewKey).toHaveBeenCalledWith(
            expect.objectContaining({ text: 'Has bugs' })
        );
    });
});
