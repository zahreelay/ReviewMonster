function monthKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function avg(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildReleaseTimeline(analyzedReviews) {
    const groups = {};

    for (const r of analyzedReviews) {
        const period = monthKey(r.date);
        const key = `${r.version}::${period}`;

        if (!groups[key]) {
            groups[key] = {
                version: r.version,
                period,
                ratings: [],
                issues: {}
            };
        }

        groups[key].ratings.push(r.rating);

        for (const issue of r.issues) {
            groups[key].issues[issue] = (groups[key].issues[issue] || 0) + 1;
        }
    }

    const entries = Object.values(groups).map(g => {
        const sortedIssues = Object.entries(g.issues).sort((a, b) => b[1] - a[1]);
        return {
            version: g.version,
            period: g.period,
            avg_rating: avg(g.ratings),
            review_count: g.ratings.length,
            issues: sortedIssues.map(i => i[0])
        };
    }).sort((a, b) => a.period.localeCompare(b.period));

    const timeline = [];

    for (let i = 0; i < entries.length; i++) {
        const curr = entries[i];
        const prev = entries[i - 1];

        const currIssues = new Set(curr.issues);
        const prevIssues = prev ? new Set(prev.issues) : new Set();

        const newIssues = [...currIssues].filter(x => !prevIssues.has(x));
        const resolvedIssues = prev ? [...prevIssues].filter(x => !currIssues.has(x)) : [];

        const regressions = prev && curr.avg_rating < prev.avg_rating
            ? newIssues
            : [];

        const dominant_issues = curr.issues.slice(0, 3);

        const notes = regressions.length
            ? `Rating dropped from ${prev.avg_rating.toFixed(1)} to ${curr.avg_rating.toFixed(1)} with new issues: ${regressions.join(", ")}`
            : "";

        timeline.push({
            version: curr.version,
            period: curr.period,
            avg_rating: +curr.avg_rating.toFixed(2),
            review_count: curr.review_count,
            new_issues: newIssues,
            resolved_issues: resolvedIssues,
            dominant_issues,
            regressions,
            notes
        });
    }

    const worst = [...timeline].sort((a, b) => a.avg_rating - b.avg_rating)[0];
    const best = [...timeline].sort((a, b) => b.avg_rating - a.avg_rating)[0];

    const regressionCounts = {};
    for (const t of timeline) {
        for (const r of t.regressions) {
            regressionCounts[r] = (regressionCounts[r] || 0) + 1;
        }
    }

    const mostCommonRegression = Object.entries(regressionCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
        generatedAt: new Date().toISOString(),
        timeline,
        summary: {
            worst_release: worst?.version,
            best_release: best?.version,
            most_common_regression_trigger: mostCommonRegression
        }
    };
}

module.exports = { buildReleaseTimeline };
