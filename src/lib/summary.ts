import { jsonSchema } from "ai";

export type SummarySource = "captions" | "whisper";

export type Summary = {
  tldr: string;
  topics: { title: string; summary: string }[];
  /** ISO 639-1 code of the language the summary was written in, e.g. "en". */
  language: string;
};

/** Shape of a partially streamed summary — every field may still be missing. */
export type SummaryPartial = {
  tldr?: string;
  // Elements can be undefined while the array is still streaming in.
  topics?: ({ title?: string; summary?: string } | undefined)[];
  language?: string;
};

/** One NDJSON line of `POST /api/summarize`. */
export type SummaryEvent =
  | { type: "captions-ready"; source: SummarySource }
  | { type: "summary-start" }
  | { type: "partial"; summary: SummaryPartial }
  | { type: "error"; message: string };

/** Strict JSON schema (all properties required) — the OpenAI provider sends it as `response_format`. */
export const summarySchema = jsonSchema<Summary>({
  type: "object",
  additionalProperties: false,
  required: ["tldr", "topics", "language"],
  properties: {
    tldr: { type: "string" },
    language: {
      type: "string",
      description: "ISO 639-1 code of the summary's language, e.g. en",
    },
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "summary"],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
        },
      },
    },
  },
});
