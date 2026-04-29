"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
});

interface SlideVideoPreviewProps {
  playbackId: string;
  startTime?: number;
  onPlaybackStarted?: () => void;
}

export default function SlideVideoPreview({
  playbackId,
  startTime = 30,
  onPlaybackStarted,
}: SlideVideoPreviewProps) {
  const [playing, setPlaying] = useState(false);
  const hasPlayed = useRef(false);

  return (
    <div
      className="absolute inset-0 overflow-hidden transition-opacity duration-[1500ms] ease-in"
      style={{ opacity: playing ? 1 : 0 }}
    >
      <MuxPlayer
        playbackId={playbackId}
        autoPlay="muted"
        muted
        loop
        startTime={startTime}
        streamType="on-demand"
        onPlaying={() => {
          if (!hasPlayed.current) {
            hasPlayed.current = true;
            setPlaying(true);
            if (onPlaybackStarted) {
              setTimeout(onPlaybackStarted, 1500);
            }
          }
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          "--controls": "none",
          "--media-object-fit": "cover",
          aspectRatio: "unset",
        }}
      />
    </div>
  );
}
