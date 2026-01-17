function avgRating(reviews) {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((a, b) => a + (b.rating || 0), 0);
    return Number((sum / reviews.length).toFixed(2));
}

function sentimentStats(analyzed) {
    const stats = { positive: 0, neutral: 0, negative: 0 };
    for (const r of analyzed) {
        if (stats[r.sentiment] !== undefined) {
            stats[r.sentiment]++;
        }
    }
    return stats;
}

module.exports.analyzeAppReviews = function ({ reviews, analyzed }) {
    return {
        rating: avgRating(reviews),
        sentiment: sentimentStats(analyzed)
    };
};
