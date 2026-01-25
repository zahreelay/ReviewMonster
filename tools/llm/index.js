/**
 * LLM Abstraction Layer
 *
 * This module provides a unified interface for interacting with different LLM providers.
 * It reads from config to determine which provider to use by default.
 *
 * Usage:
 *   const llm = require('./tools/llm');
 *
 *   // Use default provider from config
 *   const response = await llm.chat({
 *       messages: [
 *           { role: "system", content: "You are a helpful assistant." },
 *           { role: "user", content: "Hello!" }
 *       ]
 *   });
 *
 *   // Override provider for specific call
 *   const response = await llm.chat({
 *       messages: [...],
 *       provider: "anthropic"
 *   });
 */

const config = require("../../config/llm.config");

// Provider implementations
const { OpenAIProvider } = require("./providers/openai");
const { AnthropicProvider } = require("./providers/anthropic");
const { GoogleProvider } = require("./providers/google");

// Provider registry
const providerClasses = {
    openai: OpenAIProvider,
    anthropic: AnthropicProvider,
    google: GoogleProvider
};

// Singleton instances cache
const providerInstances = {};

/**
 * Get or create a provider instance
 * @param {string} providerName - Provider name (openai, anthropic, google)
 * @returns {BaseLLMProvider} - Provider instance
 */
function getProvider(providerName) {
    const name = providerName || config.default;

    if (!providerClasses[name]) {
        throw new Error(`Unknown LLM provider: ${name}. Supported: ${Object.keys(providerClasses).join(", ")}`);
    }

    // Return cached instance or create new one
    if (!providerInstances[name]) {
        const providerConfig = config.providers[name];
        if (!providerConfig) {
            throw new Error(`No configuration found for provider: ${name}`);
        }
        providerInstances[name] = new providerClasses[name](providerConfig);
    }

    return providerInstances[name];
}

/**
 * Send a chat completion request using the configured provider
 *
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of {role, content} messages
 * @param {string} [options.provider] - Override default provider
 * @param {string} [options.model] - Model to use (or tier: fast/standard/advanced)
 * @param {number} [options.temperature=0] - Temperature (0-2)
 * @param {number} [options.maxTokens] - Max tokens in response
 * @param {Object} [options.jsonSchema] - JSON schema for structured output
 * @returns {Promise<string>} - The response content
 */
async function chat(options) {
    const { provider: providerName, ...chatOptions } = options;
    const provider = getProvider(providerName);

    return provider.chat(chatOptions);
}

/**
 * Get the current default provider name
 * @returns {string}
 */
function getDefaultProvider() {
    return config.default;
}

/**
 * Get list of available providers
 * @returns {string[]}
 */
function getAvailableProviders() {
    return Object.keys(providerClasses);
}

/**
 * Check if a provider is configured (has API key)
 * @param {string} providerName
 * @returns {boolean}
 */
function isProviderConfigured(providerName) {
    const providerConfig = config.providers[providerName];
    return !!(providerConfig && providerConfig.apiKey);
}

/**
 * Get provider info
 * @param {string} [providerName] - Provider name (defaults to current default)
 * @returns {Object} - Provider info
 */
function getProviderInfo(providerName) {
    const name = providerName || config.default;
    const providerConfig = config.providers[name];

    return {
        name,
        isDefault: name === config.default,
        isConfigured: isProviderConfigured(name),
        defaultModel: providerConfig?.defaultModel,
        models: providerConfig?.models
    };
}

module.exports = {
    chat,
    getProvider,
    getDefaultProvider,
    getAvailableProviders,
    isProviderConfigured,
    getProviderInfo
};
