"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
});
import FocusViewCarousel, { buildCarouselItems } from "./FocusViewCarousel";
import { getMuxThumbnail } from "@/lib/mux";
import type { Project } from "@/lib/types";
import ProgressiveImage from "./ProgressiveImage";
import PlaceholderFrame from "./PlaceholderFrame";

const EDGE_PAD = 48;
const HIDE_UI_DELAY = 3000;

interface FocusViewModalProps {
  project: Project;
  /** For campaign projects: which cut to focus */
  cutIndex?: number;
  onClose?: () => void;
}

export default function FocusViewModal({ project, cutIndex = 0, onClose }: FocusViewModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const playerRef = useRef<any>(null);

  const cut =
    project.videos.length > 0
      ? project.videos[Math.min(cutIndex, project.videos.length - 1)]
      : null;
  const playbackId = cut ? cut.playbackId : project.muxPlaybackId;

  const videoThumb = cut?.poster || getMuxThumbnail(playbackId);
  const carouselItems = buildCarouselItems(
    playbackId,
    project.images,
    videoThumb
  );

  const isVideo = !!playbackId;
  // Placeholders get the full player chrome so the interaction matches
  // what real videos will do once playback IDs are added
  const videoLike = isVideo || project.placeholder;

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(!isVideo && videoLike);
  const [muted, setMuted] = useState(true);
  const [uiVisible, setUiVisible] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorOverUI, setCursorOverUI] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const creditsOpenRef = useRef(false);
  creditsOpenRef.current = creditsOpen;

  // Parse the markdown body into credit rows ("Role: Name" per line)
  const credits = useMemo(() => {
    const clean = (project.body || "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_#>`]/g, "");
    return clean
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(":");
        if (idx > 0 && idx < line.length - 1) {
          return {
            role: line.slice(0, idx).trim(),
            name: line.slice(idx + 1).trim(),
          };
        }
        return { role: "", name: line };
      });
  }, [project.body]);
  const hasCredits = credits.length > 0;

  const currentItem = carouselItems[activeIndex] || carouselItems[0];
  const showingVideo = activeIndex === 0 && isVideo;
  const showChrome = showingVideo || (videoLike && !isVideo);

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!creditsOpenRef.current) setUiVisible(false);
    }, HIDE_UI_DELAY);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      dialogRef.current?.close();
      if (onClose) onClose();
      else router.back();
    }, 400);
  }, [router, onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => setVisible(true));
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (creditsOpenRef.current) setCreditsOpen(false);
        else close();
      }
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const getVideo = (): HTMLVideoElement | null => {
    const el = playerRef.current;
    if (!el) return null;
    return (el as any).media?.nativeEl || el.querySelector?.("video") || null;
  };

  const togglePlay = () => {
    const vid = getVideo();
    if (!vid) {
      if (videoLike) setPlaying((p) => !p);
      return;
    }
    if (vid.paused) vid.play();
    else vid.pause();
  };

  const toggleMute = () => {
    const vid = getVideo();
    if (!vid) {
      if (videoLike) setMuted((m) => !m);
      return;
    }
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  };

  const toggleFullscreen = () => {
    const el = playerRef.current ?? dialogRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  useEffect(() => {
    if (!showingVideo) return;
    let raf: number;
    const tick = () => {
      const vid = getVideo();
      if (vid && vid.duration > 0) {
        setProgress(vid.currentTime / vid.duration);
        setPlaying(!vid.paused);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showingVideo]);

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const vid = getVideo();
    if (vid && vid.duration) vid.currentTime = pct * vid.duration;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) close();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    resetHideTimer();
  };

  const handleVideoClick = () => togglePlay();

  const role = project.description?.replace(/<[^>]*>/g, "").trim().split("\n")[0] || "";

  return (
    <dialog
      ref={dialogRef}
      className="focus-view fixed inset-0 m-0 w-screen h-screen max-w-none max-h-none overflow-hidden p-0 border-0 bg-black"
      onClick={handleBackdropClick}
      onClose={close}
    >
      <div
        className={`relative h-screen ${videoLike ? "cursor-none" : "cursor-default"}`}
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease-in-out" }}
        onMouseMove={onMouseMove}
        onMouseEnter={() => setCursorVisible(true)}
        onMouseLeave={() => setCursorVisible(false)}
      >
        {videoLike && cursorVisible && !cursorOverUI && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              transform: "translate(-50%, -50%)",
              opacity: uiVisible ? 1 : 0.4,
              transition: "opacity 0.3s ease",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
              {playing ? (
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                  <rect x="0" y="0" width="5" height="20" fill="white" fillOpacity="0.9" />
                  <rect x="11" y="0" width="5" height="20" fill="white" fillOpacity="0.9" />
                </svg>
              ) : (
                <svg width="18" height="20" viewBox="0 0 18 20" fill="none" className="ml-0.5">
                  <path d="M0 0L18 10L0 20V0Z" fill="white" fillOpacity="0.9" />
                </svg>
              )}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-black" onClick={handleVideoClick}>
          {showingVideo ? (
            <MuxPlayer
              ref={playerRef}
              playbackId={playbackId!}
              poster={cut?.poster}
              autoPlay="muted"
              muted={muted}
              streamType="on-demand"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              style={{
                width: "100%",
                height: "100%",
                "--controls": "none",
                "--media-object-fit": "contain",
              }}
            />
          ) : currentItem ? (
            <div className="w-full h-full flex items-center justify-center">
              <ProgressiveImage
                src={currentItem.src}
                alt={currentItem.alt}
                width={1800}
                height={1200}
                className="max-w-full max-h-full object-contain"
                priority
              />
            </div>
          ) : project.placeholder ? (
            <div className="flex h-full w-full items-center justify-center p-12">
              <div
                style={
                  cut
                    ? { height: "84%", aspectRatio: "9 / 16" }
                    : { width: "min(84%, 1280px)", aspectRatio: "16 / 9" }
                }
              >
                <PlaceholderFrame
                  index={cut ? cutIndex : undefined}
                  sublabel={cut ? "9:16 · placeholder" : "16:9 · placeholder"}
                  hueSeed={project.slug.length + cutIndex}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="absolute top-8 right-8 z-30"
          onMouseEnter={() => setCursorOverUI(true)}
          onMouseLeave={() => setCursorOverUI(false)}
          style={{
            opacity: uiVisible ? 1 : 0,
            transition: "opacity 0.5s ease",
            pointerEvents: uiVisible ? "auto" : "none",
            cursor: "pointer",
          }}
        >
          <button onClick={close} aria-label="Close" className="group cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 20 20" className="text-white/60 group-hover:text-white transition-colors">
              <line x1="1" y1="1" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5" />
              <line x1="19" y1="1" x2="1" y2="19" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Credits panel — slides in from the right */}
        {hasCredits && (
          <div
            className="absolute bottom-0 right-0 top-0 z-[25] overflow-y-auto"
            style={{
              width: "min(420px, 88vw)",
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              transform: creditsOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
              pointerEvents: creditsOpen ? "auto" : "none",
              cursor: "default",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setCursorOverUI(true)}
            onMouseLeave={() => setCursorOverUI(false)}
          >
            <div style={{ padding: "96px 40px 72px" }}>
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                Credits
              </h2>
              <p className="mt-1.5 text-sm text-white/85">{project.title}</p>
              <div className="mt-8">
                {credits.map((c, i) =>
                  c.role ? (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-6 border-b border-white/[0.06] py-2"
                    >
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-white/40">
                        {c.role}
                      </span>
                      <span className="text-right text-[13px] leading-snug text-white/85">
                        {c.name}
                      </span>
                    </div>
                  ) : (
                    <p key={i} className="py-2 text-[13px] text-white/70">
                      {c.name}
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <div
          className="absolute bottom-0 left-0 right-0 z-20"
          onMouseEnter={() => setCursorOverUI(true)}
          onMouseLeave={() => setCursorOverUI(false)}
          style={{
            opacity: uiVisible ? 1 : 0,
            transition: "opacity 0.5s ease",
            pointerEvents: uiVisible ? "auto" : "none",
            cursor: "default",
          }}
        >
          {showChrome && (
            <div
              className="w-full cursor-pointer"
              style={{ height: 1, background: "rgba(255,255,255,0.2)" }}
              onClick={handleScrubberClick}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress * 100}%`,
                  background: "rgba(255,255,255,0.8)",
                }}
              />
            </div>
          )}

          <div
            className="flex items-center justify-between"
            style={{ padding: `16px ${EDGE_PAD}px`, paddingBottom: EDGE_PAD / 2 }}
          >
            <div className="flex items-center gap-5">
              {showChrome && (
                <button
                  onClick={togglePlay}
                  className="text-white/60 hover:text-white text-xs tracking-[0.15em] uppercase cursor-pointer transition-colors"
                >
                  {playing ? "Pause" : "Play"}
                </button>
              )}
              {hasCredits && (
                <button
                  onClick={() => {
                    setCreditsOpen((o) => !o);
                    resetHideTimer();
                  }}
                  className={`text-xs tracking-[0.15em] uppercase cursor-pointer transition-colors focus:outline-none ${
                    creditsOpen ? "text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  {creditsOpen ? "Close Credits" : "Credits"}
                </button>
              )}
            </div>

            <div className="text-center">
              <span className="text-white/40 text-xs tracking-[0.1em]">
                <span className="font-medium text-white/60">{project.title.split(" - ")[0]}</span>
                {project.title.includes(" - ") && (
                  <span className="text-white/30">
                    {" "}| {project.title.split(" - ").slice(1).join(" - ")}
                  </span>
                )}
              </span>
            </div>

            {showChrome ? (
              <div className="flex items-center gap-5">
                <button
                  onClick={toggleMute}
                  className="text-white/60 hover:text-white text-xs tracking-[0.15em] uppercase cursor-pointer transition-colors"
                >
                  Sound {muted ? "Off" : "On"}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="text-white/60 hover:text-white text-xs tracking-[0.15em] uppercase cursor-pointer transition-colors"
                >
                  Fullscreen
                </button>
              </div>
            ) : <div />}
          </div>
        </div>
      </div>
    </dialog>
  );
}
