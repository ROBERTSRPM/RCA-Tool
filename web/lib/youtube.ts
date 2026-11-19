/** Privacy-friendly YouTube embeds (youtube-nocookie), loaded only after a click. */
export const DEMO_VIDEO = { id: "3_s0V_pwHdE", duration: "2:55" } as const;
export const EXPLAINER_VIDEO = { id: "b_pNSfn9jjI", duration: "12 min" } as const;

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Embed URL for a video id, or null if the id is not a valid YouTube id. */
export function youtubeEmbedUrl(id: string): string | null {
  return ID_RE.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
}
