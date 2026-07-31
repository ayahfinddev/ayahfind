"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, BookOpen, Check, ChevronDown, Mic, ScrollText, Square } from "lucide-react";
import { WaveformVisualizer } from "@/components/ui/WaveformVisualizer";
import { useVoiceSearch, type VoiceLang } from "@/hooks/useVoiceSearch";
import type { SearchMode } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Same two sources — and the same labels — as the dashboard search bar's
 * "Search in:" segmented control (components/search/AISearchBar.tsx); this
 * page just presents them as a dropdown in place of Gemini's model picker.
 * `SearchMode` stays the single source of truth for the value itself. */
const SOURCES: { id: SearchMode; label: string; icon: typeof BookOpen }[] = [
  { id: "quran", label: "Qur'an", icon: BookOpen },
  { id: "hadith", label: "Hadith", icon: ScrollText },
];

const VOICE_LANGS: { id: VoiceLang; label: string; hint: string }[] = [
  { id: "en-US", label: "English", hint: "Search in English" },
  { id: "ar-SA", label: "العربية", hint: "Recite in Arabic" },
];

/**
 * `idle` → mic click → `requesting` (browser permission prompt) →
 * `lang` (Arabic/English picker) → `listening`. Split into stages rather than
 * a single "start listening" call so the permission prompt and the language
 * choice can't collide — asking for a language while Chrome's own mic dialog
 * is up leaves the picker stranded behind it.
 */
type VoiceStage = "idle" | "requesting" | "lang" | "listening";

export interface AskSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSearch: (value: string) => void;
  mode: SearchMode;
  onModeChange: (m: SearchMode) => void;
  loading?: boolean;
}

