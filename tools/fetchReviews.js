//const fetch = require("node-fetch");

const APP_ID = "1081530898"; // your iOS app id

function isWithinNDays(dateString, days) {
    const reviewDate = new Date(dateString);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return reviewDate >= cutoff;
}

function normalizeReview(r) {
    return {
        text: r.content?.label || "",
        title: r.title?.label || "User Review",
        date: r.updated?.label || "",
        user: r.author?.name?.label || "unknown",
        version: r["im:version"]?.label || "unknown",
        rating: Number(r["im:rating"]?.label || 0)
    };
}

async function fetchReviews(days = 10) {
    let page = 1;
    let results = [];
    console.log("Fetching reviews... 2");

    while (true) {
        const url = `https://itunes.apple.com/rss/customerreviews/page=${page}/id=${APP_ID}/sortBy=mostRecent/json`;
        const response = await fetch(url);
        //console.log("Fetching reviews... 3", response);

        const data = await response.json();
        console.log("Fetching reviews... 4", data);

        const entries = data.feed?.entry || [];
        //console.log("Fetching reviews... 5", entries);

        if (!entries.length) break;

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


        if (!reviews.length) break;

        results.push(...reviews);
        //console.log("Fetching reviews... 7", results);
        //process.exit(0);
        page++;
    }

    //console.log("Fetching reviews... 8", results);
    //process.exit(0);
    return results;
}

module.exports = { fetchReviews };
