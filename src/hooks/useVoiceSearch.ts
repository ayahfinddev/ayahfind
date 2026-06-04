"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectVoiceBrowser,
  getVoiceApiDiagnostics,
  releaseMediaStream,
  VOICE_CHROME_FALLBACK_MSG,
  type VoiceBrowserInfo,
} from "@/lib/voiceSearchSupport";

export type VoiceLang = "en-US" | "ar-SA";

const START_TIMEOUT_MS = 5000;

type SpeechResultEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechErrorEvent = {
  error: string;
};

export type SpeechRecognitionInstance = {
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
  onspeechstart?: (() => void) | null;
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

function logVoiceStage(
  stage: string,
  browser: VoiceBrowserInfo,
  extra?: Record<string, unknown>
) {
  const api = getVoiceApiDiagnostics();
  console.log(`[voice] stage: ${stage}`, {
    browser: browser.label,
    isOperaGX: browser.isOperaGX,
    usePermissionPriming: browser.usePermissionPriming,
    preferNonContinuous: browser.preferNonContinuous,
    SpeechRecognition: api.speechRecognition,
    webkitSpeechRecognition: api.webkitSpeechRecognition,
    hasSpeechCtor: api.hasSpeechCtor,
    ...extra,
  });
}

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
  const [experimentalBrowser, setExperimentalBrowser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);
  const onFinalRef = useRef(onFinal);
  const langRef = useRef(lang);
  const cancelledRef = useRef(false);
  const finalizedRef = useRef(false);
  const accumulatedFinalRef = useRef("");
  const latestInterimRef = useRef("");
  const startTimeoutRef = useRef<number | null>(null);
  const startupSignalsRef = useRef({
    onstart: false,
    onspeechstart: false,
    onresult: false,
  });

  onFinalRef.current = onFinal;
  langRef.current = lang;

  const clearStartTimeout = useCallback(() => {
    if (startTimeoutRef.current != null) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  }, []);

  const releaseMicrophone = useCallback(() => {
    releaseMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;
  }, []);

  const hasStartupSignal = useCallback(
    () =>
      startupSignalsRef.current.onstart ||
      startupSignalsRef.current.onspeechstart ||
      startupSignalsRef.current.onresult,
    []
  );

  const markStartupSignal = useCallback(
    (kind: "onstart" | "onspeechstart" | "onresult") => {
      startupSignalsRef.current[kind] = true;
      console.log(`[voice] onstart lifecycle: ${kind} fired`);
      clearStartTimeout();
    },
    [clearStartTimeout]
  );

  const resetStartupSignals = useCallback(() => {
    startupSignalsRef.current = {
      onstart: false,
      onspeechstart: false,
      onresult: false,
    };
  }, []);

  useEffect(() => {
    const info = detectVoiceBrowser();
    logVoiceStage("mount", info);
    setExperimentalBrowser(info.isOperaGX);
    const SR = getSpeechRecognitionCtor();
    const ok = !!SR && info.hasSpeechCtor;
    setSupported(ok);
    if (!ok) {
      setError(VOICE_CHROME_FALLBACK_MSG);
    }
  }, []);

  const detachRecognition = useCallback((rec: SpeechRecognitionInstance) => {
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    rec.onstart = null;
    rec.onspeechstart = null;
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const stopRecognition = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    detachRecognition(rec);
  }, [detachRecognition]);

  const teardown = useCallback(() => {
    clearStartTimeout();
    stopRecognition();
    releaseMicrophone();
    recRef.current = null;
    setListening(false);
  }, [clearStartTimeout, releaseMicrophone, stopRecognition]);

  useEffect(() => () => teardown(), [teardown]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        teardown();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [teardown]);

  const failStart = useCallback(
    (message: string, session: number) => {
      if (session !== sessionRef.current) return;
      logVoiceStage("failStart", detectVoiceBrowser(), { message });
      clearStartTimeout();
      cancelledRef.current = true;
      stopRecognition();
      releaseMicrophone();
      recRef.current = null;
      setListening(false);
      setStatus("");
      setError(message);
    },
    [clearStartTimeout, releaseMicrophone, stopRecognition]
  );

  const deliver = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || finalizedRef.current) return;
      finalizedRef.current = true;
      clearStartTimeout();
      cancelledRef.current = true;
      stopRecognition();
      releaseMicrophone();
      recRef.current = null;
      setListening(false);
      setTranscript(trimmed);
      setInterim("");
      setStatus("Searching…");
      console.log("[search] transcript finalized (voice hook):", trimmed);
      onFinalRef.current(trimmed);
    },
    [clearStartTimeout, releaseMicrophone, stopRecognition]
  );

  const armStartTimeout = useCallback(
    (session: number, browser: VoiceBrowserInfo) => {
      clearStartTimeout();
      startTimeoutRef.current = window.setTimeout(() => {
        if (session !== sessionRef.current) return;
        if (cancelledRef.current || hasStartupSignal()) return;
        console.log(
          "[voice] timeout triggered — no onstart/onspeechstart/onresult within",
          START_TIMEOUT_MS,
          "ms"
        );
        logVoiceStage("startup-timeout", browser, {
          signals: { ...startupSignalsRef.current },
        });
        failStart(VOICE_CHROME_FALLBACK_MSG, session);
      }, START_TIMEOUT_MS);
    },
    [clearStartTimeout, failStart, hasStartupSignal]
  );

  const start = useCallback(async () => {
    const session = ++sessionRef.current;
    resetStartupSignals();
    cancelledRef.current = false;
    finalizedRef.current = false;
    setError(null);
    setStatus("Requesting microphone…");
    setTranscript("");
    setInterim("");
    accumulatedFinalRef.current = "";
    latestInterimRef.current = "";

    const browser = detectVoiceBrowser();
    logVoiceStage("start()", browser, { session });

    const SR = getSpeechRecognitionCtor();
    if (!SR || !browser.hasSpeechCtor) {
      logVoiceStage("no-speech-ctor", browser);
      failStart(VOICE_CHROME_FALLBACK_MSG, session);
      return;
    }

    if (browser.usePermissionPriming) {
      try {
        logVoiceStage("getUserMedia-request", browser);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (session !== sessionRef.current) {
          releaseMediaStream(stream);
          return;
        }
        mediaStreamRef.current = stream;
        console.log("[voice] getUserMedia success:", {
          trackCount: stream.getTracks().length,
          labels: stream.getTracks().map((t) => t.label),
        });
        if (browser.releaseStreamBeforeRecognition) {
          releaseMicrophone();
        }
      } catch (err) {
        console.log("[voice] getUserMedia failed:", err);
        failStart(
          "Microphone access denied. Allow the mic in browser settings.",
          session
        );
        return;
      }
    } else {
      console.log(
        "[voice] getUserMedia skipped (Opera/iOS path — SpeechRecognition owns mic)"
      );
    }

    if (session !== sessionRef.current || cancelledRef.current) {
      logVoiceStage("start-aborted-before-recognition", browser, {
        cancelled: cancelledRef.current,
      });
      releaseMicrophone();
      setStatus("");
      return;
    }

    stopRecognition();
    recRef.current = null;

    const rec = new SR();
    console.log("[voice] recognition created:", {
      continuous: !browser.preferNonContinuous,
      lang: langRef.current,
    });

    rec.continuous = !browser.preferNonContinuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = langRef.current;

    rec.onstart = () => {
      if (session !== sessionRef.current) return;
      markStartupSignal("onstart");
      releaseMicrophone();
      setError(null);
      setListening(true);
      setStatus("Listening… speak now");
    };

    rec.onspeechstart = () => {
      if (session !== sessionRef.current) return;
      markStartupSignal("onspeechstart");
    };

    rec.onresult = (ev: SpeechResultEvent) => {
      if (session !== sessionRef.current) return;
      markStartupSignal("onresult");
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

      if (browser.preferNonContinuous && final.trim()) {
        const best = (accumulatedFinalRef.current + latestInterimRef.current).trim();
        if (best) {
          deliver(best);
        }
      }
    };

    rec.onerror = (ev: SpeechErrorEvent) => {
      if (session !== sessionRef.current) return;
      const code = ev.error;
      console.log("[voice] onerror fired:", code);
      if (code === "aborted") return;
      clearStartTimeout();
      releaseMicrophone();
      setListening(false);
      setStatus("");
      if (code === "no-speech") {
        setError("No speech heard. Speak louder or move closer to the mic.");
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone blocked. Allow mic access for this site.");
      } else if (code === "network") {
        setError(
          "Speech service needs internet. Check your connection or type your query below."
        );
      } else if (code === "audio-capture") {
        setError("No microphone found. Plug in a mic or check sound settings.");
      } else {
        setError(`Voice error: ${code}. ${VOICE_CHROME_FALLBACK_MSG}`);
      }
    };

    rec.onend = () => {
      if (session !== sessionRef.current) return;
      clearStartTimeout();
      setListening(false);
      const instance = recRef.current;
      if (instance) {
        detachRecognition(instance);
        recRef.current = null;
      }
      releaseMicrophone();
      if (cancelledRef.current || finalizedRef.current) {
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

    setStatus(
      browser.isOperaGX
        ? "Starting voice (Opera)…"
        : "Starting speech recognition…"
    );
    armStartTimeout(session, browser);

    try {
      console.log("[voice] recognition.start called");
      rec.start();
      logVoiceStage("recognition.start-returned", browser);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("[voice] recognition.start threw:", msg);
      failStart(`${VOICE_CHROME_FALLBACK_MSG} (${msg})`, session);
    }
  }, [
    armStartTimeout,
    clearStartTimeout,
    deliver,
    failStart,
    markStartupSignal,
    releaseMicrophone,
    resetStartupSignals,
    detachRecognition,
    stopRecognition,
  ]);

  const stop = useCallback(
    (runSearch = true) => {
      if (!runSearch) {
        cancelledRef.current = true;
      }
      setStatus(runSearch ? "Processing…" : "");
      clearStartTimeout();
      const rec = recRef.current;
      if (rec) {
        try {
          detachRecognition(rec);
        } catch {
          /* ignore */
        }
        recRef.current = null;
        releaseMicrophone();
        setListening(false);
        if (runSearch && !finalizedRef.current) {
          const best = (accumulatedFinalRef.current + latestInterimRef.current).trim();
          if (best) {
            deliver(best);
          }
        }
      } else {
        releaseMicrophone();
        setListening(false);
      }
    },
    [clearStartTimeout, deliver, detachRecognition, releaseMicrophone]
  );

  const cancel = useCallback(() => {
    sessionRef.current += 1;
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
    experimentalBrowser,
    error,
    status,
    displayText,
    start,
    stop,
    cancel,
  };
}
