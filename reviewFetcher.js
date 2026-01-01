//const fetch = require("node-fetch");

const APP_ID = "1081530898"; // <-- hard-code your iOS App Store app id here

function isWithinNDays(dateString, days) {
    const reviewDate = new Date(dateString);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return reviewDate >= cutoff;
}

async function fetchRecentReviews(days = 10) {
    const url = `https://itunes.apple.com/rss/customerreviews/id=${APP_ID}/sortBy=mostRecent/json`;

    const response = await fetch(url);
    const data = await response.json();

    const entries = data.feed?.entry || [];

    const reviews = entries
        .filter((r) => r["im:rating"]) // skip app metadata entry
        .map((r) => ({
            text: r.content?.label || "",
            title: r.title?.label || "User Review",
            date: r.updated?.label || "",
            user: r.author?.name?.label || "unknown",
            version: r["im:version"]?.label || "unknown",
            rating: Number(r["im:rating"]?.label || 0),
            //sentiment: "unknown",
            //intent: "unknown",
            //issues: []
        }))
        .filter((r) => r.date && isWithinNDays(r.date, days));

    return reviews;
}

module.exports = { fetchRecentReviews };
