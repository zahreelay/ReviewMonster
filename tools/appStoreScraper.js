//const fetch = require("node-fetch");

const DEFAULT_APP_ID = "1081530898";

function normalize(r) {
    return {
        text: r.content?.label || "",
        title: r.title?.label || "User Review",
        date: r.updated?.label || "",
        user: r.author?.name?.label || "unknown",
        version: r["im:version"]?.label || "unknown",
        rating: Number(r["im:rating"]?.label || 0)
    };
}

/**
 * Scrape reviews from the last year for a given app
 * @param {string} appId - App Store app ID (defaults to DEFAULT_APP_ID for backwards compatibility)
 * @returns {Promise<Array>} Array of normalized reviews
 */
async function scrapeLastYear(appId = DEFAULT_APP_ID) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    let page = 1;
    let all = [];

    while (true) {
        const url = `https://itunes.apple.com/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`;
        const res = await fetch(url);
        const data = await res.json();
        const entries = data.feed?.entry || [];

        if (!entries.length) break;

        const reviews = entries
            .filter(r => r["im:rating"])
            .map(normalize)
            .filter(r => new Date(r.date) >= cutoff);

        if (!reviews.length) break;

        all.push(...reviews);
        page++;
    }

    return all;
}

module.exports = { scrapeLastYear };
