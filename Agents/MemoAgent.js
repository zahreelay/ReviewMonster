class MemoAgent {
    constructor({ generateMemo, cache }) {
        this.generateMemo = generateMemo;
        this.cache = cache; // Using the injected cache module (llmcache style)
    }

    run(analyzedReviews) {
        if (!analyzedReviews || analyzedReviews.length === 0) {
            return "No reviews to generate memo from.";
        }

        const key = this.cache.makeMemoKey(analyzedReviews);
        console.log("Memo key:", key);
        // Try to get from cache
        const cached = this.cache.get(key);
        console.log("Cached memo:", cached);
        if (cached) {
            return cached;
        }

        const memo = this.generateMemo(analyzedReviews);

        // Save to cache
        this.cache.set(key, memo);
        console.log("Generated memo:", memo);
        return memo;
    }
}

module.exports = { MemoAgent };
