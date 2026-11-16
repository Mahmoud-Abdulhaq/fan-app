import type { CosmeticCrate, CosmeticSlot } from "@/game/cosmetics";
import type { GameProfile, Kit } from "@workspace/api-client-react";
import { Check, Coins, PackageOpen, Sparkles, X } from "lucide-react";
import {
  CRATES,
  getCosmeticSkin,
  getCratePool,
  type CosmeticSkin,
} from "@/game/cosmetics";

type CosmeticsShopPanelProps = {
  kits: Kit[];
  profile: GameProfile;
  openingCrate: CosmeticCrate | null;
  equippingSlot: CosmeticSlot | null;
  latestAward: string | null;
  lastOpenedCrate: CosmeticCrate | null;
  onOpenCrate: (crate: CosmeticCrate) => void;
  onEquip: (slot: CosmeticSlot, skinId: string | null) => void;
};

const slotLabels = {
  sword: "Sword",
  axe: "Axe",
  block: "Block",
  kit: "Kit",
} as const;

function SkinMark({ skin }: { skin: CosmeticSkin }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-[#6f2929] bg-[#090909]"
      style={{ boxShadow: `inset 0 -5px ${skin.color}` }}
    >
      <span
        className="h-4 w-4 rotate-45 border border-[#1a1111]"
        style={{ backgroundColor: skin.accent }}
      />
    </span>
  );
}

