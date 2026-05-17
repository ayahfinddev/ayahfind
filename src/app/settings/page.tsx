"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useReciter } from "@/hooks/useReciter";
import { RECITERS, type ReciterId } from "@/lib/reciters";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { reciterId, setReciterId } = useReciter();

  return (
    <div className="px-5 pt-8 pb-8">
      <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
      <div className="mt-6 space-y-3">
        <Link href="/onboarding" className="glass-panel block px-4 py-4 text-neutral-700">
          Replay onboarding
        </Link>

        <div className="glass-panel px-4 py-4">
          <p className="mb-3 font-medium text-neutral-700">Reciter</p>
          <p className="mb-3 text-xs text-neutral-500">
            Used for Listen on search results and ayah pages.
          </p>
          <ul className="space-y-2" role="listbox" aria-label="Choose reciter">
            {RECITERS.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={reciterId === r.id}
                  onClick={() => setReciterId(r.id as ReciterId)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    reciterId === r.id
                      ? "border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald"
                      : "border-glass-border text-neutral-600 hover:border-neutral-300"
                  )}
                >
                  <span>{r.name}</span>
                  {reciterId === r.id && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel px-4 py-4">
          <p className="font-medium text-neutral-700">Theme</p>
          <p className="text-sm text-neutral-500">Light</p>
        </div>

        <div className="glass-panel px-4 py-4">
          <p className="font-medium text-neutral-700">API</p>
          <p className="text-sm text-neutral-500">localhost:8000</p>
        </div>
      </div>
    </div>
  );
}