"use client";

import { useEffect } from "react";
import {
  BUILD_CATALOG,
  calculateCoinRate,
  getElapsedStreakMs,
  useGameStore,
  type ActiveScene,
  type ForestObjectType
} from "@/store/useGameStore";

export function GameHud() {
  useEconomyTicker();

  const activeScene = useGameStore((state) => state.activeScene);
  const setActiveScene = useGameStore((state) => state.setActiveScene);
  const coinBalance = useGameStore((state) => state.coinBalance);
  const currentStreakStartTime = useGameStore(
    (state) => state.currentStreakStartTime
  );
  const lastEconomyUpdateAt = useGameStore((state) => state.lastEconomyUpdateAt);
  const highestStreak = useGameStore((state) => state.highestStreak);
  const relapse = useGameStore((state) => state.relapse);

  const streakElapsed = getElapsedStreakMs(
    currentStreakStartTime,
    lastEconomyUpdateAt
  );
  const currentRate = calculateCoinRate(streakElapsed);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto flex rounded-md border border-white/10 bg-black/45 p-1 shadow-2xl backdrop-blur">
          <SceneTab
            active={activeScene === "shrine"}
            label="Shrine"
            scene="shrine"
            onSelect={setActiveScene}
          />
          <SceneTab
            active={activeScene === "forest"}
            label="Forest"
            scene="forest"
            onSelect={setActiveScene}
          />
        </div>

        <div className="grid min-w-[260px] grid-cols-2 gap-2 rounded-md border border-white/10 bg-black/45 p-3 text-sm shadow-2xl backdrop-blur sm:min-w-[360px] sm:grid-cols-4">
          <Readout label="Coins" value={formatCoins(coinBalance)} />
          <Readout label="Rate" value={`${currentRate.toFixed(2)}/s`} />
          <Readout label="Streak" value={formatDuration(streakElapsed)} />
          <Readout label="Best" value={formatDuration(highestStreak)} />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        {activeScene === "forest" ? <BuildMenu /> : <div />}

        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Reset the Phoenix streak? Your forest and coins stay."
              )
            ) {
              relapse();
            }
          }}
          className="pointer-events-auto ml-auto rounded-md border border-red-300/30 bg-red-950/75 px-4 py-3 text-sm font-semibold text-red-100 shadow-2xl backdrop-blur transition hover:bg-red-900/85 focus:outline-none focus:ring-2 focus:ring-red-300/70"
        >
          Relapse
        </button>
      </div>
    </div>
  );
}

function useEconomyTicker() {
  useEffect(() => {
    let frameId = 0;
    let lastTickAt = 0;

    const loop = (time: number) => {
      if (time - lastTickAt >= 250) {
        useGameStore.getState().tick();
        lastTickAt = time;
      }

      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);
}

function SceneTab({
  active,
  label,
  scene,
  onSelect
}: {
  active: boolean;
  label: string;
  scene: ActiveScene;
  onSelect: (scene: ActiveScene) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(scene)}
      className={`rounded px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-200/80 ${
        active
          ? "bg-amber-300 text-stone-950"
          : "text-stone-200 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
        {label}
      </div>
      <div className="mt-1 truncate text-base font-bold text-stone-50">
        {value}
      </div>
    </div>
  );
}

function BuildMenu() {
  const selectedBuildItem = useGameStore((state) => state.selectedBuildItem);
  const setSelectedBuildItem = useGameStore(
    (state) => state.setSelectedBuildItem
  );
  const coinBalance = useGameStore((state) => state.coinBalance);

  return (
    <div className="pointer-events-auto max-w-[min(92vw,560px)] rounded-md border border-white/10 bg-black/50 p-2 shadow-2xl backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {Object.entries(BUILD_CATALOG).map(([objectType, item]) => {
          const typedObject = objectType as ForestObjectType;
          const isSelected = typedObject === selectedBuildItem;
          const canAfford = coinBalance >= item.cost;

          return (
            <button
              key={objectType}
              type="button"
              onClick={() => setSelectedBuildItem(typedObject)}
              className={`flex min-w-[104px] items-center gap-2 rounded px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-amber-200/80 ${
                isSelected
                  ? "bg-amber-300 text-stone-950"
                  : "bg-white/10 text-stone-100 hover:bg-white/15"
              } ${canAfford ? "" : "opacity-55"}`}
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-sm border border-black/25"
                style={{ backgroundColor: item.swatch }}
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {item.label}
                </span>
                <span className="block text-xs opacity-75">
                  {item.cost} coins
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatCoins(value: number) {
  if (value >= 10_000) {
    return Math.floor(value).toLocaleString();
  }

  return value.toFixed(1);
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}
