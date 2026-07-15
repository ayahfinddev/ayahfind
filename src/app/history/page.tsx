"use client";

import { Clock } from "lucide-react";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { ListRow } from "@/components/ui/ListRow";

export default function HistoryPage() {
  const { history } = useSearchHistory();

  return (
    <div className="px-1 pt-8 sm:px-5">
      <h1 className="text-2xl font-bold text-text">History</h1>
      <p className="mt-1 text-sm text-text-secondary">Recent searches</p>
      {history.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-text-tertiary">
          <Clock className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Your search history will appear here.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {history.map((q) => (
            <li key={q}>
              <ListRow
                icon={<Clock className="h-4 w-4" />}
                title={q}
                href={`/search?q=${encodeURIComponent(q)}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
