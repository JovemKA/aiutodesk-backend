import { registerAs } from '@nestjs/config';

export default registerAs('gemini', () => ({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
    temperature: process.env.GEMINI_TEMPERATURE ? Number(process.env.GEMINI_TEMPERATURE) : undefined,
    topP: process.env.GEMINI_TOP_P ? Number(process.env.GEMINI_TOP_P) : undefined,
    topK: process.env.GEMINI_TOP_K ? Number(process.env.GEMINI_TOP_K) : undefined,
    maxOutputTokens: process.env.GEMINI_MAX_OUTPUT_TOKENS ? Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) : undefined,
    requestTimeoutMs: process.env.GEMINI_REQUEST_TIMEOUT_MS ? Number(process.env.GEMINI_REQUEST_TIMEOUT_MS) : undefined,
    maxMessageChars: process.env.CHAT_MAX_MESSAGE_CHARS ? Number(process.env.CHAT_MAX_MESSAGE_CHARS) : undefined,
}));
