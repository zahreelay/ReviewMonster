function normalize(list = []) {
    return new Set(list.map(x => x.text.toLowerCase()));
}

module.exports.generateGapAnalysis = function ({ mainApp, competitors }) {
    const gaps = [];

    const mainLiked = normalize(mainApp.liked);
    const mainAsked = normalize(mainApp.askedFor);

    for (const [name, c] of Object.entries(competitors)) {
        const compLiked = normalize(c.liked);
        const compAsked = normalize(c.askedFor);

        // Feature gaps: competitor users like something we don’t have
        for (const item of compLiked) {
            if (!mainLiked.has(item)) {
                gaps.push({
                    type: "feature_gap",
                    competitor: name,
                    signal: item,
                    confidence: "high",
                    reason: "Users praise this in competitor but not in main app"
                });
            }
        }

        // Demand gaps: competitor users ask for something we don’t address
        for (const item of compAsked) {
            if (!mainAsked.has(item)) {
                gaps.push({
                    type: "demand_gap",
                    competitor: name,
                    signal: item,
                    confidence: "medium",
                    reason: "Users request this in competitor reviews"
                });
            }
        }

        // Catch-up gaps: competitor likely shipped something users still ask for in main app
        for (const shipped of c.likelyShipped || []) {
            const s = shipped.toLowerCase();
            if ([...mainAsked].some(x => s.includes(x))) {
                gaps.push({
                    type: "catchup_gap",
                    competitor: name,
                    signal: shipped,
                    confidence: "high",
                    reason: "Competitor shipped this; main app users still request it"
                });
            }
        }
    }

    return gaps;
};
