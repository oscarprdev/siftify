"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SavedSummary } from "@/lib/summaries";

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
        <Dialog key={selected.id} open onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="h-[80vh] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-2xl">
            <DialogHeader className="flex-row items-start gap-4">
              <Image
                src={`https://i.ytimg.com/vi/${selected.videoId}/hqdefault.jpg`}
                alt=""
                width={480}
                height={360}
                className="aspect-video w-36 shrink-0 rounded-lg object-cover sm:w-48"
              />
              <div className="min-w-0 space-y-2">
                <DialogTitle className="line-clamp-2 text-sm">
                  {selected.title}
                </DialogTitle>
                <DialogDescription>{meta(selected)}</DialogDescription>
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Watch on YouTube
                </a>
              </div>
            </DialogHeader>

            <div className="min-h-0 space-y-4 overflow-y-auto text-sm">
              <p className="font-medium">{selected.tldr}</p>
              {selected.topics.map((topic, index) => (
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
      ) : null}
    </>
  );
}
