/**
 * OpenAI LLM Provider
 */

const OpenAI = require("openai");
const { BaseLLMProvider } = require("./base");

class OpenAIProvider extends BaseLLMProvider {
    constructor(config) {
        super(config);
        this.name = "openai";
        this.client = new OpenAI({ apiKey: config.apiKey });
    }

    /**
     * Send a chat completion request to OpenAI
     */
    async chat(options) {
        const {
            messages,
            model,
            temperature = 0,
            maxTokens,
            jsonSchema
        } = options;

        const requestParams = {
            model: this.resolveModel(model),
            messages,
            temperature
        };

        if (maxTokens) {
            requestParams.max_tokens = maxTokens;
        }

        // OpenAI supports native JSON schema response format
        if (jsonSchema) {
            requestParams.response_format = {
                type: "json_schema",
                json_schema: jsonSchema
            };
        }

        const response = await this.client.chat.completions.create(requestParams);
        return response.choices[0].message.content;
    }

    supportsJsonSchema() {
        return true;
    }
}

module.exports = { OpenAIProvider };
