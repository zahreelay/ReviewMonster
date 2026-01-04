const fs = require("fs");
const path = require("path");

const PATH = path.join(__dirname, "../data/reviews_store.json");

function read() {
    return JSON.parse(fs.readFileSync(PATH, "utf8"));
}

function write(data) {
    fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}

function hasData() {
    const store = read();
    return store.reviews.length > 0;
}

function loadReviews() {
    return read().reviews;
}

function saveReviews(reviews) {
    write({
        lastUpdated: new Date().toISOString(),
        reviews
    });
}

function clearReviews() {
    write({ lastUpdated: null, reviews: [] });
}

module.exports = { hasData, loadReviews, saveReviews, clearReviews };
