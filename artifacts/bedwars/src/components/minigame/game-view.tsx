import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { DoorOpen, Pause, Play } from "lucide-react";
import { createGame, hudSnapshot, shopItemsForGame, step, STEP, type HudSnapshot } from "@/game/engine";
import { botThink } from "@/game/bot";
import { renderGame, type RenderOpts } from "@/game/renderer";
import { MIN_REWARD_SECONDS, bedAt, canPlace, dist, onHomeIsland, resolveTarget, wallAt } from "@/game/core";
import { W, H, CELL, type Action, type Cell, type GameMode, type Input, type ShopItemId, type EquippedSkins } from "@/game/types";
import type { ArenaMapId } from "@/game/maps";
import type { KitLoadout } from "@/game/abilities";
import { formatKey, KEYBIND_ACTIONS, type KeybindAction, type MinigameSettings } from "@/game/settings";
import { HudBottom, HudTop, LogFeed } from "./hud";
import { MatchShop } from "./match-shop";
import { TouchControls, type TouchState } from "./touch-controls";

export interface MatchOutcome { won: boolean; elapsed: number; kills: number; deaths: number; bedsBroken: number; blocksPlaced: number; forfeited: boolean }

function currentKeymap(settings: MinigameSettings): Record<string, KeybindAction> {
  return Object.fromEntries(KEYBIND_ACTIONS.map((action) => [settings.keybinds[action], action]));
}

