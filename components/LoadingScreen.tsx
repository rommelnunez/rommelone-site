"use client";

import { useState, useEffect } from "react";

const MIN_DISPLAY_MS = 1400; // enough for the signature wipe to complete
const MAX_WAIT_MS = 2500; // never block longer than this
const FADE_MS = 600;

interface LoadingScreenProps {
  imageSrcs: string[];
}

export default function LoadingScreen({ imageSrcs }: LoadingScreenProps) {
  const [phase, setPhase] = useState<"intro" | "fading" | "done">("intro");

  useEffect(() => {
    // The ident plays once per session — skip on repeat views
    if (sessionStorage.getItem("introSeen")) {
      setPhase("done");
      return;
    }
    sessionStorage.setItem("introSeen", "1");

    const start = performance.now();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const wait = Math.max(0, MIN_DISPLAY_MS - (performance.now() - start));
      window.setTimeout(() => {
        setPhase("fading");
        window.setTimeout(() => setPhase("done"), FADE_MS);
      }, wait);
    };

    // Dissolve as soon as the first slide's poster is ready
    const first = imageSrcs[0];
    if (first) {
      const img = new window.Image();
      img.onload = finish;
      img.onerror = finish;
      img.src = first;
    } else {
      finish();
    }
    const fallback = window.setTimeout(finish, MAX_WAIT_MS);
    return () => window.clearTimeout(fallback);
  }, [imageSrcs]);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      style={{
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://lkcg0hfyci0wodry.public.blob.vercel-storage.com/uploads/sig_black.PNG"
        alt=""
        className="w-28 h-auto select-none invert sm:w-32"
        draggable={false}
        style={{
          clipPath: "inset(0 100% 0 0)",
          animation: "sig-reveal 1100ms cubic-bezier(0.65, 0, 0.35, 1) 150ms forwards",
        }}
      />
    </div>
  );
}
