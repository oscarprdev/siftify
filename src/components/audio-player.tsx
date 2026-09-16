"use client";

import { useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekLabelId = useId();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function seek(time: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={playing ? "Pause" : "Play"}
        onClick={toggle}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Slider
        className="min-w-0 flex-1"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        aria-labelledby={seekLabelId}
        onValueChange={(value) => seek(Array.isArray(value) ? value[0] : value)}
      />
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {clock(currentTime)} / {clock(duration)}
      </span>
      <span id={seekLabelId} className="sr-only">
        Seek
      </span>
    </div>
  );
}
