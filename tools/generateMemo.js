function generateMemo(reviews) {
    console.log("Generating memo for", reviews.length, "reviews");
    const total = reviews.length;
    const avg = total > 0 ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2)) : 0;

    const group = (filter) => {
        const m = {};
        reviews.filter(filter).forEach(r =>
            (r.issues || []).forEach(i => m[i] = (m[i] || 0) + 1)
        );
        return Object.entries(m)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([issue, count]) => ({ issue, count }));
    };

    return {
        keyMetrics: {
            totalReviews: total,
            avgRating: avg
        },
        biggestComplaints: group(r => r.intent === "complaint"),
        biggestRequests: group(r => r.intent === "feature_request"),
        biggestPraises: group(r => r.intent === "praise"),
        ratingDrivers: {
            low: group(r => r.rating <= 2),
            mid: group(r => r.rating >= 3 && r.rating <= 4),
            high: group(r => r.rating === 5)
        },
        recommendations: [
            "Prioritize top complaint issues to stabilize ratings",
            "Evaluate most requested features for roadmap inclusion",
            "Reinforce strengths driving high ratings"
        ]
    };
}

module.exports = { generateMemo };
