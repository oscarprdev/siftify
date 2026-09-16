"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatTimestamp, youtubeVideoId, type TranscriptSegment } from "@/lib/youtube";

type Result = { source: "captions" | "whisper"; segments: TranscriptSegment[] };
type Status =
  | { state: "loading" }
  | { state: "done"; result: Result }
  | { state: "error"; message: string };

export function SiftBar() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  function sift(event: FormEvent) {
    event.preventDefault();
    const id = youtubeVideoId(url);
    if (!id) {
      setError("Paste a YouTube video URL (watch, youtu.be, shorts or embed).");
      return;
    }
    setError(null);
    setVideoId(id);
  }

  return (
    <form onSubmit={sift} className="flex w-full items-start gap-2">
      <div className="flex-1">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="YouTube URL"
          aria-label="YouTube URL"
          aria-invalid={error !== null}
        />
        {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
      </div>
      <Button type="submit">Sift</Button>
      {videoId ? (
        <SiftDialog
          key={videoId}
          videoId={videoId}
          onClose={() => setVideoId(null)}
        />
      ) : null}
    </form>
  );
}

function SiftDialog({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function sift() {
      try {
        const response = await fetch("/api/transcript", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
          }),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error ?? `Request failed (${response.status}).`);
        }
        setStatus({ state: "done", result: data });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setStatus({
          state: "error",
          message: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }

    sift();
    return () => controller.abort();
  }, [videoId]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sift</DialogTitle>
          <DialogDescription>
            {status.state === "done"
              ? `${videoId} — from YouTube ${status.result.source}.`
              : `${videoId} — captions first, whisper if the video has none.`}
          </DialogDescription>
        </DialogHeader>

        {status.state === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Sifting. Long videos can take minutes.
          </p>
        ) : null}

        {status.state === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Sift failed</AlertTitle>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        ) : null}

        {status.state === "done" ? (
          <ol className="max-h-[60vh] space-y-2 overflow-y-auto text-sm">
            {status.result.segments.map((segment, index) => (
              <li key={index} className="flex gap-3">
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatTimestamp(segment.startSec)}
                </span>
                <span>{segment.text}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
