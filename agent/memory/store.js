const fs = require("fs");
const path = require("path");

const MEMORY_PATH = path.join(__dirname, "../../data/memory.json");

class MemoryStore {
    constructor() {
        if (!fs.existsSync(MEMORY_PATH)) {
            fs.writeFileSync(MEMORY_PATH, JSON.stringify({
                reviews: [],
                issues: [],
                reports: []
            }, null, 2));
        }
    }

    load() {
        return JSON.parse(fs.readFileSync(MEMORY_PATH));
    }

    save(data) {
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));
    }
}

module.exports = MemoryStore;
