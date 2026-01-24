const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');

const cache = require('../tools/cache');

describe('cache', () => {
    const mockCacheData = {};

    beforeEach(() => {
        // Reset mock
        jest.clearAllMocks();

        // Mock file existence check
        fs.existsSync.mockReturnValue(true);

        // Mock read/write
        fs.readFileSync.mockImplementation(() => JSON.stringify(mockCacheData));
        fs.writeFileSync.mockImplementation(() => {});
    });

    describe('makeReviewKey', () => {
        test('should generate consistent hash for same review', () => {
            const review = { text: 'Great app!', rating: 5, version: '1.0.0' };

            const key1 = cache.makeReviewKey(review);
            const key2 = cache.makeReviewKey(review);

            expect(key1).toBe(key2);
        });

        test('should generate different hash for different reviews', () => {
            const review1 = { text: 'Great app!', rating: 5, version: '1.0.0' };
            const review2 = { text: 'Bad app!', rating: 1, version: '1.0.0' };

            const key1 = cache.makeReviewKey(review1);
            const key2 = cache.makeReviewKey(review2);

            expect(key1).not.toBe(key2);
        });

        test('should generate 64 character hex string (SHA-256)', () => {
            const review = { text: 'Test', rating: 3, version: '1.0.0' };
            const key = cache.makeReviewKey(review);

            expect(key).toMatch(/^[a-f0-9]{64}$/);
        });

        test('should handle missing fields gracefully', () => {
            const review = { text: 'Test' };
            expect(() => cache.makeReviewKey(review)).not.toThrow();
        });
    });

    describe('makeMemoKey', () => {
        test('should generate consistent hash for same analyzed reviews', () => {
            const reviews = [
                { text: 'Great!', title: 'Love it', rating: 5, issues: ['good_ui'] },
                { text: 'Bad!', title: 'Hate it', rating: 1, issues: ['crashes'] }
            ];

            const key1 = cache.makeMemoKey(reviews);
            const key2 = cache.makeMemoKey(reviews);

            expect(key1).toBe(key2);
        });

        test('should generate different hash for different reviews', () => {
            const reviews1 = [
                { text: 'Great!', title: 'Love it', rating: 5, issues: ['good_ui'] }
            ];
            const reviews2 = [
                { text: 'Bad!', title: 'Hate it', rating: 1, issues: ['crashes'] }
            ];

            const key1 = cache.makeMemoKey(reviews1);
            const key2 = cache.makeMemoKey(reviews2);

            expect(key1).not.toBe(key2);
        });

        test('should generate 64 character hex string (SHA-256)', () => {
            const reviews = [{ text: 'Test', title: 'T', rating: 3, issues: [] }];
            const key = cache.makeMemoKey(reviews);

            expect(key).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('get', () => {
        test('should return cached value if exists', () => {
            const testData = { testKey: 'testValue' };
            fs.readFileSync.mockReturnValue(JSON.stringify(testData));

            const result = cache.get('testKey');
            expect(result).toBe('testValue');
        });

        test('should return undefined for non-existent key', () => {
            fs.readFileSync.mockReturnValue(JSON.stringify({}));

            const result = cache.get('nonExistentKey');
            expect(result).toBeUndefined();
        });
    });

    describe('set', () => {
        test('should write value to cache', () => {
            fs.readFileSync.mockReturnValue(JSON.stringify({}));

            cache.set('newKey', 'newValue');

            expect(fs.writeFileSync).toHaveBeenCalled();
            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            expect(writtenData.newKey).toBe('newValue');
        });

        test('should preserve existing cache entries', () => {
            fs.readFileSync.mockReturnValue(JSON.stringify({ existingKey: 'existingValue' }));

            cache.set('newKey', 'newValue');

            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            expect(writtenData.existingKey).toBe('existingValue');
            expect(writtenData.newKey).toBe('newValue');
        });
    });
});
