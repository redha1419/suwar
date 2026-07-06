"use client";

import { useEffect, useRef, useState } from "react";
import { decode } from "blurhash";

interface BlurhashImageProps {
  src: string;
  alt: string;
  blurhash: string | null;
  className?: string;
  onClick?: () => void;
}

export function BlurhashImage({
  src,
  alt,
  blurhash,
  className,
  onClick,
}: BlurhashImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;
    try {
      const pixels = decode(blurhash, 32, 32);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(32, 32);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // malformed hash — the plain background color underneath is enough
    }
  }, [blurhash]);

  // The <img> starts loading as soon as the browser parses its src, which can
  // be before React finishes hydrating and attaches onLoad — if the image is
  // already cached, the native load event fires and is missed entirely,
  // leaving `loaded` stuck false (permanently blurred). Checking `.complete`
  // once mounted catches that race; onLoad still covers genuinely fresh loads.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  return (
    <div className="relative h-full w-full" onClick={onClick}>
      {blurhash && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-0" : "opacity-100"
          } ${className ?? ""}`}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className ?? ""}`}
      />
    </div>
  );
}
