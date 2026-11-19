"use client";

import Image from "next/image";
import { useState } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";

/**
 * Lazy YouTube facade: a local thumbnail and play button. The iframe (and any
 * request to YouTube) only exists after the visitor clicks.
 */
export function VideoFacade({
  id,
  title,
  thumb,
  duration,
  size = "large",
}: {
  id: string;
  title: string;
  thumb: string;
  duration: string;
  size?: "large" | "small";
}) {
  const [playing, setPlaying] = useState(false);
  const src = youtubeEmbedUrl(id);
  const big = size === "large";
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-ink shadow-[0_30px_60px_-30px_rgb(15_18_23/0.35)]">
      {playing && src ? (
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title} (${duration})`}
          className="group absolute inset-0 block h-full w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent"
        >
          <Image
            src={thumb}
            width={1280}
            height={720}
            unoptimized
            sizes={big ? "(min-width: 1024px) 960px, 100vw" : "(min-width: 1024px) 480px, 100vw"}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
          <span
            aria-hidden="true"
            className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform group-hover:scale-105 ${
              big ? "h-20 w-20 sm:h-24 sm:w-24" : "h-14 w-14"
            }`}
          >
            <svg viewBox="0 0 24 24" className={big ? "h-9 w-9 sm:h-11 sm:w-11" : "h-6 w-6"} fill="currentColor">
              <path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" />
            </svg>
          </span>
          <span className="absolute bottom-3 right-3 rounded bg-black/75 px-2 py-0.5 text-xs font-medium tabular-nums text-white">
            {duration}
          </span>
        </button>
      )}
    </div>
  );
}
