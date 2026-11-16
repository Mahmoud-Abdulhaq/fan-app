import { useEffect, useState } from "react";
import type { ArenaMapId } from "./maps";

export type TouchMode = "auto" | "on" | "off";
export const KEYBIND_ACTIONS = ["up", "down", "left", "right", "attack", "mine", "place", "ability", "shop", "pause"] as const;
export type KeybindAction = typeof KEYBIND_ACTIONS[number];
export type Keybinds = Record<KeybindAction, string>;

export const DEFAULT_KEYBINDS: Keybinds = {
  up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD",
  attack: "KeyJ", mine: "KeyK", place: "KeyE", ability: "KeyQ", shop: "KeyB", pause: "KeyP",
};

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  up: "Move up", down: "Move down", left: "Move left", right: "Move right",
  attack: "Sword attack", mine: "Axe / mine", place: "Place block", ability: "Kit ability",
  shop: "Open shop", pause: "Pause game",
};

export function formatKey(code: string) {
  if (code === "Space") return "Space";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  const arrows: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
  if (arrows[code]) return arrows[code];
  return code;
}

function isBindableCode(code: unknown): code is string {
  return typeof code === "string" && (/^Key[A-Z]$/.test(code) || /^Digit[0-9]$/.test(code) || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code));
}

export interface MinigameSettings {
  showGrid: boolean;
  screenShake: boolean;
  showHints: boolean;
  touchControls: TouchMode;
  kitId: string | null;
  keybinds: Keybinds;
  mapId: ArenaMapId;
}

export const DEFAULT_SETTINGS: MinigameSettings = {
  showGrid: false, screenShake: true, showHints: true, touchControls: "auto", kitId: null, keybinds: DEFAULT_KEYBINDS, mapId: "classic",
};

export const settingsKey = (userId: string) => `bw.minigame.settings.v1.${userId}`;

/** Pure: validate an unknown JSON value into settings. Only preferences live here, never progress. */
export function parseSettings(raw: unknown): MinigameSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t = o.touchControls;
  const savedKeys = o.keybinds && typeof o.keybinds === "object" ? o.keybinds as Record<string, unknown> : {};
  const keybinds = {} as Keybinds;
  const usedCodes = new Set<string>();
  for (const action of KEYBIND_ACTIONS) {
    const code = savedKeys[action];
    if (isBindableCode(code) && !usedCodes.has(code)) {
      keybinds[action] = code;
      usedCodes.add(code);
    }
  }
  const availableCodes = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "KeyE", "KeyQ", "KeyB", "KeyP", "KeyR", "KeyT", "KeyF", "KeyG", "KeyH", "KeyU", "KeyI", "KeyO", "KeyL", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyN", "KeyM", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
  for (const action of KEYBIND_ACTIONS) {
    if (!keybinds[action]) {
      const preferred = DEFAULT_KEYBINDS[action];
      const replacement = !usedCodes.has(preferred) ? preferred : availableCodes.find((code) => !usedCodes.has(code));
      if (replacement) {
        keybinds[action] = replacement;
        usedCodes.add(replacement);
      } else {
        keybinds[action] = preferred;
      }
    }
  }
  return {
    showGrid: typeof o.showGrid === "boolean" ? o.showGrid : DEFAULT_SETTINGS.showGrid,
    screenShake: typeof o.screenShake === "boolean" ? o.screenShake : DEFAULT_SETTINGS.screenShake,
    showHints: typeof o.showHints === "boolean" ? o.showHints : DEFAULT_SETTINGS.showHints,
    touchControls: t === "auto" || t === "on" || t === "off" ? t : DEFAULT_SETTINGS.touchControls,
    kitId: typeof o.kitId === "string" ? o.kitId : null,
    keybinds,
    mapId: o.mapId === "classic" || o.mapId === "crosswind" || o.mapId === "twin-bridges" || o.mapId === "snake-run" || o.mapId === "fortress" ? o.mapId as ArenaMapId : DEFAULT_SETTINGS.mapId,
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
