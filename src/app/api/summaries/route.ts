import { after } from "next/server";
import { auth } from "@/lib/auth";
import { saveSummary } from "@/lib/summaries";
import { generateAndStoreSpeech } from "@/lib/speech";
import type { Summary, SummarySource } from "@/lib/summary";
import { youtubeVideoId } from "@/lib/youtube";

const MAX_TOPICS = 20;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const input = parseBody(body);
  if (!input) {
    return Response.json({ error: "Invalid summary." }, { status: 400 });
  }

  const videoId = input.videoId;
  const saved = await saveSummary({
    userId: session.user.id,
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: await videoTitle(videoId),
    tldr: input.summary.tldr,
    topics: input.summary.topics,
    source: input.source,
    language: input.summary.language,
  });

  if (!saved) {
    return Response.json({ error: "Already generated." }, { status: 409 });
  }
  // Save fast, speak later: the response goes out first, then the mp3 is generated.
  after(() => generateAndStoreSpeech(saved.id));
  return Response.json({ id: saved.id }, { status: 201 });
}

function parseBody(
  body: unknown,
): { videoId: string; summary: Summary; source: SummarySource } | null {
  if (typeof body !== "object" || body === null) return null;
  const { url, summary, source } = body as Record<string, unknown>;

  const videoId = typeof url === "string" ? youtubeVideoId(url) : null;
  if (!videoId) return null;
  if (source !== "captions" && source !== "whisper") return null;

  if (typeof summary !== "object" || summary === null) return null;
  const { tldr, topics, language } = summary as Record<string, unknown>;
  if (typeof tldr !== "string" || tldr.length === 0 || tldr.length > 4000) {
    return null;
  }
  if (typeof language !== "string" || !/^[a-z]{2}$/.test(language)) {
    return null;
  }
  if (
    !Array.isArray(topics) ||
    topics.length === 0 ||
    topics.length > MAX_TOPICS ||
    !topics.every(
      (topic) =>
        typeof topic === "object" &&
        topic !== null &&
        typeof (topic as Record<string, unknown>).title === "string" &&
        typeof (topic as Record<string, unknown>).summary === "string",
    )
  ) {
    return null;
  }

  return { videoId, summary: { tldr, topics, language } as Summary, source };
}

/** Video title from YouTube's keyless oEmbed endpoint; the id is the fallback. */
async function videoTitle(videoId: string): Promise<string> {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}&format=json`;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return videoId;
    const data: unknown = await response.json();
    const title = (data as { title?: unknown })?.title;
    return typeof title === "string" && title ? title.slice(0, 300) : videoId;
  } catch {
    return videoId;
  }
}
