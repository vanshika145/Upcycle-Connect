/**
 * AI Configuration for OpenRouter Integration
 * Centralized configuration for AI models via OpenRouter
 * Currently using: DeepSeek Chat v3
 */

module.exports = {
  // OpenRouter API Configuration
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  
  // Valid OpenRouter Model ID (MANDATORY - DO NOT CHANGE)
  // Using DeepSeek model: deepseek/deepseek-chat-v3-0324
  // Alternative models: google/gemini-1.5-flash, google/gemini-1.5-pro, google/gemini-2.0-flash
  GEMINI_MODEL: 'deepseek/deepseek-chat-v3-0324',
  
  // API Key Environment Variable Names (in priority order)
  API_KEY_ENV_VARS: ['OPENROUTER_API_KEY', 'GEMINI_API_KEY'],
  
  // Request Configuration
  REQUEST_CONFIG: {
    temperature: 0.7,
    max_tokens: 1000,
  },
  
  // HTTP Headers
  getHeaders: (apiKey) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'UpCycle Connect',
  }),
  
  // Get API Key from environment
  getApiKey: () => {
    for (const envVar of module.exports.API_KEY_ENV_VARS) {
      const key = process.env[envVar];
      if (key && key.trim()) {
        return key.trim();
      }
    }
    return null;
  },
};

