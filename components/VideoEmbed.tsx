"use client";

import MuxPlayer from "@mux/mux-player-react";

interface VideoEmbedProps {
  playbackId: string;
  autoplay?: boolean;
}

export default function VideoEmbed({
  playbackId,
  autoplay = false,
}: VideoEmbedProps) {
  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <MuxPlayer
        playbackId={playbackId}
        autoPlay={autoplay ? "muted" : false}
        muted={autoplay}
        loop={autoplay}
        streamType="on-demand"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          "--controls": autoplay ? "none" : undefined,
        }}
      />
    </div>
  );
}
