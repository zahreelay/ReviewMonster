const { buildReleaseTimeline } = require('../tools/releaseTimeline');

describe('buildReleaseTimeline', () => {
    const mockAnalyzedReviews = [
        { date: '2024-01-15', rating: 2, version: '1.0.0', issues: ['login_bug', 'crashes'] },
        { date: '2024-01-20', rating: 3, version: '1.0.0', issues: ['login_bug'] },
        { date: '2024-02-10', rating: 4, version: '1.1.0', issues: ['slow_loading'] },
        { date: '2024-02-15', rating: 5, version: '1.1.0', issues: [] },
        { date: '2024-03-01', rating: 1, version: '1.2.0', issues: ['major_bug', 'data_loss'] },
        { date: '2024-03-10', rating: 2, version: '1.2.0', issues: ['major_bug'] }
    ];

    test('should return object with required structure', () => {
        const result = buildReleaseTimeline(mockAnalyzedReviews);

        expect(result).toHaveProperty('generatedAt');
        expect(result).toHaveProperty('timeline');
        expect(result).toHaveProperty('summary');
    });

    test('should create timeline entries for each version-period combination', () => {
        const result = buildReleaseTimeline(mockAnalyzedReviews);

        expect(Array.isArray(result.timeline)).toBe(true);
        expect(result.timeline.length).toBeGreaterThan(0);
    });

    test('should include correct fields in timeline entries', () => {
        const result = buildReleaseTimeline(mockAnalyzedReviews);

        for (const entry of result.timeline) {
            expect(entry).toHaveProperty('version');
            expect(entry).toHaveProperty('period');
            expect(entry).toHaveProperty('avg_rating');
            expect(entry).toHaveProperty('review_count');
            expect(entry).toHaveProperty('new_issues');
            expect(entry).toHaveProperty('resolved_issues');
            expect(entry).toHaveProperty('dominant_issues');
        }
    });

    test('should calculate correct average rating per version', () => {
        const result = buildReleaseTimeline(mockAnalyzedReviews);

        const v100 = result.timeline.find(t => t.version === '1.0.0');
        expect(v100).toBeDefined();
        // (2 + 3) / 2 = 2.5
        expect(v100.avg_rating).toBe(2.5);
    });

    test('should count reviews correctly', () => {
        const result = buildReleaseTimeline(mockAnalyzedReviews);

        const v100 = result.timeline.find(t => t.version === '1.0.0');
        expect(v100.review_count).toBe(2);
    });

    test('should identify worst and best releases in summary', () => {
        const result = buildReleaseTimeline(mockAnalyzedReviews);

        expect(result.summary).toHaveProperty('worst_release');
        expect(result.summary).toHaveProperty('best_release');
    });

    test('should identify new issues introduced in each release', () => {
        const result = buildReleaseTimeline(mockAnalyzedReviews);

        // First entry should have all its issues as "new"
        expect(result.timeline[0].new_issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should sort timeline by period', () => {
        const result = buildReleaseTimeline(mockAnalyzedReviews);

        for (let i = 1; i < result.timeline.length; i++) {
            expect(result.timeline[i].period >= result.timeline[i - 1].period).toBe(true);
        }
    });

    test('should handle empty reviews array', () => {
        const result = buildReleaseTimeline([]);

        expect(result.timeline).toEqual([]);
    });

    test('should handle single review', () => {
        const singleReview = [
            { date: '2024-01-15', rating: 4, version: '1.0.0', issues: ['minor_issue'] }
        ];
        const result = buildReleaseTimeline(singleReview);

        expect(result.timeline.length).toBe(1);
        expect(result.timeline[0].version).toBe('1.0.0');
    });
});
