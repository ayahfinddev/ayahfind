import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ListRowProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Generic `ContentCard`-based row: icon + title/subtitle + trailing slot.
 * Renders as a Link when `href` is given, otherwise a button (or a plain
 * card if neither is provided). Shared by Recent Searches, Bookmarked
 * Ayahs, and the full `/bookmarks`/`/history` pages.
 */
export function ListRow({ icon, title, subtitle, trailing, href, onClick, className }: ListRowProps) {
  const content = (
    <>
      {icon && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-surface text-primary-hover [&_svg]:h-3.5 [&_svg]:w-3.5">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text">{title}</span>
        {subtitle && <span className="block truncate text-xs text-text-tertiary">{subtitle}</span>}
      </span>
      {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />}
    </>
  );

  const rowClassName = cn(
    "flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left shadow-xs transition-shadow duration-150 ease-out hover:shadow-sm",
    className
  );

  if (href) {
    return (
      <Link href={href} className={rowClassName}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClassName}>
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}
