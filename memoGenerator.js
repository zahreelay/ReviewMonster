function generateMemo(reviews) {
    const total = reviews.length;
    const recent = reviews.slice(0, 10).map(r => `- (${r.rating}★ v${r.version}) ${r.text}`).join("\n");

    return `
EXECUTIVE SUMMARY
Collected ${total} user reviews from the last 180 days.

REGRESSIONS
Not yet implemented (v1 stateless).

EMERGING ISSUES & REQUESTS
Not yet implemented (v1 stateless).

PERSISTENT PROBLEMS
Not yet implemented (v1 stateless).

NOISE & LOW-IMPACT FEEDBACK
Not yet implemented (v1 stateless).

SUGGESTED PRIORITIES
1. Implement review understanding (sentiment/intent/issues).
2. Add issue grouping to detect top problems.

RECENT RAW FEEDBACK SAMPLE
${recent}
`;
}

module.exports = { generateMemo };
