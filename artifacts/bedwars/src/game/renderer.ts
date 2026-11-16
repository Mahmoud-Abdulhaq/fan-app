import { W, H, CELL, VOID, BRIDGE, type GameState, type Cell, type Fighter } from "./types";
import { TEAM_COLOR, baseAt, hasBuff, idx } from "./core";
import { blockSkinForIndex, STATIC_SKINS } from "./cosmetics";

export interface RenderOpts { target: Cell | null; targetKind: "place" | "break" | "bed" | "blocked" | null; showGrid: boolean; shake: boolean }

const C = {
  void: "#09090b", ground: "#171719", groundAlt: "#202023", cliff: "#333136", cliffDeep: "#111113",
  bridge: "#302729", bridgeLine: "#4a3437", wall: "#2b292d", wallTop: "#414046", wallDark: "#111113",
  ink: "#B22222", paper: "#111113", iron: "#aeb4be",
  blueDark: "#1c3d8f", orangeDark: "#9a4a0e",
};

const STARS = (() => {
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 90 }, () => ({ x: r() * W * CELL, y: r() * H * CELL, s: r() < 0.2 ? 2 : 1, a: 0.15 + r() * 0.35 }));
})();

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, border: string, alpha = 1) {
  ctx.font = "700 10px 'JetBrains Mono', monospace";
  const w = ctx.measureText(text).width + 8;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.paper;
  ctx.fillRect(Math.round(x - w / 2), Math.round(y - 7), Math.round(w), 14);
  ctx.strokeStyle = border; ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(x - w / 2) + 0.5, Math.round(y - 7) + 0.5, Math.round(w) - 1, 13);
  ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 0.5);
  ctx.globalAlpha = 1;
}