export function CosmeticsShopPanel({ kits, profile, openingCrate, equippingSlot, latestAward, lastOpenedCrate, onOpenCrate, onEquip }: CosmeticsShopPanelProps) {
  const ownedSkins = profile.ownedSkins
    .map((id) => ({ id, skin: getCosmeticSkin(id, kits) }))
    .sort((a, b) => (a.skin?.name ?? a.id).localeCompare(b.skin?.name ?? b.id));
  const isBusy = openingCrate !== null || equippingSlot !== null;

  const awardedSkin = latestAward
    ? getCosmeticSkin(latestAward, kits)
    : undefined;

  return (
    <section
      aria-labelledby="cosmetics-shop-title"
      className="mg-paper relative mx-auto w-full max-w-6xl overflow-hidden rounded-lg bg-[#080707] text-[#B22222]"
      data-testid="panel-cosmetics-shop"
    >
      <header className="border-b border-[#542020] bg-[#0d0909] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8f2828]">
              Arena loadout / cosmetics
            </p>
            <h2
              id="cosmetics-shop-title"
              className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-[#B22222] sm:text-3xl"
            >
              The gear locker
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[#8f2929]">
              Pick a crate, find a look, and take it into your next round.
            </p>
          </div>
          <div
            className="flex w-fit items-center gap-3 border border-[#642525] bg-[#090707] px-4 py-2.5"
            data-testid="status-coin-balance"
            aria-label={`${profile.coins} coins available`}
          >
            <Coins className="h-5 w-5 text-[#B22222]" aria-hidden="true" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8f2929]">Balance</p>
              <p className="font-display text-xl font-bold leading-none text-[#B22222]">
                {profile.coins} <span className="text-xs font-semibold">COINS</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8f2929]">Four drops</p>
              <h3 className="font-display text-lg font-bold uppercase text-[#B22222]">Crates</h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#8f2929]">10 coins each</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CRATES.map((crate, index) => {
              const pool = getCratePool(crate.id, kits);
              const isOpening = openingCrate === crate.id;
              const cannotAfford = profile.coins < 10;
              const hasPool = pool.length > 0;
              const allOwned =
                hasPool &&
                pool.every((skin) => profile.ownedSkins.includes(skin.id));
              return (
                <article
                  key={crate.id}
                  className="relative flex min-h-[178px] flex-col border border-[#4b1d1d] bg-[#0d0a0a] p-4 transition-colors hover:border-[#7e2a2a]"
                  data-testid={`card-crate-${crate.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#7f2525]">
                        Drop {String(index + 1).padStart(2, "0")}
                      </p>
                      <h4 className="mt-1 font-display text-base font-bold uppercase text-[#B22222]">{crate.name}</h4>
                    </div>
                    <span className="border border-[#4d2020] bg-[#171111] px-2 py-1 font-mono text-[10px] text-[#B22222]">
                      10 C
                    </span>
                  </div>
                  <p className="mt-2 min-h-10 text-xs leading-relaxed text-[#8f2929]">{crate.description}</p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-[#702222]">
                    {pool.length} possible {pool.length === 1 ? "look" : "looks"} · {slotLabels[crate.slot]} slot
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenCrate(crate.id)}
                    disabled={isBusy || cannotAfford || !hasPool || allOwned}
                    className="mg-cta mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 border border-[#7e2a2a] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#B22222] disabled:cursor-not-allowed disabled:opacity-40"
                    data-testid={`button-open-crate-${crate.id}`}
                    aria-label={allOwned ? `All ${crate.name} looks owned` : `Open ${crate.name} for 10 coins`}
                  >
                    <PackageOpen className="h-4 w-4" aria-hidden="true" />
                    {isOpening ? "Opening…" : allOwned ? "All owned" : !hasPool ? "No looks available" : cannotAfford ? "Need more coins" : "Open crate"}
                  </button>
                </article>
              );
            })}
          </div>
          {openingCrate && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8f2929]" role="status" data-testid="status-crate-opening">
              Crate opening in progress…
            </p>
          )}
        </div>

        <div className="space-y-5">
          <section aria-labelledby="collection-title">
            <div className="flex items-end justify-between border-b border-[#4b1d1d] pb-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8f2929]">Owned gear</p>
                <h3 id="collection-title" className="font-display text-lg font-bold uppercase text-[#B22222]">
                  Collection
                </h3>
              </div>
              <span className="font-mono text-[10px] text-[#8f2929]" data-testid="text-owned-count">
                {ownedSkins.length} ITEMS
              </span>
            </div>

            {ownedSkins.length === 0 ? (
              <div className="mt-3 border border-dashed border-[#512020] bg-[#0c0909] px-4 py-5 text-center" data-testid="empty-owned-skins">
                <PackageOpen className="mx-auto h-5 w-5 text-[#762323]" aria-hidden="true" />
                <p className="mt-2 font-display text-sm font-bold uppercase text-[#B22222]">Locker is empty</p>
                <p className="mt-1 text-xs text-[#8f2929]">Open a crate to find your first look.</p>
              </div>
            ) : (
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {ownedSkins.map(({ id, skin }) => {
                  const slot = skin?.slot;
                  const equipped = slot ? profile.equippedSkins[slot] === id : false;
                  return (
                    <li
                      key={id}
                      className={`flex items-center gap-3 border p-2.5 ${equipped ? "border-[#6b2525] bg-[#282525]" : "border-[#3e1a1a] bg-[#0b0808]"}`}
                      data-testid={`item-owned-skin-${id}`}
                    >
                      {skin ? <SkinMark skin={skin} /> : <span className="h-11 w-11 shrink-0 border border-[#542020] bg-[#171111]" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-bold text-[#B22222]" data-testid={`text-skin-name-${id}`}>
                          {skin?.name ?? id}
                        </p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8f2929]">
                          {slot ? slotLabels[slot] : "Unknown slot"}{equipped ? " · equipped" : ""}
                        </p>
                      </div>
                      {skin && (
                        <button
                          type="button"
                          onClick={() => onEquip(skin.slot, id)}
                          disabled={isBusy || equipped}
                          className={`min-h-8 border px-2.5 font-mono text-[9px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-45 ${equipped ? "border-[#595454] bg-[#303030] text-[#B22222]" : "border-[#702626] bg-[#171010] text-[#B22222] hover:bg-[#241616]"}`}
                          data-testid={`button-equip-skin-${id}`}
                          aria-label={equipped ? `${skin.name} is equipped` : `Equip ${skin.name}`}
                        >
                          {equipped ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Equipped</span> : "Equip"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="loadout-title">
            <div className="flex items-end justify-between border-b border-[#4b1d1d] pb-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8f2929]">Before the next round</p>
                <h3 id="loadout-title" className="font-display text-lg font-bold uppercase text-[#B22222]">Equipped</h3>
              </div>
              <Sparkles className="mb-1 h-4 w-4 text-[#8f2929]" aria-hidden="true" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.keys(slotLabels) as (keyof typeof slotLabels)[]).map((slot) => {
                const skinId = profile.equippedSkins[slot];
                const skin = skinId ? getCosmeticSkin(skinId, kits) : undefined;
                return (
                  <div
                    key={slot}
                    className={`min-h-[92px] border p-3 ${skinId ? "border-[#682424] bg-[#282525]" : "border-[#3e1a1a] bg-[#0b0808]"}`}
                    data-testid={`status-equipped-${slot}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8f2929]">{slotLabels[slot]}</p>
                      {skinId && (
                        <button
                          type="button"
                          onClick={() => onEquip(slot, null)}
                          disabled={isBusy}
                          className="inline-flex h-6 w-6 items-center justify-center border border-[#542020] bg-[#100c0c] text-[#B22222] hover:bg-[#241616] disabled:cursor-not-allowed disabled:opacity-45"
                          data-testid={`button-clear-equipped-${slot}`}
                          aria-label={`Clear equipped ${slotLabels[slot].toLowerCase()} skin`}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 truncate font-display text-sm font-bold text-[#B22222]" data-testid={`text-equipped-skin-${slot}`}>
                      {skin?.name ?? (skinId ? skinId : "Default gear")}
                    </p>
                    {!skinId && <p className="mt-1 font-mono text-[9px] uppercase text-[#762323]">No skin selected</p>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {latestAward && (
        <div
          role="status"
          aria-live="polite"
          className="mg-pop border-t border-[#6f2929] bg-[#171010] px-4 py-3 sm:px-6"
          data-testid="status-crate-result"
        >
          <div className="flex items-center gap-3">
            {awardedSkin ? <SkinMark skin={awardedSkin} /> : <Sparkles className="h-5 w-5 text-[#B22222]" aria-hidden="true" />}
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8f2929]">
                {CRATES.find((crate) => crate.id === lastOpenedCrate)?.name ?? "Crate"} / reward
              </p>
              <p className="truncate font-display text-base font-bold uppercase text-[#B22222]" data-testid="text-crate-award">
                {awardedSkin?.name ?? latestAward}
              </p>
            </div>
            <span className="ml-auto shrink-0 border border-[#6f2929] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#B22222]">
              Added to locker
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default CosmeticsShopPanel;
