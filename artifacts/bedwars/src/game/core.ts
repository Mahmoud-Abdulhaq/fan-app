import { W, H, VOID, GROUND, BRIDGE, type GameState, type Fighter, type Team, type Bed, type Cell, type ProjectileKind } from "./types";

export const SWORD_DMG = [3, 4, 6, 8];
export const AXE_DMG = [1, 2, 3, 4];
export const TIER_NAMES = ["Wood", "Stone", "Iron", "Diamond"];
export const RADIUS = 0.32;
export const REACH = 1.8;
export const BASE_SPEED = 4.2;
export const ATTACK_CD = 0.5;
export const MINE_CD = 0.4;
export const RESPAWN_SECONDS = 3;
export const MAX_HP = 20;
export const WALL_HP = 3;
export const BED_HP = 8;
export const SUDDEN_DEATH_AT = 300;
export const MIN_REWARD_SECONDS = 20;
export const WIN_REWARD = 15;
export const LOSS_REWARD = 5;

export const TEAM_NAME: Record<Team, string> = { blue: "You", orange: "Orange bot" };
export const TEAM_COLOR: Record<Team, string> = { blue: "#2f62d6", orange: "#ec7a22" };

export interface Rect { x0: number; y0: number; x1: number; y1: number }
export const ISLANDS: { id: string; rect: Rect; home: Team | null }[] = [
  { id: "blue-home", rect: { x0: 1, y0: 4, x1: 6, y1: 10 }, home: "blue" },
  { id: "orange-home", rect: { x0: 33, y0: 4, x1: 38, y1: 10 }, home: "orange" },
  { id: "diamond-north", rect: { x0: 12, y0: 2, x1: 14, y1: 4 }, home: null },
  { id: "diamond-south", rect: { x0: 25, y0: 10, x1: 27, y1: 12 }, home: null },
  { id: "center", rect: { x0: 18, y0: 6, x1: 21, y1: 8 }, home: null },
];

export function rand(s: GameState) {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const idx = (x: number, y: number) => y * W + x;
export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
export function baseAt(s: GameState, x: number, y: number) { return inBounds(x, y) ? s.base[idx(x, y)] : VOID; }
export function wallAt(s: GameState, x: number, y: number) { return inBounds(x, y) ? s.wall[idx(x, y)] : 0; }
export function bedAt(s: GameState, x: number, y: number): Bed | undefined { return s.beds.find((b) => b.alive && b.x === x && b.y === y); }
export function isBlocked(s: GameState, x: number, y: number) { return wallAt(s, x, y) > 0 || !!bedAt(s, x, y); }
export const other = (t: Team): Team => (t === "blue" ? "orange" : "blue");
export function fighterOf(s: GameState, t: Team) { return t === "blue" ? s.blue : s.orange; }
export function bedOf(s: GameState, t: Team) { return s.beds.find((b) => b.team === t)!; }
export function hasBuff(s: GameState, f: Fighter, b: string) { return (f.buffs[b] ?? 0) > s.t; }
export function dist(ax: number, ay: number, bx: number, by: number) { return Math.hypot(ax - bx, ay - by); }
export function cellOf(p: { x: number; y: number }): Cell { return { x: Math.floor(p.x), y: Math.floor(p.y) }; }
export function homeRect(team: Team): Rect { return ISLANDS.find((i) => i.home === team)!.rect; }
export function onHomeIsland(f: Fighter) {
  const r = homeRect(f.team);
  return f.x >= r.x0 && f.x < r.x1 + 1 && f.y >= r.y0 && f.y < r.y1 + 1;
}

export function buildMap() {
  const base = new Uint8Array(W * H);
  const wall = new Uint8Array(W * H);
  for (const { rect: r } of ISLANDS) {
    const trim = r.x1 - r.x0 >= 3 && r.y1 - r.y0 >= 3;
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      const corner = (x === r.x0 || x === r.x1) && (y === r.y0 || y === r.y1);
      if (trim && corner) continue;
      base[idx(x, y)] = GROUND;
    }
  }
  return { base, wall };
}

