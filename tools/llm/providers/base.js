/**
 * Base LLM Provider Interface
 *
 * All LLM providers must implement this interface.
 * This ensures consistent behavior across different providers.
 */

class BaseLLMProvider {
    constructor(config) {
        this.config = config;
        this.name = "base";
    }

    /**
     * Send a chat completion request
     *
     * @param {Object} options - Request options
     * @param {Array} options.messages - Array of {role, content} messages
     * @param {string} [options.model] - Model to use (defaults to provider's default)
     * @param {number} [options.temperature=0] - Temperature (0-2)
     * @param {number} [options.maxTokens] - Max tokens in response
     * @param {Object} [options.jsonSchema] - JSON schema for structured output
     * @returns {Promise<string>} - The response content
     */
    async chat(options) {
        throw new Error("chat() must be implemented by provider");
    }

    /**
     * Get the model name to use
     * @param {string} [modelOverride] - Model name or tier (fast/standard/advanced)
     * @returns {string} - Resolved model name
     */
    resolveModel(modelOverride) {
        if (!modelOverride) {
            return this.config.defaultModel;
        }

        // Check if it's a tier name
        if (this.config.models && this.config.models[modelOverride]) {
            return this.config.models[modelOverride];
        }

        // Assume it's a direct model name
        return modelOverride;
    }

    /**
     * Check if provider supports JSON schema response format
     * @returns {boolean}
     */
    supportsJsonSchema() {
        return false;
    }

    /**
     * Get provider name
     * @returns {string}
     */
    getName() {
        return this.name;
    }
}

module.exports = { BaseLLMProvider };
