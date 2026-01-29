const fs = require("fs");

const DEFAULT_COUNTRY = "us";

/**
 * iTunes Lookup API: get metadata for a known appId
 * https://itunes.apple.com/lookup?id=<APP_ID>&country=<COUNTRY>
 */
async function itunesLookup(appId, country = DEFAULT_COUNTRY) {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${encodeURIComponent(country)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
    const json = await res.json();
    const app = json.results?.[0];
    if (!app) throw new Error("iTunes lookup returned no app");
    return app;
}

/**
 * iTunes Search API: search apps by term
 * https://itunes.apple.com/search?term=<TERM>&entity=software&limit=<N>&country=<COUNTRY>
 */
async function itunesSearch(term, country = DEFAULT_COUNTRY, limit = 50) {
    const url =
        `https://itunes.apple.com/search?` +
        `term=${encodeURIComponent(term)}` +
        `&country=${encodeURIComponent(country)}` +
        `&entity=software` +
        `&limit=${encodeURIComponent(limit)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
    const json = await res.json();
    return json.results || [];
}

/**
 * Apple RSS Marketing Tools (optional): top apps by genre
 * Example:
 * https://rss.marketingtools.apple.com/api/v2/us/apps/top-free/100/apps.json/genre=6003
 *
 * If this fails (some storefront/genre combos), we just skip it.
 */
async function rssTopApps({ country = DEFAULT_COUNTRY, feed = "top-free", limit = 100, genreId }) {
    const genrePart = genreId ? `/genre=${encodeURIComponent(genreId)}` : "";
    const url = `https://rss.marketingtools.apple.com/api/v2/${country}/apps/${feed}/${limit}/apps.json${genrePart}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`RSS failed: ${res.status}`);
    const json = await res.json();
    return json.feed?.results || [];
}

function tokenize(s) {
    return (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}

function jaccard(a, b) {
    const A = new Set(a);
    const B = new Set(b);
    const inter = [...A].filter(x => B.has(x)).length;
    const uni = new Set([...A, ...B]).size;
    return uni ? inter / uni : 0;
}

function scoreCandidate(our, cand) {
    const sameGenre = cand.primaryGenreId && our.primaryGenreId && cand.primaryGenreId === our.primaryGenreId ? 1 : 0;

    // Light text similarity based on name + description (if present)
    const ourTokens = tokenize(`${our.trackName || ""} ${our.description || ""}`.slice(0, 2000));
    const cTokens = tokenize(`${cand.trackName || ""} ${cand.description || ""}`.slice(0, 2000));
    const sim = jaccard(ourTokens, cTokens);

    const rating = typeof cand.averageUserRating === "number" ? cand.averageUserRating : 0;
    const ratingScore = rating ? Math.min(rating / 5, 1) : 0.5;

    // weights: genre dominates, then similarity, then rating
    return 0.55 * sameGenre + 0.30 * sim + 0.15 * ratingScore;
}

/**
 * STRUCTURE COMPATIBLE:
 * discoverCompetitors(appProfile, reviews)
 *
 * We support either:
 * - appProfile.appId (preferred)
 * - OR appProfile.trackId
 */
module.exports.discoverCompetitors = async function (appProfile, reviews, opts = {}) {
    const country = opts.country || DEFAULT_COUNTRY;
    const k = opts.k || 8;

    const ourAppId = String(appProfile?.appId || appProfile?.trackId || "");
    if (!ourAppId) throw new Error("discoverCompetitors: appProfile.appId (or trackId) is required");

    // 1) Our app metadata
    const our = await itunesLookup(ourAppId, country);

    // 2) Search-based candidates from our name (and optionally some review-derived keywords)
    const nameTerms = tokenize(our.trackName).slice(0, 3);

    const reviewArray =
        Array.isArray(reviews) ? reviews :
            Array.isArray(reviews?.reviews) ? reviews.reviews :
                [];

    const reviewTerms = [...new Set(
        reviewArray
            .flatMap(r => Array.isArray(r.intent) ? r.intent : [])
            .map(x => String(x).toLowerCase())
    )].slice(0, 10);


    const searchTerms = [
        our.trackName,
        nameTerms.slice(0, 2).join(" "),
        nameTerms[0],
        ...reviewTerms
    ].filter(Boolean);
    const searchPool = [];
    for (const t of searchTerms) {
        const results = await itunesSearch(t, country, 50);
        searchPool.push(...results);
    }

    // 3) Optional chart-based candidates from the same genre
    let chartPool = [];
    try {
        const genreId = our.primaryGenreId;
        const topFree = await rssTopApps({ country, feed: "top-free", limit: 100, genreId });
        const topPaid = await rssTopApps({ country, feed: "top-paid", limit: 100, genreId });

        // RSS results have .id but not full metadata → lookup a limited set
        const ids = [...new Set([...topFree, ...topPaid].map(x => x.id).filter(Boolean))]
            .filter(id => String(id) !== String(our.trackId))
            .slice(0, 25);

        for (const id of ids) {
            try {
                const app = await itunesLookup(id, country);
                chartPool.push(app);
            } catch { }
        }
    } catch {
        // silently skip chart enrichment
    }

    // 4) Merge + de-dupe + score
    const all = [...searchPool, ...chartPool]
        .filter(x => x && x.trackId)
        .filter(x => String(x.trackId) !== String(our.trackId));

    const byId = new Map();
    for (const a of all) byId.set(String(a.trackId), a);

    const scored = [...byId.values()]
        .map(c => ({
            appId: String(c.trackId),
            name: c.trackName,
            seller: c.sellerName,
            genre: c.primaryGenreName,
            icon: c.artworkUrl100 || c.artworkUrl60,
            score: Number(scoreCandidate(our, c).toFixed(4)),
            rating: c.averageUserRating ?? null,
            ratingCount: c.userRatingCount ?? null
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);

    fs.writeFileSync("./data/competitors.json", JSON.stringify(scored, null, 2));
    return scored;
};
