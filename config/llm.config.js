/**
 * LLM Provider Configuration
 *
 * This file configures which LLM provider to use by default.
 * Set the `default` field to switch between providers.
 *
 * Supported providers: "openai", "anthropic", "google"
 */

module.exports = {
    // Default provider to use for all LLM calls
    default: process.env.LLM_PROVIDER || "openai",

    // Provider-specific configurations
    providers: {
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
            models: {
                fast: "gpt-4o-mini",
                standard: "gpt-4o",
                advanced: "gpt-4-turbo"
            }
        },
        anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY,
            defaultModel: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
            models: {
                fast: "claude-3-5-haiku-20241022",
                standard: "claude-3-5-sonnet-20241022",
                advanced: "claude-3-opus-20240229"
            }
        },
        google: {
            apiKey: process.env.GOOGLE_API_KEY,
            defaultModel: process.env.GOOGLE_MODEL || "gemini-2.0-flash",
            models: {
                fast: "gemini-2.0-flash",
                standard: "gemini-1.5-pro-latest",
                advanced: "gemini-1.5-pro-latest"
            }
        }
    }
};
