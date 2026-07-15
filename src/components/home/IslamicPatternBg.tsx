/**
 * Tiled 8-point star geometric lattice — the classic Islamic girih motif,
 * rendered as a repeating SVG pattern. Purely atmospheric: always used at
 * very low opacity behind text, never as a foreground element.
 */
export function IslamicPatternBg({ className, color = "#1f4d3a" }: { className?: string; color?: string }) {
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="girih-tile" width="88" height="88" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="0.9" transform="scale(1.57)">
            <path d="M28 2 L38 14 L54 14 L44 28 L54 42 L38 42 L28 54 L18 42 L2 42 L12 28 L2 14 L18 14 Z" />
            <circle cx="28" cy="28" r="7" />
            <path d="M28 0 L28 8 M28 48 L28 56 M0 28 L8 28 M48 28 L56 28" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#girih-tile)" />
    </svg>
  );
}
