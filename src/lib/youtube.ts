const VIDEO_ID = /^[\w-]{11}$/;

/** Returns the 11-character video id for a YouTube URL or bare id, else null. */
export function youtubeVideoId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1);
  } else if (host === "youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (/^\/(shorts|embed|live|v)\//.test(url.pathname))
      id = url.pathname.split("/")[2];
  }

  return id && VIDEO_ID.test(id) ? id : null;
}

export type TranscriptSegment = { startSec: number; text: string };

/** `m:ss`, or `h:mm:ss` past the hour. */
export function formatTimestamp(startSec: number) {
  const total = Math.max(0, Math.floor(startSec));
  const [h, m, s] = [
    Math.floor(total / 3600),
    Math.floor((total % 3600) / 60),
    total % 60,
  ];
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
