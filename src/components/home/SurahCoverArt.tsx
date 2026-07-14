/**
 * Original illustrated "cover art" for Continue Reading — a dusk skyline
 * with a mosque silhouette, evoking Makkah/Madinah without depicting any
 * real, specific, or copyrighted place. Warm decorative gradient, distinct
 * from the app's interactive teal accent (this is atmosphere, not UI).
 */
export function SurahCoverArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Illustrated mosque skyline at dusk" className={className}>
      <defs>
        <linearGradient id="cover-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b573" />
          <stop offset="45%" stopColor="#c97a52" />
          <stop offset="100%" stopColor="#1f4d3a" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#cover-sky)" />
      <circle cx="74" cy="24" r="9" fill="#faf5e6" opacity="0.85" />
      <circle cx="71" cy="21" r="7.5" fill="url(#cover-sky)" />
      <g fill="#12271d" opacity="0.92">
        <rect x="0" y="72" width="100" height="28" />
        <path d="M30 72 a20 20 0 0 1 40 0 Z" />
        <circle cx="50" cy="48" r="3" />
        <rect x="48" y="48" width="4" height="24" />
        <rect x="14" y="58" width="6" height="42" />
        <circle cx="17" cy="55" r="3" />
        <rect x="80" y="58" width="6" height="42" />
        <circle cx="83" cy="55" r="3" />
      </g>
    </svg>
  );
}
