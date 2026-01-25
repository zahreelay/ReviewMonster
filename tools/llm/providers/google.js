/**
 * Google (Gemini) LLM Provider
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { BaseLLMProvider } = require("./base");

class GoogleProvider extends BaseLLMProvider {
    constructor(config) {
        super(config);
        this.name = "google";
        this.client = new GoogleGenerativeAI(config.apiKey);
    }

    /**
     * Send a chat completion request to Google Gemini
     */
    async chat(options) {
        const {
            messages,
            model,
            temperature = 0,
            maxTokens,
            jsonSchema
        } = options;

        const modelName = this.resolveModel(model);
        const generativeModel = this.client.getGenerativeModel({ model: modelName });

        // Convert messages to Gemini format
        const { systemInstruction, contents } = this.convertMessages(messages);

        const generationConfig = {
            temperature,
        };

        if (maxTokens) {
            generationConfig.maxOutputTokens = maxTokens;
        }

        // If JSON schema is requested, add instructions
        if (jsonSchema) {
            generationConfig.responseMimeType = "application/json";
        }

        const chatSession = generativeModel.startChat({
            generationConfig,
            history: contents.slice(0, -1), // All messages except the last
            systemInstruction
        });

        // Send the last message
        const lastMessage = contents[contents.length - 1];
        const result = await chatSession.sendMessage(lastMessage.parts[0].text);

        return result.response.text();
    }

    /**
     * Convert OpenAI-style messages to Gemini format
     */
    convertMessages(messages) {
        let systemInstruction = null;
        const contents = [];

        for (const msg of messages) {
            if (msg.role === "system") {
                // Gemini expects systemInstruction as a Content object with parts
                systemInstruction = {
                    role: "user",
                    parts: [{ text: msg.content }]
                };
            } else {
                contents.push({
                    role: msg.role === "assistant" ? "model" : "user",
                    parts: [{ text: msg.content }]
                });
            }
        }

        return { systemInstruction, contents };
    }

    supportsJsonSchema() {
        return true;
    }
}

module.exports = { GoogleProvider };
