import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Coins, Lock, Play, RotateCcw, Sparkles, Swords } from "lucide-react";
import type { Kit } from "@workspace/api-client-react";
import { isOwned, unlockPrice, type KitLoadout } from "@/game/abilities";
import { formatKey, KEYBIND_ACTIONS, KEYBIND_LABELS, type KeybindAction, type MinigameSettings, type TouchMode } from "@/game/settings";
import { ARENA_MAPS, type ArenaMapId } from "@/game/maps";
import { cn } from "@/lib/utils";

const TIERS = ["D", "C", "B", "A", "S"] as const;

export function TierBadge({ tier }: { tier: string }) {
  return <span className="inline-grid h-6 w-6 place-items-center rounded border-2 border-[#B22222] bg-[#242427] font-display text-xs font-bold">{tier}</span>;
}

export function KitDossier({ loadout, kit }: { loadout: KitLoadout; kit?: Kit }) {
  return (
    <div className="mg-paper mg-ticket relative rounded-lg p-5" data-testid="card-selected-kit">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em]">Loadout / {loadout.category}</p>
          <h2 className="mt-1 font-display text-3xl font-bold leading-none" data-testid="text-selected-kit">{loadout.kitName}</h2>
        </div>
        <TierBadge tier={loadout.tier} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[#B22222]/25 bg-[#141416] p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest">Passive</p>
          <p className="font-display text-base font-bold">{loadout.passive.name}</p>
          <p className="text-sm">{loadout.passive.summary}</p>
        </div>
        <div className="rounded-md border-2 border-[#B22222]/50 bg-[#141416] p-3">
          <p className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest"><span>Ability / Q</span><span>{loadout.ability.cooldown}s</span></p>
          <p className="font-display text-base font-bold">{loadout.ability.name}</p>
          <p className="text-sm">{loadout.ability.summary}</p>
        </div>
      </div>
      {kit && <p className="mt-3 line-clamp-2 text-xs opacity-90"><span className="font-semibold">In the real game:</span> {kit.ability}</p>}
    </div>
  );
}

