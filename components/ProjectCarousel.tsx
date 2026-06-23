"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import FilterNav, { type Filter } from "./FilterNav";
import type { Project } from "@/lib/types";
import { getMuxThumbnail } from "@/lib/mux";
import ProgressiveImage from "./ProgressiveImage";

interface ProjectCarouselProps {
  projects: Project[];
}

export default function ProjectCarousel({ projects }: ProjectCarouselProps) {
  const [filter, setFilter] = useState<Filter>("videos");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = projects.filter((p) =>
    filter === "videos" ? !!p.muxPlaybackId : !p.muxPlaybackId
  );

  const handleFilterChange = useCallback((f: Filter) => {
    setFilter(f);
    setActiveIndex(0);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      if (i >= 0 && i < filtered.length) setActiveIndex(i);
    },
    [filtered.length]
  );

  const getThumbnail = (project: Project): string | null => {
    return project.images[0]?.src || getMuxThumbnail(project.muxPlaybackId);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 pt-2 pb-4">
        <FilterNav active={filter} onChange={handleFilterChange} />
      </div>

      {/* Stacked cards */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div className="relative w-full max-w-[90rem] h-[70vh] sm:h-[75vh]">
          {filtered.map((project, i) => {
            const thumb = getThumbnail(project);
            if (!thumb) return null;

            const offset = i - activeIndex;
            const isCenter = offset === 0;
            const isVisible = Math.abs(offset) <= 2;

            if (!isVisible) return null;

            // Stacked layout: center card on top, others peek from sides and behind
            const translateX = offset * 28; // % shift left/right
            const scale = isCenter ? 1 : 0.75;
            const zIndex = 10 - Math.abs(offset);
            const opacity = isCenter ? 1 : 0.4;

            return (
              <div
                key={project.slug}
                className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out"
                style={{
                  transform: `translateX(${translateX}%) scale(${scale})`,
                  zIndex,
                  opacity,
                  pointerEvents: isCenter ? "auto" : "auto",
                }}
                onClick={() => {
                  if (!isCenter) goTo(i);
                }}
              >
                {isCenter ? (
                  <Link
                    href={`/project/${project.slug}`}
                    className="block w-[95%] sm:w-[85%] lg:w-[80%]"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
                      <ProgressiveImage
                        src={thumb}
                        alt={project.images[0]?.caption || project.title}
                        fill
                        sizes="(min-width: 1024px) 45rem, (min-width: 640px) 35rem, 85vw"
                        className="object-cover"
                        priority
                      />
                      {/* Play button overlay for videos */}
                      {project.muxPlaybackId && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <span className="text-white text-2xl ml-1">&#9654;</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div
                    className="w-[95%] sm:w-[85%] lg:w-[80%] cursor-pointer"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                      <ProgressiveImage
                        src={thumb}
                        alt={project.title}
                        fill
                        sizes="22rem"
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-2 py-4">
        {filtered.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`
              rounded-full transition-all duration-300 cursor-pointer
              ${i === activeIndex
                ? "w-2.5 h-2.5 bg-current opacity-80"
                : "w-1.5 h-1.5 bg-current opacity-20 hover:opacity-50"
              }
            `}
            aria-label={`Go to project ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
