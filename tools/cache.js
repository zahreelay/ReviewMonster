const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PATH = path.join(__dirname, "../data/agent_cache.json");
if (!fs.existsSync(PATH)) fs.writeFileSync(PATH, "{}");

function read() {
    return JSON.parse(fs.readFileSync(PATH));
}

function write(data) {
    fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}

function makeReviewKey(review) {
    return crypto
        .createHash("sha256")
        .update(`${review.text}|${review.rating}|${review.version}`)
        .digest("hex");
}

function makeMemoKey(analyzedReviews) {
    const fingerprint = analyzedReviews
        .map(r => `${r.text}|${r.title}|${r.rating}|${r.issues.join(",")}`)
        .join("||");

    return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

function get(key) {
    return read()[key];
}

function set(key, value) {
    const c = read();
    c[key] = value;
    write(c);
}

module.exports = { makeReviewKey, makeMemoKey, get, set };
