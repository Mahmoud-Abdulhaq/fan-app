import type { Kit } from "@workspace/api-client-react";
import { VOID, type GameState, type Fighter } from "./types";
import {
  addFloat, autoAimDir, baseAt, bedOf, canPlace, dashFighter, dealDamage, dist, facingCell, knockback,
  meleeDamage, placeBlock, spawnProjectile,
} from "./core";

export type KitCategory = "Fighter" | "Movement" | "Support" | "Economy" | "Defender" | "Ranged";
export interface AbilityDef { id: string; name: string; cooldown: number; summary: string }
export interface PassiveDef { name: string; summary: string }
export interface KitLoadout { kitId: string; kitName: string; tier: string; category: KitCategory; passive: PassiveDef; ability: AbilityDef }

export const PASSIVES: Record<KitCategory, PassiveDef> = {
  Fighter: { name: "Sharpened", summary: "+1 sword damage on every hit." },
  Movement: { name: "Light Feet", summary: "Move 18% faster at all times." },
  Support: { name: "Field Medic", summary: "Out-of-combat regeneration ticks twice as fast." },
  Economy: { name: "Overclocked Forge", summary: "Your home iron generator runs 35% faster." },
  Defender: { name: "Reinforced", summary: "Bed starts with +3 health; your walls take one extra axe hit." },
  Ranged: { name: "Long Reach", summary: "Sword reach +0.5 tiles." },
};

export const ABILITIES: Record<KitCategory, AbilityDef[]> = {
  Fighter: [
    { id: "berserk", name: "Berserk", cooldown: 14, summary: "+3 sword damage for 4s." },
    { id: "lunge", name: "Lunge", cooldown: 9, summary: "Dash up to 2.5 tiles at the bot and strike for +2." },
    { id: "cleave", name: "Cleave", cooldown: 11, summary: "Wide sweep: 5 damage to the bot within 2.6 tiles." },
    { id: "bloodthirst", name: "Bloodthirst", cooldown: 15, summary: "Heal for half of all damage dealt for 5s." },
    { id: "execute", name: "Executioner", cooldown: 12, summary: "For 5s, hits on targets under half health deal +6." },
  ],
  Movement: [
    { id: "dash", name: "Dash", cooldown: 6, summary: "Burst 3 tiles forward, stopping safely at edges." },
    { id: "feather", name: "Featherfall", cooldown: 14, summary: "Hover over the void for 2.5s." },
    { id: "sprint", name: "Sprint", cooldown: 12, summary: "+60% move speed for 4s." },
    { id: "recall", name: "Recall", cooldown: 20, summary: "Teleport straight back to your spawn." },
    { id: "glider", name: "Glider", cooldown: 16, summary: "Hover and +35% speed for 2s." },
  ],
  Support: [
    { id: "mend", name: "Mend", cooldown: 12, summary: "Instantly heal 7 health." },
    { id: "aegis", name: "Aegis", cooldown: 16, summary: "Take 55% less damage for 5s." },
    { id: "secondwind", name: "Second Wind", cooldown: 18, summary: "Regenerate 1 health every 0.5s for 6s." },
    { id: "hymn", name: "Battle Hymn", cooldown: 14, summary: "Sword swings twice as fast for 5s." },
    { id: "pulse", name: "Cleanse Pulse", cooldown: 15, summary: "Heal 4, clear slows, shove a close bot away." },
  ],
  Economy: [
    { id: "payday", name: "Payday", cooldown: 18, summary: "Gain 8 iron on the spot." },
    { id: "prospector", name: "Prospector", cooldown: 30, summary: "Gain 1 diamond." },
    { id: "haggle", name: "Haggle", cooldown: 25, summary: "Iron prices are 35% cheaper for 15s." },
    { id: "magnet", name: "Magnet", cooldown: 20, summary: "Pull every generator stock within 7 tiles." },
    { id: "vault", name: "Vault", cooldown: 45, summary: "Gain 1 emerald." },
  ],
  Defender: [
    { id: "barricade", name: "Barricade", cooldown: 20, summary: "Free walls on every open tile around your bed." },
    { id: "patch", name: "Mortar Patch", cooldown: 22, summary: "Repair your bed by 3 health." },
    { id: "rampart", name: "Rampart", cooldown: 15, summary: "Raise a free 3-wide wall in front of you." },
    { id: "thorns", name: "Thorns", cooldown: 16, summary: "Reflect 40% of sword damage for 6s." },
    { id: "ironhide", name: "Ironhide", cooldown: 16, summary: "40% less damage and no knockback for 6s." },
  ],
  Ranged: [
    { id: "arrow", name: "Arrow", cooldown: 3.5, summary: "Fire a 5-damage arrow, auto-aimed at the bot." },
    { id: "fireball", name: "Fireball", cooldown: 9, summary: "4 damage; blasts the first wall or hits a bed for 2." },
    { id: "volley", name: "Volley", cooldown: 8, summary: "Three spread arrows, 3 damage each." },
    { id: "longshot", name: "Longshot", cooldown: 10, summary: "Fast 8-damage arrow." },
    { id: "frost", name: "Frost Shot", cooldown: 7, summary: "3 damage and slows the target 40% for 3s." },
  ],
};

