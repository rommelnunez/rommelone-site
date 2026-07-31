"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { FormEvent } from "react";
import type { Project } from "@/lib/types";
import { getMuxThumbnail } from "@/lib/mux";
import SlideVideoPreview from "./SlideVideoPreview";
import PhotoDrawer from "./PhotoDrawer";
import FocusViewModal from "./FocusViewModal";
import ProgressiveImage from "./ProgressiveImage";
import CampaignRack from "./CampaignRack";
import PlaceholderFrame from "./PlaceholderFrame";
import LoadingScreen from "./LoadingScreen";

type MediaFilter = "film" | "photography";
type WorkSection = "music-videos" | "commercials";

const EDGE_PAD = 48;

// ─── Feature flags ───
const AUTOPLAY_PREVIEW = true;
const AUTOPLAY_START_SECONDS = 30;
const SHOW_PHOTO_SECTION = false; // Set to true to re-enable photography drawer
const AUTO_ADVANCE_DELAY = 6000; // ms after video fade-in to auto-advance
const CUT_ADVANCE_DELAY = 4200; // ms per campaign cut before auto-stepping
const STATIC_ADVANCE_DELAY = 5000; // ms for slides with no playable video
const DOT_HIT_SIZE = 28;
const DOT_MAGNET_RADIUS = 62;
const SECTION_FADE_MS = 350;

const isCampaign = (p: Project) => p.videos.length > 0;
const isCommercial = (p: Project) => p.projectType === "commercial";
const pad = (n: number) => String(n).padStart(2, "0");

interface ProjectSlideshowProps {
  projects: Project[];
  siteTitle: string;
}

