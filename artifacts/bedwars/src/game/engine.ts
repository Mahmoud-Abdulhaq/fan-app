import {
  VOID, type GameState, type Fighter, type Team, type Input, type ShopItemId, type Cost, type Bed, type LogEntry, type EquippedSkins,
} from "./types";
import type { ArenaMapId } from "./maps";
import {
  ATTACK_CD, MAX_HP, MINE_CD, SUDDEN_DEATH_AT, TEAM_COLOR, TIER_NAMES, addFloat, baseAt, bedAt, bedHpFor, bedOf, buildMap, burst,
  dealDamage, destroyBed, dist, fighterOf, fighterSpeed, hasBuff, idx, inBounds, meleeDamage, mineCell, moveFighter, onHomeIsland,
  other, placeBlock, pushLog, resolveTarget, killFighter,
} from "./core";
import { triggerAbility, type KitLoadout } from "./abilities";

export const STEP = 1 / 60;

export interface ShopItem { id: ShopItemId; label: string; group: "Blocks" | "Swords" | "Axes"; cost: Cost; tier?: number; amount?: number; desc: string }
export const SHOP_ITEMS: ShopItem[] = [
  { id: "wool8", label: "Wool x8", group: "Blocks", cost: { iron: 4 }, amount: 8, desc: "Bridge the void or wall your bed." },
  { id: "wool20", label: "Wool x20", group: "Blocks", cost: { iron: 9 }, amount: 20, desc: "Bulk stack for long bridges." },
  { id: "sword1", label: "Stone Sword", group: "Swords", cost: { iron: 10 }, tier: 1, desc: "4 damage per hit." },
  { id: "sword2", label: "Iron Sword", group: "Swords", cost: { iron: 20 }, tier: 2, desc: "6 damage per hit." },
  { id: "axe1", label: "Stone Axe", group: "Axes", cost: { iron: 8 }, tier: 1, desc: "2 damage to blocks and beds." },
  { id: "axe2", label: "Iron Axe", group: "Axes", cost: { iron: 16 }, tier: 2, desc: "3 damage to blocks and beds." },
];

export function effectiveCost(s: GameState, f: Fighter, item: ShopItem): Cost {
  const c = { ...item.cost };
  if (c.iron && hasBuff(s, f, "discount")) c.iron = Math.ceil(c.iron * 0.65);
  return c;
}
export function canAfford(f: Fighter, c: Cost) {
  return f.iron >= (c.iron ?? 0);
}
export type BuyStatus = "ok" | "owned" | "poor" | "away";
export function buyStatus(s: GameState, f: Fighter, id: ShopItemId): BuyStatus {
  const item = SHOP_ITEMS.find((i) => i.id === id)!;
  if (item.group === "Swords" && f.sword >= item.tier!) return "owned";
  if (item.group === "Axes" && f.axe >= item.tier!) return "owned";
  if (!f.alive || !onHomeIsland(f)) return "away";
  return canAfford(f, effectiveCost(s, f, item)) ? "ok" : "poor";
}
export function buyItem(s: GameState, f: Fighter, id: ShopItemId): { ok: boolean; message: string } {
  const item = SHOP_ITEMS.find((i) => i.id === id)!;
  const st = buyStatus(s, f, id);
  if (st === "owned") return { ok: false, message: `Already have ${item.label}` };
  if (st === "away") return { ok: false, message: "Shop only works on your home island" };
  if (st === "poor") return { ok: false, message: "Not enough resources" };
  const c = effectiveCost(s, f, item);
  f.iron -= c.iron ?? 0;
  if (item.group === "Blocks") f.blocks += item.amount!;
  if (item.group === "Swords") f.sword = item.tier!;
  if (item.group === "Axes") f.axe = item.tier!;
  return { ok: true, message: `Bought ${item.label}` };
}

const EMPTY_SKINS: EquippedSkins = { sword: null, axe: null, block: null, kit: null };

