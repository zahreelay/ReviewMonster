function generateMemo(reviews) {
    console.log("Generating memo for", reviews.length, "reviews");
    const total = reviews.length;
    const avg = (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2);

    const group = (filter) => {
        const m = {};
        reviews.filter(filter).forEach(r =>
            r.issues.forEach(i => m[i] = (m[i] || 0) + 1)
        );
        return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3);
    };

    const fmt = arr => arr.length ? arr.map(([k, v]) => `• ${k} (${v})`).join("\n") : "• No strong signal";
    return `
PRODUCT FEEDBACK MEMO

KEY METRICS
• Total Reviews: ${total}
• Average Rating: ${avg}

BIGGEST COMPLAINTS
${fmt(group(r => r.intent === "complaint"))}

BIGGEST FEATURE REQUESTS
${fmt(group(r => r.intent === "feature_request"))}

BIGGEST PRAISES
${fmt(group(r => r.intent === "praise"))}

LOW RATING DRIVERS (1–2★)
${fmt(group(r => r.rating <= 2))}

MID RATING DRIVERS (3–4★)
${fmt(group(r => r.rating >= 3 && r.rating <= 4))}

HIGH RATING DRIVERS (5★)
${fmt(group(r => r.rating === 5))}

RECOMMENDATIONS
1. Prioritize top complaint issues to stabilize ratings.
2. Evaluate most requested features for roadmap inclusion.
3. Reinforce strengths driving high ratings.
`.trim();
}

module.exports = { generateMemo };
