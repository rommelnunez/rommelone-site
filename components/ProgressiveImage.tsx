"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";

type ProgressiveImageProps = ImageProps & {
  revealClassName?: string;
};

export default function ProgressiveImage({
  className = "",
  revealClassName = "duration-700 ease-out",
  onLoad,
  src,
  ...props
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    setLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [src]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    onLoad?.(event);
  };

  return (
    <Image
      {...props}
      ref={imageRef}
      src={src}
      onLoad={handleLoad}
      decoding="async"
      className={[
        className,
        "transition-opacity",
        revealClassName,
        loaded ? "opacity-100" : "opacity-0",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
