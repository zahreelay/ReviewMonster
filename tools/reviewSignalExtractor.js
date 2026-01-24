function norm(t) {
    return String(t || "").toLowerCase().trim();
}

function countByIntent(reviews, intentFilter, limit = 5) {
    const freq = {};
    for (const r of reviews) {
        // Filter by intent if specified
        if (intentFilter && r.intent !== intentFilter) continue;

        const arr = Array.isArray(r.issues) ? r.issues : [];
        for (const v of arr) {
            const k = norm(v);
            if (!k) continue;
            freq[k] = (freq[k] || 0) + 1;
        }
    }

    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([text, count]) => ({ text, count }));
}

function detectShipped(reviews, limit = 5) {
    const hits = [];
    for (const r of reviews) {
        const t = norm(r.text);
        if (
            t.includes("after update") ||
            t.includes("finally added") ||
            t.includes("now works") ||
            t.includes("new version") ||
            t.includes("latest update")
        ) {
            hits.push(r.text);
        }
    }
    return hits.slice(0, limit);
}

module.exports.extractSignals = function (analyzed) {
    return {
        liked: countByIntent(analyzed, "praise"),
        disliked: countByIntent(analyzed, "complaint"),
        askedFor: countByIntent(analyzed, "feature_request"),
        likelyShipped: detectShipped(analyzed)
    };
};
