"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Web Speech API type declarations (not in standard TS DOM lib)
// ---------------------------------------------------------------------------

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string; readonly confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceInputProps {
  onTranscript: (finalText: string) => void;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ??
    null
  );
}

// ---------------------------------------------------------------------------
// VoiceInput — speech-to-text microphone toggle for the Feynman editor
// ---------------------------------------------------------------------------

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check browser support on mount
  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // Auto-stop after 3s of silence
      recognitionRef.current?.stop();
    }, 3000);
  }, [clearSilenceTimer]);

  const stop = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [clearSilenceTimer]);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    setError(null);
    setInterim("");

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = ""; // use browser default

    recognition.onstart = () => {
      setListening(true);
      resetSilenceTimer();
    };

    recognition.onresult = (event) => {
      resetSilenceTimer();
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          onTranscript(result[0].transcript.trim());
          setInterim("");
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      if (interimTranscript) {
        setInterim(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      clearSilenceTimer();
      setListening(false);
      setInterim("");
      switch (event.error) {
        case "not-allowed":
          setError("Microphone permission denied");
          break;
        case "no-speech":
          setError("No speech detected");
          break;
        case "network":
          setError("Network error — check connection");
          break;
        case "aborted":
          // User stopped, not an error
          break;
        default:
          setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
      clearSilenceTimer();
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript, resetSilenceTimer, clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      recognitionRef.current?.stop();
    };
  }, [clearSilenceTimer]);

  // Don't render anything if browser doesn't support speech recognition
  if (!supported) return null;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={listening ? stop : start}
        className={[
          "pixel-btn pixel-btn-secondary pixel-btn-sm",
          listening ? "border-[var(--pixel-error)]" : "",
        ].join(" ")}
        aria-label={listening ? "Stop voice input" : "Start voice input"}
        title={listening ? "Stop recording" : "Voice input"}
      >
        <span className="inline-flex items-center gap-1">
          {listening && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-[var(--pixel-error)] animate-pulse"
              aria-hidden="true"
            />
          )}
          <span aria-hidden="true">🎤</span>
        </span>
      </button>

      {/* Interim transcript display */}
      {listening && interim && (
        <span className="max-w-[180px] truncate font-pixel text-[10px] italic text-[var(--pixel-text-muted)]">
          {interim}
        </span>
      )}

      {/* Listening indicator */}
      {listening && !interim && (
        <span className="font-pixel text-[10px] text-[var(--pixel-text-muted)]">
          Listening...
        </span>
      )}

      {/* Error display */}
      {error && !listening && (
        <span className="text-xs text-[var(--pixel-error)]">
          {error}
        </span>
      )}
    </div>
  );
}
