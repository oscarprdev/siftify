import { generateSpeech } from "ai";
import { nan } from "@/lib/ai";
import { pool } from "@/lib/db";
import type { Summary } from "@/lib/summary";

// Edit if nan.builders renames the model.
const SPEECH_MODEL = "kokoro";
const OUTPUT_FORMAT = "mp3";
const DEFAULT_VOICE = "af_heart";

// ponytail: kokoro has no voice for every language — unmapped languages get the
// English voice, which reads foreign text with an accent. Extend the map when needed.
const VOICES: Record<string, string> = {
  en: "af_heart",
  es: "ef_dora",
  fr: "ff_siwis",
  hi: "hf_alpha",
  it: "if_sara",
  ja: "jf_alpha",
  pt: "pf_dora",
  zh: "zf_xiaobei",
};

/** Kokoro voice for an ISO 639-1 language code; English when unknown or missing. */
export function voiceFor(language: string | null | undefined) {
  return VOICES[language ?? ""] ?? DEFAULT_VOICE;
}

/** The whole saved summary as one speakable text: tl;dr, then one paragraph per topic. */
export function speechText(tldr: string, topics: Summary["topics"]) {
  // ponytail: the text goes out as one request — chunk it if a summary ever
  // exceeds the gateway's input cap.
  const paragraphs = [tldr];
  for (const topic of topics) {
    const paragraph = [topic.title, topic.summary].filter(Boolean).join("\n");
    if (paragraph) paragraphs.push(paragraph);
  }
  return paragraphs.filter(Boolean).join("\n\n");
}

/** Generates the mp3 bytes for one summary's text. */
export async function generateSpeechBytes(
  tldr: string,
  topics: Summary["topics"],
  language: string | null,
  abortSignal?: AbortSignal,
): Promise<Uint8Array> {
  const { audio } = await generateSpeech({
    model: nan.speech(SPEECH_MODEL),
    text: speechText(tldr, topics),
    voice: voiceFor(language),
    language: language ?? undefined,
    outputFormat: OUTPUT_FORMAT,
    abortSignal,
  });
  return audio.uint8Array;
}

/** Stores finished audio on the row. */
export async function storeSpeech(summaryId: string, bytes: Uint8Array) {
  await pool.query(
    `UPDATE summaries SET audio = $2, audio_state = 'ready' WHERE id = $1`,
    [summaryId, Buffer.from(bytes)],
  );
}

/**
 * Background job for `after()`: loads the saved text, generates speech, and
 * stores it. Never throws — a TTS failure marks the row 'failed' so the
 * on-demand POST can retry it later.
 */
export async function generateAndStoreSpeech(summaryId: string): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT tldr, topics, language FROM summaries WHERE id = $1`,
      [summaryId],
    );
    if (rows.length === 0) return;
    const { tldr, topics, language } = rows[0];
    await storeSpeech(summaryId, await generateSpeechBytes(tldr, topics, language));
  } catch (error) {
    console.error(`Speech generation failed for summary ${summaryId}:`, error);
    await pool
      .query(`UPDATE summaries SET audio_state = 'failed' WHERE id = $1`, [
        summaryId,
      ])
      .catch(() => {});
  }
}

/** 500-char error detail, used in API responses. */
export function speechErrorDetail(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  return error.message.slice(0, 500);
}