export function KitPicker({ kits, loadouts, unlocked, selected, onSelect, onShop }: {
  kits: Kit[]; loadouts: Map<string, KitLoadout>; unlocked: string[]; selected: string | null; onSelect: (id: string) => void; onShop: () => void;
}) {
  const sorted = useMemo(() => [...kits].sort((a, b) => TIERS.indexOf(a.tier as never) - TIERS.indexOf(b.tier as never) || a.name.localeCompare(b.name)), [kits]);
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5" data-testid="grid-kit-picker">
      {sorted.map((k) => {
        const owned = isOwned(k, unlocked);
        const active = selected === k.id;
        const l = loadouts.get(k.id);
        return (
          <button key={k.id} type="button" onClick={() => (owned ? onSelect(k.id) : onShop())} data-testid={`button-pick-kit-${k.id}`}
            className={cn("group relative rounded-md border px-2.5 py-2 text-left transition-all",
              active ? "mg-paper border-[#B22222] bg-[#2c2c2f] -translate-y-0.5" : owned ? "border-[#B22222]/35 bg-black/50 hover:-translate-y-0.5 hover:border-[#B22222]" : "border-dashed border-[#B22222]/25 bg-black/30 opacity-70 hover:opacity-100")}>
            <span className="flex items-center justify-between gap-1">
              <span className="truncate text-sm font-bold">{k.name}</span>
              {owned ? (active ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="font-mono text-[10px]">{k.tier}</span>) : <Lock className="h-3.5 w-3.5 shrink-0" />}
            </span>
            <span className="block truncate font-mono text-[10px]">{owned ? l?.ability.name : `${unlockPrice(k.tier)} coins`}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PlayPanel({ loadout, kit, mapId, onMapChange, settings, onPlay, starting, startError, children }: {
  loadout: KitLoadout | null; kit?: Kit; mapId: ArenaMapId; onMapChange: (id: ArenaMapId) => void; settings: MinigameSettings; onPlay: () => void; starting: boolean; startError: boolean; children: ReactNode;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4">
        {loadout ? <KitDossier loadout={loadout} kit={kit} /> : <div className="h-48 animate-pulse rounded-lg bg-[#171719]/30" />}
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em]">Choose loadout</p>
          {children}
        </div>
      </div>
      <div className="space-y-4">
        <div className="mg-paper rounded-lg p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em]">Match</p>
          <p className="font-display text-xl font-bold">Blue vs Orange bot</p>
          <p className="mt-1 text-xs">Normal rules every round. No difficulty settings.</p>
          <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em]">Choose your map</p>
          <div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Arena map">
            {ARENA_MAPS.map((map) => (
              <button key={map.id} type="button" role="radio" aria-checked={mapId === map.id} onClick={() => onMapChange(map.id)}
                data-testid={`button-map-${map.id}`}
                className={cn("rounded-md border px-2.5 py-2 text-left transition-colors", mapId === map.id ? "border-2 border-[#B22222] bg-[#2c2c2f]" : "border-[#B22222]/25 bg-black/30 hover:border-[#B22222]/60")}>
                <span className="block text-sm font-bold">{map.name}</span>
                <span className="block text-[11px]">{map.description}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={onPlay} disabled={!loadout || starting} data-testid="button-play"
            className="mg-cta mt-5 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#B22222] px-4 py-3.5 font-display text-xl font-bold uppercase tracking-widest disabled:opacity-60">
            {starting ? <><RotateCcw className="h-5 w-5 animate-spin" />Opening ticket</> : <><Play className="h-5 w-5" />Play match</>}
          </button>
          {startError && <p className="mt-2 text-center text-xs font-semibold" data-testid="text-start-error">Could not open a match ticket. Check your connection and press Play again.</p>}
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider">Win 15 coins / Loss 5 coins / 20s minimum</p>
        </div>
        <HowToPlay />
      </div>
    </div>
  );
}

export function HowToPlay() {
  const steps = [
    ["Gather", "Stand by the iron generator beside your base. It creates iron every 50 milliseconds."],
    ["Shop", "Use the item-shop worker beside your spawn. The match shop sells blocks, swords, and axes."],
    ["Bridge", "Islands float over the void. Place wool on empty tiles next to solid ground to cross."],
    ["Break", "Cross to the orange bed and use your axe. Controls can be changed in Arena settings."],
    ["Finish", "While your bed stands you respawn. Once it breaks, the next death is final."],
  ];
  return (
    <ol className="mg-paper space-y-2 rounded-lg p-5" data-testid="list-how-to-play">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em]">How a match goes</p>
      {steps.map(([t, d], i) => (
        <li key={t} className="flex gap-3 text-sm">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#B22222] font-mono text-xs font-bold">{i + 1}</span>
          <span><span className="font-bold">{t}.</span> {d}</span>
        </li>
      ))}
    </ol>
  );
}

export function KitShopPanel({ kits, loadouts, unlocked, coins, pendingId, onUnlock }: {
  kits: Kit[]; loadouts: Map<string, KitLoadout>; unlocked: string[]; coins: number; pendingId: string | null; onUnlock: (k: Kit) => void;
}) {
  const [tier, setTier] = useState<string>("all");
  const list = useMemo(() => kits.filter((k) => tier === "all" || k.tier === tier)
    .sort((a, b) => TIERS.indexOf(a.tier as never) - TIERS.indexOf(b.tier as never) || a.name.localeCompare(b.name)), [kits, tier]);
  const ownedCount = kits.filter((k) => isOwned(k, unlocked)).length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm"><span className="font-bold">{ownedCount}/{kits.length}</span> kits owned. D tier is free for every rookie. C 20 / B 30 / A 40 / S 50 coins.</p>
        <div className="flex gap-1" role="tablist" aria-label="Filter by tier">
          {["all", ...TIERS].map((t) => (
            <button key={t} type="button" onClick={() => setTier(t)} data-testid={`button-filter-tier-${t}`}
              className={cn("rounded-md border px-2.5 py-1 font-mono text-xs font-bold uppercase", tier === t ? "border-2 border-[#B22222] bg-[#2c2c2f]" : "border-[#B22222]/30 bg-black/40")}>{t}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((k, i) => {
          const l = loadouts.get(k.id);
          const owned = isOwned(k, unlocked);
          const price = unlockPrice(k.tier);
          const short = !owned && coins < price;
          return (
            <article key={k.id} className={cn("mg-paper rise flex flex-col rounded-lg p-4", owned && "mg-owned")} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} data-testid={`card-shop-kit-${k.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest">{k.category}</p>
                  <h3 className="truncate font-display text-lg font-bold">{k.name}</h3>
                </div>
                <TierBadge tier={k.tier} />
              </div>
              {l && (
                <div className="mt-2 space-y-1 text-xs">
                  <p><span className="font-bold">{l.passive.name}:</span> {l.passive.summary}</p>
                  <p><span className="font-bold"><Sparkles className="mr-0.5 inline h-3 w-3" />{l.ability.name} ({l.ability.cooldown}s):</span> {l.ability.summary}</p>
                </div>
              )}
              <div className="mt-auto pt-3">
                {owned ? (
                  <p className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider" data-testid={`status-owned-${k.id}`}><Check className="h-4 w-4" />{k.tier === "D" ? "Starter kit" : "Owned"}</p>
                ) : (
                  <button type="button" disabled={short || pendingId !== null} onClick={() => onUnlock(k)} data-testid={`button-unlock-${k.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-[#B22222] bg-[#202023] px-3 py-2 text-sm font-bold transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:border-[#B22222]/30 disabled:bg-transparent">
                    {pendingId === k.id ? <RotateCcw className="h-4 w-4 animate-spin" /> : short ? <Lock className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                    {pendingId === k.id ? "Unlocking" : short ? `Need ${price - coins} more coins` : `Unlock for ${price}`}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ label, note, value, onChange, id }: { label: string; note: string; value: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} data-testid={`toggle-${id}`}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-[#B22222]/20 bg-[#141416] px-3 py-2.5 text-left hover:border-[#B22222]/60">
      <span><span className="block text-sm font-bold">{label}</span><span className="block text-xs">{note}</span></span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full border-2 border-[#B22222] transition-colors", value ? "bg-[#3a3a3f]" : "bg-transparent")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-[#B22222] transition-transform", value ? "translate-x-5" : "translate-x-0.5")} />
      </span>
    </button>
  );
}

export function SettingsPanel({ settings, update, reset }: { settings: MinigameSettings; update: (p: Partial<MinigameSettings>) => void; reset: () => void }) {
  const [captureAction, setCaptureAction] = useState<KeybindAction | null>(null);
  const [keybindMessage, setKeybindMessage] = useState("");

  useEffect(() => {
    if (!captureAction) return;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "Escape") {
        setCaptureAction(null);
        setKeybindMessage("Key change cancelled.");
        return;
      }
      const allowed = /^Key[A-Z]$/.test(event.code) || /^Digit[0-9]$/.test(event.code)
        || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code);
      if (!allowed) {
        setKeybindMessage("Use a letter, number, arrow key, or Space.");
        return;
      }
      const conflict = KEYBIND_ACTIONS.find((action) => action !== captureAction && settings.keybinds[action] === event.code);
      if (conflict) {
        setKeybindMessage(`${formatKey(event.code)} is already assigned to ${KEYBIND_LABELS[conflict].toLowerCase()}.`);
        return;
      }
      update({ keybinds: { ...settings.keybinds, [captureAction]: event.code } });
      setCaptureAction(null);
      setKeybindMessage(`${KEYBIND_LABELS[captureAction]} is now ${formatKey(event.code)}.`);
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [captureAction, settings.keybinds, update]);

  return (
    <div className="mg-paper max-w-2xl space-y-3 rounded-lg p-5" data-testid="panel-settings">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-lg font-bold"><Swords className="h-5 w-5" />Arena settings</p>
        <button type="button" onClick={reset} className="flex items-center gap-1 rounded-md border border-[#B22222]/40 px-2.5 py-1 text-xs font-bold" data-testid="button-reset-settings"><RotateCcw className="h-3.5 w-3.5" />Defaults</button>
      </div>
      <p className="text-xs">Saved on this device for your account only. Coins, wins and unlocks live on the server.</p>
      <Toggle id="grid" label="Tile grid" note="Faint outlines on every floor tile for precise bridging." value={settings.showGrid} onChange={(v) => update({ showGrid: v })} />
      <Toggle id="shake" label="Screen shake" note="Camera kick on hits and bed breaks." value={settings.screenShake} onChange={(v) => update({ screenShake: v })} />
      <Toggle id="hints" label="Control card" note="Keep the key reference next to the arena." value={settings.showHints} onChange={(v) => update({ showHints: v })} />
      <div>
        <p className="mb-1.5 text-sm font-bold">Touch controls</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["auto", "on", "off"] as TouchMode[]).map((m) => (
            <button key={m} type="button" onClick={() => update({ touchControls: m })} data-testid={`button-touch-${m}`}
              className={cn("rounded-md border px-2 py-1.5 text-sm font-bold capitalize", settings.touchControls === m ? "border-2 border-[#B22222] bg-[#2c2c2f]" : "border-[#B22222]/25")}>{m}</button>
          ))}
        </div>
        <p className="mt-1 text-xs">Auto shows the on-screen pad on touch screens.</p>
      </div>
      <div className="border-t border-[#B22222]/25 pt-3">
        <p className="font-display text-sm font-bold">Keyboard controls</p>
        <p className="mb-2 mt-1 text-xs">Select a key, then press a new one. Changes save automatically.</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {KEYBIND_ACTIONS.map((action) => (
            <div key={action} className="flex items-center justify-between gap-2 rounded-md border border-[#B22222]/20 px-2.5 py-1.5">
              <span className="text-sm font-semibold">{KEYBIND_LABELS[action]}</span>
              <button type="button" aria-label={`Change ${KEYBIND_LABELS[action]} key`}
                aria-pressed={captureAction === action} data-testid={`button-keybind-${action}`}
                onClick={() => { setKeybindMessage(""); setCaptureAction(captureAction === action ? null : action); }}
                className={cn("min-w-14 rounded border px-2 py-1 font-mono text-xs font-bold", captureAction === action ? "border-2 border-[#B22222] bg-[#2c2c2f]" : "border-[#B22222]/40")}>
                {captureAction === action ? "Press key…" : formatKey(settings.keybinds[action])}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 min-h-4 text-xs" aria-live="polite">{keybindMessage || "Each action must use a different key. Escape cancels key selection."}</p>
      </div>
    </div>
  );
}
