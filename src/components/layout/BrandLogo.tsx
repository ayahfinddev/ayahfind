import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  /** Hide the wordmark (the collapsed md-width sidebar shows the mark only). */
  markOnly?: boolean;
  /** Wordmark colour — the sidebar sits on its own dark surface and needs
   * `--sidebar-text`, everywhere else inherits the page's text colour. */
  wordmarkClassName?: string;
  className?: string;
}

/** The "A" mark + AyahFind wordmark. One definition shared by the sidebar and
 * the search page's top bar so they can't drift. */
export function BrandLogo({ markOnly, wordmarkClassName, className }: BrandLogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
        A
      </span>
      {!markOnly && (
        <span className={cn("text-[15px] font-semibold tracking-tight text-text", wordmarkClassName)}>
          AyahFind
        </span>
      )}
    </span>
  );
}
