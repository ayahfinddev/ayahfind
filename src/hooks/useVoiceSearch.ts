"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceLang = "en-US" | "ar-SA";

type SpeechResultEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechErrorEvent = {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechResultEvent) => void) | null;
  onerror: ((ev: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionInstance)
  | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Merge all segments from resultIndex onward (per MDN). */
function mergeResults(
  results: SpeechRecognitionResultList,
  fromIndex: number
): { final: string; interim: string } {
  let final = "";
  let interim = "";
  for (let i = fromIndex; i < results.length; i++) {
    const part = results[i][0]?.transcript ?? "";
    if (results[i].isFinal) {
      final += part;
    } else {
      interim += part;
    }
  }
  return { final, interim };
}

export function useVoiceSearch(
  onFinal: (text: string) => void,
  lang: VoiceLang = "en-US"
) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef = useRef(onFinal);
  const langRef = useRef(lang);
  const cancelledRef = useRef(false);
  const finalizedRef = useRef(false);
  const accumulatedFinalRef = useRef("");
  const latestInterimRef = useRef("");

  onFinalRef.current = onFinal;
  langRef.current = lang;

  useEffect(() => {
    setSupported(!!getSpeechRecognitionCtor());
  }, []);

  const teardown = useCallback(() => {
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const deliver = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || finalizedRef.current) return;
    finalizedRef.current = true;
    setTranscript(trimmed);
    setInterim("");
    setStatus("Searching…");
    onFinalRef.current(trimmed);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("Requesting microphone…");
    setTranscript("");
    setInterim("");
    accumulatedFinalRef.current = "";
    latestInterimRef.current = "";
    cancelledRef.current = false;
    finalizedRef.current = false;

    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      setSupported(false);
      setError("Voice search needs Chrome or Edge on desktop.");
      setStatus("");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied. Allow the mic in browser settings.");
      setStatus("");
      return;
    }

    teardown();

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = langRef.current;

    rec.onstart = () => {
      setError(null);
      setListening(true);
      setStatus("Listening… speak now");
    };

    rec.onresult = (ev: SpeechResultEvent) => {
      const { final, interim: interimPart } = mergeResults(
        ev.results,
        ev.resultIndex
      );
      if (final) {
        accumulatedFinalRef.current += final;
      }
      const displayFinal = accumulatedFinalRef.current.trim();
      const combined = (displayFinal + interimPart).trim();
      latestInterimRef.current = interimPart;
      setTranscript(displayFinal);
      setInterim(interimPart);
      if (combined) {
        setStatus("Heard you — keep speaking or tap stop");
      }
    };

    rec.onerror = (ev: SpeechErrorEvent) => {
      const code = ev.error;
      if (code === "aborted") return;
      if (code === "no-speech") {
        setError("No speech heard. Speak louder or move closer to the mic.");
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone blocked. Allow mic access for this site.");
      } else if (code === "network") {
        setError(
          "Speech service needs internet (Chrome sends audio to Google). Check your connection."
        );
      } else if (code === "audio-capture") {
        setError("No microphone found. Plug in a mic or check Windows sound settings.");
      } else {
        setError(`Voice error: ${code}`);
      }
      setStatus("");
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (cancelledRef.current) {
        setStatus("");
        return;
      }
      const best = (accumulatedFinalRef.current + latestInterimRef.current).trim();
      if (best) {
        deliver(best);
      } else {
        setStatus("");
        setError((prev) => prev ?? "No speech captured. Try again.");
      }
    };

    recRef.current = rec;

    try {
      rec.start();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Could not start voice: ${msg}`);
      setStatus("");
      setListening(false);
    }
  }, [deliver, teardown]);

  const stop = useCallback(
    (runSearch = true) => {
      if (!runSearch) {
        cancelledRef.current = true;
      }
      setStatus(runSearch ? "Processing…" : "");
      try {
        recRef.current?.stop();
      } catch {
        teardown();
      }
      if (!recRef.current) {
        setListening(false);
      }
    },
    [teardown]
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    teardown();
    setStatus("");
  }, [teardown]);

  const displayText = (transcript + interim).trim();

  return {
    listening,
    transcript,
    interim,
    supported,
    error,
    status,
    displayText,
    start,
    stop,
    cancel,
  };
}
