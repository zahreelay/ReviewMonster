const { buildImpactModel } = require('../tools/impactModel');

describe('buildImpactModel', () => {
    const mockRegressionTree = {
        generatedAt: '2024-03-15T00:00:00.000Z',
        period: { from: '2024-01', to: '2024-03' },
        issues: {
            'login_bug': {
                severity: 0.9,
                rating_impact: -1.5,
                status: 'regressing',
                version_causality: { '1.0.0': { mentions: 5 }, '1.1.0': { mentions: 3 } }
            },
            'slow_loading': {
                severity: 0.5,
                rating_impact: -0.8,
                status: 'stable',
                version_causality: { '1.1.0': { mentions: 2 } }
            },
            'minor_ui': {
                severity: 0.2,
                rating_impact: -0.2,
                status: 'improving',
                version_causality: { '1.0.0': { mentions: 1 } }
            }
        },
        summary: { total_unique_issues: 3 }
    };

    const mockReleaseTimeline = {
        generatedAt: '2024-03-15T00:00:00.000Z',
        timeline: [],
        summary: { worst_release: '1.0.0', best_release: '1.2.0' }
    };

    test('should return object with required structure', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        expect(result).toHaveProperty('generatedAt');
        expect(result).toHaveProperty('priorities');
        expect(result).toHaveProperty('summary');
    });

    test('should return priorities as array', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        expect(Array.isArray(result.priorities)).toBe(true);
    });

    test('should include required fields in each priority item', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        for (const priority of result.priorities) {
            expect(priority).toHaveProperty('issue');
            expect(priority).toHaveProperty('severity');
            expect(priority).toHaveProperty('rating_impact');
            expect(priority).toHaveProperty('trend');
            expect(priority).toHaveProperty('affected_versions');
            expect(priority).toHaveProperty('priority_score');
            expect(priority).toHaveProperty('estimated_lift_if_fixed');
            expect(priority).toHaveProperty('confidence');
            expect(priority).toHaveProperty('recommendation');
        }
    });

    test('should sort priorities by priority_score descending', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        for (let i = 1; i < result.priorities.length; i++) {
            expect(result.priorities[i].priority_score)
                .toBeLessThanOrEqual(result.priorities[i - 1].priority_score);
        }
    });

    test('should normalize priority scores between 0 and 1', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        for (const priority of result.priorities) {
            expect(priority.priority_score).toBeGreaterThanOrEqual(0);
            expect(priority.priority_score).toBeLessThanOrEqual(1);
        }
    });

    test('should provide appropriate recommendations based on priority', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        const highPriority = result.priorities.find(p => p.priority_score > 0.8);
        if (highPriority) {
            expect(highPriority.recommendation).toContain('Critical');
        }
    });

    test('should identify top priority in summary', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        expect(result.summary).toHaveProperty('top_priority');
        expect(result.summary.top_priority).toBe(result.priorities[0]?.issue);
    });

    test('should identify high risk issues', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        expect(result.summary).toHaveProperty('high_risk_issues');
        expect(Array.isArray(result.summary.high_risk_issues)).toBe(true);
    });

    test('should identify quick wins', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        expect(result.summary).toHaveProperty('quick_wins');
        expect(Array.isArray(result.summary.quick_wins)).toBe(true);
    });

    test('should calculate expected rating lift', () => {
        const result = buildImpactModel(mockRegressionTree, mockReleaseTimeline);

        expect(result.summary).toHaveProperty('expected_rating_lift');
        expect(typeof result.summary.expected_rating_lift).toBe('number');
    });

    test('should handle empty issues object', () => {
        const emptyTree = { ...mockRegressionTree, issues: {} };
        const result = buildImpactModel(emptyTree, mockReleaseTimeline);

        expect(result.priorities).toEqual([]);
        expect(result.summary.top_priority).toBeUndefined();
    });
});
