const llm = require("./llm");

const REVIEW_ANALYSIS_SCHEMA = {
    name: "review_intelligence",
    schema: {
        type: "object",
        additionalProperties: false,
        properties: {
            intent: { type: "string", enum: ["complaint", "feature_request", "praise"] },
            issues: { type: "array", items: { type: "string" } },
            summary: { type: "string" }
        },
        required: ["intent", "issues", "summary"]
    },
    strict: true
};

async function analyzeReview(review) {
    const response = await llm.chat({
        messages: [
            {
                role: "system",
                content: `
You are a senior product manager analyzing app reviews.

Rules:
- Derive everything strictly from the review text.
- Determine the dominant intent: complaint, feature_request, or praise.
- Extract concrete issues as normalized snake_case identifiers.
- If the review contains any problem or request, issues must not be empty.
- Produce a concise executive summary (1–2 lines).

Respond with valid JSON only.
`
            },
            {
                role: "user",
                content: `
Review Text:
${review.text}

Analyze this review.
`
            }
        ],
        model: "fast", // Uses the "fast" tier from config (gpt-4o-mini for OpenAI)
        temperature: 0,
        jsonSchema: REVIEW_ANALYSIS_SCHEMA
    });

    return response;
}

module.exports = { analyzeReview };
