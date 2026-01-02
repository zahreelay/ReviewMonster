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

function generateMemoV1(reviews) {

    if (!reviews.length) return "No reviews available for this period.";

    const totalReviews = reviews.length;
    console.log(totalReviews);
    const avgRating =
        (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2);
    console.log(avgRating);

    const countIssues = (filtered) => {
        const map = {};
        filtered.forEach(r =>
            r.issues.forEach(issue => {
                map[issue] = (map[issue] || 0) + 1;
            })
        );
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
    };

    const complaints = reviews.filter(r => r.intent === "complaint");
    const requests = reviews.filter(r => r.intent === "feature_request");
    const praises = reviews.filter(r => r.intent === "praise");

    const lowRatings = reviews.filter(r => r.rating <= 2);
    const midRatings = reviews.filter(r => r.rating >= 3 && r.rating <= 4);
    const highRatings = reviews.filter(r => r.rating === 5);

    const biggestComplaints = countIssues(complaints);
    const biggestRequests = countIssues(requests);
    const biggestPraises = countIssues(praises);

    const lowDrivers = countIssues(lowRatings);
    const midDrivers = countIssues(midRatings);
    const highDrivers = countIssues(highRatings);

    const fmt = (arr) =>
        arr.length
            ? arr.map(([k, v]) => `• ${k} (${v})`).join("\n")
            : "• No strong signal yet";

    const memo = `
PRODUCT FEEDBACK MEMO

EXECUTIVE SUMMARY
Users submitted ${totalReviews} reviews with an average rating of ${avgRating}. The strongest negative signals come from ${biggestComplaints.map(i => i[0]).join(", ") || "no dominant issue"}, while top positive sentiment is driven by ${biggestPraises.map(i => i[0]).join(", ") || "no dominant theme"}.

KEY METRICS
• Total Reviews: ${totalReviews}
• Average Rating: ${avgRating}

BIGGEST COMPLAINTS
${fmt(biggestComplaints)}

BIGGEST FEATURE REQUESTS
${fmt(biggestRequests)}

BIGGEST PRAISES
${fmt(biggestPraises)}

WHAT DRIVES LOW RATINGS (1-2★)
${fmt(lowDrivers)}

WHAT DRIVES MID RATINGS (3-4★)
${fmt(midDrivers)}

WHAT DRIVES HIGH RATINGS (5★)
${fmt(highDrivers)}

RECOMMENDATIONS
1. Address top complaint issues immediately to improve low ratings.
2. Evaluate most frequent feature requests for roadmap inclusion.
3. Reinforce strengths driving 5★ reviews in future releases.
`;

    return memo.trim();
}


module.exports = { understandReview, generateMemoV1 };
