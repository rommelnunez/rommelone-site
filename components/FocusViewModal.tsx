"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import MuxPlayer from "@mux/mux-player-react";
import FocusViewCarousel, { buildCarouselItems } from "./FocusViewCarousel";
import { getMuxThumbnail } from "@/lib/mux";
import type { Project } from "@/lib/types";

const EDGE_PAD = 48;
const HIDE_UI_DELAY = 3000;

interface FocusViewModalProps {
  project: Project;
}

export default function FocusViewModal({ project }: FocusViewModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const playerRef = useRef<any>(null);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [uiVisible, setUiVisible] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom cursor
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorOverUI, setCursorOverUI] = useState(false);

  const videoThumb = getMuxThumbnail(project.muxPlaybackId);
  const carouselItems = buildCarouselItems(
    project.muxPlaybackId,
    project.images,
    videoThumb
  );

  const isVideo = !!project.muxPlaybackId;
  const currentItem = carouselItems[activeIndex] || carouselItems[0];
  const showingVideo = activeIndex === 0 && isVideo;

  // --- UI auto-hide ---
  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setUiVisible(false), HIDE_UI_DELAY);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  // --- Open / close ---
  const close = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      dialogRef.current?.close();
      router.back();
    }, 400);
  }, [router]);

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

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // --- Playback controls ---
  const getVideo = (): HTMLVideoElement | null => {
    const el = playerRef.current;
    if (!el) return null;
    // MuxPlayer exposes the underlying media element
    return (el as any).media?.nativeEl || el.querySelector?.("video") || null;
  };

  const togglePlay = () => {
    const vid = getVideo();
    if (!vid) return;
    if (vid.paused) {
      vid.play();
    } else {
      vid.pause();
    }
  };

  const toggleMute = () => {
    const vid = getVideo();
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  };

  const toggleFullscreen = () => {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  // Track progress via timeupdate + polling
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

  // Scrubber seek
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const vid = getVideo();
    if (vid && vid.duration) {
      vid.currentTime = pct * vid.duration;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) close();
  };

  // Cursor handlers
  const onMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    resetHideTimer();
  };

  // Click video area to toggle play
  const handleVideoClick = () => {
    togglePlay();
  };

  const role = project.description?.replace(/<[^>]*>/g, "").trim().split("\n")[0] || "";

  return (
    <dialog
      ref={dialogRef}
      className="focus-view fixed inset-0 m-0 w-screen h-screen max-w-none max-h-none overflow-hidden p-0 border-0 bg-black"
      onClick={handleBackdropClick}
      onClose={close}
    >
      <div
        className="relative h-screen cursor-none"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease-in-out" }}
        onMouseMove={onMouseMove}
        onMouseEnter={() => setCursorVisible(true)}
        onMouseLeave={() => setCursorVisible(false)}
      >
        {/* Custom play/pause cursor */}
        {cursorVisible && !cursorOverUI && (
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
                /* Pause icon */
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                  <rect x="0" y="0" width="5" height="20" fill="white" fillOpacity="0.9" />
                  <rect x="11" y="0" width="5" height="20" fill="white" fillOpacity="0.9" />
                </svg>
              ) : (
                /* Play icon */
                <svg width="18" height="20" viewBox="0 0 18 20" fill="none" className="ml-0.5">
                  <path d="M0 0L18 10L0 20V0Z" fill="white" fillOpacity="0.9" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Main media — fills the screen */}
        <div className="absolute inset-0 bg-black" onClick={handleVideoClick}>
          {showingVideo ? (
            <MuxPlayer
              ref={playerRef}
              playbackId={project.muxPlaybackId!}
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
              <Image
                src={currentItem.src}
                alt={currentItem.alt}
                width={1800}
                height={1200}
                className="max-w-full max-h-full object-contain"
                priority
                unoptimized
              />
            </div>
          ) : null}
        </div>

        {/* Close X — top right */}
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

        {/* Bottom UI — scrubber + footer */}
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
          {/* Scrubber */}
          {showingVideo && (
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

          {/* Footer bar */}
          <div
            className="flex items-center justify-between"
            style={{ padding: `16px ${EDGE_PAD}px`, paddingBottom: EDGE_PAD / 2 }}
          >
            {showingVideo ? (
              <button
                onClick={togglePlay}
                className="text-white/60 hover:text-white text-xs tracking-[0.15em] uppercase cursor-pointer transition-colors"
              >
                {playing ? "Pause" : "Play"}
              </button>
            ) : <div />}

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

            {showingVideo ? (
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
