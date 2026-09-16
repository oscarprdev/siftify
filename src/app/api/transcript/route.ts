import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { transcribe } from "ai";
import { fetchTranscript } from "youtube-transcript";
import { auth } from "@/lib/auth";
import { nan } from "@/lib/ai";
import { youtubeVideoId, type TranscriptSegment } from "@/lib/youtube";

const execFileAsync = promisify(execFile);
const YT_DLP_TIMEOUT_MS = 5 * 60 * 1000;

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

  try {
    const segments = await captionSegments(videoId);
    if (segments.length > 0) {
      return Response.json({ videoId, source: "captions", segments });
    }
  } catch {
    // No captions (or YouTube refused) — fall through to whisper.
  }

  try {
    return Response.json({
      videoId,
      source: "whisper",
      segments: await whisperSegments(videoId),
    });
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
  const stderr = "stderr" in error ? String(error.stderr ?? "") : "";
  return [error.message, stderr].filter(Boolean).join(" ").trim().slice(0, 500);
}
