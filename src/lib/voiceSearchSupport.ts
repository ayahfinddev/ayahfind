export const VOICE_OPERA_GX_NOTICE_MSG =
  "Voice search is currently unavailable in Opera GX. You can still search by typing, or use Chrome, Edge, or Safari for voice search.";

/** Fallback when the browser has no speech recognition API (non-Opera). */
export const VOICE_CHROME_FALLBACK_MSG =
  "Voice search works best in Chrome. Please type your query below.";

export type VoiceBrowserInfo = {
  isOperaGX: boolean;
  isSafari: boolean;
  isIOS: boolean;
  hasSpeechCtor: boolean;
  label: string;
  releaseStreamBeforeRecognition: boolean;
  preferNonContinuous: boolean;
  usePermissionPriming: boolean;
};

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
  const isSafari = isSafariBrowser(ua);
  const isIOS = isIOSDevice(ua);
  const hasSpeechCtor = getVoiceApiDiagnostics().hasSpeechCtor;
  const preferNonContinuous = isOperaGX || isSafari || isIOS;
  const releaseStreamBeforeRecognition = isSafari || isIOS;

  let label = "supported";
  if (isOperaGX) label = "opera-gx";
  else if (isIOS) label = "ios-safari";
  else if (isSafari) label = "safari";
  else if (!hasSpeechCtor) label = "unsupported";

  return {
    isOperaGX,
    isSafari,
    isIOS,
    hasSpeechCtor,
    label,
    releaseStreamBeforeRecognition,
    preferNonContinuous,
    usePermissionPriming: !isIOS && !isOperaGX,
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