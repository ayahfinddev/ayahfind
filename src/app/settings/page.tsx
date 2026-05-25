"use client";

import Link from "next/link";
import { Check, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useReciter } from "@/hooks/useReciter";
import { ENABLED_RECITERS, type ReciterId } from "@/lib/reciters";
import { getApiSettingsDisplay } from "@/lib/apiConfig";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { reciterId, setReciterId } = useReciter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const apiDisplay = getApiSettingsDisplay();

  useEffect(() => setMounted(true), []);

  return (
    <div className="px-1 pt-8 pb-8 sm:px-5">
      <h1 className="text-2xl font-bold text-ink">Settings</h1>
      <div className="mt-6 space-y-3">
        <Link href="/onboarding" className="glass-panel block px-4 py-4 text-ink-muted">
          Replay onboarding
        </Link>

        <div className="glass-panel px-4 py-4">
          <p className="mb-3 font-medium text-ink-muted">Reciter</p>
          <p className="mb-3 text-xs text-ink-subtle">
            Used for Listen on search results and ayah pages.
          </p>
          <ul className="max-h-[min(24rem,60vh)] space-y-2 overflow-y-auto" role="listbox" aria-label="Choose reciter">
            {ENABLED_RECITERS.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={reciterId === r.id}
                  onClick={() => setReciterId(r.id as ReciterId)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    reciterId === r.id
                      ? "border-accent/40 bg-accent-surface text-accent-dim"
                      : "border-glass-border text-ink-muted hover:border-border-strong"
                  )}
                >
                  <span>
                    {r.name}
                    <span className="ml-2 text-xs font-normal text-ink-subtle">{r.bitrate}</span>
                  </span>
                  {reciterId === r.id && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel px-4 py-4">
          <p className="mb-3 font-medium text-ink-muted">Theme</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Choose theme">
            {mounted && THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors",
                  theme === value
                    ? "border-accent/40 bg-accent-surface text-accent-dim"
                    : "border-glass-border text-ink-muted hover:border-border-strong"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {apiDisplay.show && (
          <div className="glass-panel px-4 py-4">
            <p className="font-medium text-ink-muted">API</p>
            <p className="text-sm text-ink-subtle">{apiDisplay.label}</p>
            {apiDisplay.hint && (
              <p className="mt-1 text-xs text-ink-subtle">{apiDisplay.hint}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}