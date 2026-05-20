"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { bucketTimeForTradeDate } from "./chartTime";

type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type HighlightStyle = { left: number; width: number; visible: boolean };

const SPEEDS: Array<{ label: string; ms: number }> = [
  { label: "0.5×", ms: 1200 },
  { label: "1×", ms: 600 },
  { label: "2×", ms: 300 },
  { label: "5×", ms: 120 },
  { label: "10×", ms: 60 },
];

export default function ChartView({
  bars,
  entry,
  exit,
}: {
  bars: Bar[];
  entry?: Date | null;
  exit?: Date | null;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [highlight, setHighlight] = useState<HighlightStyle>({
    left: 0,
    width: 0,
    visible: false,
  });

  const [cursor, setCursor] = useState(0); // index of last bar visible
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  const entryTime = entry ? bucketTimeForTradeDate(entry) : null;
  const exitTime = exit ? bucketTimeForTradeDate(exit) : null;

  const visibleBars = bars.slice(0, cursor + 1);

  const updateHighlight = useCallback(() => {
    if (!chartRef.current || entryTime === null || exitTime === null) {
      setHighlight((h) => (h.visible ? { ...h, visible: false } : h));
      return;
    }
    const ts = chartRef.current.timeScale();
    const x1 = ts.timeToCoordinate(entryTime as UTCTimestamp);
    const x2 = ts.timeToCoordinate(exitTime as UTCTimestamp);
    if (x1 === null || x2 === null) {
      setHighlight((h) => (h.visible ? { ...h, visible: false } : h));
      return;
    }
    const left = Math.min(x1, x2);
    const width = Math.max(2, Math.abs(x2 - x1));
    setHighlight({ left, width, visible: true });
  }, [entryTime, exitTime]);

  // Initial chart setup
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: "#0e0e10" }, textColor: "#cccccc" },
      grid: {
        vertLines: { color: "#1f1f23" },
        horzLines: { color: "#1f1f23" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#262628" },
      timeScale: {
        borderColor: "#262628",
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;
    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderUpColor: "#16a34a",
      borderDownColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });
    volumeRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#3a3a3a",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const ro = new ResizeObserver(() => updateHighlight());
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    chart.timeScale().subscribeVisibleTimeRangeChange(updateHighlight);

    return () => {
      ro.disconnect();
      chart.timeScale().unsubscribeVisibleTimeRangeChange(updateHighlight);
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, [updateHighlight]);

  // Push data to chart when visible bars change
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return;
    candleRef.current.setData(
      visibleBars.map((b) => ({
        time: b.time as UTCTimestamp,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }))
    );
    volumeRef.current.setData(
      visibleBars.map((b) => ({
        time: b.time as UTCTimestamp,
        value: b.volume,
        color: b.close >= b.open ? "#16a34a55" : "#dc262655",
      }))
    );
    updateHighlight();
  }, [visibleBars, updateHighlight]);

  // Auto-fit viewport when bars change (new symbol/data), not when cursor moves
  useEffect(() => {
    if (!chartRef.current || bars.length === 0) return;
    if (entryTime !== null || exitTime !== null) {
      const from = (entryTime ?? exitTime!) - 60 * 60 * 4;
      const to = (exitTime ?? entryTime!) + 60 * 60 * 4;
      chartRef.current.timeScale().setVisibleRange({
        from: from as UTCTimestamp,
        to: to as UTCTimestamp,
      });
    } else {
      chartRef.current.timeScale().fitContent();
    }
  }, [bars, entryTime, exitTime]);

  // Reset cursor when new bars arrive
  useEffect(() => {
    setCursor(Math.max(0, bars.length - 1));
  }, [bars]);

  // Play loop
  useEffect(() => {
    if (!playing) {
      if (playTimer.current) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
      return;
    }
    const ms = SPEEDS[speedIdx].ms;
    playTimer.current = setInterval(() => {
      setCursor((c) => {
        if (c >= bars.length - 1) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, ms);
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [playing, speedIdx, bars.length]);

  const stepBack = () => setCursor((c) => Math.max(0, c - 1));
  const stepFwd = () => setCursor((c) => Math.min(bars.length - 1, c + 1));
  const jumpEnd = () => setCursor(bars.length - 1);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    // If already at the end, rewind to a useful start position before playing
    if (cursor >= bars.length - 1) {
      const target =
        entryTime !== null
          ? Math.max(0, bars.findIndex((b) => b.time >= entryTime) - 4)
          : 0;
      setCursor(target);
    }
    setPlaying(true);
  };

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {highlight.visible && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: `${highlight.left}px`,
            width: `${highlight.width}px`,
            background:
              "linear-gradient(to right, rgba(250, 204, 21, 0.04) 0%, rgba(250, 204, 21, 0.12) 50%, rgba(250, 204, 21, 0.04) 100%)",
            borderLeft: "1px dashed rgba(250, 204, 21, 0.6)",
            borderRight: "1px dashed rgba(250, 204, 21, 0.6)",
          }}
        />
      )}

      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#16151B]/90 backdrop-blur border border-white/10 rounded-md p-1">
        <button
          onClick={stepBack}
          disabled={bars.length === 0}
          className="text-xs px-2 py-1 rounded text-white/80 hover:bg-white/5 cursor-pointer disabled:text-white/30 disabled:cursor-not-allowed"
          title="Step back"
        >
          <i className="fa-solid fa-backward-step"></i>
        </button>
        <button
          onClick={togglePlay}
          disabled={bars.length === 0}
          className="text-xs px-3 py-1 rounded text-white/90 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={playing ? "Pause" : "Play"}
        >
          <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"}`}></i>
        </button>
        <button
          onClick={stepFwd}
          disabled={bars.length === 0}
          className="text-xs px-2 py-1 rounded text-white/80 hover:bg-white/5 cursor-pointer disabled:text-white/30 disabled:cursor-not-allowed"
          title="Step forward"
        >
          <i className="fa-solid fa-forward-step"></i>
        </button>
        <button
          onClick={jumpEnd}
          disabled={bars.length === 0}
          className="text-xs px-2 py-1 rounded text-white/80 hover:bg-white/5 cursor-pointer disabled:text-white/30 disabled:cursor-not-allowed"
          title="Jump to end"
        >
          <i className="fa-solid fa-forward-fast"></i>
        </button>
        <div className="border-l border-white/10 mx-1 h-5"></div>
        <select
          value={speedIdx}
          onChange={(e) => setSpeedIdx(parseInt(e.target.value))}
          className="text-xs bg-transparent text-white/80 px-1 py-0.5 rounded border border-white/10 cursor-pointer"
          title="Playback speed"
        >
          {SPEEDS.map((s, i) => (
            <option key={i} value={i} className="bg-[#16151B]">
              {s.label}
            </option>
          ))}
        </select>
        <div className="text-xs text-white/50 px-2">
          {cursor + 1} / {Math.max(bars.length, 1)}
        </div>
      </div>
    </div>
  );
}