function makeFighter(team: Team, kit: KitLoadout, spawn: { x: number; y: number }, cosmetics = EMPTY_SKINS): Fighter {
  return {
    team, kit, x: spawn.x, y: spawn.y, spawn, facing: { x: team === "blue" ? 1 : -1, y: 0 },
    hp: MAX_HP, maxHp: MAX_HP, alive: true, eliminated: false, respawnAt: null,
    sword: 0, axe: 0, blocks: 8, iron: kit.category === "Economy" ? 4 : 0, cosmetics, swingWeapon: "sword",
    attackCd: 0, mineCd: 0, abilityCd: 3, placeCd: 0, buffs: {}, lastHurt: -99, regenT: 0, swingT: -9, hurtT: -9,
    speedMul: 1, attackMul: 1, kills: 0, deaths: 0, bedsBroken: 0, blocksPlaced: 0, deathCause: "",
  };
}

export interface GameOptions { blueKit: KitLoadout; orangeKit: KitLoadout; mapId?: ArenaMapId; cosmetics?: EquippedSkins; seed?: number }

export function createGame(o: GameOptions): GameState {
  const mapId = o.mapId ?? "classic";
  const { base, wall, wallSkin } = buildMap(mapId);
  const mkBed = (team: Team, x: number, y: number, cat: string): Bed => ({ team, x, y, hp: bedHpFor(cat), maxHp: bedHpFor(cat), alive: true, hitT: -9 });
  const s: GameState = {
    t: 0, base, wall, wallSkin, mapId,
    blue: makeFighter("blue", o.blueKit, { x: 4.5, y: 7.5 }, o.cosmetics),
    orange: makeFighter("orange", o.orangeKit, { x: 35.5, y: 7.5 }),
    beds: [mkBed("blue", 2, 7, o.blueKit.category), mkBed("orange", 37, 7, o.orangeKit.category)],
    gens: [
      { kind: "iron", x: 2, y: 9, interval: 0.05, timer: 0, stock: 0, cap: 40, owner: "blue" },
      { kind: "iron", x: 37, y: 5, interval: 0.05, timer: 0, stock: 0, cap: 40, owner: "orange" },
    ],
    projectiles: [], floats: [], particles: [], log: [], over: null, suddenDeath: false, shake: 0,
    bot: { thinkT: 0, buyT: 0, placeT: 0, path: [], goal: "gather", gathering: true },
    seed: o.seed ?? 1337,
  };
  pushLog(s, "Match live. Guard your bed, break theirs.", "neutral");
  return s;
}

export const emptyInput = (): Input => ({ mx: 0, my: 0, attack: false, mine: false, aim: null, actions: [] });

function say(s: GameState, f: Fighter, text: string) { if (f.team === "blue") addFloat(s, f.x, f.y - 1, text, "#B22222"); }

function respawn(s: GameState, f: Fighter) {
  if (!bedOf(s, f.team).alive) { f.eliminated = true; f.respawnAt = null; return; }
  f.alive = true; f.hp = f.maxHp; f.x = f.spawn.x; f.y = f.spawn.y; f.respawnAt = null; f.buffs = {}; f.lastHurt = -99;
  burst(s, f.x, f.y, TEAM_COLOR[f.team], 12);
}

function swing(s: GameState, f: Fighter, foe: Fighter) {
  f.swingWeapon = "sword";
  f.attackCd = ATTACK_CD * f.attackMul * (hasBuff(s, f, "haste") ? 0.5 : 1);
  f.swingT = s.t;
  if (!foe.alive) return;
  const range = 1.5 + (f.kit.category === "Ranged" ? 0.5 : 0);
  const d = dist(f.x, f.y, foe.x, foe.y);
  if (d <= range) {
    const n = d > 0 ? { x: (foe.x - f.x) / d, y: (foe.y - f.y) / d } : { x: f.facing.x, y: f.facing.y };
    dealDamage(s, f, foe, meleeDamage(s, f, foe), "melee", n);
  }
}

