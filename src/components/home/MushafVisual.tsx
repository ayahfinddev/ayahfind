import type { CSSProperties } from "react";

/**
 * An original, tasteful illustration — a closed mushaf resting on a wooden
 * rehal (book stand), rendered as flat/soft-shaded vector art in the same
 * forest-and-gold language as SurahCoverArt. Not a photo or likeness of any
 * existing artwork or product. Deliberately borderless/backgroundless — the
 * SVG has no enclosing rect, so callers can float it directly over the hero
 * with a mask-image fade and drop-shadow, rather than sitting in a card.
 */
export function MushafVisual({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 280 320"
      role="presentation"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="rehal-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a6b3f" />
          <stop offset="100%" stopColor="#5f4a2b" />
        </linearGradient>
        <linearGradient id="mushaf-cover-v" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#357a5f" />
          <stop offset="55%" stopColor="#1f4d3a" />
          <stop offset="100%" stopColor="#123023" />
        </linearGradient>
        <linearGradient id="mushaf-spine-v" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d2419" />
          <stop offset="100%" stopColor="#193d2c" />
        </linearGradient>
        <linearGradient id="mushaf-pages-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaee" />
          <stop offset="100%" stopColor="#eee3c6" />
        </linearGradient>
        <linearGradient id="mushaf-gold-v" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8e2ab" />
          <stop offset="50%" stopColor="#caa14a" />
          <stop offset="100%" stopColor="#f8e2ab" />
        </linearGradient>
        <linearGradient id="mushaf-sheen-v" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mushaf-ground-v" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0d2419" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0d2419" stopOpacity="0" />
        </radialGradient>
        <filter id="mushaf-shadow-v" x="-40%" y="-30%" width="180%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0d2419" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ground contact shadow */}
      <ellipse cx="140" cy="290" rx="78" ry="9" fill="url(#mushaf-ground-v)" />

      {/* Rehal — crossed wooden stand */}
      <g stroke="url(#rehal-wood)" strokeLinecap="round" opacity="0.92">
        <path d="M64 286 L206 232" strokeWidth="9" fill="none" />
        <path d="M216 286 L74 232" strokeWidth="9" fill="none" />
      </g>
      <ellipse cx="140" cy="259" rx="10" ry="5" fill="#5f4a2b" opacity="0.5" />

      {/* Book, closed, resting on the stand */}
      <g filter="url(#mushaf-shadow-v)">
        {/* Page block edge peeking along the right side */}
        <path d="M196 78 L204 82 L200 234 L192 231 Z" fill="url(#mushaf-pages-v)" />
        <g stroke="#d8c79a" strokeWidth="0.6" opacity="0.55">
          <path d="M197 92 L203 94 M197 104 L203 106 M197 116 L203 118 M197 128 L203 130 M197 140 L203 142 M197 152 L203 154 M197 164 L203 166 M197 176 L203 178 M197 188 L203 190 M197 200 L203 202 M197 212 L203 214" />
        </g>

        {/* Spine, left edge */}
        <path d="M84 70 L100 65 L104 226 L88 233 Z" fill="url(#mushaf-spine-v)" />

        {/* Front cover */}
        <path d="M100 65 L196 78 L192 231 L104 226 Z" fill="url(#mushaf-cover-v)" />
        <path d="M100 65 L196 78 L192 231 L104 226 Z" fill="url(#mushaf-sheen-v)" />

        {/* Gold frame, inset from the cover edge */}
        <path
          d="M110 76 L186 87 L183 220 L114 216 Z"
          fill="none"
          stroke="url(#mushaf-gold-v)"
          strokeWidth="2.25"
        />

        {/* Corner flourishes */}
        <g stroke="url(#mushaf-gold-v)" strokeWidth="1.4" fill="none" opacity="0.95">
          <path d="M110 76 L110 87 M110 76 L121 77.5" />
          <path d="M186 87 L186 98 M186 87 L175 85.5" />
          <path d="M114 216 L114 205 M114 216 L125 217" />
          <path d="M183 220 L183 209 M183 220 L172 218.5" />
        </g>

        {/* Central medallion */}
        <g transform="translate(148,151)">
          <circle r="20" fill="none" stroke="url(#mushaf-gold-v)" strokeWidth="1.8" />
          <circle r="15" fill="none" stroke="url(#mushaf-gold-v)" strokeWidth="0.9" opacity="0.7" />
          <path
            d="M0 -11 L5.6 -3.4 L14.5 -3.4 L7.3 2.6 L9.8 11 L0 5.6 L-9.8 11 L-7.3 2.6 L-14.5 -3.4 L-5.6 -3.4 Z"
            fill="url(#mushaf-gold-v)"
            opacity="0.92"
          />
        </g>

        {/* Ribbon bookmark */}
        <path d="M166 79 L177 80.5 L174 122 L169.5 115 L164.5 124 Z" fill="#b23b3b" opacity="0.85" />
      </g>
    </svg>
  );
}
