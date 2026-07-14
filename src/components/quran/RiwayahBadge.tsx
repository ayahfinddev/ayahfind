import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import {
  COMMON_TO_ALL_THEME,
  getRiwayahTheme,
  riwayahAriaLabel,
  type RiwayahDefinition,
  type RiwayahThemeColors,
} from "@/lib/riwayat";
import { cn } from "@/lib/utils";

function themeStyle(theme: RiwayahThemeColors): CSSProperties {
  return {
    ["--rw-bg" as string]: theme.background,
    ["--rw-fg" as string]: theme.foreground,
    ["--rw-border" as string]: theme.border,
    ["--rw-bg-dark" as string]: theme.darkBackground,
    ["--rw-fg-dark" as string]: theme.darkForeground,
    ["--rw-border-dark" as string]: theme.darkBorder,
  };
}

interface RiwayahBadgeBaseProps {
  selected?: boolean;
  className?: string;
}

/** "Common to all" — a distinct neutral state, never Hafs' (or any
 * riwayah's) colour, since it describes a relationship between riwayat
 * rather than one riwayah. */
export function CommonToAllBadge({ className }: RiwayahBadgeBaseProps) {
  return (
    <span
      className={cn(
        "riwayah-badge inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        className
      )}
      style={themeStyle(COMMON_TO_ALL_THEME)}
      role="status"
      aria-label="Common to all currently supported readings"
    >
      Common to all
    </span>
  );
}

interface RiwayahBadgeProps extends RiwayahBadgeBaseProps {
  riwayah: RiwayahDefinition;
  /** Extra text appended to the accessible label and, when provided,
   * rendered visibly too (e.g. "Unavailable — dataset not yet
   * integrated") — colour is never the only signal. */
  statusLabel?: string | null;
  /** Descriptive chip (search cards) vs. a row inside the Qira'at panel. */
  variant?: "chip" | "row";
}

/**
 * The one riwayah badge used everywhere in the app — search-card reading
 * chips, the Qira'at panel, the reader header, Continue Reading, the
 * comparison view, and the symbols filter. Always shows the written
 * riwayah name (never colour alone) and always carries an aria-label.
 *
 * Unavailable riwayat intentionally do NOT render in their registry
 * colour — colour is reserved for riwayat whose wording is actually
 * verified/displayed, so a disabled placeholder never looks as "live" as
 * an enabled one.
 */
export function RiwayahBadge({
  riwayah,
  selected = false,
  statusLabel = null,
  variant = "chip",
  className,
}: RiwayahBadgeProps) {
  const available = riwayah.isEnabled;
  const label = riwayahAriaLabel(riwayah, statusLabel ?? undefined);

  if (!available) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-medium text-ink-subtle",
          variant === "row" && "w-full justify-between",
          className
        )}
        aria-label={label}
        title={label}
      >
        <span>{riwayah.shortName}</span>
        <span className="text-ink-subtle/80">{statusLabel ?? "Unavailable"}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "riwayah-badge inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        variant === "row" && "w-full justify-between",
        className
      )}
      style={themeStyle(getRiwayahTheme(riwayah.colorToken))}
      aria-label={selected ? `${label} — currently displayed` : label}
      title={label}
    >
      <span className="flex items-center gap-1">
        {selected && <Check className="h-3 w-3" aria-hidden="true" />}
        {riwayah.shortName}
      </span>
    </span>
  );
}
