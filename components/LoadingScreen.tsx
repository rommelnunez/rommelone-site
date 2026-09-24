"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_DISPLAY_MS = 1400; // let the signature wipe complete on the first visit
const MAX_WAIT_MS = 15000; // avoid a permanent black screen if an image fails
const FADE_MS = 600;
const READY_IMAGE_COUNT = 4;

export interface LoadingImage {
  src: string;
  sizes: string;
}

interface LoadingScreenProps {
  imageSrcs: LoadingImage[];
  ready: boolean;
  onComplete: () => void;
}

export default function LoadingScreen({ imageSrcs, ready, onComplete }: LoadingScreenProps) {
  const [phase, setPhase] = useState<"intro" | "fading" | "done">("intro");
  const [targets, setTargets] = useState<LoadingImage[]>([]);
  const started = useRef(false);
  const finished = useRef(false);
  const loaded = useRef(new Set<string>());
  const minReadyAt = useRef(0);
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const wait = Math.max(0, minReadyAt.current - performance.now());
    timers.current.push(window.setTimeout(() => {
      setPhase("fading");
      timers.current.push(window.setTimeout(() => {
        setPhase("done");
        onComplete();
      }, FADE_MS));
    }, wait));
  }, [onComplete]);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const firstVisit = !sessionStorage.getItem("introSeen");
    sessionStorage.setItem("introSeen", "1");
    minReadyAt.current = performance.now() + (firstVisit ? MIN_DISPLAY_MS : 0);
    const selected = imageSrcs.slice(0, READY_IMAGE_COUNT);
    setTargets(selected);
    if (selected.length === 0) finish();
    timers.current.push(window.setTimeout(finish, MAX_WAIT_MS));
  }, [ready, imageSrcs, finish]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
  }, []);

  const handleLoad = (src: string) => {
    loaded.current.add(src);
    if (targets.length > 0 && loaded.current.size >= targets.length) finish();
  };

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
      {/* Use the same optimized image requests as the slides behind this screen. */}
      <div className="pointer-events-none absolute inset-0 opacity-0" aria-hidden="true">
        {targets.map(({ src, sizes }) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority
            sizes={sizes}
            onLoad={() => handleLoad(src)}
          />
        ))}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://lkcg0hfyci0wodry.public.blob.vercel-storage.com/uploads/sig_black.PNG"
        alt=""
        className="relative w-28 h-auto select-none invert sm:w-32"
        draggable={false}
        style={{
          clipPath: "inset(0 100% 0 0)",
          animation: "sig-reveal 1100ms cubic-bezier(0.65, 0, 0.35, 1) 150ms forwards",
        }}
      />
    </div>
  );
}
