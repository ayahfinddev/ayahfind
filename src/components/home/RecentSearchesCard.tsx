"use client";

import { Clock } from "lucide-react";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { ListRow } from "@/components/ui/ListRow";
import { ContentCard } from "@/components/ui/ContentCard";

export interface RecentSearchesCardProps {
  onReopen: (query: string) => void;
}

export function RecentSearchesCard({ onReopen }: RecentSearchesCardProps) {
  const { history } = useSearchHistory();

  return (
    <ContentCard elevation="surface" padding="sm" className="min-h-[160px] rounded-[20px] p-3.5">
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        Recent searches
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-text-tertiary">Your searches will show up here.</p>
      ) : (
        <div className="space-y-1.5">
          {history.slice(0, 3).map((q) => (
            <ListRow key={q} icon={<Clock className="h-4 w-4" />} title={q} onClick={() => onReopen(q)} className="h-10 rounded-2xl" />
          ))}
        </div>
      )}
    </ContentCard>
  );
}
