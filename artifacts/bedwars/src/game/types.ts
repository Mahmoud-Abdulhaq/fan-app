import type { KitLoadout } from "./abilities";

export const W = 40;
export const H = 15;
export const CELL = 24;

export const VOID = 0;
export const GROUND = 1;
export const BRIDGE = 2;

export type Team = "blue" | "orange";
export type Difficulty = "rookie" | "standard" | "veteran";

export interface Cell { x: number; y: number }

export type ShopItemId = "wool8" | "wool20" | "sword1" | "sword2" | "sword3" | "axe1" | "axe2" | "axe3";
export interface Cost { iron?: number; diamond?: number; emerald?: number }

export type Action = { type: "place" } | { type: "ability" } | { type: "buy"; item: ShopItemId };

export interface Input {
  mx: number;
  my: number;
  attack: boolean;
  mine: boolean;
  aim: Cell | null;
  actions: Action[];
}

export interface Fighter {
  team: Team;
  kit: KitLoadout;
  x: number;
  y: number;
  spawn: { x: number; y: number };
  facing: Cell;
  hp: number;
  maxHp: number;
  alive: boolean;
  eliminated: boolean;
  respawnAt: number | null;
  sword: number;
  axe: number;
  blocks: number;
  iron: number;
  diamond: number;
  emerald: number;
  attackCd: number;
  mineCd: number;
  abilityCd: number;
  placeCd: number;
  buffs: Record<string, number>;
  lastHurt: number;
  regenT: number;
  swingT: number;
  hurtT: number;
  speedMul: number;
  attackMul: number;
  kills: number;
  deaths: number;
  bedsBroken: number;
  blocksPlaced: number;
  deathCause: string;
}

export interface Bed { team: Team; x: number; y: number; hp: number; maxHp: number; alive: boolean; hitT: number }

export type GenKind = "iron" | "diamond" | "emerald";
export interface Generator { kind: GenKind; x: number; y: number; interval: number; timer: number; stock: number; cap: number; owner: Team | null }

export type ProjectileKind = "arrow" | "fire" | "frost";
export interface Projectile { x: number; y: number; vx: number; vy: number; team: Team; dmg: number; life: number; kind: ProjectileKind }

export interface FloatText { x: number; y: number; text: string; color: string; t0: number }
export interface Particle { x: number; y: number; vx: number; vy: number; t0: number; life: number; color: string; size: number }
export interface LogEntry { t: number; text: string; tone: "blue" | "orange" | "neutral" }

export interface BotMemory { thinkT: number; buyT: number; placeT: number; path: Cell[]; goal: string; gathering: boolean }

export interface GameState {
  t: number;
  base: Uint8Array;
  wall: Uint8Array;
  blue: Fighter;
  orange: Fighter;
  beds: Bed[];
  gens: Generator[];
  projectiles: Projectile[];
  floats: FloatText[];
  particles: Particle[];
  log: LogEntry[];
  over: { winner: Team; at: number } | null;
  suddenDeath: boolean;
  shake: number;
  difficulty: Difficulty;
  bot: BotMemory;
  seed: number;
}
