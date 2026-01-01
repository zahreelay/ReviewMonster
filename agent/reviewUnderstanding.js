const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function understandReview(review) {
    const response = await client.responses.create({
        model: "gpt-4.1-mini",

        input: [
            {
                role: "system",
                content: `
You are a senior product manager analyzing app reviews.

Rules:
- Derive everything strictly from the review text.
- Always determine the dominant intentß: complaint, feature_request, or praise.
- Extract concrete issues as normalized snake_case identifiers.
- If the review contains any problem or request, issues MUST NOT be empty.
- Produce short, executive summaries.
- Do not repeat the review verbatim.
`
            },
            {
                role: "user",
                content: `
Review Text:
${review.text}

Produce the structured result.
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
                        original_text: { type: "string" },
                        intent: { type: "string", enum: ["complaint", "feature_request", "praise"] },
                        issues: { type: "array", items: { type: "string" } },
                        summary: { type: "string" }
                    },
                    required: ["original_text", "intent", "issues", "summary"]
                }
            }
        },

        temperature: 0
    });

    // console.log(response.output_text);
    // console.log(response.output_parsed);
    // process.exit(0);
    return JSON.parse(response.output_text);;
}

module.exports = { understandReview };
