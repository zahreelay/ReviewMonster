//const fetch = require("node-fetch");

const APP_ID = "1081530898";

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

async function scrapeLastYear() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    let page = 1;
    let all = [];

    while (true) {
        const url = `https://itunes.apple.com/rss/customerreviews/page=${page}/id=${APP_ID}/sortBy=mostRecent/json`;
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
