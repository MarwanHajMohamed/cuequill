"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in lib.dom by default, and
// only the webkit-prefixed constructor exists in Chrome/Safari).
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  0: SRAlternative;
  isFinal: boolean;
}
interface SRResultList {
  length: number;
  [index: number]: SRResult;
}
interface SREvent {
  resultIndex: number;
  results: SRResultList;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Tap-to-talk dictation via the browser's Speech Recognition API.
//   onResult — live transcript (interim + final) while speaking.
//   onFinal  — the complete phrase once the user stops (recognition ends).
// Callbacks are kept in refs so the recognition instance isn't rebuilt when
// they change (e.g. a fresh `send` closure each render).
export function useSpeechRecognition(opts: {
  onResult?: (text: string) => void;
  onFinal?: (text: string) => void;
  lang?: string;
}) {
  const { lang = "en-US" } = opts;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef("");
  const onResultRef = useRef(opts.onResult);
  const onFinalRef = useRef(opts.onFinal);
  onResultRef.current = opts.onResult;
  onFinalRef.current = opts.onFinal;

  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: SREvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0]?.transcript ?? "";
        if (res.isFinal) final += txt;
        else interim += txt;
      }
      if (final) finalRef.current += final;
      onResultRef.current?.((finalRef.current + interim).trim());
    };
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      finalRef.current = "";
      if (text) onFinalRef.current?.(text);
    };
    rec.onerror = () => {
      setListening(false);
      finalRef.current = "";
    };

    recRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec || listening) return;
    finalRef.current = "";
    try {
      rec.start();
      setListening(true);
    } catch {
      /* start() throws if already running; ignore */
    }
  }, [listening]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}
