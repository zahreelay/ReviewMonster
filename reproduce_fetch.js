const { fetchRecentReviews } = require("./reviewFetcher");

(async () => {
    try {
        console.log("Fetching reviews...");
        const reviews = await fetchRecentReviews();
        console.log(`Fetched ${reviews.length} reviews.`);
        console.log("Success!");
    } catch (err) {
        console.error("Error fetching reviews:", err);
    }
})();
