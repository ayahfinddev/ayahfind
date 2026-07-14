import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ReaderSectionProps extends HTMLAttributes<HTMLElement> {
  /** Small label above the content — e.g. a verse number or "Bismillah". */
  label?: ReactNode;
  /** Trailing controls for this section — usually an ActionBar. */
  actions?: ReactNode;
  active?: boolean;
}

/**
 * Generic "block of reading content" primitive: label + content + optional
 * action row. Used for the Surah header, the Bismillah line, and every verse
 * so the whole reading flow — and later a Hadith entry or Tafsir excerpt —
 * shares one visual rhythm instead of each inventing its own shell.
 */
export function ReaderSection({
  label,
  actions,
  active,
  className,
  children,
  ...props
}: ReaderSectionProps) {
  return (
    <section
      className={cn(
        "relative border-l-[3px] border-transparent px-6 py-8 transition-colors duration-150 ease-out md:px-10 md:py-10",
        active && "border-primary bg-accent-surface",
        className
      )}
      {...props}
    >
      {(label || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {label && (
            <span className="text-xs font-medium text-text-tertiary">{label}</span>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
