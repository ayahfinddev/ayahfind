import type { CSSProperties } from "react";

/**
 * Soft botanical ornament tucked behind/beside the hero Mushaf — filled
 * olive-leaf sprigs meant to read clearly (if softly) through a light blur,
 * echoing the leaf-and-stand imagery from the earlier photographic hero
 * without using a photo. Purely atmospheric, never a foreground element.
 */
export function BotanicalLeaves({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 320 320" role="presentation" aria-hidden="true" className={className} style={style}>
      <defs>
        <linearGradient id="leaf-fill-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5fa374" />
          <stop offset="100%" stopColor="#2f6b46" />
        </linearGradient>
        <linearGradient id="leaf-fill-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a7a54" />
          <stop offset="100%" stopColor="#1f4d3a" />
        </linearGradient>
      </defs>
      <g stroke="none">
        {/* Lower-left sprig, largest */}
        <g transform="translate(70,250) rotate(-18)">
          <path d="M0 0 C -6 -34, -2 -66, 22 -92 C 40 -66, 40 -34, 26 -4 C 18 -14, 8 -10, 0 0 Z" fill="url(#leaf-fill-a)" />
          <path d="M22 -92 C 20 -70, 22 -48, 26 -4" stroke="#e9f2ea" strokeWidth="1" opacity="0.35" fill="none" />
        </g>
        <g transform="translate(96,262) rotate(4)">
          <path d="M0 0 C -8 -26, -6 -50, 14 -70 C 30 -50, 30 -26, 18 -2 C 12 -10, 4 -8, 0 0 Z" fill="url(#leaf-fill-b)" opacity="0.92" />
        </g>
        <g transform="translate(50,222) rotate(-46)">
          <path d="M0 0 C -6 -20, -4 -38, 12 -54 C 24 -38, 24 -20, 14 -2 C 9 -8, 3 -6, 0 0 Z" fill="url(#leaf-fill-a)" opacity="0.85" />
        </g>

        {/* Upper-right echo, smaller */}
        <g transform="translate(246,96) rotate(150)">
          <path d="M0 0 C -5 -18, -3 -34, 11 -48 C 21 -34, 21 -18, 12 -2 C 8 -7, 3 -6, 0 0 Z" fill="url(#leaf-fill-b)" opacity="0.8" />
        </g>
        <g transform="translate(262,78) rotate(128)">
          <path d="M0 0 C -4 -14, -3 -27, 9 -38 C 17 -27, 17 -14, 10 -1 C 6 -6, 2 -5, 0 0 Z" fill="url(#leaf-fill-a)" opacity="0.7" />
        </g>
      </g>
    </svg>
  );
}
