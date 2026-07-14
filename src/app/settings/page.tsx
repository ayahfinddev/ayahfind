"use client";

import Link from "next/link";
import { Check, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useReciter } from "@/hooks/useReciter";
import { ENABLED_RECITERS, type ReciterId } from "@/lib/reciters";
import { getApiSettingsDisplay } from "@/lib/apiConfig";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/ui/ContentCard";

const THEME_OPTIONS = [
  { value: "light", label: "Light", swatch: ["#F7F6F2", "#14b8a6"] },
  { value: "dark", label: "Dark", swatch: ["#1b1d22", "#2dd4bf"] },
  { value: "emerald", label: "Emerald", swatch: ["#e8f1ea", "#10b981"] },
  { value: "midnight", label: "Midnight", swatch: ["#121729", "#6366f1"] },
  { value: "sand", label: "Sand", swatch: ["#f5ecdb", "#b45309"] },
  { value: "forest", label: "Forest", swatch: ["#16221a", "#34d399"] },
  { value: "royal", label: "Royal", swatch: ["#1c1733", "#a78bfa"] },
  { value: "amoled", label: "AMOLED", swatch: ["#000000", "#2dd4bf"] },
  { value: "system", label: "System", swatch: null },
] as const;

export default function SettingsPage() {
  const { reciterId, setReciterId } = useReciter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const apiDisplay = getApiSettingsDisplay();

  useEffect(() => setMounted(true), []);

  return (
    <div className="px-1 pt-8 pb-8 sm:px-5">
      <h1 className="text-2xl font-bold text-text">Settings</h1>
      <div className="mt-6 space-y-3">
        <Link href="/onboarding" className="block">
          <ContentCard elevation="surface" padding="md" className="text-text-secondary">
            Replay onboarding
          </ContentCard>
        </Link>

        <ContentCard elevation="surface" padding="md">
          <p className="mb-3 font-medium text-text-secondary">Reciter</p>
          <p className="mb-3 text-xs text-text-tertiary">
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
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors duration-150 ease-out",
                    reciterId === r.id
                      ? "border-accent-border bg-accent-surface text-primary-hover"
                      : "border-border text-text-secondary hover:border-border-strong"
                  )}
                >
                  <span>
                    {r.name}
                    <span className="ml-2 text-xs font-normal text-text-tertiary">{r.bitrate}</span>
                  </span>
                  {reciterId === r.id && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </ContentCard>

        <ContentCard elevation="surface" padding="md">
          <p className="mb-3 font-medium text-text-secondary">Theme</p>
          <div
            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            role="radiogroup"
            aria-label="Choose theme"
          >
            {mounted && THEME_OPTIONS.map(({ value, label, swatch }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors duration-150 ease-out",
                  theme === value
                    ? "border-accent-border bg-accent-surface text-primary-hover"
                    : "border-border text-text-secondary hover:border-border-strong"
                )}
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  {swatch ? (
                    <span
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{
                        background: `conic-gradient(${swatch[1]} 0deg 180deg, ${swatch[0]} 180deg 360deg)`,
                      }}
                    />
                  ) : (
                    <Monitor className="h-5 w-5" />
                  )}
                  {theme === value && (
                    <Check className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary-hover p-0.5 text-white" />
                  )}
                </span>
                {label}
              </button>
            ))}
          </div>
        </ContentCard>

        {apiDisplay.show && (
          <ContentCard elevation="surface" padding="md">
            <p className="font-medium text-text-secondary">API</p>
            <p className="text-sm text-text-tertiary">{apiDisplay.label}</p>
            {apiDisplay.hint && (
              <p className="mt-1 text-xs text-text-tertiary">{apiDisplay.hint}</p>
            )}
          </ContentCard>
        )}
      </div>
    </div>
  );
}
