import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import {
  generateSpeechBytes,
  speechErrorDetail,
  storeSpeech,
} from "@/lib/speech";

function audioResponse(bytes: Uint8Array) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "audio/mpeg",
      "content-length": String(bytes.byteLength),
      "cache-control": "no-store",
    },
  });
}

/** Serves the stored audio, or the generation state for the client to poll. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const summaryId = new URL(request.url).searchParams.get("summaryId");
  if (!summaryId) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // The user_id filter also hides other users' summaries as 404.
  const { rows } = await pool.query(
    `SELECT audio, audio_state FROM summaries WHERE id = $1 AND user_id = $2`,
    [summaryId, session.user.id],
  );
  if (rows.length === 0) {
    return Response.json({ error: "Summary not found." }, { status: 404 });
  }

  const { audio, audio_state: state } = rows[0];
  if (state === "pending") {
    return Response.json({ state: "pending" }, { status: 202 });
  }
  // 'failed', and rows saved before audio existed (NULL), need on-demand generation.
  if (state !== "ready" || !audio) {
    return Response.json({ state: "failed" }, { status: 409 });
  }
  return audioResponse(audio);
}

/** Generates, stores, and returns the audio on demand (old rows and failed retries). */
export async function POST(request: Request) {
  // Speech spends AI credits — keep it behind the session.
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const summaryId =
    typeof body === "object" && body !== null && "summaryId" in body
      ? body.summaryId
      : null;
  if (typeof summaryId !== "string" || summaryId.length === 0) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT tldr, topics, language FROM summaries WHERE id = $1 AND user_id = $2`,
    [summaryId, session.user.id],
  );
  if (rows.length === 0) {
    return Response.json({ error: "Summary not found." }, { status: 404 });
  }

  const { tldr, topics, language } = rows[0];
  try {
    const bytes = await generateSpeechBytes(tldr, topics, language, request.signal);
    await storeSpeech(summaryId, bytes);
    return audioResponse(bytes);
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    return Response.json(
      { error: `Speech failed: ${speechErrorDetail(error)}` },
      { status: 502 },
    );
  }
}
