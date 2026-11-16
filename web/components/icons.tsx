import type { SVGProps } from "react";

const PATHS = {
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  right: "M9 6l6 6-6 6",
  left: "M15 6l-6 6 6 6",
  check: "M5 13l4 4L19 7",
  copy: "M9 9h10v11H9zM5 15V4h10",
  print: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  x: "M6 6l12 12M18 6L6 18",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  reset: "M4 4v6h6M20 20v-6h-6M5.6 15A8 8 0 0019 12M18.4 9A8 8 0 005 12",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  tree: "M4 5h6v4H4zM14 3h6v4h-6zM14 11h6v4h-6zM14 19h6v4h-6zM10 7h2V5h2M12 7v12h2M12 13h2",
  chevronsDown: "M6 7l6 6 6-6M6 13l6 6 6-6",
  chevronsUp: "M6 11l6-6 6 6M6 17l6-6 6 6",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  play: "M8 5v14l11-7z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
