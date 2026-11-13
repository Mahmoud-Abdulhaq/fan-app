import assert from "node:assert/strict";
import { createGame, step, emptyInput, buyItem, checkWinner, STEP, SHOP_ITEMS } from "./engine";
import { bedOf, destroyBed, killFighter, placeBlock, rewardFor, idx } from "./core";
import { PASSIVES, ABILITIES, triggerAbility, type KitLoadout, type KitCategory } from "./abilities";
import { botThink } from "./bot";

const loadout = (category: KitCategory = "Fighter", index = 0): KitLoadout => ({
  kitId: `${category}-${index}`, kitName: category, tier: "D", category,
  passive: PASSIVES[category], ability: ABILITIES[category][index],
});
const game = () => createGame({ blueKit: loadout(), orangeKit: loadout(), difficulty: "rookie" });
const tick = (s: ReturnType<typeof game>, seconds: number, bot = false) => {
  for (let n = 0; n < seconds / STEP; n++) step(s, { blue: emptyInput(), orange: bot ? botThink(s, STEP) : emptyInput() }, STEP);
};

{
  const s = game();
  s.blue.x = 2.5; s.blue.y = 9.5;
  tick(s, 10);
  assert.ok(s.blue.iron >= 9, "standing in iron generator earns iron");
  const iron = s.blue.iron;
  assert.equal(buyItem(s, s.blue, "wool8").ok, true);
  assert.equal(s.blue.iron, iron - 4);
  assert.equal(s.blue.blocks, 16);
  s.blue.x = 19.5; s.blue.y = 7.5;
  assert.equal(buyItem(s, s.blue, "wool8").ok, false, "cannot shop off home island");
  tick(s, 25);
  assert.ok(s.blue.emerald >= 1, "emerald generation and collection work");
  s.blue.x = 13.5; s.blue.y = 3.5;
  tick(s, 15);
  assert.ok(s.blue.diamond >= 1, "diamond generation and collection work");
  assert.deepEqual([...new Set(SHOP_ITEMS.map(i => i.group))].sort(), ["Axes", "Blocks", "Swords"]);
}
{
  const s = game();
  const blocks = s.blue.blocks;
  assert.equal(placeBlock(s, s.blue, { x: 7, y: 7 }), "ok");
  assert.equal(s.blue.blocks, blocks - 1);
  assert.equal(s.base[idx(7, 7)], 2, "bridge creates walkable ground");
  assert.equal(placeBlock(s, s.blue, { x: 10, y: 0 }), "invalid", "floating disconnected blocks forbidden");
  killFighter(s, s.blue, null, "void");
  tick(s, 4);
  assert.equal(s.blue.alive, true, "living bed allows respawn");
  destroyBed(s, bedOf(s, "blue"), s.orange);
  killFighter(s, s.blue, s.orange, "sword");
  checkWinner(s);
  assert.equal(s.over?.winner, "orange", "death without bed ends match");
}
{
  for (const category of Object.keys(ABILITIES) as KitCategory[]) {
    ABILITIES[category].forEach((_ability, index) => {
      const s = createGame({ blueKit: loadout(category, index), orangeKit: loadout(), difficulty: "standard" });
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
  assert.ok(s.orange.blocksPlaced > 0, "bot builds bridges");
  assert.ok(s.orange.sword > 0, "bot collects and buys equipment");
  assert.ok(s.orange.x < 30 || s.blue.deaths > 0 || !bedOf(s, "blue").alive, "bot advances toward the player");
  assert.ok(Number.isFinite(s.orange.x) && Number.isFinite(s.orange.hp));
}
assert.equal(rewardFor(true, 19), 0);
assert.equal(rewardFor(true, 20), 15);
assert.equal(rewardFor(false, 20), 5);
console.log("Minigame engine checks passed: resources, purchases, bridges, respawn, final elimination, all abilities, bot progression, rewards.");
