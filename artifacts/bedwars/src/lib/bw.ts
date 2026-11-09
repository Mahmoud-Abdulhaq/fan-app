import { useEffect, useMemo, useState } from "react";
import { useListKits, type Kit } from "@workspace/api-client-react";

export const CATEGORIES = ["Fighter", "Movement", "Support", "Economy", "Defender", "Ranged"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_STYLE: Record<Category, { chip: string; dot: string; text: string; bar: string }> = {
  Fighter: { chip: "bg-red-950/70 text-red-400 border-red-800/60", dot: "bg-red-500", text: "text-red-400", bar: "bg-red-500" },
  Movement: { chip: "bg-black/70 text-red-400 border-red-900/70", dot: "bg-cyan-400", text: "text-red-400", bar: "bg-cyan-400" },
  Support: { chip: "bg-black/70 text-red-400 border-red-900/70", dot: "bg-green-500", text: "text-red-400", bar: "bg-green-500" },
  Economy: { chip: "bg-black/70 text-red-400 border-red-900/70", dot: "bg-yellow-400", text: "text-red-400", bar: "bg-yellow-400" },
  Defender: { chip: "bg-black/70 text-red-400 border-red-900/70", dot: "bg-slate-400", text: "text-red-400", bar: "bg-slate-400" },
  Ranged: { chip: "bg-black/70 text-red-400 border-red-900/70", dot: "bg-purple-500", text: "text-red-400", bar: "bg-purple-500" },
};

export const TIERS = ["S", "A", "B", "C", "D"] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_STYLE: Record<Tier, string> = {
  S: "bg-red-950 text-red-400 border border-red-700",
  A: "bg-red-950/80 text-red-400 border border-red-900",
  B: "bg-neutral-950 text-red-400 border border-red-900/70",
  C: "bg-neutral-950/80 text-red-400 border border-neutral-800",
  D: "bg-black text-red-400 border border-neutral-900",
};
export const tierIndex = (t: string) => TIERS.indexOf(t as Tier);

export const MODES = ["Solos", "Doubles", "Squads", "Ranked 5v5", "Kit Fusion"] as const;
export const TEAMS = [
  { id: "Blue", swatch: "bg-blue-500" },
  { id: "Yellow", swatch: "bg-yellow-400" },
  { id: "Orange", swatch: "bg-orange-500" },
  { id: "Pink", swatch: "bg-pink-400" },
] as const;
export const SOLO_DOUBLES_TEAMS = [
  { id: "White", swatch: "bg-white" },
  { id: "Blue", swatch: "bg-blue-500" },
  { id: "Brown", swatch: "bg-amber-900" },
  { id: "Yellow", swatch: "bg-yellow-400" },
  { id: "Pink", swatch: "bg-pink-400" },
  { id: "Cyan", swatch: "bg-cyan-400" },
  { id: "Orange", swatch: "bg-orange-500" },
  { id: "Purple", swatch: "bg-purple-500" },
] as const;

export const SNAPSHOT_LABEL = "October 2026 snapshot (Season 17)";
export const ATTRIBUTION =
  "Kit data is from a user-supplied BedWars Master Specification (community tier lists and patch history). It has not been independently verified against the live game. Re-verify after each balance patch.";

export function useKits() {
  const q = useListKits();
  const map = useMemo(() => {
    const m = new Map<string, Kit>();
    (q.data ?? []).forEach((k) => m.set(k.id, k));
    return m;
  }, [q.data]);
  return { ...q, kits: q.data ?? [], map };
}

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | BedWars Intel`;
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    el.setAttribute("content", description);
  }, [title, description]);
}

function useLocal<T extends string>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => (localStorage.getItem(key) as T) || initial);
  useEffect(() => {
    localStorage.setItem(key, v);
  }, [key, v]);
  return [v, setV] as const;
}

export function usePrefs() {
  const [mode, setMode] = useLocal<string>("bw.mode", "Ranked 5v5");
  const [storedTeam, setStoredTeam] = useLocal<string>("bw.team", "Orange");
  const team = storedTeam === "Red" ? "White" : storedTeam === "Green" ? "Brown" : storedTeam;
  useEffect(() => {
    if (storedTeam !== team) setStoredTeam(team);
  }, [storedTeam, team, setStoredTeam]);
  return { mode, setMode, team, setTeam: setStoredTeam };
}
