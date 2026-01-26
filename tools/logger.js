/**
 * Logger Utility
 *
 * Structured logging with levels and context.
 * All logs are prefixed with timestamp and level.
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Default log level from environment or INFO
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format timestamp for logs
 */
function timestamp() {
    return new Date().toISOString();
}

/**
 * Format log message with context
 */
function formatMessage(level, message, context = {}) {
    const base = `[${timestamp()}] [${level}]`;
    const contextStr = Object.keys(context).length > 0
        ? ` ${JSON.stringify(context)}`
        : "";
    return `${base} ${message}${contextStr}`;
}

/**
 * Debug level - verbose information for development
 */
function debug(message, context = {}) {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
        console.log(formatMessage("DEBUG", message, context));
    }
}

/**
 * Info level - general operational information
 */
function info(message, context = {}) {
    if (currentLevel <= LOG_LEVELS.INFO) {
        console.log(formatMessage("INFO", message, context));
    }
}

/**
 * Warn level - potentially problematic situations
 */
function warn(message, context = {}) {
    if (currentLevel <= LOG_LEVELS.WARN) {
        console.warn(formatMessage("WARN", message, context));
    }
}

/**
 * Error level - error conditions
 */
function error(message, context = {}) {
    if (currentLevel <= LOG_LEVELS.ERROR) {
        console.error(formatMessage("ERROR", message, context));
    }
}

/**
 * Create a child logger with preset context
 */
function child(defaultContext) {
    return {
        debug: (msg, ctx = {}) => debug(msg, { ...defaultContext, ...ctx }),
        info: (msg, ctx = {}) => info(msg, { ...defaultContext, ...ctx }),
        warn: (msg, ctx = {}) => warn(msg, { ...defaultContext, ...ctx }),
        error: (msg, ctx = {}) => error(msg, { ...defaultContext, ...ctx })
    };
}

module.exports = {
    debug,
    info,
    warn,
    error,
    child,
    LOG_LEVELS
};
