function generateMemo(reviews, ratingHistory = [], metadata = {}) {
    console.log("Generating memo for", reviews.length, "reviews");
    const total = reviews.length;
    const avg = total > 0 ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2)) : 0;

    // Group issues by type and get counts with sample reviews
    const groupWithSamples = (filter, limit = 5) => {
        const m = {};
        const samples = {};
        reviews.filter(filter).forEach(r => {
            (r.issues || []).forEach(i => {
                m[i] = (m[i] || 0) + 1;
                if (!samples[i]) samples[i] = [];
                if (samples[i].length < 2) {
                    samples[i].push({
                        text: r.text?.slice(0, 150) + (r.text?.length > 150 ? "..." : ""),
                        rating: r.rating,
                        date: r.date
                    });
                }
            });
        });
        return Object.entries(m)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([issue, count]) => ({
                issue,
                count,
                samples: samples[issue] || []
            }));
    };

    // Calculate rating change over last 3 months
    let ratingChange = null;
    if (ratingHistory && ratingHistory.length >= 3) {
        const recent = ratingHistory.slice(-1)[0];
        const threeMonthsAgo = ratingHistory.slice(-4, -1);
        if (threeMonthsAgo.length > 0) {
            const earlierAvg = threeMonthsAgo.reduce((s, r) => s + r.avgRating, 0) / threeMonthsAgo.length;
            ratingChange = {
                current: recent.avgRating,
                previous: parseFloat(earlierAvg.toFixed(2)),
                change: parseFloat((recent.avgRating - earlierAvg).toFixed(2)),
                trend: recent.avgRating > earlierAvg ? "up" : recent.avgRating < earlierAvg ? "down" : "stable"
            };
        }
    }

    // Get top items
    const complaints = groupWithSamples(r => r.intent === "complaint", 5);
    const requests = groupWithSamples(r => r.intent === "feature_request", 5);
    const praises = groupWithSamples(r => r.intent === "praise", 5);

    // Build alerts
    const alerts = [];
    if (ratingChange && ratingChange.change < -0.3) {
        alerts.push({
            type: "rating_drop",
            severity: "high",
            message: `Rating dropped ${Math.abs(ratingChange.change).toFixed(1)} stars in the last 3 months`
        });
    }
    if (complaints.length > 0 && complaints[0].count >= 20) {
        alerts.push({
            type: "critical_issue",
            severity: "high",
            message: `"${complaints[0].issue}" reported ${complaints[0].count} times`
        });
    }
    const lowRatingReviews = reviews.filter(r => r.rating <= 2);
    if (lowRatingReviews.length / total > 0.3) {
        alerts.push({
            type: "negative_sentiment",
            severity: "medium",
            message: `${Math.round((lowRatingReviews.length / total) * 100)}% of reviews are 1-2 stars`
        });
    }

    // Build recommendations based on data
    const recommendations = [];
    if (complaints.length > 0) {
        recommendations.push(`Fix "${complaints[0].issue}" - top complaint with ${complaints[0].count} reports`);
    }
    if (requests.length > 0) {
        recommendations.push(`Consider adding "${requests[0].issue}" - most requested feature (${requests[0].count} requests)`);
    }
    if (praises.length > 0) {
        recommendations.push(`Maintain "${praises[0].issue}" - key strength driving positive reviews`);
    }
    if (ratingChange && ratingChange.change < 0) {
        recommendations.push("Investigate recent rating decline and address root causes");
    }

    // Generate text summary
    const appName = metadata.name || "This app";
    const topComplaint = complaints[0]?.issue || "no major complaints";
    const topPraise = praises[0]?.issue || "general satisfaction";
    const topRequest = requests[0]?.issue || "no specific requests";

    const summary = `${appName} has an average rating of ${avg} stars based on ${total} reviews analyzed. ` +
        `Users most frequently complain about "${topComplaint}" while praising "${topPraise}". ` +
        `The most requested feature is "${topRequest}". ` +
        (ratingChange ? `Over the last 3 months, the rating has ${ratingChange.trend === "down" ? "dropped" : ratingChange.trend === "up" ? "improved" : "remained stable"} by ${Math.abs(ratingChange.change).toFixed(1)} stars. ` : "") +
        (alerts.length > 0 ? `There ${alerts.length === 1 ? "is" : "are"} ${alerts.length} alert${alerts.length > 1 ? "s" : ""} requiring attention.` : "No critical alerts at this time.");

    return {
        summary,
        alerts,
        complaints,
        requests,
        praises,
        ratingChange,
        recommendations
    };
}

module.exports = { generateMemo };
