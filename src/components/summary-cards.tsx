"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AudioLines } from "lucide-react";
import { cn } from "cn";
import { AudioPlayer } from "@/components/audio-player";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { AudioState, SavedSummary } from "@/lib/summaries";

/** Human-readable error from a failed speech response. */
async function errorMessage(response: Response) {
  const data: unknown = await response.json().catch(() => null);
  return data &&
    typeof data === "object" &&
    typeof (data as { error?: unknown }).error === "string"
    ? (data as { error: string }).error
    : `Request failed (${response.status}).`;
}

function meta(summary: SavedSummary) {
  return (
    <>
      {summary.source} · {summary.topics.length} topic
      {summary.topics.length === 1 ? "" : "s"} ·{" "}
      <time dateTime={summary.createdAt}>
        {new Date(summary.createdAt).toLocaleDateString()}
      </time>
    </>
  );
}

export function SummaryCards({ summaries }: { summaries: SavedSummary[] }) {
  const [selected, setSelected] = useState<SavedSummary | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary) => (
          <Card
            key={summary.id}
            id={`sift-${summary.videoId}`}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(summary)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelected(summary);
              }
            }}
            className="scroll-mt-6 cursor-pointer transition-colors hover:ring-foreground/25"
          >
            <Image
              src={`https://i.ytimg.com/vi/${summary.videoId}/hqdefault.jpg`}
              alt=""
              width={480}
              height={360}
              className="aspect-video w-full object-cover"
            />
            <CardHeader>
              <CardTitle className="truncate">{summary.title}</CardTitle>
              <CardDescription>{meta(summary)}</CardDescription>
            </CardHeader>
            <CardContent className="line-clamp-3 text-muted-foreground">
              {summary.tldr}
            </CardContent>
          </Card>
        ))}
      </div>

      {selected ? (
        <SummaryDialog
          key={selected.id}
          summary={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

function SummaryDialog({
  summary,
  onClose,
}: {
  summary: SavedSummary;
  onClose: () => void;
}) {
  const [audioState, setAudioState] = useState<AudioState | null>(
    summary.audioState,
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Release the blob when the audio is replaced or the dialog closes.
  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  // Audio is generated in the background after save — poll until it lands.
  useEffect(() => {
    if (audioState !== "pending") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/speech?summaryId=${summary.id}`);
        if (response.status === 202) {
          timer = setTimeout(poll, 3000);
          return;
        }
        if (!response.ok) throw new Error(await errorMessage(response));
        const blob = await response.blob();
        if (cancelled) return;
        setAudioUrl(URL.createObjectURL(blob));
        setAudioState("ready");
      } catch (error) {
        if (cancelled) return;
        setSpeechError(
          error instanceof Error ? error.message : "Speech generation failed.",
        );
        setAudioState("failed");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [audioState, summary.id]);

  async function requestAudio(url: string, init: RequestInit) {
    setRequesting(true);
    setSpeechError(null);
    try {
      const response = await fetch(url, init);
      if (!response.ok) throw new Error(await errorMessage(response));
      setAudioUrl(URL.createObjectURL(await response.blob()));
      setAudioState("ready");
    } catch (error) {
      setSpeechError(
        error instanceof Error ? error.message : "Speech generation failed.",
      );
    } finally {
      setRequesting(false);
    }
  }

  const generating = requesting || audioState === "pending";

  function playSpeech() {
    const url = `/api/speech?summaryId=${summary.id}`;
    if (audioState === "failed" || audioState === null) {
      return requestAudio("/api/speech", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ summaryId: summary.id }),
      });
    }
    return requestAudio(url, {});
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "grid h-[80vh] max-h-[calc(100dvh-2rem)] sm:max-w-2xl",
          audioUrl ? "grid-rows-[auto_auto_minmax(0,1fr)]" : "grid-rows-[auto_minmax(0,1fr)]",
        )}
      >
        <DialogHeader className="flex-row items-start gap-4">
          <Image
            src={`https://i.ytimg.com/vi/${summary.videoId}/hqdefault.jpg`}
            alt=""
            width={480}
            height={360}
            className="aspect-video w-36 shrink-0 rounded-lg object-cover sm:w-48"
          />
          <div className="min-w-0 space-y-2">
            <DialogTitle className="line-clamp-2 text-sm">
              {summary.title}
            </DialogTitle>
            <DialogDescription>{meta(summary)}</DialogDescription>
            <a
              href={summary.url}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Watch on YouTube
            </a>
            {audioUrl ? null : (
              <Button
                type="button"
                size="sm"
                disabled={generating}
                onClick={playSpeech}
              >
                {generating ? <Spinner /> : <AudioLines />}
                {generating
                  ? "Generating…"
                  : audioState === "failed"
                    ? "Retry speech"
                    : "Speech"}
              </Button>
            )}
            {speechError ? (
              <p className="text-sm text-destructive">{speechError}</p>
            ) : null}
          </div>
        </DialogHeader>

        {audioUrl ? <AudioPlayer key={audioUrl} src={audioUrl} /> : null}

        <div className="min-h-0 space-y-4 overflow-y-auto text-sm">
          <p className="font-medium">{summary.tldr}</p>
          {summary.topics.map((topic, index) => (
            <section key={index} className="space-y-1">
              {topic.title ? (
                <h3 className="font-medium">{topic.title}</h3>
              ) : null}
              {topic.summary ? (
                <p className="text-muted-foreground">{topic.summary}</p>
              ) : null}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
