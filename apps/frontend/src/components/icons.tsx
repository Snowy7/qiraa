import type { SVGProps } from "react";

/*
 * Custom marks that lucide doesn't cover. They follow lucide's conventions
 * (24px grid, currentColor stroke) so they sit naturally beside its icons.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** An open mushaf resting on a rehal (Quran stand). */
export function QuranIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 6.5c-1.8-1.3-4.3-2-7-2v11c2.7 0 5.2.7 7 2 1.8-1.3 4.3-2 7-2v-11c-2.7 0-5.2.7-7 2Z" />
      <path d="M12 6.5v11" />
      <path d="m5 20 7-2.5 7 2.5" />
    </svg>
  );
}

/** A small mosque: dome, crescent finial and a minaret. */
export function MosqueIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20v-6.5a5.5 5.5 0 0 1 11 0V20" />
      <path d="M9.5 8V4.5" />
      <path d="M8 20v-2.5a1.5 1.5 0 0 1 3 0V20" />
      <path d="M18 20V10l1.5-3 1.5 3v10" />
      <path d="M2.5 20h19" />
    </svg>
  );
}

/**
 * The Qiraa mark: a pointed medallion like the ornaments in a mushaf's
 * margins. The app icons and favicon in public/ are drawn from the same shape.
 */
export function BrandMark(props: IconProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeWidth={30}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M256 34C308 78 356 123 400 158C421 176 428 212 428 256C428 300 421 336 400 354C356 389 308 434 256 478C204 434 156 389 112 354C91 336 84 300 84 256C84 212 91 176 112 158C156 123 204 78 256 34Z" />
      <circle cx="256" cy="256" r="64" />
      <path d="M280 197L324 93M315 232L419 189M315 280L419 323M280 315L324 419M232 315L188 419M197 280L93 323M197 232L93 189M232 197L188 93" />
    </svg>
  );
}

/** Mosque skyline drawn behind hero cards; inherits colour, scales to width. */
export function MosqueSkyline(props: IconProps) {
  return (
    <svg
      viewBox="0 0 400 100"
      preserveAspectRatio="xMidYMax meet"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M150 88V66q0-36 50-44 50 8 50 44v22Z" />
      <path d="M198.5 22V9h3v13Z" />
      <path d="M200 0a5 5 0 1 0 4.2 7.7A4 4 0 1 1 200 0Z" />
      <path d="M95 88V72q0-17 25-22 25 5 25 22v16Zm160 0V72q0-17 25-22 25 5 25 22v16Z" />
      <path d="M118.8 50v-9h2.4v9Zm160 0v-9h2.4v9Z" />
      <path d="M60 88V40l6-12 6 12v48Zm268 0V40l6-12 6 12v48Z" />
      <path d="M56 50h20v4H56Zm268 0h20v4h-20Z" />
      <path d="M25 88V58l4-8 4 8v30Zm342 0V58l4-8 4 8v30Z" />
      <path d="M0 86h400v14H0Z" />
    </svg>
  );
}
