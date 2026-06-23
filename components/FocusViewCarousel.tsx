"use client";

import type { ProjectImage } from "@/lib/types";
import ProgressiveImage from "./ProgressiveImage";

interface CarouselItem {
  type: "video" | "image";
  src: string;
  alt: string;
}

interface FocusViewCarouselProps {
  items: CarouselItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function FocusViewCarousel({
  items,
  activeIndex,
  onSelect,
}: FocusViewCarouselProps) {
  if (items.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden justify-center">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`
            flex-none w-[80px] sm:w-[100px] aspect-video
            snap-start rounded overflow-hidden relative cursor-pointer
            border transition-all duration-200
            ${i === activeIndex
              ? "opacity-100 border-white/60"
              : "opacity-30 border-transparent hover:opacity-60"
            }
          `}
        >
          <ProgressiveImage
            src={item.src}
            alt={item.alt}
            fill
            sizes="100px"
            className="object-cover"
            revealClassName="duration-300 ease-out"
          />
          {item.type === "video" && (
            <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] drop-shadow-md">
              &#9654;
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export type { CarouselItem };

export function buildCarouselItems(
  muxPlaybackId: string | null,
  images: ProjectImage[],
  videoThumbnail: string | null
): CarouselItem[] {
  const items: CarouselItem[] = [];

  if (muxPlaybackId) {
    const thumb = videoThumbnail || images[0]?.src;
    if (thumb) {
      items.push({ type: "video", src: thumb, alt: "Video" });
    }
  }

  for (const img of images) {
    if (img.src) {
      items.push({ type: "image", src: img.src, alt: img.caption || "" });
    }
  }

  return items;
}
