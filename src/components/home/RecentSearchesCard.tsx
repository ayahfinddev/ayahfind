"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { ContentCard } from "@/components/ui/ContentCard";

export interface RecentSearchesCardProps {
  onReopen: (query: string) => void;
}

export function RecentSearchesCard({ onReopen }: RecentSearchesCardProps) {
  const { history, historyRefs } = useSearchHistory();

  return (
    <ContentCard elevation="surface" padding="sm" className="h-full rounded-2xl p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Recently Searched</h2>
        <Link href="/history" className="text-xs font-medium text-primary-hover hover:underline">
          View all
        </Link>
      </div>
      {history.length === 0 ? (
        <p className="text-sm text-text-tertiary">Your searches will show up here.</p>
      ) : (
        <div className="divide-y divide-border">
          {history.slice(0, 3).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onReopen(q)}
              className="flex w-full items-center gap-2.5 py-1.5 text-left text-sm transition-colors duration-150 ease-out first:pt-0 last:pb-0 hover:bg-surface-secondary"
            >
              <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
              <span className="min-w-0 flex-1 truncate text-text-secondary">{q}</span>
              {historyRefs[q] && (
                <span className="shrink-0 text-xs text-text-tertiary">{historyRefs[q]}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </ContentCard>
  );
}
