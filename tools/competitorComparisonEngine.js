function summarizeTexts(list, key) {
    const map = {};
    for (const r of list) {
        const items = Array.isArray(r[key]) ? r[key] : [];
        for (const i of items) {
            map[i] = (map[i] || 0) + 1;
        }
    }
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([text, count]) => ({ text, count }));
}

function sentimentStats(list) {
    const stats = { positive: 0, neutral: 0, negative: 0 };
    for (const r of list) {
        const s = r.sentiment || "neutral";
        if (stats[s] !== undefined) stats[s]++;
    }
    return stats;
}

function avgRating(list) {
    if (!list.length) return 0;
    const sum = list.reduce((a, b) => a + (b.rating || 0), 0);
    return Number((sum / list.length).toFixed(2));
}

module.exports.compareProducts = function (ourIntel, competitorIntel) {
    const result = {};

    for (const id in competitorIntel) {
        const data = competitorIntel[id];

        result[id] = {
            name: data.name,
            reviewCount: data.reviews.length,
            rating: avgRating(data.reviews),
            sentiment: sentimentStats(data.analyzed),
            liked: summarizeTexts(data.analyzed, "praise"),
            disliked: summarizeTexts(data.analyzed, "issues"),
            requested: summarizeTexts(data.analyzed, "requests")
        };
    }

    return result;
};
