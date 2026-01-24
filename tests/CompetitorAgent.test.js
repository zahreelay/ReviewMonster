const fs = require('fs');

// Mock fs module
jest.mock('fs');

const { CompetitorAgent } = require('../Agents/CompetitorAgent');

describe('CompetitorAgent', () => {
    let mockAnalyzeReview;
    let mockFetchReviews;
    let mockCache;
    let agent;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAnalyzeReview = jest.fn().mockResolvedValue(
            JSON.stringify({ intent: 'complaint', issues: ['bug'], summary: 'Has bugs' })
        );

        mockFetchReviews = jest.fn().mockResolvedValue([]);

        mockCache = {
            get: jest.fn(),
            set: jest.fn()
        };

        fs.existsSync.mockReturnValue(true);
        fs.writeFileSync.mockImplementation(() => {});

        agent = new CompetitorAgent({
            analyzeReview: mockAnalyzeReview,
            fetchReviews: mockFetchReviews,
            cache: mockCache
        });
    });

    test('should throw error if analyzeReview not provided', () => {
        expect(() => new CompetitorAgent({})).toThrow('CompetitorAgent requires analyzeReview');
    });

    test('should create agent with required tools', () => {
        expect(agent).toBeDefined();
        expect(agent.analyzeReview).toBe(mockAnalyzeReview);
    });

    describe('compare', () => {
        const mockDataset = {
            mainApp: {
                appId: '123',
                name: 'MainApp',
                analyzed: [
                    { intent: 'praise', issues: ['great_feature'] },
                    { intent: 'praise', issues: ['fast_performance'] }
                ]
            },
            competitors: {
                '456': {
                    appId: '456',
                    name: 'CompetitorA',
                    analyzed: [
                        { intent: 'praise', issues: ['good_ui'] },
                        { intent: 'complaint', issues: ['crashes', 'slow'] },
                        { intent: 'complaint', issues: ['crashes'] },
                        { intent: 'feature_request', issues: ['dark_mode'] }
                    ]
                },
                '789': {
                    appId: '789',
                    name: 'CompetitorB',
                    analyzed: [
                        { intent: 'praise', issues: ['simple'] },
                        { intent: 'complaint', issues: ['limited_features'] }
                    ]
                }
            }
        };

        test('should return SWOT for each competitor', () => {
            const result = agent.compare(mockDataset);

            expect(result).toHaveProperty('CompetitorA');
            expect(result).toHaveProperty('CompetitorB');
        });

        test('should include strengths, weaknesses, opportunities, threats', () => {
            const result = agent.compare(mockDataset);

            for (const name of Object.keys(result)) {
                expect(result[name]).toHaveProperty('strengths');
                expect(result[name]).toHaveProperty('weaknesses');
                expect(result[name]).toHaveProperty('opportunities');
                expect(result[name]).toHaveProperty('threats');
            }
        });

        test('should extract strengths from praise intent', () => {
            const result = agent.compare(mockDataset);

            const strengths = result['CompetitorA'].strengths;
            expect(strengths.length).toBeGreaterThan(0);
            expect(strengths[0]).toHaveProperty('text');
            expect(strengths[0]).toHaveProperty('count');
        });

        test('should extract weaknesses from complaint intent', () => {
            const result = agent.compare(mockDataset);

            const weaknesses = result['CompetitorA'].weaknesses;
            expect(weaknesses.length).toBeGreaterThan(0);

            const crashesWeakness = weaknesses.find(w => w.text === 'crashes');
            expect(crashesWeakness).toBeDefined();
            expect(crashesWeakness.count).toBe(2);
        });

        test('should extract opportunities from feature_request intent', () => {
            const result = agent.compare(mockDataset);

            const opportunities = result['CompetitorA'].opportunities;
            expect(opportunities.length).toBeGreaterThan(0);

            const darkMode = opportunities.find(o => o.text === 'dark_mode');
            expect(darkMode).toBeDefined();
        });

        test('should extract threats from main app praises', () => {
            const result = agent.compare(mockDataset);

            const threats = result['CompetitorA'].threats;
            expect(threats.length).toBeGreaterThan(0);
        });

        test('should write SWOT to file', () => {
            agent.compare(mockDataset);

            expect(fs.writeFileSync).toHaveBeenCalled();
            const [filePath, content] = fs.writeFileSync.mock.calls[0];
            expect(filePath).toContain('competitive_swot.json');

            const written = JSON.parse(content);
            expect(written).toHaveProperty('CompetitorA');
        });

        test('should handle empty analyzed arrays', () => {
            const emptyDataset = {
                mainApp: { appId: '123', name: 'Main', analyzed: [] },
                competitors: {
                    '456': { appId: '456', name: 'Comp', analyzed: [] }
                }
            };

            const result = agent.compare(emptyDataset);

            expect(result['Comp'].strengths).toEqual([]);
            expect(result['Comp'].weaknesses).toEqual([]);
        });
    });
});
