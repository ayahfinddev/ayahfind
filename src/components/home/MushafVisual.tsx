/**
 * An original, tasteful illustration — an open mushaf with a warm
 * leather-green gradient cover, gold foil trim and corner ornaments, and a
 * ribbon bookmark, resting on a rahle with a soft contact shadow. Hand-drawn
 * as flat/soft-shaded vector art (not a photo or likeness of any existing
 * artwork), using warm decorative colors chosen for this illustration
 * specifically — distinct from the app's interactive teal accent, since
 * this is atmosphere, not UI.
 */
export function MushafVisual({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-label="An open mushaf with a gold-trimmed cover, resting on a stand" className={className}>
      <defs>
        <linearGradient id="mushaf-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#357a5f" />
          <stop offset="55%" stopColor="#1f4d3a" />
          <stop offset="100%" stopColor="#123023" />
        </linearGradient>
        <linearGradient id="mushaf-spine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#123023" />
          <stop offset="100%" stopColor="#0d2419" />
        </linearGradient>
        <linearGradient id="mushaf-pages" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaee" />
          <stop offset="100%" stopColor="#eee3c6" />
        </linearGradient>
        <linearGradient id="mushaf-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8e2ab" />
          <stop offset="50%" stopColor="#caa14a" />
          <stop offset="100%" stopColor="#f8e2ab" />
        </linearGradient>
        <linearGradient id="mushaf-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mushaf-glow" cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#f3d38a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f3d38a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mushaf-ground" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0d2419" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#0d2419" stopOpacity="0" />
        </radialGradient>
        <filter id="mushaf-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#0d2419" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Ambient warm glow behind the book */}
      <rect x="0" y="0" width="320" height="320" fill="url(#mushaf-glow)" />

      {/* Ground contact shadow */}
      <ellipse cx="160" cy="277" rx="82" ry="10" fill="url(#mushaf-ground)" />

      {/* Rahle (book stand) */}
      <g opacity="0.55">
        <path d="M76 258 L244 258 L228 282 L92 282 Z" fill="#8a6b3f" opacity="0.25" />
        <path d="M100 258 L124 224 L196 224 L220 258 Z" fill="none" stroke="#8a6b3f" strokeWidth="2" />
      </g>

      {/* Book, with drop shadow */}
      <g filter="url(#mushaf-shadow)">
        {/* Page edges peeking out, with faint leaf lines for texture */}
        <path d="M96 108 L96 232 L102 236 L102 104 Z" fill="url(#mushaf-pages)" />
        <path d="M224 108 L224 232 L218 236 L218 104 Z" fill="url(#mushaf-pages)" />
        <g stroke="#d8c79a" strokeWidth="0.75" opacity="0.6">
          <path d="M97 116 L101 118 M97 128 L101 130 M97 140 L101 142 M97 152 L101 154 M97 164 L101 166 M97 176 L101 178 M97 188 L101 190 M97 200 L101 202 M97 212 L101 214 M97 224 L101 226" />
          <path d="M223 116 L219 118 M223 128 L219 130 M223 140 L219 142 M223 152 L219 154 M223 164 L219 166 M223 176 L219 178 M223 188 L219 190 M223 200 L219 202 M223 212 L219 214 M223 224 L219 226" />
        </g>

        {/* Spine */}
        <path d="M150 100 L170 100 L170 240 L150 240 Z" fill="url(#mushaf-spine)" />

        {/* Front cover */}
        <path d="M100 104 L216 100 L220 236 L104 240 Z" fill="url(#mushaf-cover)" />
        {/* Diagonal sheen for a glossy, premium feel */}
        <path d="M100 104 L216 100 L220 236 L104 240 Z" fill="url(#mushaf-sheen)" />

        {/* Gold border trim, inset from the cover edge */}
        <path
          d="M110 113 L207 109.5 L210.5 231 L106.5 234.5 Z"
          fill="none"
          stroke="url(#mushaf-gold)"
          strokeWidth="2.5"
        />

        {/* Corner flourishes echoing the medallion motif */}
        <g stroke="url(#mushaf-gold)" strokeWidth="1.6" fill="none" opacity="0.95">
          <path d="M110 113 L110 124 M110 113 L121 113" />
          <path d="M207 109.5 L207 120.5 M207 109.5 L196 110" />
          <path d="M106.5 234.5 L106.5 223.5 M106.5 234.5 L117.5 234" />
          <path d="M210.5 231 L210.5 220 M210.5 231 L199.5 231.5" />
        </g>

        {/* Central medallion ornament */}
        <g transform="translate(158,171)">
          <circle r="23" fill="none" stroke="url(#mushaf-gold)" strokeWidth="2" />
          <circle r="17.5" fill="none" stroke="url(#mushaf-gold)" strokeWidth="1" opacity="0.7" />
          <path
            d="M0 -13 L6.5 -4 L17 -4 L8.5 3 L11.5 13 L0 6.5 L-11.5 13 L-8.5 3 L-17 -4 L-6.5 -4 Z"
            fill="url(#mushaf-gold)"
            opacity="0.92"
          />
        </g>

        {/* Ribbon bookmark */}
        <path d="M182 100 L194 100 L194 152 L188 144 L182 152 Z" fill="#b23b3b" opacity="0.85" />
      </g>
    </svg>
  );
}
