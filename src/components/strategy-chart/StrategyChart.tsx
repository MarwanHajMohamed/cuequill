"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Wrapper for a strategy schematic illustration.
 *
 * Coordinate system: a 800×320 SVG viewBox (5:2 aspect). Higher y values
 * represent LOWER prices, so candle bodies are drawn with y at the top of
 * the body and grow downward - matches normal SVG coordinates. Helper
 * components below all use this same coordinate space.
 *
 * Playback: a Play button animates `progressX` from 0 → CHART_WIDTH over
 * a fixed duration. Children read `progressX` from `useStrategyPlayback`
 * and reveal themselves as the cursor sweeps past their x position.
 */
export const CHART_WIDTH = 800;
export const CHART_HEIGHT = 320;
const PLAY_DURATION_MS = 6500;

type Playback = { progressX: number; playing: boolean };
const PlaybackContext = createContext<Playback>({
  progressX: CHART_WIDTH,
  playing: false,
});

export function useStrategyPlayback() {
  return useContext(PlaybackContext);
}

type Props = {
  children: React.ReactNode;
  title?: string;
  /** Adds a subtle grid for visual anchoring. */
  grid?: boolean;
  /** Override the viewBox width to trim empty space. Default 800. */
  width?: number;
  /** Override the viewBox height. Default 320. */
  height?: number;
};

export function StrategyChart({
  children,
  title,
  grid = true,
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
}: Props) {
  const [progressX, setProgressX] = useState(width);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const startTime = performance.now();
    const startX = progressX >= width ? 0 : progressX;
    const span = width - startX;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const x = startX + (elapsed / PLAY_DURATION_MS) * span;
      if (x >= width) {
        setProgressX(width);
        setPlaying(false);
        return;
      }
      setProgressX(x);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // We deliberately only watch `playing`; restart logic uses the latest
    // progressX captured at play time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const handlePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (progressX >= width) setProgressX(0);
    setPlaying(true);
  }, [playing, progressX, width]);

  return (
    <PlaybackContext.Provider value={{ progressX, playing }}>
      <div className="w-full border border-white/10 rounded-lg overflow-hidden bg-[var(--surface)]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          {title && (
            <div className="text-xs text-white/50 tracking-wide">
              {title}
            </div>
          )}
          <button
            type="button"
            onClick={handlePlay}
            className="ml-auto text-xs text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-md px-2.5 py-1 flex items-center gap-1.5 transition"
            aria-label={playing ? "pause schematic" : "play schematic"}
          >
            <i
              className={`fa-solid ${
                playing ? "fa-pause" : "fa-play"
              } text-[10px]`}
            ></i>
            {playing ? "Pause" : progressX >= CHART_WIDTH ? "Replay" : "Play"}
          </button>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          className="block"
        >
          {grid && <Grid width={width} height={height} />}
          {children}
        </svg>
      </div>
    </PlaybackContext.Provider>
  );
}

function Grid({ width, height }: { width: number; height: number }) {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= width; x += 80) {
    lines.push(
      <line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#ffffff08"
        strokeWidth={1}
      />,
    );
  }
  for (let y = 0; y <= height; y += 40) {
    lines.push(
      <line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#ffffff08"
        strokeWidth={1}
      />,
    );
  }
  return <g>{lines}</g>;
}