export function GameView({ playerKit, botKit, mapId, mode = "pit", equippedSkins, settings, onFinish }: {
  playerKit: KitLoadout; botKit: KitLoadout; mapId: ArenaMapId; mode?: GameMode; equippedSkins: EquippedSkins;
  settings: MinigameSettings; onFinish: (o: MatchOutcome) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game] = useState(() => createGame({ blueKit: playerKit, orangeKit: botKit, mapId, mode, cosmetics: equippedSkins, seed: (Date.now() & 0xffffff) | 1 }));
  const keys = useRef(new Set<string>());
  const actions = useRef<Action[]>([]);
  const touch = useRef<TouchState>({ mx: 0, my: 0, attack: false, mine: false });
  const pointer = useRef<{ aim: Cell | null; attack: boolean; mine: boolean; placing: boolean; last: string }>({ aim: null, attack: false, mine: false, placing: false, last: "" });
  const pausedRef = useRef(false);
  const [paused, setPausedState] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(() => hudSnapshot(game));
  const [shopOpen, setShopOpen] = useState(false);
  const shopOpenRef = useRef(false); shopOpenRef.current = shopOpen;
  const [confirmQuit, setConfirmQuit] = useState(false);
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const onFinishRef = useRef(onFinish); onFinishRef.current = onFinish;
  const finishedRef = useRef(false);
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const showTouch = settings.touchControls === "on" || (settings.touchControls === "auto" && coarse);

  const releaseAll = useCallback(() => {
    keys.current.clear();
    Object.assign(touch.current, { mx: 0, my: 0, attack: false, mine: false });
    Object.assign(pointer.current, { attack: false, mine: false, placing: false });
  }, []);
  const setPaused = useCallback((p: boolean) => { pausedRef.current = p; setPausedState(p); releaseAll(); }, [releaseAll]);

  const finish = useCallback((forfeited: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const f = game.blue;
    onFinishRef.current({ won: !forfeited && game.over?.winner === "blue", elapsed: game.t, kills: f.kills, deaths: f.deaths, bedsBroken: f.bedsBroken, blocksPlaced: f.blocksPlaced, forfeited });
  }, [game]);

  const buy = useCallback((id: ShopItemId) => { actions.current.push({ type: "buy", item: id }); }, []);

  // main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * CELL * dpr; canvas.height = H * CELL * dpr;
    let raf = 0, last = performance.now(), acc = 0, hudT = 0, overAt: number | null = null;

    const readInput = (consume: boolean): Input => {
      const k = keys.current, t = touch.current, p = pointer.current;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      return {
        mx: clamp((k.has("right") ? 1 : 0) - (k.has("left") ? 1 : 0) + t.mx),
        my: clamp((k.has("down") ? 1 : 0) - (k.has("up") ? 1 : 0) + t.my),
        attack: k.has("attack") || t.attack || p.attack,
        mine: k.has("mine") || t.mine || p.mine,
        aim: p.aim,
        actions: consume ? actions.current.splice(0) : [],
      };
    };

    const renderOpts = (): RenderOpts => {
      const f = game.blue;
      let target: Cell | null = null; let kind: RenderOpts["targetKind"] = null;
      if (f.alive) {
        target = resolveTarget(f, pointer.current.aim);
        const bed = bedAt(game, target.x, target.y);
        if (bed) kind = bed.team === "blue" ? "blocked" : "bed";
        else if (wallAt(game, target.x, target.y) > 0) kind = "break";
        else kind = canPlace(game, target) ? "place" : "blocked";
      }
      return { target, targetKind: kind, showGrid: settingsRef.current.showGrid, shake: settingsRef.current.screenShake };
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      if (!pausedRef.current && !game.over) {
        acc += dt;
        let first = true;
        while (acc >= STEP) {
          step(game, { blue: readInput(first), orange: botThink(game, STEP) }, STEP);
          first = false;
          acc -= STEP;
        }
      } else acc = 0;
      if (game.over && overAt === null) overAt = now;
      if (overAt !== null && now - overAt > 1900) finish(false);
      renderGame(ctx, game, renderOpts(), dpr);
      hudT += dt;
      if (hudT >= 0.1) { hudT = 0; setHud(hudSnapshot(game)); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [game, finish]);

  // keyboard + focus
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const action = currentKeymap(settingsRef.current)[e.code];
      if (e.code === "Escape" || action === "pause") { e.preventDefault(); if (!e.repeat && !game.over) setPaused(!pausedRef.current); return; }
      if (pausedRef.current || game.over) return;
      if (action === "up" || action === "down" || action === "left" || action === "right" || action === "attack" || action === "mine") {
        keys.current.add(action); e.preventDefault(); return;
      }
      if (action === "place") { e.preventDefault(); actions.current.push({ type: "place" }); }
      else if (action === "ability" && !e.repeat) actions.current.push({ type: "ability" });
      else if (action === "shop" && !e.repeat) setShopOpen((o) => !o);
      else if (shopOpenRef.current && /^Digit[1-6]$/.test(e.code) && !e.repeat) {
        const item = shopItemsForGame(game)[Number(e.code.slice(5)) - 1];
        if (item) actions.current.push({ type: "buy", item: item.id });
      }
    };
    const up = (e: KeyboardEvent) => {
      const action = currentKeymap(settingsRef.current)[e.code];
      if (action === "up" || action === "down" || action === "left" || action === "right" || action === "attack" || action === "mine") keys.current.delete(action);
    };
    const blur = () => { if (!game.over) setPaused(true); else releaseAll(); };
    const vis = () => { if (document.hidden) blur(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", vis);
      keys.current.clear();
    };
  }, [game, setPaused, releaseAll]);

  const cellFrom = (e: RPointerEvent<HTMLCanvasElement>): Cell => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * W), y: Math.floor(((e.clientY - r.top) / r.height) * H) };
  };
  const onPointerDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (pausedRef.current || game.over) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = cellFrom(e); const p = pointer.current; p.aim = c;
    if (c.x === 6 && c.y === 7 && onHomeIsland(game.blue)) { setShopOpen(true); return; }
    if (e.button === 2) { p.mine = true; return; }
    const me = game.blue, foe = game.orange;
    if (foe.alive && Math.abs(Math.floor(foe.x) - c.x) <= 1 && Math.abs(Math.floor(foe.y) - c.y) <= 1 && dist(me.x, me.y, foe.x, foe.y) <= 2.4) { p.attack = true; return; }
    const bed = bedAt(game, c.x, c.y);
    if (wallAt(game, c.x, c.y) > 0 || (bed && bed.team !== "blue")) { p.mine = true; return; }
    p.placing = true; p.last = `${c.x},${c.y}`;
    actions.current.push({ type: "place" });
  };
  const onPointerMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const c = cellFrom(e); const p = pointer.current; p.aim = c;
    const k = `${c.x},${c.y}`;
    if (p.placing && k !== p.last && !pausedRef.current) { p.last = k; actions.current.push({ type: "place" }); }
  };
  const onPointerUp = () => { Object.assign(pointer.current, { attack: false, mine: false, placing: false }); };

  const over = hud.over;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <HudTop hud={hud} botKit={botKit} />
        <div className="relative border-x-2 border-[#303035] bg-[#09090b]">
          <canvas ref={canvasRef} data-testid="canvas-game"
            className="block h-auto w-full touch-none select-none [image-rendering:pixelated]" style={{ aspectRatio: `${W} / ${H}` }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") pointer.current.aim = null; }}
            onContextMenu={(e) => e.preventDefault()} />
          {shopOpen && !over && <MatchShop game={game} closeKey={formatKey(settings.keybinds.shop)} onBuy={buy} onClose={() => setShopOpen(false)} />}
          {!hud.alive && !hud.eliminated && !over && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="mg-paper mg-pop rounded-lg px-5 py-3 text-center" data-testid="overlay-respawn">
                <p className="font-display text-xl font-bold uppercase">You fell</p>
                <p className="font-mono text-xs">Bed standing. Respawning now</p>
              </div>
            </div>
          )}
          {over && (
            <div className="absolute inset-0 grid place-items-center bg-[#160a0d]/50">
              <div className="mg-stamp font-display text-5xl font-bold uppercase tracking-widest sm:text-7xl" data-testid="text-match-verdict">{over.winner === "blue" ? "Victory" : "Defeat"}</div>
            </div>
          )}
          {paused && !over && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-[#160a0d]/70 p-4">
              <div className="mg-paper mg-pop w-full max-w-xs rounded-lg p-5 text-center" data-testid="overlay-paused">
                <p className="font-display text-2xl font-bold uppercase tracking-widest">Paused</p>
                <p className="mt-1 text-xs">The clock stops while this tab is away. Keys were released.</p>
                {confirmQuit ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold">Forfeit counts as a loss{mode === "ranked" ? " (-10 RP)" : game.t >= MIN_REWARD_SECONDS ? " (5 coins)" : " with no reward (under 20s)"}.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => finish(true)} className="flex-1 rounded-md border-2 border-[#B22222] bg-[#202023] px-3 py-2 text-sm font-bold" data-testid="button-confirm-forfeit">Forfeit</button>
                      <button type="button" onClick={() => setConfirmQuit(false)} className="flex-1 rounded-md border border-[#B22222]/40 px-3 py-2 text-sm font-bold" data-testid="button-cancel-forfeit">Keep playing</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setPaused(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 border-[#B22222] bg-[#202023] px-3 py-2 text-sm font-bold" data-testid="button-resume"><Play className="h-4 w-4" />Resume</button>
                    <button type="button" onClick={() => setConfirmQuit(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#B22222]/40 px-3 py-2 text-sm font-bold" data-testid="button-forfeit"><DoorOpen className="h-4 w-4" />Leave</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <HudBottom hud={hud} kit={playerKit} keybinds={settings.keybinds}
          onAbility={() => actions.current.push({ type: "ability" })} onShop={() => setShopOpen((o) => !o)} />
        {showTouch && (
          <TouchControls touch={touch} onPlace={() => actions.current.push({ type: "place" })} onAbility={() => actions.current.push({ type: "ability" })} onShop={() => setShopOpen((o) => !o)} showAbility={playerKit.category !== "None"} />
        )}
      </div>
      <aside className="space-y-3">
        <button type="button" onClick={() => setPaused(!paused)} disabled={!!over}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#B22222]/50 bg-black/60 px-3 py-2 text-sm font-bold hover:bg-[#B22222]/10" data-testid="button-pause">
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? "Resume" : "Pause"} <kbd className="font-mono text-[10px]">{formatKey(settings.keybinds.pause)}</kbd>
        </button>
        <LogFeed hud={hud} />
        <div className="mg-paper rounded-lg p-3 text-xs">
          {playerKit.category === "None" ? (
            <p className="font-display text-xs font-bold uppercase tracking-widest">Ranked match / no kits</p>
          ) : (
            <>
              <p className="font-display text-xs font-bold uppercase tracking-widest">{playerKit.kitName}</p>
              <p className="mt-1"><span className="font-bold">{playerKit.passive.name}:</span> {playerKit.passive.summary}</p>
              <p className="mt-1"><span className="font-bold">{playerKit.ability.name} ({formatKey(settings.keybinds.ability)}):</span> {playerKit.ability.summary}</p>
            </>
          )}
        </div>
        {settings.showHints && (
          <div className="mg-paper rounded-lg p-3 text-xs leading-relaxed" data-testid="panel-controls">
            <p className="mb-1 font-display text-xs font-bold uppercase tracking-widest">Controls</p>
            <p><kbd>{formatKey(settings.keybinds.up)}</kbd><kbd>{formatKey(settings.keybinds.left)}</kbd><kbd>{formatKey(settings.keybinds.down)}</kbd><kbd>{formatKey(settings.keybinds.right)}</kbd> move</p>
            <p><kbd>{formatKey(settings.keybinds.attack)}</kbd> or click bot: sword</p>
            <p><kbd>{formatKey(settings.keybinds.mine)}</kbd> or right-click: axe (walls, bridges, bed)</p>
            <p><kbd>{formatKey(settings.keybinds.place)}</kbd> or click-drag: place block</p>
            {playerKit.category !== "None" && <p><kbd>{formatKey(settings.keybinds.ability)}</kbd> ability</p>}
            <p><kbd>{formatKey(settings.keybinds.shop)}</kbd> shop, <kbd>{formatKey(settings.keybinds.pause)}</kbd> pause (<kbd>Esc</kbd> always works)</p>
            <p className="mt-1 opacity-80">Dashed square shows where your block or axe lands.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