export default function ProjectSlideshow({
  projects,
}: ProjectSlideshowProps) {
  const [focusedProject, setFocusedProject] = useState<Project | null>(null);
  const [focusedCutIndex, setFocusedCutIndex] = useState(0);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("film");
  const [workSection, setWorkSection] = useState<WorkSection>("music-videos");
  const [activeIndex, setActiveIndex] = useState(0);
  const [cutIndex, setCutIndex] = useState(0);
  const [deckFading, setDeckFading] = useState(false);
  const [unlockedProjects, setUnlockedProjects] = useState<string[]>([]);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const locked = useRef(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubIndexRef = useRef(0);
  const railScrubbingRef = useRef(false);
  const railClickSuppressedRef = useRef(false);
  const userNavRef = useRef(false);

  // Custom cursor state
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorOverUI, setCursorOverUI] = useState(false);
  const [railCursorY, setRailCursorY] = useState<number | null>(null);
  const [railScrubbing, setRailScrubbing] = useState(false);

  const isPhotos = mediaFilter === "photography";

  // Partition projects
  const filmProjects = useMemo(
    () =>
      projects.filter(
        (p) => p.muxPlaybackId || p.videos.length > 0 || p.placeholder
      ),
    [projects]
  );
  const photoProjects = useMemo(
    () =>
      projects.filter(
        (p) => !p.muxPlaybackId && p.videos.length === 0 && !p.placeholder
      ),
    [projects]
  );
  const musicVideoProjects = useMemo(
    () => filmProjects.filter((p) => !isCommercial(p)),
    [filmProjects]
  );
  const commercialProjects = useMemo(
    () => filmProjects.filter(isCommercial),
    [filmProjects]
  );
  const deck = workSection === "commercials" ? commercialProjects : musicVideoProjects;
  const current = deck[activeIndex];
  const currentIsCampaign = current ? isCampaign(current) : false;
  const currentIsProtected = Boolean(
    current?.accessPassword && !unlockedProjects.includes(current.slug)
  );

  const sectionCounts = {
    "music-videos": musicVideoProjects.length,
    commercials: commercialProjects.length,
  };

  // Refs mirrored for event handlers registered once
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  scrubIndexRef.current = activeIndex;
  const cutIndexRef = useRef(cutIndex);
  cutIndexRef.current = cutIndex;
  const deckRef = useRef(deck);
  deckRef.current = deck;

  // Reset cut + user override when the slide or section changes
  useEffect(() => {
    setCutIndex(0);
    userNavRef.current = false;
  }, [activeIndex, workSection]);

  useEffect(() => {
    setPasswordInput("");
    setPasswordError(false);
  }, [current?.slug]);

  useEffect(() => {
    const root = document.documentElement;
    const campaignIsActive = currentIsCampaign && !isPhotos;
    root.classList.toggle("campaign-active", campaignIsActive);

    return () => {
      root.classList.remove("campaign-active");
    };
  }, [currentIsCampaign, isPhotos]);

  // Clamp index when deck shrinks
  useEffect(() => {
    if (activeIndex >= deck.length && deck.length > 0) {
      setActiveIndex(deck.length - 1);
    }
  }, [activeIndex, deck.length]);

  // ─── Auto-advance (video-driven): called when a slide video fade-in completes ───
  const scheduleAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      if (locked.current) return;
      locked.current = true;
      setActiveIndex((prev) =>
        prev + 1 < deckRef.current.length ? prev + 1 : 0
      );
      setTimeout(() => {
        locked.current = false;
      }, 1100);
    }, AUTO_ADVANCE_DELAY);
  }, []);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, []);

  // Clear video-driven timer when user navigates
  useEffect(() => {
    clearAutoAdvance();
  }, [activeIndex, clearAutoAdvance]);

  // ─── Auto-advance (timer-driven): campaigns and placeholder slides ───
  useEffect(() => {
    if (isPhotos || focusedProject || deckFading || currentIsProtected) return;
    const slide = deck[activeIndex];
    if (!slide) return;
    // Slides with a single preview video are handled by scheduleAutoAdvance
    if (slide.muxPlaybackId && !isCampaign(slide)) return;

    const campaign = isCampaign(slide);
    const delay = campaign ? CUT_ADVANCE_DELAY : STATIC_ADVANCE_DELAY;
    const timer = setTimeout(() => {
      if (locked.current || userNavRef.current) return;
      if (campaign) {
        // Campaigns loop their own cuts; vertical scroll moves between projects
        setCutIndex((cutIndex + 1) % slide.videos.length);
      } else {
        setActiveIndex((prev) =>
          prev + 1 < deckRef.current.length ? prev + 1 : 0
        );
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [
    deck,
    activeIndex,
    cutIndex,
    isPhotos,
    focusedProject,
    deckFading,
    currentIsProtected,
  ]);

  // ─── Navigation ───
  const advance = useCallback(
    (direction: 1 | -1) => {
      if (locked.current || isPhotos) return;
      const next = activeIndexRef.current + direction;
      if (next < 0 || next >= deckRef.current.length) return;
      locked.current = true;
      setActiveIndex(next);
      setTimeout(() => {
        locked.current = false;
      }, 1100);
    },
    [isPhotos]
  );

  // Unified step: one gesture drives everything. On a campaign slide each
  // step moves one cut; past the ends it flows on to the adjacent project.
  const step = useCallback(
    (direction: 1 | -1) => {
      if (locked.current || isPhotos) return;
      const slide = deckRef.current[activeIndexRef.current];
      if (slide && slide.videos.length > 0) {
        const next = cutIndexRef.current + direction;
        if (next >= 0 && next < slide.videos.length) {
          userNavRef.current = true;
          locked.current = true;
          setCutIndex(next);
          setTimeout(() => {
            locked.current = false;
          }, 550);
          return;
        }
      }
      advance(direction);
    },
    [advance, isPhotos]
  );
  const stepRef = useRef(step);
  stepRef.current = step;

  const selectCut = useCallback((i: number) => {
    userNavRef.current = true;
    setCutIndex(i);
  }, []);

  const goToRailIndex = useCallback((i: number) => {
    if (
      i < 0 ||
      i >= deckRef.current.length ||
      i === scrubIndexRef.current
    )
      return;
    scrubIndexRef.current = i;
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    locked.current = false;
    setActiveIndex(i);
  }, []);

  // ─── Section switching (crossfade) ───
  const switchSection = useCallback(
    (next: WorkSection) => {
      if (next === workSection || deckFading) return;
      if (next === "commercials" && commercialProjects.length === 0) return;
      clearAutoAdvance();
      setDeckFading(true);
      window.setTimeout(() => {
        setWorkSection(next);
        setActiveIndex(0);
        setCutIndex(0);
        userNavRef.current = false;
        setDeckFading(false);
      }, SECTION_FADE_MS);
    },
    [workSection, deckFading, commercialProjects.length, clearAutoAdvance]
  );

  // ─── Rail scrubbing ───
  const getRailIndexFromClientY = useCallback((clientY: number) => {
    const rail = railRef.current;
    const len = deckRef.current.length;
    if (!rail || len === 0) return activeIndexRef.current;

    const rect = rail.getBoundingClientRect();
    const localY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    const progress = rect.height === 0 ? 0 : localY / rect.height;
    return Math.min(len - 1, Math.max(0, Math.round(progress * (len - 1))));
  }, []);

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
        i * ((rect.height - DOT_HIT_SIZE) / Math.max(1, deck.length - 1));
      const distance = Math.abs(railCursorY - centerY);
      const influence = Math.max(0, 1 - distance / DOT_MAGNET_RADIUS);

      return activeBase + influence * 1.25;
    },
    [activeIndex, deck.length, railCursorY]
  );

  // ─── Mouse wheel: one axis — steps cuts inside campaigns, projects otherwise ───
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let accumulated = 0;
    let decayTimer: ReturnType<typeof setTimeout> | null = null;
    const THRESHOLD = 50; // px of scroll delta needed to trigger a step

    const onWheel = (e: WheelEvent) => {
      if (mediaFilter === "photography") return;
      e.preventDefault();
      if (locked.current) return;

      // Use the dominant axis so trackpad horizontal swipes work too
      const delta =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

      accumulated += delta;
      if (decayTimer) clearTimeout(decayTimer);
      decayTimer = setTimeout(() => {
        accumulated = 0;
      }, 200);

      if (Math.abs(accumulated) < THRESHOLD) return;

      const dir = accumulated > 0 ? 1 : -1;
      accumulated = 0;
      stepRef.current(dir);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [mediaFilter]);

  // ─── Touch: swipe (either axis) = same unified step ───
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isPhotos) return;
    const deltaX = touchStart.current.x - e.changedTouches[0].clientX;
    const deltaY = touchStart.current.y - e.changedTouches[0].clientY;
    const delta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
    if (Math.abs(delta) > 50) {
      step(delta > 0 ? 1 : -1);
    }
  };

  // ─── Keyboard ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPhotos || focusedProject) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, isPhotos, focusedProject]);

  // ─── Custom cursor tracking ───
  const onMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const onMouseEnter = () => setCursorVisible(true);
  const onMouseLeave = () => setCursorVisible(false);

  const handleSlideClick = () => {
    if (isPhotos) return;
    if (current) {
      setFocusedCutIndex(0);
      setFocusedProject(current);
    }
  };

  const handleCampaignUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!current?.accessPassword) return;

    if (passwordInput === current.accessPassword) {
      setUnlockedProjects((projects) =>
        projects.includes(current.slug) ? projects : [...projects, current.slug]
      );
      setPasswordInput("");
      setPasswordError(false);
      return;
    }

    setPasswordError(true);
  };

  const getThumbnail = (project: Project): string | null => {
    return project.images[0]?.src || getMuxThumbnail(project.muxPlaybackId);
  };

  // Preload upcoming slide thumbnails
  useEffect(() => {
    if (isPhotos) return;

    const urls = [deck[activeIndex + 1], deck[activeIndex + 2]]
      .map((project) => (project ? getThumbnail(project) : null))
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
  }, [activeIndex, deck, isPhotos]);

  const loaderSrcs = useMemo(
    () =>
      musicVideoProjects
        .map((p) => p.images[0]?.src || getMuxThumbnail(p.muxPlaybackId))
        .filter((src): src is string => Boolean(src))
        .slice(0, 5),
    [musicVideoProjects]
  );

  const role =
    current?.description?.replace(/<[^>]*>/g, "").trim().split("\n")[0] || "";
  const showPlayCursor =
    !isPhotos &&
    !currentIsProtected &&
    cursorVisible &&
    !cursorOverUI &&
    !!current;

  const sectionTab = (key: WorkSection, label: string) => {
    const active = workSection === key;
    const empty = sectionCounts[key] === 0;
    return (
      <button
        key={key}
        type="button"
        onClick={() => switchSection(key)}
        disabled={empty}
        className={`flex items-baseline gap-2 text-sm sm:text-base uppercase tracking-[0.12em] transition-all duration-300 ${
          active
            ? currentIsCampaign
              ? "campaign-chrome-primary"
              : "text-white"
            : empty
              ? currentIsCampaign
                ? "campaign-chrome-inactive cursor-default opacity-55"
                : "cursor-default text-white/20"
              : currentIsCampaign
                ? "campaign-chrome-inactive cursor-pointer"
                : "cursor-pointer text-white/35 hover:text-white/70"
        }`}
      >
        <span>{label}</span>
        {empty && (
          <span className="text-[10px] uppercase tracking-[0.1em] opacity-45">
            soon
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <LoadingScreen imageSrcs={loaderSrcs} />
      <div
        ref={containerRef}
        className={`fixed inset-0 w-full select-none ${
          isPhotos
            ? "cursor-default overflow-y-auto"
            : `overflow-hidden ${showPlayCursor ? "cursor-none" : "cursor-default"}`
        }`}
        style={{ height: "100dvh" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseMove={onMouseMove}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Custom play cursor — only over slides that open the focus view */}
        {showPlayCursor && (
          <div
            className={`pointer-events-none fixed z-50 ${
              currentIsCampaign ? "campaign-adaptive-chrome" : ""
            }`}
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm">
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" className="ml-0.5">
                <path d="M0 0L18 10L0 20V0Z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
          </div>
        )}

        {/* Background slides — always rendered, shrinks when photos open */}
        <div
          className="relative w-full transition-all duration-700 ease-in-out"
          style={{
            height: isPhotos ? "0" : "100dvh",
            opacity: deckFading ? 0 : 1,
            transition: `opacity ${SECTION_FADE_MS}ms ease-in-out, height 700ms ease-in-out`,
          }}
        >
          {deck.map((project, i) => {
            const isActive = i === activeIndex;
            const isNearby = Math.abs(i - activeIndex) <= 1;
            if (!isNearby) return null;

            if (isCampaign(project)) {
              return (
                <div
                  key={project.slug}
                  className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
                  style={{
                    opacity: isActive ? 1 : 0,
                    zIndex: isActive ? 1 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                >
                  <CampaignRack
                    project={project}
                    cutIndex={isActive ? cutIndex : 0}
                    isActive={
                      isActive &&
                      !isPhotos &&
                      !railScrubbing &&
                      !currentIsProtected
                    }
                    onCutSelect={selectCut}
                    onActiveCutClick={() => {
                      if (currentIsProtected) return;
                      setFocusedCutIndex(cutIndex);
                      setFocusedProject(project);
                    }}
                    onUIHover={setCursorOverUI}
                  />
                </div>
              );
            }

            const thumb = getThumbnail(project);
            if (!thumb && !project.placeholder) return null;
            const showVideo =
              AUTOPLAY_PREVIEW &&
              isActive &&
              project.muxPlaybackId &&
              !isPhotos &&
              !railScrubbing;

            return (
              <div
                key={project.slug}
                className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
                style={{
                  opacity: isActive ? 1 : 0,
                  zIndex: isActive ? 1 : 0,
                }}
              >
                {thumb ? (
                  <ProgressiveImage
                    src={thumb}
                    alt={project.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={i <= 1}
                    revealClassName="duration-[900ms] ease-out"
                  />
                ) : (
                  <PlaceholderFrame
                    label="16:9 · placeholder"
                    sublabel="Add a Mux playback ID to replace"
                    hueSeed={project.slug.length}
                  />
                )}
                {showVideo && (
                  <SlideVideoPreview
                    playbackId={project.muxPlaybackId!}
                    startTime={AUTOPLAY_START_SECONDS}
                    onPlaybackStarted={scheduleAutoAdvance}
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
              </div>
            );
          })}

          {!isPhotos && currentIsCampaign && (
            <div className="campaign-mobile-scrim pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
          )}

          {!isPhotos && current && currentIsProtected && (
            <div
              className="absolute inset-0 z-[25] flex cursor-default items-center justify-center bg-black/20 px-6 backdrop-blur-[34px] backdrop-saturate-50"
              onClick={(event) => event.stopPropagation()}
              onMouseEnter={() => setCursorOverUI(true)}
              onMouseLeave={() => setCursorOverUI(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="campaign-password-title"
            >
              <form
                className="w-full max-w-sm text-center text-white"
                onSubmit={handleCampaignUnlock}
              >
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/55">
                  Private campaign
                </p>
                <h2
                  id="campaign-password-title"
                  className="mt-4 text-[clamp(1.55rem,3.5vw,2.4rem)] font-light leading-none tracking-[-0.03em]"
                >
                  {current.title.split(" – ")[0]}
                </h2>
                <p className="mt-3 text-sm font-light tracking-[0.02em] text-white/75">
                  Enter password to view
                </p>
                <div className="mt-8 flex items-center border-b border-white/55">
                  <label className="sr-only" htmlFor="campaign-password">
                    Password for {current.title}
                  </label>
                  <input
                    id="campaign-password"
                    type="password"
                    value={passwordInput}
                    onChange={(event) => {
                      setPasswordInput(event.target.value);
                      if (passwordError) setPasswordError(false);
                    }}
                    autoComplete="current-password"
                    autoFocus
                    placeholder="Password"
                    aria-describedby="campaign-password-status"
                    className="min-w-0 flex-1 bg-transparent py-3 text-base font-light tracking-[0.04em] text-white outline-none placeholder:text-white/40"
                  />
                  <button
                    type="submit"
                    className="group px-1 py-2 text-white/75 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white"
                    aria-label="Unlock campaign"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 place-items-center rounded-full border border-current text-[18px] font-light leading-none transition-transform duration-300 group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </button>
                </div>
                <p
                  id="campaign-password-status"
                  className={`mt-3 min-h-4 text-[11px] tracking-[0.08em] transition-opacity ${
                    passwordError ? "opacity-70" : "opacity-0"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  Password not recognized
                </p>
              </form>
            </div>
          )}

          {/* Click layer — opens focus view (campaigns handle clicks in the rack) */}
          {!isPhotos && current && !currentIsCampaign && (
            <div
              className="absolute inset-0 z-10 cursor-none"
              onClick={handleSlideClick}
            />
          )}

          {/* Title + meta — anchored lower-left on the gradient scrim */}
          {!isPhotos && current && (
            <div
              className={`pointer-events-none absolute z-20 ${
                currentIsCampaign ? "campaign-adaptive-chrome" : ""
              }`}
              style={{ left: EDGE_PAD, right: EDGE_PAD, bottom: 96 }}
            >
              <h1
                className={`text-[clamp(1rem,2.2vw,2rem)] font-light leading-[1.05] tracking-[-0.02em] ${
                  currentIsCampaign ? "campaign-chrome-primary" : "text-white/90"
                }`}
                style={{
                  maxWidth: "min(80vw, 400px)",
                  textShadow: currentIsCampaign
                    ? "var(--campaign-text-shadow)"
                    : "0 1px 30px rgba(0,0,0,0.4)",
                }}
              >
                {current.title}
              </h1>
              <div
                className={`mt-2.5 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] ${
                  currentIsCampaign ? "campaign-chrome-muted" : "text-white/50"
                }`}
              >
                {role && <span>{role}</span>}
                {role && current.year && <span className="opacity-40">·</span>}
                {current.year && <span>{current.year}</span>}
              </div>
            </div>
          )}

          {/* Dot navigation rail */}
          {!isPhotos && deck.length > 1 && (
            <div
              ref={railRef}
              className={`absolute top-1/2 z-20 flex -translate-y-1/2 touch-none flex-col items-center py-3 ${
                currentIsCampaign ? "campaign-adaptive-chrome" : ""
              }`}
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
              {deck.map((project, i) => (
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
                  aria-label={`Go to project ${i + 1}${isCampaign(project) ? ` (campaign, ${project.videos.length} cuts)` : ""}`}
                >
                  <span
                    className="block rounded-full transition-[background-color,opacity,transform] duration-200 ease-out"
                    style={{
                      width: i === activeIndex ? 7 : 5,
                      height: i === activeIndex ? 7 : 5,
                      background:
                        i === activeIndex
                          ? currentIsCampaign
                            ? "var(--campaign-dot-active)"
                            : "rgba(255,255,255,0.95)"
                          : currentIsCampaign
                            ? "var(--campaign-dot-idle)"
                            : "rgba(255,255,255,0.34)",
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

        {/* Bottom bar — section nav (left) + index (right) */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 flex items-end justify-between ${
            currentIsCampaign ? "campaign-adaptive-chrome" : ""
          }`}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => setCursorOverUI(true)}
          onMouseLeave={() => setCursorOverUI(false)}
          style={{
            padding: `0 24px`,
            paddingBottom: 24,
            cursor: "default",
            background: isPhotos
              ? "linear-gradient(to top, var(--color-bg) 60%, transparent)"
              : undefined,
          }}
        >
          <div className="flex items-end gap-8">
            {SHOW_PHOTO_SECTION && (
              <nav className="flex gap-7">
                {(["film", "photography"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMediaFilter(f)}
                    className={`
                    cursor-pointer border-b pb-0.5 text-sm uppercase tracking-[0.12em] transition-all duration-300
                    ${
                      mediaFilter === f
                        ? `${isPhotos ? "text-[var(--color-text)]" : "text-white"} ${isPhotos ? "border-[var(--color-text)]" : "border-white"}`
                        : `${isPhotos ? "text-[var(--color-text-muted)]" : "text-white/35"} border-transparent ${isPhotos ? "hover:text-[var(--color-text)]" : "hover:text-white/60"}`
                    }
                  `}
                  >
                    {f}
                  </button>
                ))}
              </nav>
            )}
            {!isPhotos && (
              <nav className="flex items-end gap-7">
                {sectionTab("music-videos", "Music Videos")}
                {sectionTab("commercials", "Commercial")}
              </nav>
            )}
          </div>

        </div>

        {/* Focus View Modal — client-side */}
        {focusedProject && (
          <FocusViewModal
            project={focusedProject}
            cutIndex={focusedCutIndex}
            onClose={() => setFocusedProject(null)}
          />
        )}
      </div>
    </>
  );
}