export function fighterSpeed(s: GameState, f: Fighter) {
  let v = BASE_SPEED * f.speedMul;
  if (f.kit.category === "Movement") v *= 1.18;
  if (hasBuff(s, f, "sprint")) v *= 1.6;
  if (hasBuff(s, f, "glide")) v *= 1.35;
  if (hasBuff(s, f, "slow")) v *= 0.6;
  return v;
}

export function collides(s: GameState, x: number, y: number) {
  if (x < RADIUS || y < RADIUS || x > W - RADIUS || y > H - RADIUS) return true;
  const x0 = Math.floor(x - RADIUS), x1 = Math.floor(x + RADIUS);
  const y0 = Math.floor(y - RADIUS), y1 = Math.floor(y + RADIUS);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (isBlocked(s, cx, cy)) return true;
  return false;
}

export function moveFighter(s: GameState, f: Fighter, dx: number, dy: number) {
  if (dx && !collides(s, f.x + dx, f.y)) f.x += dx;
  if (dy && !collides(s, f.x, f.y + dy)) f.y += dy;
}

export function knockback(s: GameState, f: Fighter, nx: number, ny: number, power: number) {
  const steps = Math.ceil(power / 0.15);
  for (let i = 0; i < steps; i++) moveFighter(s, f, (nx * power) / steps, (ny * power) / steps);
}

/** Dash in a direction, stopping before walls or (unless hovering) the void. */
export function dashFighter(s: GameState, f: Fighter, nx: number, ny: number, distance: number) {
  const hover = hasBuff(s, f, "hover");
  for (let d = 0; d < distance; d += 0.1) {
    const x = f.x + nx * 0.1, y = f.y + ny * 0.1;
    if (collides(s, x, y)) break;
    if (!hover && baseAt(s, Math.floor(x), Math.floor(y)) === VOID) break;
    f.x = x; f.y = y;
  }
}

export function overlapsCell(f: Fighter, x: number, y: number) {
  return Math.abs(f.x - (x + 0.5)) < 0.5 + RADIUS && Math.abs(f.y - (y + 0.5)) < 0.5 + RADIUS;
}
export function cellOccupied(s: GameState, x: number, y: number) {
  return [s.blue, s.orange].some((f) => f.alive && overlapsCell(f, x, y));
}
export function isGenCell(s: GameState, x: number, y: number) { return s.gens.some((g) => g.x === x && g.y === y); }

export function inReach(f: Fighter, c: Cell) { return dist(f.x, f.y, c.x + 0.5, c.y + 0.5) <= REACH; }
export function facingCell(f: Fighter): Cell { return { x: Math.floor(f.x) + f.facing.x, y: Math.floor(f.y) + f.facing.y }; }
export function resolveTarget(f: Fighter, aim: Cell | null): Cell {
  if (aim && inReach(f, aim) && !(aim.x === Math.floor(f.x) && aim.y === Math.floor(f.y))) return aim;
  return facingCell(f);
}

export function wallHpFor(f: Fighter) { return WALL_HP + (f.kit.category === "Defender" ? 1 : 0); }
export function bedHpFor(category: string) { return BED_HP + (category === "Defender" ? 3 : 0); }

export function canPlace(s: GameState, c: Cell) {
  if (!inBounds(c.x, c.y) || bedAt(s, c.x, c.y)) return false;
  if (baseAt(s, c.x, c.y) === VOID) {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => baseAt(s, c.x + dx, c.y + dy) !== VOID);
  }
  return wallAt(s, c.x, c.y) === 0 && !cellOccupied(s, c.x, c.y) && !isGenCell(s, c.x, c.y);
}

export type PlaceResult = "ok" | "no-blocks" | "invalid";
export function placeBlock(s: GameState, f: Fighter, c: Cell, free = false): PlaceResult {
  if (!free && f.blocks <= 0) return "no-blocks";
  if (!canPlace(s, c)) return "invalid";
  const i = idx(c.x, c.y);
  if (s.base[i] === VOID) s.base[i] = BRIDGE;
  else s.wall[i] = wallHpFor(f);
  if (!free) f.blocks--;
  f.blocksPlaced++;
  burst(s, c.x + 0.5, c.y + 0.5, "#d9bf98", 4);
  return "ok";
}

