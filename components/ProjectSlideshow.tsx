"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Project } from "@/lib/types";
import { getMuxThumbnail } from "@/lib/mux";
import SlideVideoPreview from "./SlideVideoPreview";
import PhotoDrawer from "./PhotoDrawer";
import FocusViewModal from "./FocusViewModal";
import ProgressiveImage from "./ProgressiveImage";

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
const DOT_HIT_SIZE = 28;
const DOT_MAGNET_RADIUS = 62;

interface ProjectSlideshowProps {
  projects: Project[];
  siteTitle: string;
}

export default function ProjectSlideshow({
  projects,
  siteTitle,
}: ProjectSlideshowProps) {
  const [focusedProject, setFocusedProject] = useState<Project | null>(null);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("film");
  const [filmCategory, setFilmCategory] = useState<FilmCategory>("all");
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const locked = useRef(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubIndexRef = useRef(0);
  const railScrubbingRef = useRef(false);
  const railClickSuppressedRef = useRef(false);

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
  const [railCursorY, setRailCursorY] = useState<number | null>(null);
  const [railScrubbing, setRailScrubbing] = useState(false);

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

  const goToRailIndex = useCallback(
    (i: number) => {
      if (i < 0 || i >= filmProjects.length || i === scrubIndexRef.current) return;
      scrubIndexRef.current = i;
      clearAutoAdvance();
      locked.current = false;
      setActiveIndex(i);
    },
    [clearAutoAdvance, filmProjects.length]
  );

  const getRailIndexFromClientY = useCallback(
    (clientY: number) => {
      const rail = railRef.current;
      if (!rail || filmProjects.length === 0) return activeIndex;

      const rect = rail.getBoundingClientRect();
      const localY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
      const progress = rect.height === 0 ? 0 : localY / rect.height;
      return Math.min(
        filmProjects.length - 1,
        Math.max(0, Math.round(progress * (filmProjects.length - 1)))
      );
    },
    [activeIndex, filmProjects.length]
  );

  const handleRailPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setRailCursorY(e.clientY);
      if (railScrubbingRef.current) {
        goToRailIndex(getRailIndexFromClientY(e.clientY));
      }
    },
    [getRailIndexFromClientY, goToRailIndex]
  );

  const handleRailPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      railClickSuppressedRef.current = true;
      railScrubbingRef.current = true;
      setCursorOverUI(true);
      setRailScrubbing(true);
      setRailCursorY(e.clientY);
      goToRailIndex(getRailIndexFromClientY(e.clientY));
    },
    [getRailIndexFromClientY, goToRailIndex]
  );

  const finishRailScrub = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    locked.current = false;
    scrubIndexRef.current = activeIndexRef.current;
    railScrubbingRef.current = false;
    setRailScrubbing(false);
    window.setTimeout(() => {
      railClickSuppressedRef.current = false;
    }, 0);
  }, []);

  const getDotScale = useCallback(
    (i: number) => {
      const activeBase = i === activeIndex ? 1.35 : 1;
      const rail = railRef.current;
      if (railCursorY === null || !rail) return activeBase;

      const rect = rail.getBoundingClientRect();
      const centerY =
        rect.top +
        DOT_HIT_SIZE / 2 +
        i * ((rect.height - DOT_HIT_SIZE) / Math.max(1, filmProjects.length - 1));
      const distance = Math.abs(railCursorY - centerY);
      const influence = Math.max(0, 1 - distance / DOT_MAGNET_RADIUS);

      return activeBase + influence * 1.25;
    },
    [activeIndex, filmProjects.length, railCursorY]
  );

  // Mouse wheel
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  scrubIndexRef.current = activeIndex;
  const filteredLenRef = useRef(filmProjects.length);
  filteredLenRef.current = filmProjects.length;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let accumulated = 0;
    let decayTimer: ReturnType<typeof setTimeout> | null = null;
    const THRESHOLD = 50; // px of scroll delta needed to trigger advance

    const onWheel = (e: WheelEvent) => {
      if (mediaFilter === "photography") return;
      e.preventDefault();
      if (locked.current) return;

      // Accumulate scroll delta and decay it after inactivity
      accumulated += e.deltaY;
      if (decayTimer) clearTimeout(decayTimer);
      decayTimer = setTimeout(() => { accumulated = 0; }, 200);

      if (Math.abs(accumulated) < THRESHOLD) return;

      const dir = accumulated > 0 ? 1 : -1;
      accumulated = 0;

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
      setFocusedProject(current);
    }
  };

  const getThumbnail = (project: Project): string | null => {
    return project.images[0]?.src || getMuxThumbnail(project.muxPlaybackId);
  };

  useEffect(() => {
    if (isPhotos) return;

    const urls = [filmProjects[activeIndex + 1], filmProjects[activeIndex + 2]]
      .map((project) => project ? getThumbnail(project) : null)
      .filter((src): src is string => Boolean(src));

    const preloads = urls.map((src) => {
      const img = new window.Image();
      img.src = src;
      return img;
    });

    return () => {
      preloads.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [activeIndex, filmProjects, isPhotos]);

  const current = filmProjects[activeIndex];

  const formatLabel = (s: string) =>
    s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
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
            const isNearby = Math.abs(i - activeIndex) <= 1;
            if (!isNearby) return null;
            const showVideo = AUTOPLAY_PREVIEW && isActive && project.muxPlaybackId && !isPhotos && !railScrubbing;

            return (
              <div
                key={project.slug}
                className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
                style={{
                  opacity: isActive ? 1 : 0,
                  zIndex: isActive ? 1 : 0,
                }}
              >
                <ProgressiveImage
                  src={thumb}
                  alt={project.title}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={i <= 1}
                  revealClassName="duration-[900ms] ease-out"
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
              ref={railRef}
              className="absolute top-1/2 -translate-y-1/2 z-20 flex touch-none flex-col items-center py-3"
              style={{
                right: "clamp(16px, 4vw, 48px)",
                cursor: railScrubbing ? "grabbing" : "grab",
              }}
              onMouseEnter={() => setCursorOverUI(true)}
              onMouseLeave={() => {
                setCursorOverUI(false);
                if (!railScrubbing) setRailCursorY(null);
              }}
              onPointerDown={handleRailPointerDown}
              onPointerMove={handleRailPointerMove}
              onPointerUp={finishRailScrub}
              onPointerCancel={finishRailScrub}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {filmProjects.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (railClickSuppressedRef.current) return;
                    goToRailIndex(i);
                  }}
                  className="grid place-items-center"
                  style={{
                    width: DOT_HIT_SIZE,
                    height: DOT_HIT_SIZE,
                  }}
                  aria-label={`Go to project ${i + 1}`}
                >
                  <span
                    className="block rounded-full transition-[background-color,opacity,transform] duration-200 ease-out"
                    style={{
                      width: i === activeIndex ? 7 : 5,
                      height: i === activeIndex ? 7 : 5,
                      background: i === activeIndex ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.34)",
                      opacity: i === activeIndex ? 1 : 0.82,
                      transform: `scale(${getDotScale(i)})`,
                      transformOrigin: "center",
                    }}
                  />
                </button>
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

        {/* Focus View Modal — client-side */}
        {focusedProject && (
          <FocusViewModal
            project={focusedProject}
            onClose={() => setFocusedProject(null)}
          />
        )}
      </div>
    </>
  );
}
