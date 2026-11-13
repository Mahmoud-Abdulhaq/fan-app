import { Axe, Bed, Box, Heart, Sparkles, Sword, Timer } from "lucide-react";
import type { HudSnapshot } from "@/game/engine";
import type { KitLoadout } from "@/game/abilities";
import { cn } from "@/lib/utils";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function BedPips({ hp, maxHp, alive, team }: { hp: number; maxHp: number; alive: boolean; team: "blue" | "orange" }) {
  return (
    <div className="flex items-center gap-1.5">
      <Bed className="h-4 w-4" />
      {alive ? (
        <div className="flex gap-0.5">
          {Array.from({ length: maxHp }, (_, i) => (
            <span key={i} className={cn("h-2.5 w-1.5 rounded-[1px]", i < hp ? (team === "blue" ? "bg-[#2f62d6]" : "bg-[#ec7a22]") : "bg-[#B22222]/15")} />
          ))}
        </div>
      ) : <span className="font-mono text-[10px] font-bold uppercase tracking-wider line-through">Bed gone</span>}
    </div>
  );
}

export function HudTop({ hud, botKit }: { hud: HudSnapshot; botKit: KitLoadout }) {
  const blueBed = hud.beds.find((b) => b.team === "blue")!;
  const orangeBed = hud.beds.find((b) => b.team === "orange")!;
  return (
    <div className="mg-paper grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-t-lg px-3 py-2" data-testid="hud-top">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-widest"><span className="h-2.5 w-2.5 rounded-sm bg-[#2f62d6]" />Blue / You</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <BedPips {...blueBed} />
          <span className="flex items-center gap-1 font-mono text-xs" data-testid="text-player-hp"><Heart className="h-3.5 w-3.5" />{hud.hp}/{hud.maxHp}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="flex items-center justify-center gap-1 font-mono text-lg font-bold tabular-nums" data-testid="text-match-clock"><Timer className="h-4 w-4" />{fmt(hud.t)}</p>
        <p className="font-mono text-[9px] uppercase tracking-widest">{hud.suddenIn > 0 ? `Sudden death ${fmt(hud.suddenIn)}` : "Sudden death"}</p>
      </div>
      <div className="min-w-0 text-right">
        <p className="flex items-center justify-end gap-1.5 font-display text-xs font-bold uppercase tracking-widest">Orange / Bot<span className="h-2.5 w-2.5 rounded-sm bg-[#ec7a22]" /></p>
        <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <span className="font-mono text-xs" data-testid="text-bot-hp">{hud.bot.eliminated ? "OUT" : hud.bot.alive ? `${hud.bot.hp}/${hud.bot.maxHp}` : `respawn ${hud.bot.respawnIn?.toFixed(1)}`}</span>
          <BedPips {...orangeBed} />
        </div>
        <p className="truncate font-mono text-[9px] uppercase tracking-wider">{botKit.kitName} / {botKit.ability.name}</p>
      </div>
    </div>
  );
}

export function HudBottom({ hud, kit, onAbility, onShop }: { hud: HudSnapshot; kit: KitLoadout; onAbility: () => void; onShop: () => void }) {
  const ready = hud.abilityCd <= 0;
  const pct = ready ? 1 : 1 - hud.abilityCd / hud.abilityMax;
  return (
    <div className="mg-paper flex flex-wrap items-center gap-x-4 gap-y-2 rounded-b-lg px-3 py-2" data-testid="hud-bottom">
      <div className="flex items-center gap-3 font-mono text-xs">
        <span className="flex items-center gap-1" data-testid="text-iron"><span className="h-2.5 w-2.5 rotate-45 bg-[#cdd2da] ring-1 ring-[#B22222]/40" />{hud.iron}</span>
        <span className="flex items-center gap-1" data-testid="text-diamond"><span className="h-2.5 w-2.5 rotate-45 bg-[#5fd0e2] ring-1 ring-[#B22222]/40" />{hud.diamond}</span>
        <span className="flex items-center gap-1" data-testid="text-emerald"><span className="h-2.5 w-2.5 rotate-45 bg-[#35c17a] ring-1 ring-[#B22222]/40" />{hud.emerald}</span>
      </div>
      <div className="flex items-center gap-3 text-xs font-semibold">
        <span className={cn("flex items-center gap-1", hud.blocks === 0 && "mg-blink")} data-testid="text-blocks"><Box className="h-3.5 w-3.5" />{hud.blocks}</span>
        <span className="flex items-center gap-1"><Sword className="h-3.5 w-3.5" />{hud.sword}</span>
        <span className="flex items-center gap-1"><Axe className="h-3.5 w-3.5" />{hud.axe}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={onShop} data-testid="button-open-shop"
          className={cn("rounded-md border px-2.5 py-1.5 text-xs font-bold", hud.onHome ? "border-[#B22222] bg-[#fbf4ef]" : "border-[#B22222]/30")}>
          Shop <kbd className="font-mono text-[10px]">B</kbd>{hud.discount && <span className="ml-1 font-mono text-[10px]">-35%</span>}
        </button>
        <button type="button" onClick={onAbility} data-testid="button-ability" title={kit.ability.summary}
          className={cn("relative overflow-hidden rounded-md border px-2.5 py-1.5 text-xs font-bold transition-transform", ready ? "border-[#B22222] bg-[#fbf4ef] mg-ready" : "border-[#B22222]/30")}>
          <span className="absolute inset-y-0 left-0 bg-[#B22222]/12" style={{ width: `${pct * 100}%` }} />
          <span className="relative flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />{kit.ability.name} <kbd className="font-mono text-[10px]">{ready ? "Q" : `${hud.abilityCd.toFixed(1)}s`}</kbd></span>
        </button>
      </div>
      {hud.buffs.length > 0 && (
        <div className="flex w-full flex-wrap gap-1">
          {hud.buffs.map((b) => <span key={b} className="rounded-sm border border-[#B22222]/40 px-1.5 font-mono text-[10px] uppercase">{b}</span>)}
        </div>
      )}
    </div>
  );
}

export function LogFeed({ hud }: { hud: HudSnapshot }) {
  return (
    <div className="mg-paper rounded-lg p-3" data-testid="feed-match-log">
      <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-widest">Feed</p>
      <ul className="space-y-1">
        {[...hud.log].reverse().slice(0, 6).map((l, i) => (
          <li key={`${l.t}-${i}`} className={cn("flex gap-2 text-xs leading-snug", i === 0 && "mg-pop")}>
            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-sm", l.tone === "blue" ? "bg-[#2f62d6]" : l.tone === "orange" ? "bg-[#ec7a22]" : "bg-[#B22222]")} />
            <span><span className="font-mono text-[10px]">{fmt(l.t)}</span> {l.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
