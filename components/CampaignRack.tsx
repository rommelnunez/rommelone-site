"use client";

import type { CSSProperties } from "react";
import type { Project } from "@/lib/types";
import { getMuxThumbnail } from "@/lib/mux";
import SlideVideoPreview from "./SlideVideoPreview";
import ProgressiveImage from "./ProgressiveImage";
import PlaceholderFrame from "./PlaceholderFrame";

const RACK_GAP = 28;
const RACK_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const FLANK_SCALE = 0.9;

interface CampaignRackProps {
  project: Project;
  cutIndex: number;
  /** Whether this slide is the active one in the deck (controls video playback) */
  isActive: boolean;
  onCutSelect: (i: number) => void;
  /** Clicking the active cut (or backdrop) opens the focus view */
  onActiveCutClick: () => void;
  /** Suppress the custom play cursor while hovering side cuts */
  onUIHover: (hovering: boolean) => void;
}

export default function CampaignRack({
  project,
  cutIndex,
  isActive,
  onCutSelect,
  onActiveCutClick,
  onUIHover,
}: CampaignRackProps) {
  const cuts = project.videos;
  const hueSeed = project.slug.length;

  return (
    <div
      className="absolute inset-0 cursor-none overflow-hidden"
      onClick={onActiveCutClick}
    >
      {/* Ambient backdrop — one layer per cut, crossfaded */}
      {cuts.map((cut, i) => {
        const thumb =
          cut.poster ||
          (cut.playbackId ? getMuxThumbnail(cut.playbackId, 320) : null);
        const hue = (((hueSeed + i) * 47) % 360 + 200) % 360;
        return (
          <div
            key={`bg-${i}`}
            className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
            style={{ opacity: i === cutIndex ? 1 : 0 }}
            aria-hidden
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(110% 90% at 30% 0%, hsl(${hue} 30% 16%) 0%, hsl(${(hue + 40) % 360} 16% 7%) 55%, #08080a 100%)`,
                }}
              />
            )}
          </div>
        );
      })}
      <div className="absolute inset-0 bg-black/55" />

      {/* Rack of vertical cuts */}
      <div
        className="absolute inset-0"
        style={
          {
            "--fh": "100dvh",
            "--fw": "calc(var(--fh) * 0.5625)",
          } as CSSProperties
        }
      >
        {cuts.map((cut, i) => {
          const offset = i - cutIndex;
          const isCurrent = offset === 0;
          const posterSrc =
            cut.poster ||
            (cut.playbackId ? getMuxThumbnail(cut.playbackId, 720) : null);
          if (Math.abs(offset) > 2) return null;

          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                if (!isCurrent) {
                  e.stopPropagation();
                  onCutSelect(i);
                }
              }}
              onMouseEnter={() => {
                if (!isCurrent) onUIHover(true);
              }}
              onMouseLeave={() => onUIHover(false)}
              aria-label={`Cut ${i + 1} of ${cuts.length}${cut.label ? `: ${cut.label}` : ""}`}
              className="absolute overflow-hidden focus:outline-none"
              style={{
                left: "50%",
                top: "50%",
                width: "var(--fw)",
                height: "var(--fh)",
                transform: `translate(-50%, -50%) translateX(calc((var(--fw) + ${RACK_GAP}px) * ${offset})) scale(${isCurrent ? 1 : FLANK_SCALE})`,
                opacity: isCurrent ? 1 : Math.abs(offset) === 1 ? 0.4 : 0.08,
                transition: `transform 700ms ${RACK_EASE}, opacity 700ms ${RACK_EASE}`,
                cursor: isCurrent ? "none" : "pointer",
                zIndex: isCurrent ? 2 : 1,
                boxShadow: isCurrent
                  ? "0 30px 80px rgba(0,0,0,0.55)"
                  : "0 20px 50px rgba(0,0,0,0.35)",
                backgroundColor: "#080808",
              }}
            >
              {posterSrc ? (
                <ProgressiveImage
                  src={posterSrc}
                  alt={cut.label || `${project.title} — cut ${i + 1}`}
                  fill
                  priority={isActive}
                  className="object-cover"
                  sizes="56.25vh"
                />
              ) : (
                <PlaceholderFrame
                  index={i}
                  sublabel="9:16 · placeholder"
                  hueSeed={hueSeed + i}
                />
              )}
              {cut.playbackId && isCurrent && isActive && (
                <SlideVideoPreview playbackId={cut.playbackId} startTime={0} />
              )}
              {!isCurrent && (
                <div className="absolute inset-0 bg-black/25 transition-colors duration-300 hover:bg-black/10" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
