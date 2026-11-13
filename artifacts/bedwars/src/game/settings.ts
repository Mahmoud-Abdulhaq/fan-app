import { useEffect, useState } from "react";
import type { Difficulty } from "./types";

export type TouchMode = "auto" | "on" | "off";
export interface MinigameSettings {
  difficulty: Difficulty;
  showGrid: boolean;
  screenShake: boolean;
  showHints: boolean;
  touchControls: TouchMode;
  kitId: string | null;
}

export const DEFAULT_SETTINGS: MinigameSettings = {
  difficulty: "standard", showGrid: false, screenShake: true, showHints: true, touchControls: "auto", kitId: null,
};

export const settingsKey = (userId: string) => `bw.minigame.settings.v1.${userId}`;

/** Pure: validate an unknown JSON value into settings. Only preferences live here, never progress. */
export function parseSettings(raw: unknown): MinigameSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = o.difficulty;
  const t = o.touchControls;
  return {
    difficulty: d === "rookie" || d === "standard" || d === "veteran" ? d : DEFAULT_SETTINGS.difficulty,
    showGrid: typeof o.showGrid === "boolean" ? o.showGrid : DEFAULT_SETTINGS.showGrid,
    screenShake: typeof o.screenShake === "boolean" ? o.screenShake : DEFAULT_SETTINGS.screenShake,
    showHints: typeof o.showHints === "boolean" ? o.showHints : DEFAULT_SETTINGS.showHints,
    touchControls: t === "auto" || t === "on" || t === "off" ? t : DEFAULT_SETTINGS.touchControls,
    kitId: typeof o.kitId === "string" ? o.kitId : null,
  };
}

function load(userId: string) {
  try { return parseSettings(JSON.parse(localStorage.getItem(settingsKey(userId)) ?? "null")); }
  catch { return DEFAULT_SETTINGS; }
}

/** Mount under a component keyed by userId so switching accounts re-reads the right key. */
export function useMinigameSettings(userId: string) {
  const [settings, setSettings] = useState<MinigameSettings>(() => load(userId));
  useEffect(() => {
    try { localStorage.setItem(settingsKey(userId), JSON.stringify(settings)); } catch { /* storage unavailable */ }
  }, [userId, settings]);
  const update = (patch: Partial<MinigameSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const reset = () => setSettings((s) => ({ ...DEFAULT_SETTINGS, kitId: s.kitId }));
  return { settings, update, reset };
}
