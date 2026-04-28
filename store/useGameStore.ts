import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const SECOND_MS = 1_000;
const HOUR_MS = 60 * 60 * SECOND_MS;
const DAY_MS = 24 * HOUR_MS;

export const TILE_SIZE = 32;
export const FOREST_GRID_WIDTH = 48;
export const FOREST_GRID_HEIGHT = 48;

export const HATCHLING_STREAK_MS = DAY_MS;
export const MAJESTIC_STREAK_MS = 7 * DAY_MS;

export const BASE_COINS_PER_SECOND = 0.12;
export const HOURLY_COMPOUND_FACTOR = 1.012;
export const MAX_RATE_MULTIPLIER = 60;

export const BUILD_CATALOG = {
  pine_tree: {
    label: "Pine",
    cost: 15,
    textureKey: "pine_tree-sprite",
    swatch: "#2f9e44"
  },
  oak_tree: {
    label: "Oak",
    cost: 24,
    textureKey: "oak_tree-sprite",
    swatch: "#78a641"
  },
  fence: {
    label: "Fence",
    cost: 6,
    textureKey: "fence-sprite",
    swatch: "#a26f3f"
  },
  lantern: {
    label: "Lantern",
    cost: 18,
    textureKey: "lantern-sprite",
    swatch: "#f4b63f"
  },
  flower_patch: {
    label: "Flowers",
    cost: 9,
    textureKey: "flower_patch-sprite",
    swatch: "#dc5d9e"
  }
} as const;

export type ActiveScene = "shrine" | "forest";
export type PhoenixStage = "egg" | "hatchling" | "majestic";
export type ForestObjectType = keyof typeof BUILD_CATALOG;

export interface ForestGridObject {
  id: string;
  type: ForestObjectType;
  x: number;
  y: number;
  placedAt: number;
}

export type PurchaseFailureReason =
  | "insufficient_funds"
  | "invalid_coordinates"
  | "invalid_cost"
  | "unknown_object"
  | "occupied";

export interface PurchaseResult {
  ok: boolean;
  objectId?: string;
  reason?: PurchaseFailureReason;
}

interface GameActions {
  setActiveScene: (scene: ActiveScene) => void;
  setSelectedBuildItem: (objectType: ForestObjectType) => void;
  tick: (now?: number) => void;
  relapse: (now?: number) => void;
  purchaseObject: (
    x: number,
    y: number,
    objectType: ForestObjectType,
    cost?: number
  ) => PurchaseResult;
  buyAndPlaceObject: (
    x: number,
    y: number,
    objectType: ForestObjectType,
    cost?: number
  ) => PurchaseResult;
}

export interface GameState extends GameActions {
  activeScene: ActiveScene;
  currentStreakStartTime: number;
  lastEconomyUpdateAt: number;
  highestStreak: number;
  coinBalance: number;
  forestGrid: ForestGridObject[];
  selectedBuildItem: ForestObjectType;
}

export function getElapsedStreakMs(startTime: number, now = Date.now()) {
  return Math.max(0, now - startTime);
}

export function getPhoenixStage(streakElapsedMs: number): PhoenixStage {
  if (streakElapsedMs >= MAJESTIC_STREAK_MS) {
    return "majestic";
  }

  if (streakElapsedMs >= HATCHLING_STREAK_MS) {
    return "hatchling";
  }

  return "egg";
}

export function calculateCoinRate(streakElapsedMs: number) {
  const elapsedHours = Math.max(0, streakElapsedMs) / HOUR_MS;
  const multiplier = Math.min(
    Math.pow(HOURLY_COMPOUND_FACTOR, elapsedHours),
    MAX_RATE_MULTIPLIER
  );

  return BASE_COINS_PER_SECOND * multiplier;
}

