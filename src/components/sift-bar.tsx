"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { youtubeVideoId } from "@/lib/youtube";
import type { SummaryEvent, SummaryPartial, SummarySource } from "@/lib/summary";

type Phase = "captions" | "summary" | "streaming" | "done";

export function SiftBar({ savedVideoIds }: { savedVideoIds: string[] }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  function sift(event: FormEvent) {
    event.preventDefault();
    const id = youtubeVideoId(url);
    if (!id) {
      setError("Paste a YouTube video URL (watch, youtu.be, shorts or embed).");
      setDuplicate(null);
      return;
    }
    if (savedVideoIds.includes(id)) {
      setError(null);
      setDuplicate(id);
      return;
    }
    setError(null);
    setDuplicate(null);
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
        {duplicate ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Already generated —{" "}
            <a href={`#sift-${duplicate}`} className="underline">
              view sift
            </a>
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={duplicate !== null}>
        Sift
      </Button>
      {videoId ? (
        <SiftDialog
          key={videoId}
          videoId={videoId}
          alreadySaved={savedVideoIds.includes(videoId)}
          onClose={() => {
            setVideoId(null);
            setUrl("");
          }}
        />
      ) : null}
    </form>
  );
}

function SiftDialog({
  videoId,
  alreadySaved,
  onClose,
}: {
  videoId: string;
  alreadySaved: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("captions");
  const [source, setSource] = useState<SummarySource | null>(null);
  const [summary, setSummary] = useState<SummaryPartial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">(
    alreadySaved ? "saved" : "idle",
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveSummary() {
    if (!summary) return;
    setSave("saving");
    try {
      const response = await fetch("/api/summaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          summary,
          source: source ?? "captions",
        }),
      });
      if (response.status === 409) {
        setSave("error");
        setSaveError("Already generated.");
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? `Save failed (${response.status}).`);
      }
      setSave("saved");
      router.refresh();
      onClose();
    } catch (cause) {
      setSave("error");
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    function handle(event: SummaryEvent) {
      if (event.type === "captions-ready") {
        setSource(event.source);
        setPhase("summary");
      } else if (event.type === "summary-start") {
        setPhase("summary");
      } else if (event.type === "partial") {
        setSummary(event.summary);
        setPhase("streaming");
      } else {
        setError(event.message);
      }
    }

    async function sift() {
      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? `Request failed (${response.status}).`);
        }
        if (!response.body) throw new Error("The server sent no summary stream.");

        // NDJSON: one event per line, split across chunk boundaries.
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line) handle(JSON.parse(line) as SummaryEvent);
          }
        }
        setPhase("done");
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    sift();
    return () => controller.abort();
  }, [videoId]);

  const busy = (phase === "captions" || phase === "summary") && error === null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sift</DialogTitle>
          <DialogDescription>
            {source
              ? `${videoId} — from YouTube ${source}.`
              : `${videoId} — captions first, whisper if the video has none.`}
          </DialogDescription>
        </DialogHeader>

        {busy ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              {phase === "captions"
                ? "Generating captions — long videos can take minutes."
                : "Generating summary"}
            </p>
            <div className="space-y-2" aria-hidden>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Sift failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {summary ? (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm">
            {summary.tldr ? <p className="font-medium">{summary.tldr}</p> : null}
            {summary.topics?.map((topic, index) =>
              topic ? (
                <section key={index} className="space-y-1">
                  {topic.title ? <h3 className="font-medium">{topic.title}</h3> : null}
                  {topic.summary ? (
                    <p className="text-muted-foreground">{topic.summary}</p>
                  ) : null}
                </section>
              ) : null,
            )}
          </div>
        ) : null}

        {phase === "done" && error === null ? (
          <div className="flex items-center gap-3">
            <Button
              onClick={saveSummary}
              disabled={save === "saving" || save === "saved"}
            >
              {save === "saving" ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : save === "saved" ? (
                "Saved"
              ) : (
                "Save"
              )}
            </Button>
            {save === "error" ? (
              <span className="text-sm text-destructive">{saveError}</span>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
