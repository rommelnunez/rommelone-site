"use client";

import Image from "next/image";
import VideoEmbed from "./VideoEmbed";
import type { CarouselItem } from "./FocusViewCarousel";

interface FocusViewMediaProps {
  item: CarouselItem;
  playbackId: string | null;
}

export default function FocusViewMedia({
  item,
  playbackId,
}: FocusViewMediaProps) {
  if (item.type === "video" && playbackId) {
    return (
      <div className="bg-black">
        <VideoEmbed playbackId={playbackId} autoplay />
      </div>
    );
  }

  return (
    <div className="bg-black flex items-center justify-center max-h-[70vh] min-h-[200px]">
      <Image
        src={item.src}
        alt={item.alt}
        width={1200}
        height={800}
        className="w-full h-auto max-h-[70vh] object-contain"
        sizes="(min-width: 768px) 80vw, 100vw"
        priority
        unoptimized
      />
    </div>
  );
}
