const fs = require("fs");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "../data/memory.json");
const TTL = 24 * 60 * 60 * 1000; // 24 hours

function read() {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
}

function write(data) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
}

function get(url) {
    const cache = read();
    const record = cache[url];

    if (!record) return null;

    if (Date.now() - record.timestamp > TTL) {
        delete cache[url];
        write(cache);
        return null;
    }

    return record.value;
}

function set(url, value) {
    const cache = read();
    cache[url] = { value, timestamp: Date.now() };
    write(cache);
}

module.exports = { get, set };