export function stepFighter(s: GameState, f: Fighter, inp: Input, dt: number) {
  if (f.eliminated) return;
  if (!f.alive) { if (f.respawnAt !== null && s.t >= f.respawnAt) respawn(s, f); return; }
  f.attackCd = Math.max(0, f.attackCd - dt);
  f.mineCd = Math.max(0, f.mineCd - dt);
  f.abilityCd = Math.max(0, f.abilityCd - dt);
  f.placeCd = Math.max(0, f.placeCd - dt);
  const foe = fighterOf(s, other(f.team));

  let mx = inp.mx, my = inp.my;
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  if (len > 0.15) f.facing = Math.abs(mx) >= Math.abs(my) ? { x: Math.sign(mx), y: 0 } : { x: 0, y: Math.sign(my) };
  const sp = fighterSpeed(s, f) * dt;
  moveFighter(s, f, mx * sp, my * sp);

  if (baseAt(s, Math.floor(f.x), Math.floor(f.y)) === VOID && !hasBuff(s, f, "hover")) {
    killFighter(s, f, s.t - f.lastHurt < 4 ? foe : null, "void");
    return;
  }

  for (const g of s.gens) {
    if (g.stock > 0 && dist(f.x, f.y, g.x + 0.5, g.y + 0.5) < 0.85) {
      f.iron += g.stock;
      addFloat(s, g.x + 0.5, g.y, `+${g.stock} iron`, "#9ea7b3");
      g.stock = 0;
    }
  }

  const regenBuff = hasBuff(s, f, "regen");
  if (regenBuff || s.t - f.lastHurt > 3) {
    f.regenT += dt;
    const every = regenBuff ? 0.5 : f.kit.category === "Support" ? 2 : 4;
    if (f.regenT >= every) { f.regenT = 0; if (f.hp < f.maxHp) f.hp += 1; }
  } else f.regenT = 0;

  if (inp.attack && f.attackCd <= 0) swing(s, f, foe);
  if (inp.mine && f.mineCd <= 0) {
    f.swingWeapon = "axe";
    f.mineCd = MINE_CD; f.swingT = s.t;
    const r = mineCell(s, f, resolveTarget(f, inp.aim));
    if (r === "own-bed") say(s, f, "That is your own bed");
  }
  for (const a of inp.actions) {
    if (!f.alive) break;
    if (a.type === "place") {
      if (f.placeCd > 0) continue;
      f.placeCd = 0.08;
      const r = placeBlock(s, f, resolveTarget(f, inp.aim));
      if (r === "no-blocks") say(s, f, "Out of blocks: buy wool (B)");
      else if (r === "invalid") say(s, f, "Can't place there");
    } else if (a.type === "ability") {
      if (f.abilityCd > 0) { say(s, f, `${f.kit.ability.name} in ${f.abilityCd.toFixed(1)}s`); continue; }
      const r = triggerAbility(s, f, foe);
      if (r.ok) { f.abilityCd = f.kit.ability.cooldown; addFloat(s, f.x, f.y - 1.1, r.message, TEAM_COLOR[f.team]); }
      else say(s, f, r.message);
    } else if (a.type === "buy") {
      const r = buyItem(s, f, a.item);
      if (f.team === "blue") say(s, f, r.message);
      else if (r.ok) pushLog(s, `Orange bot ${r.message.toLowerCase()}.`, "orange");
    }
  }
}

function stepGenerators(s: GameState, dt: number) {
  for (const g of s.gens) {
    g.timer += dt;
    while (g.timer >= g.interval) { g.timer -= g.interval; g.stock = Math.min(g.cap, g.stock + 1); }
  }
}

function stepProjectiles(s: GameState, dt: number) {
  s.projectiles = s.projectiles.filter((p) => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0) return false;
    const cx = Math.floor(p.x), cy = Math.floor(p.y);
    if (!inBounds(cx, cy)) return false;
    const bed = bedAt(s, cx, cy);
    if (bed && bed.team !== p.team) {
      if (p.kind === "fire") { bed.hp -= 2; bed.hitT = s.t; if (bed.hp <= 0) destroyBed(s, bed, fighterOf(s, p.team)); }
      burst(s, p.x, p.y, "#f0a040", 6);
      return false;
    }
    const i = idx(cx, cy);
    if (s.wall[i] > 0) {
      if (p.kind === "fire") { s.wall[i] = 0; burst(s, cx + 0.5, cy + 0.5, "#f0a040", 10); }
      return false;
    }
    const tgt = fighterOf(s, other(p.team));
    if (tgt.alive && dist(p.x, p.y, tgt.x, tgt.y) < 0.5) {
      const sp = Math.hypot(p.vx, p.vy) || 1;
      dealDamage(s, fighterOf(s, p.team), tgt, p.dmg, "ranged", { x: (p.vx / sp) * 0.4, y: (p.vy / sp) * 0.4 });
      if (p.kind === "frost" && tgt.alive) tgt.buffs.slow = s.t + 3;
      return false;
    }
    return true;
  });
}

