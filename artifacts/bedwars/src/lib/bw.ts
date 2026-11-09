import { useEffect, useMemo, useState } from "react";
import { useListKits, type Kit } from "@workspace/api-client-react";

export const CATEGORIES = ["Fighter", "Movement", "Support", "Economy", "Defender", "Ranged"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_STYLE: Record<Category, { chip: string; dot: string; text: string; bar: string }> = {
  Fighter: { chip: "bg-red-500/15 text-red-300 border-red-500/40", dot: "bg-red-500", text: "text-red-300", bar: "bg-red-500" },
  Movement: { chip: "bg-cyan-400/15 text-cyan-300 border-cyan-400/40", dot: "bg-cyan-400", text: "text-cyan-300", bar: "bg-cyan-400" },
  Support: { chip: "bg-green-500/15 text-green-300 border-green-500/40", dot: "bg-green-500", text: "text-green-300", bar: "bg-green-500" },
  Economy: { chip: "bg-yellow-400/15 text-yellow-200 border-yellow-400/40", dot: "bg-yellow-400", text: "text-yellow-200", bar: "bg-yellow-400" },
  Defender: { chip: "bg-slate-400/15 text-slate-200 border-slate-400/40", dot: "bg-slate-400", text: "text-slate-200", bar: "bg-slate-400" },
  Ranged: { chip: "bg-purple-500/15 text-purple-300 border-purple-500/40", dot: "bg-purple-500", text: "text-purple-300", bar: "bg-purple-500" },
};

export const TIERS = ["S", "A", "B", "C", "D"] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_STYLE: Record<Tier, string> = {
  S: "bg-orange-400 text-slate-950",
  A: "bg-amber-300/90 text-slate-950",
  B: "bg-sky-400/80 text-slate-950",
  C: "bg-slate-500 text-slate-50",
  D: "bg-slate-700 text-slate-300",
};
export const tierIndex = (t: string) => TIERS.indexOf(t as Tier);

export const MODES = ["Solos", "Doubles", "Squads", "Ranked 5v5", "Kit Fusion"] as const;
export const TEAMS = [
  { id: "Blue", swatch: "bg-blue-500" },
  { id: "Yellow", swatch: "bg-yellow-400" },
  { id: "Orange", swatch: "bg-orange-500" },
  { id: "Pink", swatch: "bg-pink-400" },
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
  const [team, setTeam] = useLocal<string>("bw.team", "Orange");
  return { mode, setMode, team, setTeam };
}
