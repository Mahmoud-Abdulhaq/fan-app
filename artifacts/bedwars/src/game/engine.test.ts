import assert from "node:assert/strict";
import { createGame, step, emptyInput, buyItem, buyStatus, checkWinner, STEP, SHOP_ITEMS, shopItemsForGame } from "./engine";
import { bedOf, destroyBed, ISLANDS, killFighter, mineCell, placeBlock, rewardFor, idx } from "./core";
import { PASSIVES, ABILITIES, NO_KIT_LOADOUT, triggerAbility, type KitLoadout, type KitCategory } from "./abilities";
import { botThink, choosePurchase } from "./bot";
import { ARENA_MAPS } from "./maps";
import { STATIC_SKINS } from "./cosmetics";
import { DEFAULT_KEYBINDS, parseSettings } from "./settings";
import { rankForRp } from "./ranked";

type ActiveKitCategory = Exclude<KitCategory, "None">;
const loadout = (category: ActiveKitCategory = "Fighter", index = 0): KitLoadout => ({
  kitId: `${category}-${index}`, kitName: category, tier: "D", category,
  passive: PASSIVES[category], ability: ABILITIES[category][index],
});
const game = () => createGame({ blueKit: loadout(), orangeKit: loadout() });
const tick = (s: ReturnType<typeof game>, seconds: number, bot = false) => {
  for (let n = 0; n < seconds / STEP; n++) step(s, { blue: emptyInput(), orange: bot ? botThink(s, STEP) : emptyInput() }, STEP);
};