export function checkWinner(s: GameState) {
  if (s.over) return;
  if (s.blue.eliminated) s.over = { winner: "orange", at: s.t };
  else if (s.orange.eliminated) s.over = { winner: "blue", at: s.t };
  if (s.over) pushLog(s, s.over.winner === "blue" ? "Victory. Orange is out." : "Defeat. You were eliminated.", s.over.winner);
}

export function step(s: GameState, inputs: Record<Team, Input>, dt: number) {
  if (s.over) return;
  s.t += dt;
  stepFighter(s, s.blue, inputs.blue, dt);
  stepFighter(s, s.orange, inputs.orange, dt);
  stepGenerators(s, dt);
  stepProjectiles(s, dt);
  if (!s.suddenDeath && s.t >= SUDDEN_DEATH_AT) {
    s.suddenDeath = true;
    pushLog(s, "Sudden death: both beds crumble.", "neutral");
    for (const b of s.beds) destroyBed(s, b, null);
  }
  s.shake = Math.max(0, s.shake - dt * 2.2);
  if (s.floats.length && s.t - s.floats[0].t0 > 1.2) s.floats = s.floats.filter((f) => s.t - f.t0 <= 1.2);
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; }
  s.particles = s.particles.filter((p) => s.t - p.t0 < p.life);
  checkWinner(s);
}

export interface HudSnapshot {
  t: number; hp: number; maxHp: number; alive: boolean; eliminated: boolean; respawnIn: number | null;
  iron: number; blocks: number; sword: string; axe: string; swordTier: number; axeTier: number;
  abilityCd: number; abilityMax: number; onHome: boolean; discount: boolean; buffs: string[];
  beds: { team: Team; hp: number; maxHp: number; alive: boolean }[];
  bot: { hp: number; maxHp: number; alive: boolean; eliminated: boolean; respawnIn: number | null; sword: string };
  log: LogEntry[]; over: GameState["over"]; suddenIn: number; kills: number; deaths: number;
}

export function hudSnapshot(s: GameState): HudSnapshot {
  const f = s.blue, b = s.orange;
  return {
    t: s.t, hp: Math.max(0, f.hp), maxHp: f.maxHp, alive: f.alive, eliminated: f.eliminated,
    respawnIn: f.respawnAt !== null ? Math.max(0, f.respawnAt - s.t) : null,
    iron: f.iron, blocks: f.blocks,
    sword: TIER_NAMES[f.sword], axe: TIER_NAMES[f.axe], swordTier: f.sword, axeTier: f.axe,
    abilityCd: f.abilityCd, abilityMax: f.kit.ability.cooldown, onHome: onHomeIsland(f), discount: hasBuff(s, f, "discount"),
    buffs: Object.keys(f.buffs).filter((k) => hasBuff(s, f, k)),
    beds: s.beds.map((x) => ({ team: x.team, hp: Math.max(0, x.hp), maxHp: x.maxHp, alive: x.alive })),
    bot: { hp: Math.max(0, b.hp), maxHp: b.maxHp, alive: b.alive, eliminated: b.eliminated, respawnIn: b.respawnAt !== null ? Math.max(0, b.respawnAt - s.t) : null, sword: TIER_NAMES[b.sword] },
    log: [...s.log], over: s.over, suddenIn: Math.max(0, SUDDEN_DEATH_AT - s.t), kills: f.kills, deaths: f.deaths,
  };
}
