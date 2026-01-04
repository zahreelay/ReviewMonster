const fs = require("fs");
const path = require("path");

const PATH = path.join(__dirname, "../data/raw_reviews.json");

function initStore() {
    if (!fs.existsSync(PATH)) {
        fs.writeFileSync(PATH, JSON.stringify({ updatedAt: null, reviews: [] }, null, 2));
    }
}

function readStore() {
    initStore();
    console.log("Reading store...");
    console.log(fs.readFileSync(PATH, "utf8"));
    return JSON.parse(fs.readFileSync(PATH, "utf8"));
}

function writeStore(data) {
    fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}

function getReviews() {
    return readStore().reviews;
}

function saveReviews(reviews) {
    writeStore({ updatedAt: new Date().toISOString(), reviews });
}

function clearStore() {
    writeStore({ updatedAt: null, reviews: [] });
}

module.exports = { getReviews, saveReviews, clearStore };
