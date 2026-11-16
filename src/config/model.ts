import "dotenv/config";

// Single source of truth for the local model. Every module imports from here
// so the agent runner and any helper can never disagree on the model name.
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma:e2b";
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
