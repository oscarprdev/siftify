import { pool } from "@/lib/db";
import type { Summary, SummarySource } from "@/lib/summary";

export type SavedSummary = Summary & {
  id: string;
  videoId: string;
  url: string;
  title: string;
  source: SummarySource;
  createdAt: string;
};

export type SaveSummary = {
  userId: string;
  videoId: string;
  url: string;
  title: string;
  tldr: string;
  topics: Summary["topics"];
  source: SummarySource;
};

/** Saved summaries of one user, newest first. */
export async function listSummaries(userId: string): Promise<SavedSummary[]> {
  const { rows } = await pool.query(
    `SELECT id, video_id, url, title, tldr, topics, source, created_at
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
    createdAt: row.created_at.toISOString(),
  }));
}

/** Inserts one summary. Returns null when the user already saved this video. */
export async function saveSummary(
  input: SaveSummary,
): Promise<{ id: string } | null> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO summaries (user_id, video_id, url, title, tldr, topics, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        input.userId,
        input.videoId,
        input.url,
        input.title,
        input.tldr,
        JSON.stringify(input.topics),
        input.source,
      ],
    );
    return { id: rows[0].id };
  } catch (error) {
    // 23505 = unique_violation on (user_id, video_id).
    if ((error as { code?: string }).code === "23505") return null;
    throw error;
  }
}
