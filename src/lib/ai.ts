import { createOpenAI } from "@ai-sdk/openai";

/** nan.builders is OpenAI-compatible, so the OpenAI provider just needs a baseURL. */
export const nan = createOpenAI({
  baseURL: "https://api.nan.builders/v1",
  apiKey: process.env.AI_API_KEY,
});
