const { MemoAgent } = require("./Agents/MemoAgent");
const crypto = require("crypto");

const mockCache = {
    store: {},
    get(key) {
        console.log(`MockCache: get(${key})`);
        return this.store[key];
    },
    set(key, value) {
        console.log(`MockCache: set(${key})`);
        this.store[key] = value;
    }
};

const mockGenerateMemo = (reviews) => {
    console.log("MockGenerateMemo called");
    return "MOCKED MEMO";
};

async function test() {
    const agent = new MemoAgent({ generateMemo: mockGenerateMemo, cache: mockCache });
    const reviews = [{ id: 1, text: "good" }];

    console.log("--- First Run ---");
    const result1 = agent.run(reviews);
    console.log("Result 1:", result1);

    console.log("\n--- Second Run ---");
    const result2 = agent.run(reviews);
    console.log("Result 2:", result2);

    if (result1 === "MOCKED MEMO" && result2 === "MOCKED MEMO") {
        console.log("\nSUCCESS: Memo matches");
    } else {
        console.log("\nFAILURE: Memo mismatch");
    }
}

test();
