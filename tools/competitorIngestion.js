const fs = require("fs");

const DEFAULT_COUNTRY = "us";

function normalize(entry) {
    return {
        title: entry.title?.label || "",
        text: entry.content?.label || "",
        rating: Number(entry["im:rating"]?.label || 0),
        version: entry["im:version"]?.label || "unknown",
        date: entry.updated?.label || "",
        author: entry.author?.name?.label || "unknown"
    };
}

function isWithinNDays(isoOrLabel, days) {
    const d = new Date(isoOrLabel);
    if (Number.isNaN(d.getTime())) return true; // keep if date parse fails
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return d >= cutoff;
}

/**
 * Pull reviews for a specific appId from Apple's RSS customerreviews feed.
 * Works without touching your existing fetchReviews() implementation.
 */
async function fetchReviewsByAppId(appId, { country = DEFAULT_COUNTRY, days = 30, maxPages = 10 } = {}) {
    let page = 1;
    const out = [];

    while (page <= maxPages) {
        const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${encodeURIComponent(appId)}/sortBy=mostRecent/json`;
        const res = await fetch(url);
        if (!res.ok) break;

        const json = await res.json();
        const entries = json.feed?.entry || [];

        // First entry is often metadata; keep only review entries with rating
        const reviews = entries
            .filter(e => e && e["im:rating"])
            .map(normalize)
            .filter(r => (days ? isWithinNDays(r.date, days) : true));

        if (!reviews.length) break;

        out.push(...reviews);
        page++;
    }

    return out;
}

module.exports.ingestCompetitorReviews = async function (competitors, fetchReviews /* unused */, opts = {}) {
    const country = opts.country || DEFAULT_COUNTRY;
    const days = opts.days ?? 30;

    const store = {};

    for (const c of competitors) {
        if (!c.appId) continue;
        const reviews = await fetchReviewsByAppId(c.appId, { country, days });
        store[c.appId] = {
            appId: c.appId,
            name: c.name,
            reviews
        };
    }

    fs.writeFileSync("./data/competitor_reviews.json", JSON.stringify(store, null, 2));
    return store;
};
