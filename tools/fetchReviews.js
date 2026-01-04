//const fetch = require("node-fetch");
const { get, set } = require("./httpCache");

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
    console.log("Fetching reviews...");

    while (true) {
        const url = `https://itunes.apple.com/rss/customerreviews/page=${page}/id=${APP_ID}/sortBy=mostRecent/json`;
        //const response = await fetch(url);
        let response = get(url);

        if (!response) {
            const res = await fetch(url);
            response = await res.json();
            set(url, response);
        }

        const data = response;


        const entries = data.feed?.entry || [];


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

            }))
            .filter((r) => r.date && isWithinNDays(r.date, days));


        if (!reviews.length) break;

        results.push(...reviews);

        page++;
    }


    return results;
}

module.exports = { fetchReviews };
