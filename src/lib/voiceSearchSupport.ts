export const VOICE_OPERA_GX_NOTICE_MSG =
  "Voice search is currently unavailable in Opera GX. You can still search by typing, or use Chrome, Edge, or Safari for voice search.";

/** Fallback when the browser has no speech recognition API (non-Opera). */
export const VOICE_CHROME_FALLBACK_MSG =
  "Voice search works best in Chrome. Please type your query below.";

export type VoiceBrowserInfo = {
  isOperaGX: boolean;
  isEdge: boolean;
  isSafari: boolean;
  isIOS: boolean;
  hasSpeechCtor: boolean;
  label: string;
  releaseStreamBeforeRecognition: boolean;
  preferNonContinuous: boolean;
  usePermissionPriming: boolean;
};

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
  userMessage: string;
};

function isEdgeChromium(ua: string): boolean {
  return /Edg\//i.test(ua);
}

export function speechErrorUserMessage(
  code: string,
  browser: Pick<VoiceBrowserInfo, "isEdge" | "label">
): string {
  switch (code) {
    case "no-speech":
      return "No speech heard. Speak louder or move closer to the mic.";
    case "not-allowed":
      return "Microphone blocked. Allow mic access for this site.";
    case "service-not-allowed":
      return "Speech recognition is blocked by the browser or page policy (HTTPS, permissions, or enterprise settings).";
    case "audio-capture":
      return "No microphone found. Plug in a mic or check sound settings.";
    case "network":
      if (browser.isEdge) {
        return "Microsoft Edge could not reach its speech service (error: network). This is usually an Edge backend issue, not your connection. Try Chrome or type your query below.";
      }
      return "Speech recognition could not reach its cloud service (error: network). Check connectivity or type your query below.";
    case "language-not-supported":
      return `Speech language not supported by this browser (error: language-not-supported). Try English or Chrome.`;
    case "bad-grammar":
      return "Speech grammar error. Try again or type your query below.";
    case "aborted":
      return "";
    default:
      return `Voice recognition failed (error: ${code}). ${VOICE_CHROME_FALLBACK_MSG}`;
  }
}

export function formatSpeechRecognitionError(
  code: string,
  browser: VoiceBrowserInfo,
  implementationMessage?: string
): SpeechRecognitionErrorDetails {
  const userMessage = speechErrorUserMessage(code, browser);
  return {
    code,
    message: implementationMessage,
    browserLabel: browser.label,
    userMessage,
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
  const isSafari = isSafariBrowser(ua);
  const isIOS = isIOSDevice(ua);
  const hasSpeechCtor = getVoiceApiDiagnostics().hasSpeechCtor;
  // Edge mis-fires "network" in continuous mode when idle; single-shot is more reliable.
  const preferNonContinuous = isOperaGX || isSafari || isIOS || isEdge;
  const releaseStreamBeforeRecognition = isSafari || isIOS;

  let label = "supported";
  if (isOperaGX) label = "opera-gx";
  else if (isEdge) label = "edge";
  else if (isIOS) label = "ios-safari";
  else if (isSafari) label = "safari";
  else if (!hasSpeechCtor) label = "unsupported";

  return {
    isOperaGX,
    isEdge,
    isSafari,
    isIOS,
    hasSpeechCtor,
    label,
    releaseStreamBeforeRecognition,
    preferNonContinuous,
    // Edge: getUserMedia before start() can race with the speech backend and yield "network".
    usePermissionPriming: !isIOS && !isOperaGX && !isEdge,
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