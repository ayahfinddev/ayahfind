"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function HistoryPage() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ayahfind_history");
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  }, []);

  return (
    <div className="px-5 pt-8">
      <h1 className="text-2xl font-bold text-neutral-900">History</h1>
      <p className="mt-1 text-sm text-neutral-500">Recent searches</p>
      {items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-neutral-500">
          <Clock className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Your search history will appear here.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((q) => (
            <li key={q} className="glass-panel px-4 py-3 text-sm text-neutral-600">
              {q}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
