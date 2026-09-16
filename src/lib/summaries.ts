import { pool } from "@/lib/db";
import type { Summary, SummarySource } from "@/lib/summary";

/** Lifecycle of the stored speech audio for a summary. NULL = never generated. */
export type AudioState = "pending" | "ready" | "failed";

export type SavedSummary = Omit<Summary, "language"> & {
  id: string;
  videoId: string;
  url: string;
  title: string;
  source: SummarySource;
  createdAt: string;
  /** NULL on rows saved before the language was recorded. */
  language: string | null;
  audioState: AudioState | null;
};

export type SaveSummary = {
  userId: string;
  videoId: string;
  url: string;
  title: string;
  tldr: string;
  topics: Summary["topics"];
  source: SummarySource;
  language: string;
};

/** Saved summaries of one user, newest first. */
export async function listSummaries(userId: string): Promise<SavedSummary[]> {
  const { rows } = await pool.query(
    `SELECT id, video_id, url, title, tldr, topics, source, language, audio_state, created_at
       FROM summaries WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: row.id,
    videoId: row.video_id,
    url: row.url,
    title: row.title,
    tldr: row.tldr,
    topics: row.topics,
    source: row.source,
    language: row.language,
    audioState: row.audio_state,
    createdAt: row.created_at.toISOString(),
  }));
}

/** Inserts one summary with audio generation queued. Returns null when the user already saved this video. */
export async function saveSummary(
  input: SaveSummary,
): Promise<{ id: string } | null> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO summaries (user_id, video_id, url, title, tldr, topics, source, language, audio_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id`,
      [
        input.userId,
        input.videoId,
        input.url,
        input.title,
        input.tldr,
        JSON.stringify(input.topics),
        input.source,
        input.language,
      ],
    );
    return { id: rows[0].id };
  } catch (error) {
    // 23505 = unique_violation on (user_id, video_id).
    if ((error as { code?: string }).code === "23505") return null;
    throw error;
  }
}