export function calculateIdleCoinAccrual(
  streakElapsedAtStartMs: number,
  streakElapsedAtEndMs: number
) {
  const startSeconds = Math.max(0, streakElapsedAtStartMs) / SECOND_MS;
  const endSeconds = Math.max(startSeconds, streakElapsedAtEndMs / SECOND_MS);
  const deltaSeconds = endSeconds - startSeconds;

  if (deltaSeconds <= 0) {
    return 0;
  }

  const logFactor = Math.log(HOURLY_COMPOUND_FACTOR);
  const capHours = Math.log(MAX_RATE_MULTIPLIER) / logFactor;
  const startHours = startSeconds / 3_600;
  const endHours = endSeconds / 3_600;

  if (startHours >= capHours) {
    return BASE_COINS_PER_SECOND * MAX_RATE_MULTIPLIER * deltaSeconds;
  }

  const uncappedEndHours = Math.min(endHours, capHours);
  const exponentialAccrual =
    (BASE_COINS_PER_SECOND * 3_600 * (
      Math.pow(HOURLY_COMPOUND_FACTOR, uncappedEndHours) -
      Math.pow(HOURLY_COMPOUND_FACTOR, startHours)
    )) /
    logFactor;

  if (endHours <= capHours) {
    return exponentialAccrual;
  }

  const cappedSeconds = (endHours - capHours) * 3_600;
  return (
    exponentialAccrual +
    BASE_COINS_PER_SECOND * MAX_RATE_MULTIPLIER * cappedSeconds
  );
}

function isValidGridCoordinate(x: number, y: number) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < FOREST_GRID_WIDTH &&
    y < FOREST_GRID_HEIGHT
  );
}

function createForestObjectId(
  objectType: ForestObjectType,
  x: number,
  y: number,
  placedAt: number
) {
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${objectType}-${x}-${y}-${placedAt}-${nonce}`;
}

const initialNow = Date.now();

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    activeScene: "shrine",
    currentStreakStartTime: initialNow,
    lastEconomyUpdateAt: initialNow,
    highestStreak: 0,
    coinBalance: 0,
    forestGrid: [],
    selectedBuildItem: "pine_tree",

    setActiveScene: (scene) => {
      set({ activeScene: scene });
    },

    setSelectedBuildItem: (objectType) => {
      set({ selectedBuildItem: objectType });
    },

    tick: (now = Date.now()) => {
      const state = get();
      const safeNow = Number.isFinite(now) ? now : Date.now();

      if (safeNow <= state.lastEconomyUpdateAt) {
        return;
      }

      const accrualStart = Math.max(
        state.lastEconomyUpdateAt,
        state.currentStreakStartTime
      );
      const streakElapsedAtStart =
        accrualStart - state.currentStreakStartTime;
      const streakElapsedAtEnd = safeNow - state.currentStreakStartTime;
      const earnedCoins = calculateIdleCoinAccrual(
        streakElapsedAtStart,
        streakElapsedAtEnd
      );

      set({
        coinBalance: state.coinBalance + earnedCoins,
        lastEconomyUpdateAt: safeNow,
        highestStreak: Math.max(state.highestStreak, streakElapsedAtEnd)
      });
    },

    relapse: (now = Date.now()) => {
      const state = get();
      const safeNow = Number.isFinite(now) ? now : Date.now();
      const completedStreak = getElapsedStreakMs(
        state.currentStreakStartTime,
        safeNow
      );

      set({
        currentStreakStartTime: safeNow,
        lastEconomyUpdateAt: safeNow,
        highestStreak: Math.max(state.highestStreak, completedStreak)
      });
    },

    purchaseObject: (x, y, objectType, cost) => {
      const state = get();
      const catalogItem = BUILD_CATALOG[objectType];

      if (!catalogItem) {
        return { ok: false, reason: "unknown_object" };
      }

      const resolvedCost = cost ?? catalogItem.cost;

      if (!isValidGridCoordinate(x, y)) {
        return { ok: false, reason: "invalid_coordinates" };
      }

      if (!Number.isFinite(resolvedCost) || resolvedCost < 0) {
        return { ok: false, reason: "invalid_cost" };
      }

      if (state.forestGrid.some((object) => object.x === x && object.y === y)) {
        return { ok: false, reason: "occupied" };
      }

      if (state.coinBalance < resolvedCost) {
        return { ok: false, reason: "insufficient_funds" };
      }

      const placedAt = Date.now();
      const objectId = createForestObjectId(objectType, x, y, placedAt);

      set({
        coinBalance: state.coinBalance - resolvedCost,
        forestGrid: [
          ...state.forestGrid,
          {
            id: objectId,
            type: objectType,
            x,
            y,
            placedAt
          }
        ]
      });

      return { ok: true, objectId };
    },

    buyAndPlaceObject: (x, y, objectType, cost) => {
      return get().purchaseObject(x, y, objectType, cost);
    }
  }))
);