export const UNLOCK_PRICE: Record<string, number> = { D: 0, C: 20, B: 30, A: 40, S: 50 };
export const unlockPrice = (tier: string) => UNLOCK_PRICE[tier] ?? 50;
export const isOwned = (kit: Pick<Kit, "id" | "tier">, unlocked: string[]) => kit.tier === "D" || unlocked.includes(kit.id);

/** Deterministic: within each category, kits sorted by rank then id get distinct ability variants. */
export function buildLoadouts(kits: Kit[]): Map<string, KitLoadout> {
  const out = new Map<string, KitLoadout>();
  const groups = new Map<KitCategory, Kit[]>();
  for (const k of kits) {
    const c = (k.category as KitCategory) in ABILITIES ? (k.category as KitCategory) : "Fighter";
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c)!.push(k);
  }
  groups.forEach((list, cat) => {
    list.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
    list.forEach((k, i) => {
      out.set(k.id, { kitId: k.id, kitName: k.name, tier: k.tier, category: cat, passive: PASSIVES[cat], ability: ABILITIES[cat][i % 5] });
    });
  });
  return out;
}

export interface AbilityResult { ok: boolean; message: string }

export function triggerAbility(s: GameState, f: Fighter, foe: Fighter): AbilityResult {
  const a = f.kit.ability;
  const buff = (name: string, secs: number) => { f.buffs[name] = s.t + secs; };
  const done = (message: string): AbilityResult => ({ ok: true, message });
  const fail = (message: string): AbilityResult => ({ ok: false, message });
  const fd = foe.alive ? dist(f.x, f.y, foe.x, foe.y) : Infinity;
  const toFoe = fd > 0 && fd < Infinity ? { x: (foe.x - f.x) / fd, y: (foe.y - f.y) / fd } : { x: f.facing.x, y: f.facing.y };

  switch (a.id) {
    case "berserk": buff("berserk", 4); return done("Berserk");
    case "lunge": {
      if (!foe.alive || fd > 4.5) return fail("No target in lunge range");
      dashFighter(s, f, toFoe.x, toFoe.y, Math.max(0, Math.min(2.5, fd - 0.9)));
      if (dist(f.x, f.y, foe.x, foe.y) <= 1.6) dealDamage(s, f, foe, meleeDamage(s, f, foe) + 2, "melee", toFoe);
      return done("Lunge");
    }
    case "cleave":
      if (foe.alive && fd <= 2.6) { dealDamage(s, f, foe, 5, "melee", toFoe); return done("Cleave connects"); }
      return done("Cleave whiffs");
    case "bloodthirst": buff("lifesteal", 5); return done("Bloodthirst");
    case "execute": buff("execute", 5); return done("Executioner");
    case "dash": dashFighter(s, f, f.facing.x, f.facing.y, 3); return done("Dash");
    case "feather": buff("hover", 2.5); return done("Featherfall");
    case "sprint": buff("sprint", 4); return done("Sprint");
    case "recall": f.x = f.spawn.x; f.y = f.spawn.y; return done("Recalled home");
    case "glider": buff("hover", 2); buff("glide", 2); return done("Glider");
    case "mend": {
      if (f.hp >= f.maxHp) return fail("Already at full health");
      const h = Math.min(7, f.maxHp - f.hp); f.hp += h; addFloat(s, f.x, f.y - 0.6, `+${h}`, "#2f9a5c"); return done("Mend");
    }
    case "aegis": buff("aegis", 5); return done("Aegis");
    case "secondwind": buff("regen", 6); return done("Second Wind");
    case "hymn": buff("haste", 5); return done("Battle Hymn");
    case "pulse": {
      const h = Math.min(4, f.maxHp - f.hp); f.hp += h; delete f.buffs.slow;
      if (foe.alive && fd <= 2.2) knockback(s, foe, toFoe.x, toFoe.y, 1.6);
      if (foe.alive && baseAt(s, Math.floor(foe.x), Math.floor(foe.y)) === VOID && !((foe.buffs.hover ?? 0) > s.t)) dealDamage(s, f, foe, 999, "ranged");
      return done("Cleanse Pulse");
    }
    case "payday": f.iron += 8; addFloat(s, f.x, f.y - 0.8, "+8 iron", "#7d8590"); return done("Payday");
    case "prospector": f.diamond += 1; addFloat(s, f.x, f.y - 0.8, "+1 diamond", "#2aa7bd"); return done("Prospector");
    case "haggle": buff("discount", 15); return done("Haggle: iron 35% off");
    case "magnet": {
      let got = 0;
      for (const g of s.gens) if (g.stock > 0 && dist(f.x, f.y, g.x + 0.5, g.y + 0.5) <= 7) { f[g.kind] += g.stock; got += g.stock; g.stock = 0; }
      if (!got) return fail("No generator stock within 7 tiles");
      return done(`Magnet pulled ${got}`);
    }
    case "vault": f.emerald += 1; addFloat(s, f.x, f.y - 0.8, "+1 emerald", "#2a9a5f"); return done("Vault");
    case "barricade": {
      const bed = bedOf(s, f.team);
      if (!bed.alive) return fail("Your bed is gone");
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const c = { x: bed.x + dx, y: bed.y + dy };
        if (baseAt(s, c.x, c.y) !== VOID && canPlace(s, c) && placeBlock(s, f, c, true) === "ok") n++;
      }
      return n ? done(`Barricade: ${n} walls`) : fail("Bed is already walled in");
    }
    case "patch": {
      const bed = bedOf(s, f.team);
      if (!bed.alive) return fail("Your bed is gone");
      if (bed.hp >= bed.maxHp) return fail("Bed is at full health");
      bed.hp = Math.min(bed.maxHp, bed.hp + 3); return done("Bed repaired");
    }
    case "rampart": {
      const fc = facingCell(f); const p = { x: f.facing.y, y: f.facing.x };
      let n = 0;
      for (const k of [-1, 0, 1]) {
        const c = { x: fc.x + p.x * k, y: fc.y + p.y * k };
        if (baseAt(s, c.x, c.y) !== VOID && placeBlock(s, f, c, true) === "ok") n++;
      }
      return n ? done("Rampart raised") : fail("No room for a rampart");
    }
    case "thorns": buff("thorns", 6); return done("Thorns");
    case "ironhide": buff("ironhide", 6); return done("Ironhide");
    case "arrow": { const d = autoAimDir(s, f); spawnProjectile(s, f, d.x, d.y, "arrow", 5, 12, 1); return done("Arrow"); }
    case "fireball": { const d = autoAimDir(s, f); spawnProjectile(s, f, d.x, d.y, "fire", 4, 9, 1.3); return done("Fireball"); }
    case "volley": {
      const d = autoAimDir(s, f); const base = Math.atan2(d.y, d.x);
      for (const off of [-0.22, 0, 0.22]) spawnProjectile(s, f, Math.cos(base + off), Math.sin(base + off), "arrow", 3, 12, 0.9);
      return done("Volley");
    }
    case "longshot": { const d = autoAimDir(s, f, 14); spawnProjectile(s, f, d.x, d.y, "arrow", 8, 18, 1); return done("Longshot"); }
    case "frost": { const d = autoAimDir(s, f); spawnProjectile(s, f, d.x, d.y, "frost", 3, 12, 1); return done("Frost Shot"); }
  }
  return fail("Ability unavailable");
}
