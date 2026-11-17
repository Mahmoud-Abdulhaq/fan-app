import { W, H, VOID, type GameState, type Cell, type Input, type ShopItemId } from "./types";
import { baseAt, bedAt, bedOf, cellOf, dist, idx, inBounds, onHomeIsland, wallAt } from "./core";
import { buyStatus } from "./engine";

const BOT = { think: 0.3, place: 0.28, aggro: 4.5 };

function stepCost(s: GameState, x: number, y: number) {
  const w = wallAt(s, x, y);
  if (w > 0) return 2 + w;
  if (baseAt(s, x, y) === VOID) return 3;
  return 1;
}

/** Dijkstra over the grid. Void tiles cost extra (need a block), walls cost extra (need mining). */
export function findPath(s: GameState, from: Cell, isGoal: (c: Cell) => boolean): Cell[] | null {
  if (!inBounds(from.x, from.y)) return null;
  if (isGoal(from)) return [];
  const N = W * H;
  const d = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  const start = idx(from.x, from.y);
  d[start] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!done[i] && d[i] < best) { best = d[i]; u = i; }
    if (u < 0) return null;
    done[u] = 1;
    const ux = u % W, uy = (u / W) | 0;
    if (u !== start && isGoal({ x: ux, y: uy })) {
      const path: Cell[] = [];
      for (let c = u; c !== start; c = prev[c]) path.push({ x: c % W, y: (c / W) | 0 });
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = ux + dx, ny = uy + dy;
      if (!inBounds(nx, ny) || bedAt(s, nx, ny)) continue;
      const n = idx(nx, ny);
      const nd = best + stepCost(s, nx, ny);
      if (nd < d[n]) { d[n] = nd; prev[n] = u; }
    }
  }
}

export function choosePurchase(s: GameState): ShopItemId | null {
  const me = s.orange;
  if (s.mode === "ranked") {
    const rankedOrder: ShopItemId[] = [];
    if (me.blocks < 16) rankedOrder.push("wool8", "wool20");
    if (me.axe < 1) rankedOrder.push("axe1");
    rankedOrder.push("axe2");
    for (const id of rankedOrder) if (buyStatus(s, me, id) === "ok") return id;
    return null;
  }
  const order: ShopItemId[] = [];
  if (me.blocks < 16) order.push("wool8");
  if (me.sword < 1) order.push("sword1");
  if (me.axe < 1) order.push("axe1");
  order.push("sword2", "axe2");
  for (const id of order) if (buyStatus(s, me, id) === "ok") return id;
  return null;
}

function replan(s: GameState) {
  const me = s.orange, foe = s.blue, mem = s.bot;
  const my = cellOf(me), fc = cellOf(foe);
  const myBed = bedOf(s, "orange"), foeBed = bedOf(s, "blue");
  const dFoe = foe.alive ? dist(me.x, me.y, foe.x, foe.y) : Infinity;
  const foeNearBed = myBed.alive && foe.alive && dist(foe.x, foe.y, myBed.x + 0.5, myBed.y + 0.5) < 6;
  const ironGen = s.gens.find((g) => g.kind === "iron" && g.owner === "orange")!;
  if (me.blocks < 6) mem.gathering = true;
  if (mem.gathering && me.blocks >= 16 && (me.sword >= 1 || s.t > 50)) mem.gathering = false;
  const at = (g: Cell) => (c: Cell) => c.x === g.x && c.y === g.y;

  let goal: string; let pred: (c: Cell) => boolean;
  if (foe.alive && (dFoe < BOT.aggro || foeNearBed)) { goal = "fight"; pred = (c) => Math.abs(c.x - fc.x) + Math.abs(c.y - fc.y) <= 1; }
  else if (mem.gathering) { goal = "gather"; pred = at(ironGen); }
  else if (foeBed.alive) { goal = "bed"; pred = (c) => Math.abs(c.x - foeBed.x) + Math.abs(c.y - foeBed.y) === 1; }
  else { goal = "hunt"; pred = (c) => Math.abs(c.x - fc.x) + Math.abs(c.y - fc.y) <= 1; }
  mem.goal = goal;
  mem.path = findPath(s, my, pred) ?? [];
}

