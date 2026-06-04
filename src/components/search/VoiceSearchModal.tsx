"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { detectVoiceBrowser } from "@/lib/voiceSearchSupport";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff } from "lucide-react";
import { WaveformVisualizer } from "@/components/ui/WaveformVisualizer";
import { useVoiceSearch, type VoiceLang } from "@/hooks/useVoiceSearch";
import { cn } from "@/lib/utils";

const VOICE_LANG_OPTIONS: { id: VoiceLang; label: string }[] = [
  { id: "en-US", label: "English" },
  { id: "ar-SA", label: "Arabic" },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

interface VoiceSearchModalProps {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  onExited?: () => void;
}

export function VoiceSearchModal({
  open,
  onClose,
  onResult,
  onExited,
}: VoiceSearchModalProps) {
  const [lang, setLang] = useState<VoiceLang>("en-US");
  const [manualText, setManualText] = useState("");

  const {
    listening,
    supported,
    notice,
    error,
    status,
    displayText,
    start,
    stop,
    cancel,
  } = useVoiceSearch((text) => {
    onResult(text);
  }, lang);

  const startRef = useRef(start);
  const cancelRef = useRef(cancel);
  startRef.current = start;
  cancelRef.current = cancel;

  useLayoutEffect(() => {
    if (!open) return;
    cancelRef.current();
    setManualText("");
    const browser = detectVoiceBrowser();
    if (browser.isOperaGX) {
      console.log("[voice] modal opened — Opera GX, typed search only");
      return;
    }
    const delayMs = 400;
    console.log("[voice] modal auto-start scheduled", { delayMs, browser: browser.label });
    const t = window.setTimeout(() => {
      void startRef.current();
    }, delayMs);
    return () => {
      window.clearTimeout(t);
    };
  }, [open, lang]);

  useEffect(() => {
    if (open) return;
    setManualText("");
    const t = window.setTimeout(() => cancelRef.current(), 300);
    return () => window.clearTimeout(t);
  }, [open]);

  const handleClose = () => {
    cancel();
    onClose();
  };

  const handleSearch = () => {
    const text = displayText || manualText.trim();
    if (listening) {
      stop(true);
      return;
    }
    if (text) {
      onResult(text);
      onClose();
    }
  };

  const canSearch = Boolean(displayText || manualText.trim());

  return (
    <AnimatePresence onExitComplete={() => onExited?.()}>
      {open && (
        <motion.div
          key="voice-search-modal"
          role="dialog"
          aria-modal="true"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-40 pointer-events-none"
        >
          <motion.div
            className="pointer-events-none absolute inset-0 bg-glass-fill backdrop-blur-xl"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98, pointerEvents: "none" }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="pointer-events-auto fixed inset-x-4 top-[8%] z-50 mx-auto max-w-lg"
          >
            <motion.div className="islamic-grid relative overflow-hidden rounded-3xl border border-glass-border bg-canvas p-8 shadow-glow-lg">
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-full p-2 text-ink-muted hover:bg-canvas-elevated hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <p className="mb-2 text-center text-sm font-medium uppercase tracking-widest text-ink-muted">
                {listening ? "Listening" : "Voice search"}
              </p>
              {notice && (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-center text-sm leading-relaxed text-amber-950"
                >
                  {notice}
                </div>
              )}
              <h2 className="mb-4 text-center text-xl font-semibold text-ink">
                Recite or speak — mistakes are OK
              </h2>

              <div
                className="relative mx-auto mb-6 flex w-full max-w-sm rounded-full border border-border-strong bg-canvas-card p-1"
                role="tablist"
                aria-label="Recognition language"
              >
                {VOICE_LANG_OPTIONS.map((opt) => {
                  const selected = lang === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => {
                        cancel();
                        setLang(opt.id);
                      }}
                      className={cn(
                        "relative z-0 flex min-h-[2.25rem] flex-1 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition-colors duration-200 ease-out",
                        selected
                          ? "text-canvas"
                          : "text-ink-muted hover:text-ink"
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="voice-lang-pill"
                          className="absolute inset-0 rounded-full bg-ink shadow-sm"
                          transition={{ type: "spring", stiffness: 520, damping: 36 }}
                          aria-hidden
                        />
                      )}
                      <span className="relative z-10 text-center leading-none">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mb-6 flex justify-center">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => (listening ? stop(true) : void start())}
                  disabled={!supported}
                  className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-accent-emerald to-neutral-800 shadow-glow disabled:opacity-40"
                >
                  {listening && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-accent-emerald/50"
                      animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  {listening ? (
                    <MicOff className="h-10 w-10 text-canvas" />
                  ) : (
                    <Mic className="h-10 w-10 text-canvas" />
                  )}
                </motion.button>
              </div>

              <WaveformVisualizer active={listening} className="mb-4" />

              {status && !error && (
                <p className="mb-2 text-center text-xs text-ink-muted">{status}</p>
              )}

              <div className="min-h-[4.5rem] rounded-xl bg-canvas-elevated p-4 text-center">
                {error ? (
                  <p className="text-sm text-red-400">{error}</p>
                ) : (
                  <p className="font-arabic text-lg text-ink-muted" dir="auto">
                    {displayText ||
                      (notice
                        ? "Type your search below"
                        : supported
                          ? "Speak clearly into your microphone…"
                          : "Voice not supported — type your query below")}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs text-ink-muted">
                  {notice ? "Search by typing" : "Or type what you said (if voice fails)"}
                </label>
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canSearch && handleSearch()}
                  placeholder="e.g. fa inama al usri yusra"
                  className="w-full rounded-xl border border-glass-border bg-canvas-elevated px-4 py-3 text-sm text-ink outline-none focus:border-accent-border"
                />
              </div>

              <p className="mt-3 text-center text-xs text-ink-subtle">
                Tap the mic to stop — we search automatically. Typed search always works.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-glass-border py-3 text-sm text-ink-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={!canSearch}
                  className="flex-1 rounded-xl bg-accent-emerald py-3 text-sm font-semibold text-canvas disabled:opacity-40"
                >
                  Search
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