export function AskSearchBar({
  value,
  onChange,
  onSearch,
  mode,
  onModeChange,
  loading,
}: AskSearchBarProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [stage, setStage] = useState<VoiceStage>("idle");
  const [lang, setLang] = useState<VoiceLang>("en-US");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);

  const sourceRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFinalTranscript = useCallback(
    (text: string) => {
      // Populate the bar and hand control back to the user — unlike the modal,
      // which fires the search itself. Here the transcript is a draft they can
      // edit before submitting.
      onChange(text);
      setStage("idle");
      inputRef.current?.focus();
    },
    [onChange]
  );

  const { listening, supported, notice, error, status, displayText, start, stop, cancel } =
    useVoiceSearch(handleFinalTranscript, lang);

  // `start()` reads the language off a ref the hook syncs during render, so it
  // has to run after the `setLang` commit rather than in the click handler.
  useEffect(() => {
    if (!pendingStart) return;
    setPendingStart(false);
    void start();
  }, [pendingStart, start]);

  // A recognition failure (denied mid-session, no speech, unsupported
  // backend) ends the session inside the hook without telling us — drop the
  // bar out of its listening state so the input comes back.
  useEffect(() => {
    if (error && stage === "listening") setStage("idle");
  }, [error, stage]);

  // Close the popovers on an outside click or Escape.
  useEffect(() => {
    if (!sourceOpen && stage !== "lang") return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (sourceOpen && !sourceRef.current?.contains(target)) setSourceOpen(false);
      if (stage === "lang" && !langRef.current?.contains(target)) setStage("idle");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSourceOpen(false);
      if (stage === "lang") setStage("idle");
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sourceOpen, stage]);

  const handleMicClick = useCallback(async () => {
    setPermissionError(null);

    if (stage === "listening" || listening) {
      stop(true);
      setStage("idle");
      return;
    }
    if (stage === "lang") {
      setStage("idle");
      return;
    }
    if (!supported) {
      setStage("idle");
      return;
    }

    // Trigger the browser's own permission prompt up front. Once granted the
    // origin keeps the grant, so useVoiceSearch's internal getUserMedia (on
    // the browsers that need priming) resolves silently from here on.
    setStage("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setPermissionError("Microphone access denied. Allow the mic in your browser settings.");
      setStage("idle");
      return;
    }
    setStage("lang");
  }, [listening, stage, stop, supported]);

  const handleLangSelect = useCallback((next: VoiceLang) => {
    cancel();
    setLang(next);
    setStage("listening");
    setPendingStart(true);
  }, [cancel]);

  const submit = useCallback(() => {
    const q = value.trim();
    if (q) onSearch(q);
  }, [onSearch, value]);

  const activeSource = SOURCES.find((s) => s.id === mode) ?? SOURCES[0];
  const ActiveSourceIcon = activeSource.icon;
  const isListening = stage === "listening";
  const voiceMessage = permissionError ?? error ?? notice;

  return (
    <div className="w-full">
      <div
        className={cn(
          "search-glow relative rounded-[28px] border bg-surface transition-shadow duration-150 ease-out",
          isListening
            ? "border-primary/50 shadow-md"
            : "border-border shadow-sm hover:shadow-md"
        )}
      >
        {/* Input row — swapped for the live transcript while listening. */}
        <div className="flex min-h-[3.5rem] items-center gap-3 px-5 pt-3.5 md:px-6">
          {isListening ? (
            <p
              className="flex-1 truncate text-base text-text md:text-lg"
              dir="auto"
              aria-live="polite"
            >
              {displayText || (
                <span className="text-text-tertiary">{status || "Listening…"}</span>
              )}
            </p>
          ) : (
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Ask AyahFind"
              className="w-full flex-1 bg-transparent text-base leading-6 text-text outline-none placeholder:text-text-tertiary md:text-lg"
              aria-label="Ask AyahFind"
            />
          )}
        </div>

        {/* Live waveform — spans the full bar width, so the bars flex rather
         * than sitting at the modal's fixed w-1. */}
        <AnimatePresence initial={false}>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden px-5 md:px-6"
            >
              <WaveformVisualizer
                active
                bars={40}
                maxHeight={22}
                className="h-7 gap-[3px]"
                barClassName="w-auto flex-1 bg-gradient-to-t from-primary/40 to-primary"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control row — source picker left, mic + submit right. */}
        <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2 md:px-4">
          <div className="relative" ref={sourceRef}>
            <button
              type="button"
              onClick={() => setSourceOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={sourceOpen}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 ease-out hover:bg-surface-secondary hover:text-text"
            >
              <ActiveSourceIcon className="h-4 w-4" />
              {activeSource.label}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  sourceOpen && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {sourceOpen && (
                <motion.ul
                  role="listbox"
                  aria-label="Search in"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="absolute bottom-full left-0 z-30 mb-2 w-44 overflow-hidden rounded-2xl border border-border-strong bg-surface-floating p-1 shadow-md"
                >
                  {SOURCES.map(({ id, label, icon: Icon }) => (
                    <li key={id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={mode === id}
                        onClick={() => {
                          onModeChange(id);
                          setSourceOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 ease-out",
                          mode === id
                            ? "bg-accent-surface text-primary-hover"
                            : "text-text-secondary hover:bg-surface-secondary hover:text-text"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{label}</span>
                        {mode === id && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex items-center gap-1" ref={langRef}>
            <AnimatePresence>
              {stage === "lang" && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="absolute bottom-full right-0 z-30 mb-2 w-52 overflow-hidden rounded-2xl border border-border-strong bg-surface-floating p-1 shadow-md"
                >
                  <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    Speak in
                  </p>
                  {VOICE_LANGS.map(({ id, label, hint }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleLangSelect(id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors duration-150 ease-out hover:bg-surface-secondary hover:text-text"
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-[11px] text-text-tertiary">{hint}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => void handleMicClick()}
              disabled={!supported || stage === "requesting"}
              aria-label={isListening ? "Stop listening" : "Voice search"}
              aria-pressed={isListening}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 ease-out disabled:opacity-40",
                isListening
                  ? "bg-primary text-white"
                  : "text-text-tertiary hover:bg-surface-secondary hover:text-text"
              )}
            >
              {isListening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={submit}
              disabled={!value.trim() || loading}
              aria-label="Search"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 ease-out",
                value.trim() && !loading
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "cursor-not-allowed bg-surface-secondary text-text-tertiary"
              )}
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {voiceMessage && (
        <p role="status" className="mt-2 px-2 text-center text-xs text-text-secondary">
          {voiceMessage}
        </p>
      )}
    </div>
  );
}