export type MineResult = "bed" | "own-bed" | "wall" | "broke" | "bridge" | "occupied" | "nothing";
export function mineCell(s: GameState, f: Fighter, c: Cell): MineResult {
  const bed = bedAt(s, c.x, c.y);
  const dmg = AXE_DMG[f.axe];
  if (bed) {
    if (bed.team === f.team) return "own-bed";
    bed.hp -= dmg;
    bed.hitT = s.t;
    burst(s, c.x + 0.5, c.y + 0.5, TEAM_COLOR[bed.team], 7);
    addFloat(s, c.x + 0.5, c.y, `-${dmg} bed`, TEAM_COLOR[bed.team]);
    s.shake = Math.max(s.shake, 0.25);
    if (bed.hp <= 0) destroyBed(s, bed, f);
    return "bed";
  }
  const i = idx(c.x, c.y);
  if (inBounds(c.x, c.y) && s.wall[i] > 0) {
    s.wall[i] = Math.max(0, s.wall[i] - dmg);
    burst(s, c.x + 0.5, c.y + 0.5, "#a88d7e", 5);
    return s.wall[i] === 0 ? "broke" : "wall";
  }
  if (baseAt(s, c.x, c.y) === BRIDGE) {
    if (cellOccupied(s, c.x, c.y)) return "occupied";
    s.base[i] = VOID;
    burst(s, c.x + 0.5, c.y + 0.5, "#e8cfa8", 6);
    return "bridge";
  }
  return "nothing";
}

export function meleeDamage(s: GameState, f: Fighter, target: Fighter) {
  let d = SWORD_DMG[f.sword];
  if (f.kit.category === "Fighter") d += 1;
  if (hasBuff(s, f, "berserk")) d += 3;
  if (hasBuff(s, f, "execute") && target.hp < target.maxHp / 2) d += 6;
  return d;
}

export function dealDamage(s: GameState, src: Fighter | null, tgt: Fighter, amount: number, kind: "melee" | "ranged", knock?: Cell) {
  if (!tgt.alive) return 0;
  let dmg = amount;
  if (hasBuff(s, tgt, "aegis")) dmg *= 0.45;
  if (hasBuff(s, tgt, "ironhide")) dmg *= 0.6;
  dmg = Math.max(1, Math.round(dmg));
  tgt.hp -= dmg;
  tgt.lastHurt = s.t;
  tgt.hurtT = s.t;
  addFloat(s, tgt.x, tgt.y - 0.6, `-${dmg}`, TEAM_COLOR[tgt.team]);
  burst(s, tgt.x, tgt.y, "#b22222", 5);
  if (tgt.team === "blue") s.shake = Math.max(s.shake, 0.3);
  if (src && src.alive) {
    if (hasBuff(s, src, "lifesteal")) {
      const heal = Math.ceil(dmg / 2);
      src.hp = Math.min(src.maxHp, src.hp + heal);
      addFloat(s, src.x, src.y - 0.6, `+${heal}`, "#2f9a5c");
    }
    if (kind === "melee" && hasBuff(s, tgt, "thorns")) {
      const back = Math.max(1, Math.round(dmg * 0.4));
      src.hp -= back;
      src.lastHurt = s.t;
      src.hurtT = s.t;
      addFloat(s, src.x, src.y - 0.6, `-${back} thorns`, TEAM_COLOR[src.team]);
      if (src.hp <= 0) killFighter(s, src, tgt, "thorns");
    }
  }
  if (tgt.hp <= 0) { killFighter(s, tgt, src, kind === "melee" ? "sword" : "projectile"); return dmg; }
  if (knock && !hasBuff(s, tgt, "ironhide")) {
    knockback(s, tgt, knock.x, knock.y, 0.9);
    if (baseAt(s, Math.floor(tgt.x), Math.floor(tgt.y)) === VOID && !hasBuff(s, tgt, "hover")) killFighter(s, tgt, src, "void");
  }
  return dmg;
}

