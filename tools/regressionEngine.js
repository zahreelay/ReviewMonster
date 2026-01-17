function monthKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildIssueMap(analyzedReviews) {
    const issues = {};
    console.log("Building issue map for", analyzedReviews);
    for (const r of analyzedReviews) {
        const period = monthKey(r.date);

        for (const issue of r.issues) {
            if (!issues[issue]) {
                issues[issue] = {
                    mentions: 0,
                    periods: {},
                    versions: {}
                };
            }

            issues[issue].mentions++;

            if (!issues[issue].periods[period]) {
                issues[issue].periods[period] = { count: 0, ratings: [], versions: new Set() };
            }

            issues[issue].periods[period].count++;
            issues[issue].periods[period].ratings.push(r.rating);
            issues[issue].periods[period].versions.add(r.version);

            if (!issues[issue].versions[r.version]) {
                issues[issue].versions[r.version] = { mentions: 0, ratings: [] };
            }

            issues[issue].versions[r.version].mentions++;
            issues[issue].versions[r.version].ratings.push(r.rating);
        }
    }

    return issues;
}

function avg(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeTimeline(issueData) {
    return Object.entries(issueData.periods).map(([period, data]) => ({
        period,
        count: data.count,
        avg_rating: avg(data.ratings),
        versions: Array.from(data.versions)
    })).sort((a, b) => a.period.localeCompare(b.period));
}

function detectTrend(timeline) {
    if (timeline.length < 3) return "stable";
    const last = timeline.slice(-3);
    if (last[2].count > last[1].count && last[1].count > last[0].count) return "regressing";
    if (last[2].count < last[1].count && last[1].count < last[0].count) return "improving";
    return "stable";
}

function findSpikes(timeline) {
    const spikes = [];
    for (let i = 1; i < timeline.length; i++) {
        const diff = timeline[i].count - timeline[i - 1].count;
        if (diff >= 5) {
            spikes.push({
                period: timeline[i].period,
                increase: diff,
                likely_trigger_versions: timeline[i].versions
            });
        }
    }
    return spikes;
}

function computeVersionCausality(versionData) {
    const out = {};
    for (const [v, d] of Object.entries(versionData)) {
        out[v] = {
            mentions: d.mentions,
            avg_rating: avg(d.ratings)
        };
    }
    return out;
}

function computeRatingImpact(timeline) {
    const baseline = avg(timeline[0].count ? [timeline[0].avg_rating] : [5]);
    const latest = timeline[timeline.length - 1].avg_rating;
    return +(latest - baseline).toFixed(2);
}

function normalizeSeverity(x, max) {
    return +(x / max).toFixed(2);
}

function buildRegressionTree(analyzedReviews) {
    const issueMap = buildIssueMap(analyzedReviews);
    const tree = {};
    let maxSeverityRaw = 0;

    for (const [issue, data] of Object.entries(issueMap)) {
        const timeline = computeTimeline(data);
        const status = detectTrend(timeline);
        const spikes = findSpikes(timeline);
        const versionCausality = computeVersionCausality(data.versions);
        const ratingImpact = computeRatingImpact(timeline);

        const severityRaw = data.mentions * Math.abs(ratingImpact) * (status === "regressing" ? 1.5 : 1);
        maxSeverityRaw = Math.max(maxSeverityRaw, severityRaw);

        tree[issue] = {
            first_seen: timeline[0].period,
            last_seen: timeline[timeline.length - 1].period,
            status,
            total_mentions: data.mentions,
            rating_impact: ratingImpact,
            timeline,
            spikes,
            version_causality: versionCausality,
            _severityRaw: severityRaw
        };
    }

    for (const issue of Object.keys(tree)) {
        tree[issue].severity = normalizeSeverity(tree[issue]._severityRaw, maxSeverityRaw);
        delete tree[issue]._severityRaw;
    }

    const periods = analyzedReviews.map(r => monthKey(r.date)).sort();
    const periodRange = { from: periods[0], to: periods[periods.length - 1] };

    const issuesArr = Object.entries(tree);
    const topRegressions = issuesArr
        .filter(([_, i]) => i.status === "regressing")
        .sort((a, b) => b[1].severity - a[1].severity)
        .slice(0, 3)
        .map(([k]) => k);

    return {
        generatedAt: new Date().toISOString(),
        period: periodRange,
        issues: tree,
        summary: {
            total_unique_issues: issuesArr.length,
            top_regressions: topRegressions
        }
    };
}

module.exports = { buildRegressionTree };
