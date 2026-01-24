const { buildRegressionTree } = require('../tools/regressionEngine');

describe('buildRegressionTree', () => {
    const mockAnalyzedReviews = [
        { date: '2024-01-15', rating: 2, version: '1.0.0', issues: ['login_bug', 'crashes'] },
        { date: '2024-01-20', rating: 1, version: '1.0.0', issues: ['login_bug'] },
        { date: '2024-02-10', rating: 3, version: '1.1.0', issues: ['slow_loading'] },
        { date: '2024-02-15', rating: 2, version: '1.1.0', issues: ['login_bug', 'slow_loading'] },
        { date: '2024-03-01', rating: 4, version: '1.2.0', issues: ['minor_ui_issue'] },
        { date: '2024-03-10', rating: 5, version: '1.2.0', issues: [] }
    ];

    test('should return object with required structure', () => {
        const result = buildRegressionTree(mockAnalyzedReviews);

        expect(result).toHaveProperty('generatedAt');
        expect(result).toHaveProperty('period');
        expect(result).toHaveProperty('issues');
        expect(result).toHaveProperty('summary');
    });

    test('should include period range', () => {
        const result = buildRegressionTree(mockAnalyzedReviews);

        expect(result.period).toHaveProperty('from');
        expect(result.period).toHaveProperty('to');
        expect(result.period.from).toBe('2024-01');
        expect(result.period.to).toBe('2024-03');
    });

    test('should track issue mentions correctly', () => {
        const result = buildRegressionTree(mockAnalyzedReviews);

        expect(result.issues['login_bug']).toBeDefined();
        expect(result.issues['login_bug'].total_mentions).toBe(3);
    });

    test('should calculate severity for issues', () => {
        const result = buildRegressionTree(mockAnalyzedReviews);

        for (const issue of Object.values(result.issues)) {
            expect(issue).toHaveProperty('severity');
            expect(issue.severity).toBeGreaterThanOrEqual(0);
            expect(issue.severity).toBeLessThanOrEqual(1);
        }
    });

    test('should detect issue status (regressing/improving/stable)', () => {
        const result = buildRegressionTree(mockAnalyzedReviews);

        for (const issue of Object.values(result.issues)) {
            expect(['regressing', 'improving', 'stable']).toContain(issue.status);
        }
    });

    test('should include version causality', () => {
        const result = buildRegressionTree(mockAnalyzedReviews);

        expect(result.issues['login_bug'].version_causality).toBeDefined();
        expect(result.issues['login_bug'].version_causality['1.0.0']).toBeDefined();
    });

    test('should provide summary with total unique issues', () => {
        const result = buildRegressionTree(mockAnalyzedReviews);

        expect(result.summary.total_unique_issues).toBeGreaterThan(0);
    });

    test('should handle empty reviews array', () => {
        const result = buildRegressionTree([]);

        expect(result.issues).toEqual({});
        expect(result.summary.total_unique_issues).toBe(0);
    });

    test('should handle reviews with empty issues array', () => {
        const reviews = [
            { date: '2024-01-15', rating: 5, version: '1.0.0', issues: [] }
        ];
        const result = buildRegressionTree(reviews);

        expect(result.issues).toEqual({});
    });
});
