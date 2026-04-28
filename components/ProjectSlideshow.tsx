"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { getMuxThumbnail } from "@/lib/mux";
import SlideVideoPreview from "./SlideVideoPreview";
import PhotoDrawer from "./PhotoDrawer";

type MediaFilter = "film" | "photography";

const FILM_CATEGORIES = ["all", "commercials", "music-videos", "narrative"] as const;
const PHOTO_CATEGORIES = ["all", "editorial", "commercial"] as const;

type FilmCategory = (typeof FILM_CATEGORIES)[number];
type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

const EDGE_PAD = 48;

// ─── Feature flags ───
const AUTOPLAY_PREVIEW = true;
const AUTOPLAY_START_SECONDS = 30;
const SHOW_PHOTO_SECTION = false; // Set to true to re-enable photography drawer
const AUTO_ADVANCE_DELAY = 6000; // ms after video fade-in to auto-advance

interface ProjectSlideshowProps {
  projects: Project[];
  siteTitle: string;
}

export default function ProjectSlideshow({
  projects,
  siteTitle,
}: ProjectSlideshowProps) {
  const router = useRouter();
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("film");
  const [filmCategory, setFilmCategory] = useState<FilmCategory>("all");
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const locked = useRef(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance: called when the video fade-in completes
  const scheduleAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      if (locked.current) return;
      // Advance to next, or loop to first
      locked.current = true;
      setActiveIndex((prev) => {
        const filmLen = projects.filter((p) => !!p.muxPlaybackId).length;
        return prev + 1 < filmLen ? prev + 1 : 0;
      });
      setTimeout(() => { locked.current = false; }, 1100);
    }, AUTO_ADVANCE_DELAY);
  }, [projects]);

  // Clear auto-advance on unmount or manual navigation
  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, []);

  // Clear timer when user manually navigates
  useEffect(() => {
    clearAutoAdvance();
  }, [activeIndex, clearAutoAdvance]);

  // Custom cursor state
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorOverUI, setCursorOverUI] = useState(false);

  const isPhotos = mediaFilter === "photography";

  // Filter projects by media type
  const filmProjects = useMemo(() => projects.filter((p) => !!p.muxPlaybackId), [projects]);
  const photoProjects = useMemo(() => projects.filter((p) => !p.muxPlaybackId), [projects]);
  const filtered = isPhotos ? photoProjects : filmProjects;

  // Derive which film categories have at least one project
  const visibleFilmCategories = useMemo(() => {
    const typeMap: Record<string, string> = {
      "music-video": "music-videos",
      "commercial": "commercials",
      "narrative": "narrative",
      "live-session": "music-videos",
      "visualizer": "music-videos",
      "documentary": "narrative",
      "short-film": "narrative",
      "editorial": "commercials",
    };
    const present = new Set<string>();
    for (const p of filmProjects) {
      if (p.projectType && typeMap[p.projectType]) {
        present.add(typeMap[p.projectType]);
      }
    }
    // Only show categories if there are multiple present
    if (present.size <= 1) return [];
    return FILM_CATEGORIES.filter(
      (key) => key === "all" || present.has(key)
    );
  }, [filmProjects]);

  // Reset index when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [mediaFilter, filmCategory, photoCategory]);

  // Clamp index
  useEffect(() => {
    if (activeIndex >= filmProjects.length && filmProjects.length > 0) {
      setActiveIndex(filmProjects.length - 1);
    }
  }, [activeIndex, filmProjects.length]);

  const advance = useCallback(
    (direction: 1 | -1) => {
      if (locked.current || isPhotos) return;
      const next = activeIndex + direction;
      if (next < 0 || next >= filmProjects.length) return;
      locked.current = true;
      setActiveIndex(next);
      setTimeout(() => {
        locked.current = false;
      }, 1100);
    },
    [activeIndex, filmProjects.length, isPhotos]
  );

  const goTo = useCallback(
    (i: number) => {
      if (i >= 0 && i < filmProjects.length && i !== activeIndex) {
        locked.current = true;
        setActiveIndex(i);
        setTimeout(() => {
          locked.current = false;
        }, 1100);
      }
    },
    [filmProjects.length, activeIndex]
  );

  // Mouse wheel
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const filteredLenRef = useRef(filmProjects.length);
  filteredLenRef.current = filmProjects.length;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // Let the photo drawer scroll naturally
      if (mediaFilter === "photography") return;

      e.preventDefault();
      if (locked.current) return;

      const dir = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
      if (dir === 0) return;

      const next = activeIndexRef.current + dir;
      if (next < 0 || next >= filteredLenRef.current) return;

      locked.current = true;
      setActiveIndex(next);
      setTimeout(() => {
        locked.current = false;
      }, 1200);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [mediaFilter]);

  // Touch navigation
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isPhotos) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 50) {
      advance(deltaY > 0 ? 1 : -1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPhotos) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        advance(1);
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        advance(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, isPhotos]);

  // Custom cursor tracking
  const onMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const onMouseEnter = () => setCursorVisible(true);
  const onMouseLeave = () => setCursorVisible(false);

  const handleSlideClick = () => {
    if (isPhotos) return;
    const current = filmProjects[activeIndex];
    if (current) {
      router.push(`/project/${current.slug}`);
    }
  };

  const getThumbnail = (project: Project): string | null => {
    return project.images[0]?.src || getMuxThumbnail(project.muxPlaybackId);
  };

  const current = filmProjects[activeIndex];

  const formatLabel = (s: string) =>
    s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-full h-full select-none ${isPhotos ? "overflow-y-auto cursor-default" : "overflow-hidden cursor-none"}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Custom play cursor — only in film mode */}
      {!isPhotos && cursorVisible && !cursorOverUI && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="w-16 h-16 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <svg width="18" height="20" viewBox="0 0 18 20" fill="none" className="ml-0.5">
              <path d="M0 0L18 10L0 20V0Z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
        </div>
      )}

      {/* Background slides — always rendered, shrinks when photos open */}
      <div
        className="relative w-full transition-all duration-700 ease-in-out"
        style={{ height: isPhotos ? "0" : "100vh" }}
      >
        {filmProjects.map((project, i) => {
          const thumb = getThumbnail(project);
          if (!thumb) return null;
          const isActive = i === activeIndex;
          const showVideo = AUTOPLAY_PREVIEW && isActive && project.muxPlaybackId && !isPhotos;

          return (
            <div
              key={project.slug}
              className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
              style={{
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 1 : 0,
              }}
            >
              <Image
                src={thumb}
                alt={project.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority={i <= 1}
                unoptimized
              />
              {showVideo && <SlideVideoPreview playbackId={project.muxPlaybackId!} startTime={AUTOPLAY_START_SECONDS} onPlaybackStarted={scheduleAutoAdvance} />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
            </div>
          );
        })}

        {/* Slide overlay — title + click area (film mode only) */}
        {!isPhotos && (
          <div
            className="absolute inset-0 z-10 flex flex-col cursor-none"
            onClick={handleSlideClick}
          >
            <div className="flex-1" />
            {current && (
              <div style={{ padding: `0 ${EDGE_PAD}px`, maxWidth: "50vw" }}>
                <h1 className="text-[clamp(1.8rem,4vw,3.75rem)] font-light leading-[1.05] tracking-[-0.02em] text-white/40 italic font-extralight">
                  {current.title}
                </h1>
              </div>
            )}
            <div className="flex-1" />
          </div>
        )}

        {/* Dot navigation (film mode only) */}
        {!isPhotos && filmProjects.length > 1 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2"
            style={{ right: EDGE_PAD, cursor: "pointer" }}
            onMouseEnter={() => setCursorOverUI(true)}
            onMouseLeave={() => setCursorOverUI(false)}
          >
            {filmProjects.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`
                  rounded-full transition-all duration-500
                  ${i === activeIndex
                    ? "w-[7px] h-[7px] bg-white"
                    : "w-[5px] h-[5px] bg-white/30 hover:bg-white/60"
                  }
                `}
                aria-label={`Go to project ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Photo drawer — slides up when photography selected */}
      <div
        className="w-full bg-[var(--color-bg)] transition-all duration-700 ease-in-out"
        style={{
          minHeight: isPhotos ? "100vh" : "0",
          opacity: isPhotos ? 1 : 0,
        }}
      >
        {isPhotos && (
          <div style={{ paddingTop: 100 }}>
            <PhotoDrawer projects={photoProjects} />
          </div>
        )}
      </div>

      {/* Bottom bar — filters (always visible, fixed) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex items-end justify-between"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setCursorOverUI(true)}
        onMouseLeave={() => setCursorOverUI(false)}
        style={{
          padding: `0 24px`,
          paddingBottom: 24,
          cursor: "default",
          background: isPhotos ? "linear-gradient(to top, var(--color-bg) 60%, transparent)" : undefined,
        }}
      >
        {/* Left — FILM / PHOTOGRAPHY (hidden when photo section disabled) */}
        {SHOW_PHOTO_SECTION ? (
          <nav className="flex gap-7">
            {(["film", "photography"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setMediaFilter(f)}
                className={`
                  text-sm sm:text-base tracking-[0.12em] uppercase cursor-pointer transition-all duration-300 pb-0.5
                  ${mediaFilter === f
                    ? `${isPhotos ? "text-[var(--color-text)]" : "text-white"} border-b ${isPhotos ? "border-[var(--color-text)]" : "border-white"}`
                    : `${isPhotos ? "text-[var(--color-text-muted)]" : "text-white/35"} border-b border-transparent ${isPhotos ? "hover:text-[var(--color-text)]" : "hover:text-white/60"}`
                  }
                `}
              >
                {f}
              </button>
            ))}
          </nav>
        ) : <div />}

        {/* Right — category filters */}
        <nav className="flex gap-4 sm:gap-7 flex-wrap">
          {mediaFilter === "film"
            ? visibleFilmCategories.map((key) => (
                <button
                  key={key}
                  onClick={() => setFilmCategory(key)}
                  className={`
                    text-sm sm:text-base tracking-[0.12em] uppercase cursor-pointer transition-all duration-300
                    ${filmCategory === key
                      ? "text-white"
                      : "text-white/35 hover:text-white/60"
                    }
                  `}
                >
                  {formatLabel(key)}
                </button>
              ))
            : PHOTO_CATEGORIES.map((key) => (
                <button
                  key={key}
                  onClick={() => setPhotoCategory(key)}
                  className={`
                    text-sm sm:text-base tracking-[0.12em] uppercase cursor-pointer transition-all duration-300
                    ${photoCategory === key
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }
                  `}
                >
                  {formatLabel(key)}
                </button>
              ))}
        </nav>
      </div>
    </div>
  );
}
