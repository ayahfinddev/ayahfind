export const VOICE_OPERA_GX_NOTICE_MSG =
  "Voice search is currently unavailable in Opera GX. You can still search by typing, or use Chrome, Edge, or Safari for voice search.";

/** Fallback when the browser has no speech recognition API (non-Opera). */
export const VOICE_CHROME_FALLBACK_MSG =
  "Voice search works best in Chrome. Please type your query below.";

/** Shown when speech recognition fails for browser/service reasons (production-safe). */
export const VOICE_UNAVAILABLE_MSG =
  "Voice search is currently unavailable in this browser. You can still search by typing below.";

export type VoiceBrowserInfo = {
  isOperaGX: boolean;
  isEdge: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isIOS: boolean;
  hasSpeechCtor: boolean;
  label: string;
  releaseStreamBeforeRecognition: boolean;
  preferNonContinuous: boolean;
  usePermissionPriming: boolean;
};

function isChromeBrowser(ua: string): boolean {
  return (
    /Chrome|Chromium|CriOS/i.test(ua) &&
    !/Edg|OPR|Opera/i.test(ua)
  );
}

/** Known SpeechRecognitionErrorEvent.error values (Web Speech API). */
export type SpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed";

export type SpeechRecognitionErrorDetails = {
  code: SpeechRecognitionErrorCode | string;
  message: string | undefined;
  browserLabel: string;
  /** Production-safe message shown in the UI. */
  userMessage: string;
  /** Detailed message for console logs and development diagnostics. */
  debugMessage: string;
};

function isEdgeChromium(ua: string): boolean {
  return /Edg\//i.test(ua);
}

export function speechErrorUserMessage(
  code: string,
  _browser: Pick<VoiceBrowserInfo, "isEdge" | "label">
): string {
  switch (code) {
    case "no-speech":
      return "No speech heard. Speak louder or move closer to the mic.";
    case "not-allowed":
      return "Microphone blocked. Allow mic access for this site.";
    case "service-not-allowed":
      return VOICE_UNAVAILABLE_MSG;
    case "audio-capture":
      return "No microphone found. Plug in a mic or check sound settings.";
    case "network":
      return VOICE_UNAVAILABLE_MSG;
    case "language-not-supported":
      return VOICE_UNAVAILABLE_MSG;
    case "bad-grammar":
      return "Voice search could not understand that. Try again or type your query below.";
    case "aborted":
      return "";
    default:
      return VOICE_UNAVAILABLE_MSG;
  }
}

export function speechErrorDebugMessage(
  code: string,
  browser: Pick<VoiceBrowserInfo, "isEdge" | "label">
): string {
  switch (code) {
    case "no-speech":
      return "SpeechRecognition error: no-speech";
    case "not-allowed":
      return "SpeechRecognition error: not-allowed (mic permission denied)";
    case "service-not-allowed":
      return `SpeechRecognition error: service-not-allowed (browser: ${browser.label})`;
    case "audio-capture":
      return "SpeechRecognition error: audio-capture (no mic device)";
    case "network":
      if (browser.isEdge) {
        return "SpeechRecognition error: network — Microsoft Edge could not reach its speech service. This is usually an Edge backend issue, not the user's connection.";
      }
      return `SpeechRecognition error: network (browser: ${browser.label})`;
    case "language-not-supported":
      return `SpeechRecognition error: language-not-supported (browser: ${browser.label})`;
    case "bad-grammar":
      return "SpeechRecognition error: bad-grammar";
    case "aborted":
      return "SpeechRecognition error: aborted";
    default:
      return `SpeechRecognition error: ${code} (browser: ${browser.label})`;
  }
}

export function formatSpeechRecognitionError(
  code: string,
  browser: VoiceBrowserInfo,
  implementationMessage?: string
): SpeechRecognitionErrorDetails {
  return {
    code,
    message: implementationMessage,
    browserLabel: browser.label,
    userMessage: speechErrorUserMessage(code, browser),
    debugMessage: speechErrorDebugMessage(code, browser),
  };
}

export type VoiceApiDiagnostics = {
  speechRecognition: boolean;
  webkitSpeechRecognition: boolean;
  hasSpeechCtor: boolean;
};

function isIOSDevice(ua: string): boolean {
  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    (typeof navigator !== "undefined" &&
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1)
  );
}

function isSafariBrowser(ua: string): boolean {
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|OPR|Edg|Opera/i.test(ua);
}

export function getVoiceApiDiagnostics(): VoiceApiDiagnostics {
  if (typeof window === "undefined") {
    return {
      speechRecognition: false,
      webkitSpeechRecognition: false,
      hasSpeechCtor: false,
    };
  }
  const w = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  const speechRecognition = typeof w.SpeechRecognition !== "undefined";
  const webkitSpeechRecognition =
    typeof w.webkitSpeechRecognition !== "undefined";
  return {
    speechRecognition,
    webkitSpeechRecognition,
    hasSpeechCtor: speechRecognition || webkitSpeechRecognition,
  };
}

export function detectVoiceBrowser(): VoiceBrowserInfo {
  if (typeof navigator === "undefined") {
    return {
      isOperaGX: false,
      isEdge: false,
      isChrome: false,
      isSafari: false,
      isIOS: false,
      hasSpeechCtor: false,
      label: "ssr",
      releaseStreamBeforeRecognition: false,
      preferNonContinuous: false,
      usePermissionPriming: true,
    };
  }

  const w = window as Window & {
    opr?: unknown;
    opera?: unknown;
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  const ua = navigator.userAgent;
  const isOperaGX =
    /OPR\/|Opera GX|Opera\//i.test(ua) ||
    typeof w.opr !== "undefined" ||
    typeof w.opera !== "undefined";
  const isEdge = isEdgeChromium(ua) && !isOperaGX;
  const isChrome = isChromeBrowser(ua) && !isOperaGX && !isEdge;
  const isSafari = isSafariBrowser(ua);
  const isIOS = isIOSDevice(ua);
  const hasSpeechCtor = getVoiceApiDiagnostics().hasSpeechCtor;
  // Edge mis-fires "network" in continuous mode when idle; single-shot is more reliable.
  const preferNonContinuous = isOperaGX || isSafari || isIOS || isEdge;
  const releaseStreamBeforeRecognition = isSafari || isIOS;

  let label = "supported";
  if (isOperaGX) label = "opera-gx";
  else if (isEdge) label = "edge";
  else if (isChrome) label = "chrome";
  else if (isIOS) label = "ios-safari";
  else if (isSafari) label = "safari";
  else if (!hasSpeechCtor) label = "unsupported";

  return {
    isOperaGX,
    isEdge,
    isChrome,
    isSafari,
    isIOS,
    hasSpeechCtor,
    label,
    releaseStreamBeforeRecognition,
    preferNonContinuous,
    // Chrome/Edge: SpeechRecognition should own the mic; priming can prevent onresult.
    usePermissionPriming: !isIOS && !isOperaGX && !isEdge && !isChrome,
  };
}

export function releaseMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
}