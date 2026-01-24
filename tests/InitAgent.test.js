const { InitAgent } = require('../Agents/InitAgent');

describe('InitAgent', () => {
    let mockScraper;
    let mockRawStore;
    let mockAnalyzeReview;
    let mockCache;
    let agent;

    beforeEach(() => {
        mockScraper = {
            scrapeLastYear: jest.fn().mockResolvedValue([
                { text: 'Great app!', rating: 5, version: '1.0.0', date: '2024-01-15' },
                { text: 'Has bugs', rating: 2, version: '1.0.0', date: '2024-01-16' }
            ])
        };

        mockRawStore = {
            getReviews: jest.fn().mockReturnValue([]),
            saveReviews: jest.fn()
        };

        mockAnalyzeReview = jest.fn().mockResolvedValue(
            JSON.stringify({ intent: 'praise', issues: ['good'], summary: 'Good app' })
        );

        mockCache = {
            makeReviewKey: jest.fn().mockImplementation(r => `key-${r.text}`),
            get: jest.fn(),
            set: jest.fn()
        };

        agent = new InitAgent({
            scraper: mockScraper,
            rawStore: mockRawStore,
            analyzeReview: mockAnalyzeReview,
            cache: mockCache
        });
    });

    test('should return no_data status when store is empty and refresh is false', async () => {
        mockRawStore.getReviews.mockReturnValue([]);

        const result = await agent.run({ refresh: false });

        expect(result.status).toBe('no_data');
        expect(result.message).toContain('refresh=true');
    });

    test('should scrape and save reviews when refresh is true', async () => {
        const result = await agent.run({ refresh: true });

        expect(mockScraper.scrapeLastYear).toHaveBeenCalled();
        expect(mockRawStore.saveReviews).toHaveBeenCalled();
        expect(result.status).toBe('ok');
    });

    test('should analyze reviews and return count', async () => {
        const result = await agent.run({ refresh: true });

        expect(mockAnalyzeReview).toHaveBeenCalledTimes(2);
        expect(result.totalRawReviews).toBe(2);
        expect(result.totalAnalyzed).toBe(2);
    });

    test('should use cached analysis if available', async () => {
        mockCache.get.mockImplementation(key => {
            if (key === 'key-Great app!') {
                return JSON.stringify({ intent: 'praise', issues: ['cached'], summary: 'Cached' });
            }
            return undefined;
        });

        await agent.run({ refresh: true });

        // Only one review should be analyzed (the one not in cache)
        expect(mockAnalyzeReview).toHaveBeenCalledTimes(1);
    });

    test('should cache new analyses', async () => {
        mockCache.get.mockReturnValue(undefined);

        await agent.run({ refresh: true });

        expect(mockCache.set).toHaveBeenCalledTimes(2);
    });

    test('should include updatedAt timestamp in result', async () => {
        const result = await agent.run({ refresh: true });

        expect(result.updatedAt).toBeDefined();
        expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
    });

    test('should use existing reviews when refresh is false and store has data', async () => {
        mockRawStore.getReviews.mockReturnValue([
            { text: 'Existing review', rating: 4, version: '1.0.0', date: '2024-01-10' }
        ]);

        const result = await agent.run({ refresh: false });

        expect(mockScraper.scrapeLastYear).not.toHaveBeenCalled();
        expect(result.status).toBe('ok');
        expect(result.totalRawReviews).toBe(1);
    });

    test('should default refresh to false', async () => {
        mockRawStore.getReviews.mockReturnValue([
            { text: 'Review', rating: 5, version: '1.0.0', date: '2024-01-10' }
        ]);

        await agent.run({});

        expect(mockScraper.scrapeLastYear).not.toHaveBeenCalled();
    });
});