function drawFighter(ctx: CanvasRenderingContext2D, s: GameState, f: Fighter, label: string) {
  const px = f.x * CELL, py = f.y * CELL;
  const col = TEAM_COLOR[f.team], dark = f.team === "blue" ? C.blueDark : C.orangeDark;
  const hover = hasBuff(s, f, "hover");
  ctx.fillStyle = "rgba(40,10,12,.28)";
  ctx.beginPath(); ctx.ellipse(px, py + 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  const lift = hover ? -4 - Math.sin(s.t * 8) * 2 : 0;
  const sz = 16;
  ctx.fillStyle = dark; ctx.fillRect(px - sz / 2 - 1, py - sz / 2 - 1 + lift, sz + 2, sz + 2);
  ctx.fillStyle = col; ctx.fillRect(px - sz / 2, py - sz / 2 + lift, sz, sz);
  const styleHash = f.cosmetics.kit ? [...f.cosmetics.kit].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7) : 0;
  const hatColors = ["#6d272c", "#59452b", "#3d5263", "#54426b", "#515b37", "#803b58"];
  ctx.fillStyle = f.cosmetics.kit ? hatColors[styleHash % hatColors.length] : "#34343a";
  ctx.fillRect(px - sz / 2 + 2, py - sz / 2 + lift, sz - 4, 4);
  ctx.fillStyle = "rgba(178,34,34,.65)"; ctx.fillRect(px - sz / 2 + 3, py - sz / 2 + 5 + lift, sz - 6, 2);
  // visor facing
  ctx.fillStyle = C.paper;
  const vx = px + f.facing.x * 4, vy = py + f.facing.y * 4 + lift;
  if (f.facing.x) ctx.fillRect(vx - 2 + f.facing.x * 2, vy - 4, 3, 8); else ctx.fillRect(vx - 4, vy - 2 + f.facing.y * 2, 8, 3);
  if (s.t - f.hurtT < 0.12) { ctx.fillStyle = "rgba(255,240,235,.7)"; ctx.fillRect(px - sz / 2, py - sz / 2 + lift, sz, sz); }
  // buff ring
  const buffs = ["aegis", "ironhide", "thorns", "berserk", "lifesteal", "execute", "haste", "sprint", "regen"].filter((b) => hasBuff(s, f, b));
  if (buffs.length) { ctx.strokeStyle = buffs.includes("berserk") || buffs.includes("execute") ? C.ink : "#d9a520"; ctx.lineWidth = 2; ctx.strokeRect(px - sz / 2 - 4, py - sz / 2 - 4 + lift, sz + 8, sz + 8); }
  if (hasBuff(s, f, "slow")) { ctx.strokeStyle = "#7fd6ee"; ctx.lineWidth = 2; ctx.strokeRect(px - sz / 2 - 2, py - sz / 2 - 2 + lift, sz + 4, sz + 4); }
  // swing
  const sw = s.t - f.swingT;
  if (sw < 0.16) {
    const ang = Math.atan2(f.facing.y, f.facing.x);
    ctx.strokeStyle = `rgba(247,238,232,${1 - sw / 0.16})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py + lift, 18, ang - 1 + sw * 8, ang + 0.2 + sw * 8); ctx.stroke();
    const skin = STATIC_SKINS.find((item) => item.id === f.cosmetics[f.swingWeapon]);
    ctx.save();
    ctx.translate(px + f.facing.x * 8, py + f.facing.y * 8 + lift);
    ctx.rotate(ang - 0.75 + Math.min(1, sw / 0.16) * 0.8);
    const handle = skin?.accent ?? "#8a5a39";
    const blade = skin?.color ?? "#aeb4be";
    if (f.swingWeapon === "axe") {
      ctx.fillStyle = handle; ctx.fillRect(-2, -1, 11, 3);
      ctx.fillStyle = blade; ctx.fillRect(6, -6, 5, 12);
      ctx.fillStyle = skin?.accent ?? "#777b83"; ctx.fillRect(8, -4, 2, 8);
    } else {
      ctx.fillStyle = handle; ctx.fillRect(-2, -1, 7, 3);
      ctx.fillStyle = blade; ctx.fillRect(4, -2, 12, 5);
      ctx.fillStyle = skin?.accent ?? "#d3d5da"; ctx.fillRect(12, -1, 4, 3);
    }
    ctx.restore();
  }
  // hp bar
  const bw = 26, ratio = Math.max(0, f.hp / f.maxHp);
  ctx.fillStyle = C.paper; ctx.fillRect(px - bw / 2 - 1, py - 20 + lift, bw + 2, 5);
  ctx.fillStyle = ratio > 0.35 ? col : C.ink; ctx.fillRect(px - bw / 2, py - 19 + lift, bw * ratio, 3);
  pill(ctx, px, py - 29 + lift, label, col, 0.95);
}

function drawShopkeeper(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number) {
  const px = x * CELL, py = y * CELL;
  ctx.fillStyle = "#09090b";
  ctx.fillRect(px - 8, py - 7, 16, 17);
  ctx.fillStyle = "#7a2028";
  ctx.fillRect(px - 7, py - 6, 14, 4);
  ctx.fillStyle = "#b77d58";
  ctx.fillRect(px - 5, py - 2, 10, 6);
  ctx.fillStyle = "#29292e";
  ctx.fillRect(px - 6, py + 4, 12, 7);
  ctx.fillStyle = "#B22222";
  ctx.fillRect(px + facing * 2 - 1, py, 2, 2);
  ctx.font = "700 8px 'JetBrains Mono', monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = C.ink;
  ctx.fillText("SHOP", px, py - 15);
}

export function renderGame(ctx: CanvasRenderingContext2D, s: GameState, o: RenderOpts, dpr: number) {
  const pw = W * CELL, ph = H * CELL;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = C.void; ctx.fillRect(0, 0, pw, ph);
  const sh = o.shake ? s.shake : 0;
  const ox = sh ? (Math.sin(s.t * 91) * 5 * sh) : 0, oy = sh ? (Math.cos(s.t * 77) * 5 * sh) : 0;
  ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);

  for (const st of STARS) {
    ctx.fillStyle = `rgba(178,34,34,${st.a})`;
    ctx.fillRect(Math.round((st.x + s.t * 3) % pw), Math.round(st.y), st.s, st.s);
  }

  // cliffs
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const b = s.base[idx(x, y)];
    if (b !== VOID && baseAt(s, x, y + 1) === VOID) {
      ctx.fillStyle = b === BRIDGE ? C.bridgeLine : C.cliff; ctx.fillRect(x * CELL, (y + 1) * CELL, CELL, b === BRIDGE ? 3 : 8);
      if (b !== BRIDGE) { ctx.fillStyle = C.cliffDeep; ctx.fillRect(x * CELL, (y + 1) * CELL + 8, CELL, 4); }
    }
  }
  // floor
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const b = s.base[idx(x, y)];
    if (b === VOID) continue;
    const X = x * CELL, Y = y * CELL;
    const blockSkin = blockSkinForIndex(s.wallSkin[idx(x, y)]);
    if (b === BRIDGE) {
      ctx.fillStyle = blockSkin?.color ?? C.bridge; ctx.fillRect(X, Y, CELL, CELL);
      ctx.fillStyle = blockSkin?.accent ?? C.bridgeLine; ctx.fillRect(X, Y + 7, CELL, 1); ctx.fillRect(X, Y + 16, CELL, 1); ctx.fillRect(X + 11, Y, 1, 7);
    } else {
      ctx.fillStyle = (x + y) % 2 ? C.ground : C.groundAlt; ctx.fillRect(X, Y, CELL, CELL);
    }
    if (o.showGrid) { ctx.strokeStyle = "rgba(178,34,34,.12)"; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y + 0.5, CELL - 1, CELL - 1); }
  }
  // generators
  for (const g of s.gens) {
    const X = g.x * CELL, Y = g.y * CELL, col = C.iron;
    ctx.fillStyle = "#303035"; ctx.fillRect(X + 2, Y + 2, CELL - 4, CELL - 4);
    ctx.fillStyle = C.paper; ctx.fillRect(X + 4, Y + 4, CELL - 8, CELL - 8);
    const pulse = 1 + Math.sin(s.t * 4 + g.x) * 0.12;
    ctx.save(); ctx.translate(X + CELL / 2, Y + CELL / 2); ctx.rotate(Math.PI / 4); ctx.scale(pulse, pulse);
    ctx.fillStyle = col; ctx.fillRect(-5, -5, 10, 10); ctx.strokeStyle = "rgba(60,20,20,.5)"; ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();
    const prog = Math.min(1, g.timer / g.interval);
    ctx.fillStyle = col; ctx.fillRect(X + 3, Y + CELL - 4, (CELL - 6) * (g.stock >= g.cap ? 1 : prog), 2);
    if (g.stock > 0) pill(ctx, X + CELL / 2, Y - 6, `${g.stock} ${g.kind}`, col);
  }
  // beds
  for (const b of s.beds) {
    const X = b.x * CELL, Y = b.y * CELL, col = TEAM_COLOR[b.team];
    if (!b.alive) {
      ctx.fillStyle = "#b9a093"; ctx.fillRect(X + 4, Y + 8, 6, 5); ctx.fillRect(X + 13, Y + 12, 7, 4); ctx.fillRect(X + 8, Y + 15, 5, 4);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 5, Y + 5); ctx.lineTo(X + 19, Y + 19); ctx.moveTo(X + 19, Y + 5); ctx.lineTo(X + 5, Y + 19); ctx.stroke();
      continue;
    }
    const jit = s.t - b.hitT < 0.15 ? Math.sin(s.t * 120) * 2 : 0;
    ctx.fillStyle = b.team === "blue" ? C.blueDark : C.orangeDark; ctx.fillRect(X + 1 + jit, Y + 3, CELL - 2, CELL - 6);
    ctx.fillStyle = col; ctx.fillRect(X + 2 + jit, Y + 4, CELL - 4, CELL - 8);
    ctx.fillStyle = C.paper; ctx.fillRect(X + (b.team === "blue" ? 3 : CELL - 10) + jit, Y + 6, 7, CELL - 12);
    const r = b.hp / b.maxHp;
    if (r < 0.7) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X + 12, Y + 5); ctx.lineTo(X + 15, Y + 11); ctx.lineTo(X + 11, Y + 15); if (r < 0.4) { ctx.lineTo(X + 16, Y + 19); } ctx.stroke(); }
    pill(ctx, X + CELL / 2, Y - 6, `BED ${b.hp}/${b.maxHp}`, col);
  }
  drawShopkeeper(ctx, 6.45, 7.5, 1);
  drawShopkeeper(ctx, 33.55, 7.5, -1);
  // walls
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const w = s.wall[idx(x, y)];
    if (!w) continue;
    const X = x * CELL, Y = y * CELL;
    const blockSkin = blockSkinForIndex(s.wallSkin[idx(x, y)]);
    ctx.fillStyle = blockSkin?.color ?? C.wallDark; ctx.fillRect(X, Y, CELL, CELL);
    ctx.fillStyle = blockSkin?.accent ?? C.wall; ctx.fillRect(X + 1, Y + 1, CELL - 2, CELL - 5);
    ctx.fillStyle = blockSkin?.color ?? C.wallTop; ctx.fillRect(X + 1, Y + 1, CELL - 2, 4);
    if (w <= 2) { ctx.strokeStyle = C.wallDark; ctx.beginPath(); ctx.moveTo(X + 6, Y + 6); ctx.lineTo(X + 11, Y + 12); ctx.lineTo(X + 9, Y + 17); ctx.stroke(); }
    if (w <= 1) { ctx.beginPath(); ctx.moveTo(X + 17, Y + 5); ctx.lineTo(X + 14, Y + 13); ctx.stroke(); }
  }
  // target
  if (o.target && o.targetKind) {
    const X = o.target.x * CELL, Y = o.target.y * CELL;
    const col = o.targetKind === "blocked" ? "rgba(178,34,34,.5)" : o.targetKind === "place" ? "#2f62d6" : C.ink;
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -s.t * 20;
    ctx.strokeRect(X + 1.5, Y + 1.5, CELL - 3, CELL - 3); ctx.setLineDash([]);
    if (o.targetKind === "place" && baseAt(s, o.target.x, o.target.y) === VOID) { ctx.fillStyle = "rgba(246,230,201,.35)"; ctx.fillRect(X + 3, Y + 3, CELL - 6, CELL - 6); }
  }
  // projectiles
  for (const p of s.projectiles) {
    ctx.fillStyle = p.kind === "fire" ? "#f08a2c" : p.kind === "frost" ? "#7fd6ee" : C.paper;
    const sz = p.kind === "fire" ? 7 : 4;
    ctx.fillRect(p.x * CELL - sz / 2, p.y * CELL - sz / 2, sz, sz);
    ctx.fillStyle = "rgba(247,238,232,.35)"; ctx.fillRect(p.x * CELL - p.vx * 1.2 - 1, p.y * CELL - p.vy * 1.2 - 1, 3, 3);
  }
  // fighters
  for (const f of [s.blue, s.orange]) {
    if (f.alive) drawFighter(ctx, s, f, f.team === "blue" ? "YOU" : "BOT");
    else if (f.respawnAt !== null) {
      ctx.globalAlpha = 0.4 + Math.sin(s.t * 6) * 0.15; ctx.fillStyle = TEAM_COLOR[f.team];
      ctx.fillRect(f.spawn.x * CELL - 8, f.spawn.y * CELL - 8, 16, 16); ctx.globalAlpha = 1;
      pill(ctx, f.spawn.x * CELL, f.spawn.y * CELL - 16, `${Math.ceil(f.respawnAt - s.t)}`, TEAM_COLOR[f.team]);
    }
  }
  // particles
  for (const p of s.particles) {
    const a = 1 - (s.t - p.t0) / p.life;
    ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.color; ctx.fillRect(p.x * CELL, p.y * CELL, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  // floats
  for (const f of s.floats) {
    const k = (s.t - f.t0) / 1.2;
    pill(ctx, f.x * CELL, f.y * CELL - k * 18, f.text, f.color, Math.max(0, 1 - k * k));
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
