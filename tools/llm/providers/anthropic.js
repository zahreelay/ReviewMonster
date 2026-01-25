/**
 * Anthropic (Claude) LLM Provider
 */

const Anthropic = require("@anthropic-ai/sdk").default;
const { BaseLLMProvider } = require("./base");

class AnthropicProvider extends BaseLLMProvider {
    constructor(config) {
        super(config);
        this.name = "anthropic";
        this.client = new Anthropic({ apiKey: config.apiKey });
    }

    /**
     * Send a chat completion request to Anthropic
     */
    async chat(options) {
        const {
            messages,
            model,
            temperature = 0,
            maxTokens = 4096,
            jsonSchema
        } = options;

        // Convert OpenAI-style messages to Anthropic format
        const { systemPrompt, anthropicMessages } = this.convertMessages(messages);

        const requestParams = {
            model: this.resolveModel(model),
            max_tokens: maxTokens,
            temperature,
            messages: anthropicMessages
        };

        if (systemPrompt) {
            requestParams.system = systemPrompt;
        }

        // If JSON schema is requested, add instructions to the system prompt
        if (jsonSchema) {
            const schemaInstruction = `\n\nYou must respond with valid JSON that conforms to this schema:\n${JSON.stringify(jsonSchema.schema, null, 2)}\n\nRespond with JSON only, no other text.`;
            requestParams.system = (requestParams.system || "") + schemaInstruction;
        }

        const response = await this.client.messages.create(requestParams);
        return response.content[0].text;
    }

    /**
     * Convert OpenAI-style messages to Anthropic format
     * Anthropic uses a separate system parameter, not a system message
     */
    convertMessages(messages) {
        let systemPrompt = null;
        const anthropicMessages = [];

        for (const msg of messages) {
            if (msg.role === "system") {
                systemPrompt = msg.content;
            } else {
                anthropicMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }

        return { systemPrompt, anthropicMessages };
    }

    supportsJsonSchema() {
        // Anthropic doesn't have native JSON schema, but we simulate it
        return true;
    }
}

module.exports = { AnthropicProvider };
