const { MemoAgent } = require('../Agents/MemoAgent');

describe('MemoAgent', () => {
    let mockCache;
    let mockGenerateMemo;
    let agent;

    beforeEach(() => {
        mockCache = {
            makeMemoKey: jest.fn().mockReturnValue('test-key'),
            get: jest.fn(),
            set: jest.fn()
        };

        mockGenerateMemo = jest.fn().mockReturnValue('Generated Memo Content');

        agent = new MemoAgent({
            generateMemo: mockGenerateMemo,
            cache: mockCache
        });
    });

    test('should return message for empty reviews', () => {
        const result = agent.run([]);
        expect(result).toBe('No reviews to generate memo from.');
    });

    test('should return message for null reviews', () => {
        const result = agent.run(null);
        expect(result).toBe('No reviews to generate memo from.');
    });

    test('should return cached memo if available', () => {
        const cachedMemo = 'Cached Memo Content';
        mockCache.get.mockReturnValue(cachedMemo);

        const reviews = [{ text: 'Great!', rating: 5, issues: ['good'] }];
        const result = agent.run(reviews);

        expect(mockCache.makeMemoKey).toHaveBeenCalledWith(reviews);
        expect(mockCache.get).toHaveBeenCalledWith('test-key');
        expect(result).toBe(cachedMemo);
        expect(mockGenerateMemo).not.toHaveBeenCalled();
    });

    test('should generate and cache new memo if not cached', () => {
        mockCache.get.mockReturnValue(undefined);

        const reviews = [{ text: 'Great!', rating: 5, issues: ['good'] }];
        const result = agent.run(reviews);

        expect(mockGenerateMemo).toHaveBeenCalledWith(reviews);
        expect(mockCache.set).toHaveBeenCalledWith('test-key', 'Generated Memo Content');
        expect(result).toBe('Generated Memo Content');
    });

    test('should use correct cache key based on reviews', () => {
        mockCache.get.mockReturnValue(undefined);

        const reviews = [
            { text: 'Review 1', rating: 5, issues: ['a'] },
            { text: 'Review 2', rating: 3, issues: ['b'] }
        ];

        agent.run(reviews);

        expect(mockCache.makeMemoKey).toHaveBeenCalledWith(reviews);
    });
});