{
  assert.deepEqual(DEFAULT_KEYBINDS, {
    up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD",
    attack: "KeyE", mine: "KeyT", place: "KeyR", ability: "KeyQ", shop: "KeyF", pause: "KeyG",
  }, "arena controls use the requested fixed keys");
  assert.deepEqual(
    parseSettings({ keybinds: { attack: "KeyJ", mine: "KeyK", place: "KeyE" } }).keybinds,
    DEFAULT_KEYBINDS,
    "saved custom bindings from older versions are ignored",
  );
  const s = game();
  assert.equal(s.gens.length, 2, "matches use only the two home iron generators");
  assert.ok(s.gens.every((generator) => generator.kind === "iron" && generator.interval === 0.05), "each iron generator releases one iron every 50ms");
  s.blue.x = 2.5; s.blue.y = 9.5;
  tick(s, 10);
  assert.ok(s.blue.iron >= 39, "standing in iron generator earns iron rapidly");
  const iron = s.blue.iron;
  assert.equal(buyItem(s, s.blue, "wool8").ok, true);
  assert.equal(s.blue.iron, iron - 4);
  assert.equal(s.blue.blocks, 16);
  s.blue.x = 19.5; s.blue.y = 7.5;
  assert.equal(buyItem(s, s.blue, "wool8").ok, false, "cannot shop off home island");
  assert.deepEqual([...new Set(SHOP_ITEMS.map(i => i.group))].sort(), ["Axes", "Blocks", "Swords"]);
  assert.equal(SHOP_ITEMS.length, 6, "match shop stays limited to blocks, swords and axes");
  assert.equal(ARENA_MAPS.length, 5, "the lobby offers five maps");
  for (const tier of [0, 1, 2]) {
    assert.equal(STATIC_SKINS.filter((skin) => skin.slot === "sword" && skin.swordTier === tier).length, 2, `sword tier ${tier} has two skins`);
  }
}
{
  const ranked = createGame({ mode: "ranked", blueKit: NO_KIT_LOADOUT, orangeKit: NO_KIT_LOADOUT });
  assert.equal(ranked.mode, "ranked");
  assert.equal(ranked.blue.blocks, 0, "ranked starts without blocks");
  assert.equal(ranked.blue.axe, -1, "ranked starts without an axe");
  assert.equal(ranked.blue.kit.category, "None", "ranked starts without a kit");
  assert.equal(ISLANDS.filter((island) => island.home !== null).length, 2, "ranked has two team islands");
  assert.equal(ISLANDS.filter((island) => island.home === null).length, 1, "ranked has one middle island");
  const orangeBedHp = ranked.beds.find((bed) => bed.team === "orange")!.hp;
  assert.equal(mineCell(ranked, ranked.blue, { x: 37, y: 7 }), "nothing", "ranked players cannot mine before buying an axe");
  assert.equal(ranked.beds.find((bed) => bed.team === "orange")!.hp, orangeBedHp);
  assert.equal(ranked.base[idx(7, 7)], 0, "ranked has no prebuilt bridge from blue home");
  assert.equal(ranked.base[idx(19, 7)] !== 0, true, "ranked keeps its middle island");
  assert.equal(ranked.base[idx(32, 7)], 0, "ranked has no prebuilt bridge to orange home");
  assert.deepEqual([...new Set(shopItemsForGame(ranked).map((item) => item.group))].sort(), ["Axes", "Blocks"]);
  assert.equal(shopItemsForGame(ranked).length, 4, "ranked sells only two block and two axe items");
  ranked.orange.iron = 100;
  assert.equal(choosePurchase(ranked), "wool8", "ranked bot prioritizes blocks and cannot buy a sword");
  ranked.orange.blocks = 16;
  assert.equal(choosePurchase(ranked), "axe1", "ranked bot buys an axe after gathering blocks");
  ranked.blue.iron = 100;
  assert.equal(buyItem(ranked, ranked.blue, "axe1").ok, true, "ranked can buy an axe");
  assert.equal(ranked.blue.axe, 1);
  assert.equal(buyStatus(ranked, ranked.blue, "sword1"), "unavailable", "ranked disallows sword purchases");
  assert.equal(buyItem(ranked, ranked.blue, "sword1").ok, false, "ranked cannot buy swords through the engine");
  step(ranked, { blue: { ...emptyInput(), actions: [{ type: "ability" }] }, orange: emptyInput() }, STEP);
  assert.deepEqual(ranked.blue.buffs, {}, "ranked disables kit abilities");
  assert.equal(rankForRp(0).name, "Unranked");
  assert.equal(rankForRp(100).name, "Bronze");
  assert.equal(rankForRp(200).name, "Silver");
  assert.equal(rankForRp(300).name, "Gold");
  assert.equal(rankForRp(400).name, "Diamond");
  assert.equal(rankForRp(500).name, "Emerald");
  assert.equal(rankForRp(599).name, "Emerald");
  assert.equal(rankForRp(600).name, "Nightmare");
  assert.equal(rankForRp(-10).name, "Unranked", "negative points remain in unranked");
  assert.equal(rankForRp(-10).progress, 0, "negative points do not fill the unranked progress bar");
}
{
  for (const map of ARENA_MAPS) {
    const s = createGame({ blueKit: loadout(), orangeKit: loadout(), mapId: map.id });
    assert.equal(s.mapId, map.id, `${map.name} is selected for the match`);
    assert.equal(s.gens.length, 2, `${map.name} has one iron generator per team`);
    assert.ok(s.base[idx(19, 7)] !== 0, `${map.name} keeps the center arena connected`);
  }
}
{
  const s = game();
  const blocks = s.blue.blocks;
  assert.equal(placeBlock(s, s.blue, { x: 7, y: 7 }), "ok");
  assert.equal(s.blue.blocks, blocks - 1);
  assert.equal(s.base[idx(7, 7)], 2, "bridge creates walkable ground");
  assert.equal(placeBlock(s, s.blue, { x: 10, y: 0 }), "invalid", "floating disconnected blocks forbidden");
  killFighter(s, s.blue, null, "void");
  assert.equal(s.blue.respawnAt, s.t, "standing bed schedules respawn with no wait");
  step(s, { blue: emptyInput(), orange: emptyInput() }, STEP);
  assert.equal(s.blue.alive, true, "living bed respawns on the next simulation tick");
  assert.equal(s.blue.respawnAt, null, "instant respawn clears the respawn timer");
  destroyBed(s, bedOf(s, "blue"), s.orange);
  killFighter(s, s.blue, s.orange, "sword");
  checkWinner(s);
  assert.equal(s.over?.winner, "orange", "death without bed ends match");
}
{
  for (const category of Object.keys(ABILITIES) as ActiveKitCategory[]) {
    ABILITIES[category].forEach((_ability, index) => {
      const s = createGame({ blueKit: loadout(category, index), orangeKit: loadout() });
      s.blue.hp = 8;
      s.orange.x = s.blue.x + 1; s.orange.y = s.blue.y;
      triggerAbility(s, s.blue, s.orange);
      tick(s, 5);
      assert.ok(Number.isFinite(s.blue.x) && Number.isFinite(s.blue.hp), `${category} ability ${index} remains finite`);
    });
  }
}
{
  const s = game();
  tick(s, 150, true);
  assert.ok(s.orange.sword > 0, "bot collects and buys equipment");
  assert.ok(s.orange.x < 30 || s.blue.deaths > 0 || !bedOf(s, "blue").alive, "bot advances toward the player");
  assert.ok(Number.isFinite(s.orange.x) && Number.isFinite(s.orange.hp));
}
assert.equal(rewardFor(true, 19), 0);
assert.equal(rewardFor(true, 20), 15);
assert.equal(rewardFor(false, 20), 5);
console.log("Minigame engine checks passed: ranked progression and restrictions, iron economy, maps, purchases, bridges, respawn, abilities, bot progression and rewards.");
