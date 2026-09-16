import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Output, streamText, transcribe } from "ai";
import { fetchTranscript } from "youtube-transcript";
import { auth } from "@/lib/auth";
import { nan } from "@/lib/ai";
import {
  summarySchema,
  type SummaryEvent,
  type SummarySource,
} from "@/lib/summary";
import { youtubeVideoId, type TranscriptSegment } from "@/lib/youtube";

const execFileAsync = promisify(execFile);
const YT_DLP_TIMEOUT_MS = 5 * 60 * 1000;

// Edit if nan.builders renames the model.
const SUMMARY_MODEL = "qwen3.8-flash";

export async function POST(request: Request) {
  // This route downloads video and spends AI credits — keep it behind the session.
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const url = typeof body === "object" && body !== null && "url" in body ? body.url : "";
  const videoId = typeof url === "string" ? youtubeVideoId(url) : null;
  if (!videoId) {
    return Response.json({ error: "Not a YouTube video URL." }, { status: 400 });
  }

  // Captions before streaming: failures here stay plain JSON errors the client can read.
  let source: SummarySource = "captions";
  let transcript: string[];
  try {
    transcript = (await captionSegments(videoId)).map((cue) => cue.text);
    if (transcript.length === 0) throw new Error("no captions");
  } catch {
    try {
      transcript = (await whisperSegments(videoId)).map((cue) => cue.text);
      source = "whisper";
    } catch (error) {
      const detail = execDetail(error);
      const missingBinary =
        (error as NodeJS.ErrnoException)?.code === "ENOENT" || /ffmpeg/i.test(detail);
      return Response.json(
        {
          error: missingBinary
            ? `Transcription needs yt-dlp and ffmpeg on PATH. (${detail})`
            : `Transcription failed: ${detail}`,
        },
        { status: missingBinary ? 503 : 502 },
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SummaryEvent) => {
        if (request.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Stream already cancelled by the client.
        }
      };

      send({ type: "captions-ready", source });

      try {
        const result = streamText({
          model: nan.chat(SUMMARY_MODEL),
          output: Output.object({ schema: summarySchema }),
          prompt: summaryPrompt(transcript.join(" ")),
          abortSignal: request.signal,
        });
        send({ type: "summary-start" });
        for await (const partial of result.partialOutputStream) {
          send({ type: "partial", summary: partial });
        }
      } catch (error) {
        if (!request.signal.aborted) {
          send({ type: "error", message: `Summary failed: ${execDetail(error)}` });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed or cancelled.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/x-ndjson",
      "cache-control": "no-store",
    },
  });
}

function summaryPrompt(transcript: string) {
  return [
    "Summarize this YouTube transcript.",
    "Write a tl;dr of at most 3 sentences, then 3 to 7 topic sections, each with a short title and a 1-3 sentence summary.",
    "Group the transcript's own content; do not invent details.",
    "Write in the transcript's language. Report that language as an ISO 639-1 code in the language field (e.g. \"en\", \"de\"). Plain text only: no markdown, no bullet characters, no timestamps.",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

async function captionSegments(videoId: string): Promise<TranscriptSegment[]> {
  const cues = await fetchTranscript(videoId);
  return cues.map((cue) => ({ startSec: cue.offset / 1000, text: cue.text }));
}

async function whisperSegments(videoId: string): Promise<TranscriptSegment[]> {
  const audioPath = join(tmpdir(), `myade-${videoId}-${Date.now()}.mp3`);
  try {
    // yt-dlp shells out to ffmpeg itself for the mp3 conversion.
    await execFileAsync(
      "yt-dlp",
      [
        "-x",
        "--audio-format",
        "mp3",
        "--no-playlist",
        "-o",
        audioPath,
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: YT_DLP_TIMEOUT_MS, maxBuffer: 1 << 24 },
    );
    const audio = new Uint8Array(await readFile(audioPath));
    const { segments } = await transcribe({
      model: nan.transcription("whisper"),
      audio,
    });
    return segments.map((s) => ({ startSec: s.startSecond, text: s.text }));
  } finally {
    await rm(audioPath, { force: true });
  }
}

function execDetail(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  if ("stderr" in error && error.stderr) {
    return [error.message, String(error.stderr)].filter(Boolean).join(" ").trim().slice(0, 500);
  }
  return error.message.slice(0, 500);
}
