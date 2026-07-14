/**
 * Designed cover template for Continue Reading — approved in place of a
 * stock photo (see the theme/asset review). Deliberately theme-independent
 * (same deep-forest gradient + gold frame in every theme) so it reads as a
 * consistent editorial system across all 114 surahs, like a book spine,
 * rather than shifting with the page's palette.
 */
export function SurahCoverArt({ nameAr, className }: { nameAr: string; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: "linear-gradient(155deg, #2f6b46 0%, #1c4a30 60%, #123321 100%)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "10%",
          border: "1px solid rgba(212,175,90,0.55)",
          borderRadius: "12%",
        }}
      />
      <span
        dir="rtl"
        lang="ar"
        className="font-arabic"
        style={{ color: "#e7c67a", fontSize: "clamp(1rem, 14%, 1.6rem)", textAlign: "center", padding: "0 8%" }}
      >
        {nameAr}
      </span>
    </div>
  );
}
