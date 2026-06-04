"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectVoiceBrowser,
  formatSpeechRecognitionError,
  getVoiceApiDiagnostics,
  releaseMediaStream,
  VOICE_CHROME_FALLBACK_MSG,
  VOICE_OPERA_GX_NOTICE_MSG,
  type SpeechRecognitionErrorDetails,
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
  message?: string;
};

const IS_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

function logSpeechRecognitionError(
  ev: SpeechErrorEvent,
  browser: VoiceBrowserInfo,
  context: Record<string, unknown>
): SpeechRecognitionErrorDetails {
  const details = formatSpeechRecognitionError(
    ev.error,
    browser,
    ev.message
  );
  const payload = {
    speechRecognitionError: details.code,
    speechRecognitionMessage: details.message ?? null,
    browser: details.browserLabel,
    isEdge: browser.isEdge,
    userMessage: details.userMessage,
    ...context,
  };
  console.error("[voice] SpeechRecognition.onerror", payload);
  if (IS_DEV) {
    console.error("[voice] SpeechRecognition.onerror (raw event):", ev);
  }
  return details;
}

export type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: (audioTrack?: MediaStreamTrack) => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechResultEvent) => void) | null;
  onerror: ((ev: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onaudioend?: (() => void) | null;
  onsoundstart?: (() => void) | null;
  onsoundend?: (() => void) | null;
  onspeechend?: (() => void) | null;
  onnomatch?: (() => void) | null;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [speechDiagnostics, setSpeechDiagnostics] =
    useState<SpeechRecognitionErrorDetails | null>(null);

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
    onaudiostart: false,
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
      startupSignalsRef.current.onresult ||
      startupSignalsRef.current.onaudiostart,
    []
  );

  const markStartupSignal = useCallback(
    (kind: "onstart" | "onspeechstart" | "onresult" | "onaudiostart") => {
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
      onaudiostart: false,
    };
  }, []);

  useEffect(() => {
    const info = detectVoiceBrowser();
    logVoiceStage("mount", info);
    installOperaSpeechProbeGlobal();
    if (info.isOperaGX) {
      console.log(
        "[voice] Opera detected — run __ayahfindVoiceProbe() in console for diagnostics"
      );
      setSupported(false);
      setNotice(VOICE_OPERA_GX_NOTICE_MSG);
      return;
    }
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
      const browser = detectVoiceBrowser();
      logVoiceStage("failStart", browser, { message });
      clearStartTimeout();
      cancelledRef.current = true;
      stopRecognition();
      releaseMicrophone();
      recRef.current = null;
      setListening(false);
      setStatus("");
      if (browser.isOperaGX) {
        setNotice(VOICE_OPERA_GX_NOTICE_MSG);
        setError(null);
      } else {
        setError(message);
      }
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
        failStart(
          browser.isOperaGX
            ? VOICE_OPERA_GX_NOTICE_MSG
            : VOICE_CHROME_FALLBACK_MSG,
          session
        );
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
    setSpeechDiagnostics(null);
    setStatus("Requesting microphone…");
    setTranscript("");
    setInterim("");
    accumulatedFinalRef.current = "";
    latestInterimRef.current = "";

    const browser = detectVoiceBrowser();
    logVoiceStage("start()", browser, { session });

    if (browser.isOperaGX) {
      setSupported(false);
      setNotice(VOICE_OPERA_GX_NOTICE_MSG);
      setError(null);
      setStatus("");
      return;
    }

    const SR = getSpeechRecognitionCtor();
    if (!SR || !browser.hasSpeechCtor) {
      logVoiceStage("no-speech-ctor", browser);
      failStart(VOICE_CHROME_FALLBACK_MSG, session);
      return;
    }

    if (browser.usePermissionPriming || browser.isOperaGX) {
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
          readyState: stream.getAudioTracks()[0]?.readyState,
        });
        if (browser.releaseStreamBeforeRecognition && !browser.isOperaGX) {
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
        "[voice] getUserMedia skipped (iOS path — SpeechRecognition owns mic)"
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

    rec.onaudiostart = () => {
      if (session !== sessionRef.current) return;
      console.log("[voice] onaudiostart fired");
      markStartupSignal("onaudiostart");
    };

    rec.onaudioend = () => console.log("[voice] onaudioend fired");
    rec.onsoundstart = () => console.log("[voice] onsoundstart fired");
    rec.onsoundend = () => console.log("[voice] onsoundend fired");
    rec.onspeechend = () => console.log("[voice] onspeechend fired");
    rec.onnomatch = () => console.log("[voice] onnomatch fired");

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
      if (code === "aborted") {
        console.log("[voice] SpeechRecognition.onerror (ignored): aborted");
        return;
      }
      const details = logSpeechRecognitionError(ev, browser, {
        session,
        lang: rec.lang,
        continuous: rec.continuous,
        secureContext:
          typeof window !== "undefined" ? window.isSecureContext : false,
      });
      if (IS_DEV) {
        setSpeechDiagnostics(details);
      }
      clearStartTimeout();
      releaseMicrophone();
      setListening(false);
      setStatus("");
      const msg = details.userMessage.trim();
      if (msg) {
        setError(msg);
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
      console.log("[voice] recognition.start called", {
        opera: browser.isOperaGX,
        withTrack: Boolean(browser.isOperaGX && mediaStreamRef.current),
        secureContext:
          typeof window !== "undefined" ? window.isSecureContext : false,
      });
      const track = mediaStreamRef.current?.getAudioTracks()[0];
      if (browser.isOperaGX && track?.readyState === "live") {
        rec.start(track);
      } else {
        rec.start();
      }
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
    notice,
    error,
    speechDiagnostics: IS_DEV ? speechDiagnostics : null,
    status,
    displayText,
    start,
    stop,
    cancel,
  };
}

const OPERA_PROBE_WAIT_MS = 4000;

/** Console probe — run __ayahfindVoiceProbe() to capture onerror codes per strategy */
function installOperaSpeechProbeGlobal(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __ayahfindVoiceProbe?: (lang?: string) => Promise<void>;
  };
  if (w.__ayahfindVoiceProbe) return;

  w.__ayahfindVoiceProbe = async (lang = "en-US") => {
    const api = getVoiceApiDiagnostics();
    const browser = detectVoiceBrowser();
    console.log("[voice][probe] Browser:", browser.label, browser);
    console.log("[voice][probe] SpeechRecognition?", api.speechRecognition);
    console.log(
      "[voice][probe] webkitSpeechRecognition?",
      api.webkitSpeechRecognition
    );
    console.log("[voice][probe] secureContext:", window.isSecureContext);

    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      console.log("[voice][probe] No constructor — aborting");
      return;
    }

    const strategies: Array<{
      id: string;
      run: (rec: SpeechRecognitionInstance) => void;
      track?: MediaStreamTrack;
    }> = [
      {
        id: "bare-no-lang",
        run: () => {},
      },
      {
        id: "lang-non-continuous",
        run: (rec) => {
          rec.lang = lang;
          rec.continuous = false;
          rec.interimResults = false;
        },
      },
      {
        id: "lang-continuous",
        run: (rec) => {
          rec.lang = lang;
          rec.continuous = true;
          rec.interimResults = true;
        },
      },
    ];

    let gumTrack: MediaStreamTrack | undefined;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[voice][probe] getUserMedia success");
      gumTrack = stream.getAudioTracks()[0];
      strategies.push({
        id: "gum-then-start",
        run: (rec) => {
          rec.lang = lang;
          rec.continuous = false;
          rec.interimResults = false;
        },
      });
      if (gumTrack) {
        strategies.push({
          id: "gum-start-track",
          track: gumTrack,
          run: (rec) => {
            rec.lang = lang;
            rec.continuous = false;
            rec.interimResults = false;
          },
        });
      }
    } catch (e) {
      console.log("[voice][probe] getUserMedia failed:", e);
    }

    for (const strategy of strategies) {
      const events: string[] = [];
      const rec = new SR();
      strategy.run(rec);
      rec.onstart = () => events.push("onstart");
      rec.onspeechstart = () => events.push("onspeechstart");
      rec.onresult = () => events.push("onresult");
      rec.onerror = (e) =>
        events.push(
          `onerror:${e.error}${e.message ? `:${e.message}` : ""}`
        );
      rec.onend = () => events.push("onend");
      rec.onaudiostart = () => events.push("onaudiostart");
      rec.onaudioend = () => events.push("onaudioend");

      try {
        console.log(`[voice][probe][${strategy.id}] recognition.start called`);
        if (strategy.track) rec.start(strategy.track);
        else rec.start();
      } catch (e) {
        console.log(`[voice][probe][${strategy.id}] start threw:`, e);
        continue;
      }

      await new Promise((r) => window.setTimeout(r, OPERA_PROBE_WAIT_MS));
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      console.log(
        `[voice][probe][${strategy.id}] events after ${OPERA_PROBE_WAIT_MS}ms:`,
        events.length ? events : "(none — silent stub)"
      );
    }

    if (gumTrack) {
      try {
        gumTrack.stop();
      } catch {
        /* ignore */
      }
    }

    console.log(
      "[voice][probe] If every strategy logged (none — silent stub), the browser exposes SpeechRecognition but the speech backend may be unavailable."
    );
  };
}
