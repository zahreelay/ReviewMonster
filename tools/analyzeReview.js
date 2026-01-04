const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeReview(review) {
    const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
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
        text: {
            format: {
                type: "json_schema",
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
                }
            }
        },
        temperature: 0
    });

    return response.output_text;
}

module.exports = { analyzeReview };