export function killFighter(s: GameState, f: Fighter, killer: Fighter | null, cause: string) {
  if (!f.alive) return;
  f.alive = false;
  f.hp = 0;
  f.deaths++;
  f.deathCause = cause;
  burst(s, f.x, f.y, TEAM_COLOR[f.team], 18);
  s.shake = Math.max(s.shake, 0.55);
  if (killer && killer !== f) {
    killer.kills++;
    const loot = [f.iron && `${f.iron} iron`, f.diamond && `${f.diamond} diamond`, f.emerald && `${f.emerald} emerald`].filter(Boolean);
    killer.iron += f.iron; killer.diamond += f.diamond; killer.emerald += f.emerald;
    if (loot.length && killer.alive) addFloat(s, killer.x, killer.y - 1, `+${loot.join(", ")}`, "#8a6d10");
  }
  f.iron = 0; f.diamond = 0; f.emerald = 0; f.buffs = {};
  const how = cause === "void" ? "fell into the void" : cause === "thorns" ? "was cut by thorns" : `was taken down by ${killer ? TEAM_NAME[killer.team] : "the arena"}`;
  if (bedOf(s, f.team).alive) {
    f.respawnAt = s.t + RESPAWN_SECONDS;
    pushLog(s, `${TEAM_NAME[f.team]} ${how}. Bed alive, respawning.`, f.team);
  } else {
    f.eliminated = true;
    f.respawnAt = null;
    pushLog(s, `${TEAM_NAME[f.team]} ${how}. Final kill.`, f.team);
  }
}

export function destroyBed(s: GameState, bed: Bed, by: Fighter | null) {
  if (!bed.alive) return;
  bed.alive = false;
  bed.hp = 0;
  if (by) by.bedsBroken++;
  burst(s, bed.x + 0.5, bed.y + 0.5, TEAM_COLOR[bed.team], 26);
  s.shake = 1;
  pushLog(s, `${bed.team === "blue" ? "Your" : "Orange's"} bed was destroyed${by ? ` by ${TEAM_NAME[by.team]}` : ""}. No more respawns.`, bed.team);
  const owner = fighterOf(s, bed.team);
  if (!owner.alive && owner.respawnAt !== null) { owner.eliminated = true; owner.respawnAt = null; }
}

export function addFloat(s: GameState, x: number, y: number, text: string, color: string) {
  s.floats.push({ x, y, text, color, t0: s.t });
  if (s.floats.length > 40) s.floats.shift();
}

export function burst(s: GameState, x: number, y: number, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const a = rand(s) * Math.PI * 2, sp = 1 + rand(s) * 3;
    s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: s.t, life: 0.35 + rand(s) * 0.4, color, size: 2 + Math.floor(rand(s) * 3) });
  }
  if (s.particles.length > 320) s.particles.splice(0, s.particles.length - 320);
}

export function pushLog(s: GameState, text: string, tone: "blue" | "orange" | "neutral") {
  s.log.push({ t: s.t, text, tone });
  if (s.log.length > 8) s.log.shift();
}

export function spawnProjectile(s: GameState, f: Fighter, dx: number, dy: number, kind: ProjectileKind, dmg: number, speed: number, life: number) {
  s.projectiles.push({ x: f.x + dx * 0.4, y: f.y + dy * 0.4, vx: dx * speed, vy: dy * speed, team: f.team, dmg, life, kind });
}

export function autoAimDir(s: GameState, f: Fighter, maxRange = 9): Cell {
  const foe = fighterOf(s, other(f.team));
  const d = dist(f.x, f.y, foe.x, foe.y);
  if (foe.alive && d <= maxRange && d > 0) return { x: (foe.x - f.x) / d, y: (foe.y - f.y) / d };
  return { x: f.facing.x, y: f.facing.y };
}

export function rewardFor(won: boolean, elapsed: number) {
  if (elapsed < MIN_REWARD_SECONDS) return 0;
  return won ? WIN_REWARD : LOSS_REWARD;
}
