const fs = require("fs");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "llmCache.json");

if (!fs.existsSync(CACHE_PATH)) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({}, null, 2));
}

function readCache() {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
}

function writeCache(cache) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function getCached(key) {
    const cache = readCache();
    return cache[key];
}

function setCached(key, value) {
    const cache = readCache();
    cache[key] = {
        value,
        cachedAt: new Date().toISOString()
    };
    writeCache(cache);
}

module.exports = { getCached, setCached };