export function botThink(s: GameState, dt: number): Input {
  const me = s.orange, foe = s.blue, mem = s.bot;
  const input: Input = { mx: 0, my: 0, attack: false, mine: false, aim: null, actions: [] };
  if (!me.alive || s.over) { mem.path = []; mem.thinkT = 0; return input; }
  mem.thinkT -= dt; mem.placeT -= dt; mem.buyT -= dt;
  const my = cellOf(me);
  const dFoe = foe.alive ? dist(me.x, me.y, foe.x, foe.y) : Infinity;
  const myBed = bedOf(s, "orange"), foeBed = bedOf(s, "blue");

  if (onHomeIsland(me) && mem.buyT <= 0) {
    const pick = choosePurchase(s);
    if (pick) { input.actions.push({ type: "buy", item: pick }); mem.buyT = 0.5; }
  }
  if (mem.thinkT <= 0) { mem.thinkT = BOT.think; replan(s); }

  if (dFoe <= 1.5 + (me.kit.category === "Ranged" ? 0.5 : 0)) input.attack = true;

  if (me.kit.category !== "None" && me.abilityCd <= 0) {
    const cat = me.kit.category, id = me.kit.ability.id;
    let use = false;
    if (cat === "Economy") use = true;
    else if (id === "recall") use = me.hp < 6 && dFoe < 3;
    else if (id === "barricade" || id === "patch") use = myBed.alive && (myBed.hp < myBed.maxHp || (foe.alive && dist(foe.x, foe.y, myBed.x, myBed.y) < 5));
    else if (cat === "Ranged") use = dFoe < 8;
    else if (cat === "Support") use = me.hp < me.maxHp * 0.6 || dFoe < 2.5;
    else if (cat === "Movement") use = dFoe < 6 || mem.goal === "bed";
    else use = dFoe < 2.6;
    if (use) input.actions.push({ type: "ability" });
  }

  while (mem.path.length && mem.path[0].x === my.x && mem.path[0].y === my.y) mem.path.shift();
  const n = mem.path[0];

  if (!n) {
    if (mem.goal === "bed" && foeBed.alive && Math.abs(my.x - foeBed.x) + Math.abs(my.y - foeBed.y) === 1) {
      input.aim = { x: foeBed.x, y: foeBed.y }; input.mine = true;
      input.mx = (foeBed.x + 0.5 - me.x) * 0.01; input.my = (foeBed.y + 0.5 - me.y) * 0.01;
    } else if ((mem.goal === "fight" || mem.goal === "hunt") && foe.alive && dFoe > 0.9) {
      const nx = (foe.x - me.x) / dFoe, ny = (foe.y - me.y) / dFoe;
      if (baseAt(s, Math.floor(me.x + nx * 0.6), Math.floor(me.y + ny * 0.6)) !== VOID) { input.mx = nx; input.my = ny; }
    }
    return input;
  }

  if (baseAt(s, n.x, n.y) === VOID) {
    if (me.blocks > 0) {
      if (mem.placeT <= 0) { input.actions.push({ type: "place" }); mem.placeT = BOT.place; }
      input.aim = n;
    } else { mem.gathering = true; mem.thinkT = 0; }
    input.mx = (my.x + 0.5 - me.x) * 2; input.my = (my.y + 0.5 - me.y) * 2;
    return input;
  }
  if (wallAt(s, n.x, n.y) > 0) { input.aim = n; input.mine = true; return input; }

  let dx = n.x + 0.5 - me.x, dy = n.y + 0.5 - me.y;
  if (n.x !== my.x) dy *= 3; else dx *= 3;
  const len = Math.hypot(dx, dy) || 1;
  input.mx = dx / len; input.my = dy / len;
  return input;
}
