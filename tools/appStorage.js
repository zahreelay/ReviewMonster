/**
 * App Storage Utility
 *
 * Manages per-app data storage in the folder structure:
 * /data/apps/{appId}/
 *   - metadata.json
 *   - reviews.json
 *   - insights.json
 *   - regression.json
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data/apps");
const ROOT_DATA_DIR = path.join(__dirname, "../data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Get the directory path for an app
 */
function getAppDir(appId) {
    return path.join(DATA_DIR, String(appId));
}

/**
 * Ensure app directory exists
 */
function ensureAppDir(appId) {
    const dir = getAppDir(appId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Get file path for a specific data type
 */
function getFilePath(appId, dataType) {
    return path.join(getAppDir(appId), `${dataType}.json`);
}

/**
 * Check if app data exists
 */
function appExists(appId) {
    return fs.existsSync(getAppDir(appId));
}

/**
 * Check if specific data type exists for an app
 */
function dataExists(appId, dataType) {
    return fs.existsSync(getFilePath(appId, dataType));
}

/**
 * Save data for an app
 */
function saveData(appId, dataType, data) {
    ensureAppDir(appId);
    const filePath = getFilePath(appId, dataType);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Load data for an app
 */
function loadData(appId, dataType) {
    const filePath = getFilePath(appId, dataType);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * Save app metadata
 */
function saveMetadata(appId, metadata) {
    saveData(appId, "metadata", {
        ...metadata,
        appId: String(appId),
        savedAt: new Date().toISOString()
    });
}

/**
 * Load app metadata
 */
function loadMetadata(appId) {
    return loadData(appId, "metadata");
}

/**
 * Save raw reviews
 */
function saveReviews(appId, reviews) {
    saveData(appId, "reviews", reviews);
}

/**
 * Load raw reviews
 */
function loadReviews(appId) {
    return loadData(appId, "reviews") || [];
}

/**
 * Save analyzed insights
 */
function saveInsights(appId, insights) {
    saveData(appId, "insights", {
        ...insights,
        generatedAt: new Date().toISOString()
    });
}

/**
 * Load analyzed insights
 */
function loadInsights(appId) {
    return loadData(appId, "insights");
}

/**
 * Save regression timeline data
 */
function saveRegression(appId, regression) {
    saveData(appId, "regression", {
        ...regression,
        generatedAt: new Date().toISOString()
    });
}

/**
 * Load regression timeline data
 */
function loadRegression(appId) {
    return loadData(appId, "regression");
}

/**
 * Save rating history (monthly averages)
 */
function saveRatingHistory(appId, history) {
    saveData(appId, "rating_history", history);
}

/**
 * Load rating history
 */
function loadRatingHistory(appId) {
    return loadData(appId, "rating_history") || [];
}

/**
 * Get list of all analyzed apps
 */
function listApps() {
    if (!fs.existsSync(DATA_DIR)) {
        return [];
    }
    return fs.readdirSync(DATA_DIR).filter(name => {
        const stat = fs.statSync(path.join(DATA_DIR, name));
        return stat.isDirectory();
    });
}

/**
 * Delete all data for an app
 */
function deleteApp(appId) {
    const dir = getAppDir(appId);
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
    }
}

/**
 * Load global competitors list
 * Returns competitors that have been discovered for any app
 */
function loadCompetitors() {
    const filePath = path.join(ROOT_DATA_DIR, "competitors.json");
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
        return [];
    }
}

/**
 * Save global competitors list
 */
function saveCompetitors(competitors) {
    const filePath = path.join(ROOT_DATA_DIR, "competitors.json");
    fs.writeFileSync(filePath, JSON.stringify(competitors, null, 2));
}

/**
 * Save app-specific competitors
 */
function saveAppCompetitors(appId, competitors) {
    saveData(appId, "competitors", {
        competitors,
        savedAt: new Date().toISOString()
    });
}

/**
 * Load app-specific competitors
 */
function loadAppCompetitors(appId) {
    const data = loadData(appId, "competitors");
    return data?.competitors || [];
}

/**
 * Check if an app is a competitor (exists in competitors.json)
 */
function isCompetitor(appId) {
    const competitors = loadCompetitors();
    return competitors.some(c => String(c.appId) === String(appId));
}

module.exports = {
    getAppDir,
    ensureAppDir,
    appExists,
    dataExists,
    saveData,
    loadData,
    saveMetadata,
    loadMetadata,
    saveReviews,
    loadReviews,
    saveInsights,
    loadInsights,
    saveRegression,
    loadRegression,
    saveRatingHistory,
    loadRatingHistory,
    listApps,
    deleteApp,
    loadCompetitors,
    saveCompetitors,
    saveAppCompetitors,
    loadAppCompetitors,
    isCompetitor
};
