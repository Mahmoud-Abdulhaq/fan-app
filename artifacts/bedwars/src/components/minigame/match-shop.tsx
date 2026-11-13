import { Axe, Box, Sword, X } from "lucide-react";
import type { GameState, ShopItemId, Cost } from "@/game/types";
import { SHOP_ITEMS, buyStatus, effectiveCost } from "@/game/engine";
import { cn } from "@/lib/utils";

const ICON = { Blocks: Box, Swords: Sword, Axes: Axe } as const;

export function costLabel(c: Cost) {
  return [c.iron && `${c.iron} iron`, c.diamond && `${c.diamond} diamond`, c.emerald && `${c.emerald} emerald`].filter(Boolean).join(" + ");
}

export function MatchShop({ game, onBuy, onClose }: { game: GameState; onBuy: (id: ShopItemId) => void; onClose: () => void }) {
  const f = game.blue;
  const away = !f.alive || buyStatus(game, f, "wool8") === "away";
  return (
    <div className="mg-paper absolute inset-x-2 top-2 z-20 max-h-[calc(100%-1rem)] overflow-auto rounded-lg p-3 sm:inset-x-auto sm:right-2 sm:w-[340px]" data-testid="panel-match-shop">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-sm font-bold uppercase tracking-widest">Item shop</p>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[#B22222]/10" data-testid="button-close-shop" aria-label="Close shop"><X className="h-4 w-4" /></button>
      </div>
      {away && <p className="mb-2 rounded border border-dashed border-[#B22222]/50 px-2 py-1.5 text-xs font-semibold" data-testid="text-shop-away">Walk back onto your home island to buy.</p>}
      <div className="space-y-1.5">
        {SHOP_ITEMS.map((item, i) => {
          const st = buyStatus(game, f, item.id);
          const Icon = ICON[item.group];
          return (
            <button key={item.id} type="button" disabled={st !== "ok"} onClick={() => onBuy(item.id)} data-testid={`button-buy-${item.id}`}
              className={cn("flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-transform",
                st === "ok" ? "border-[#B22222]/50 bg-[#fbf4ef] hover:-translate-y-px hover:border-[#B22222]" : "border-[#B22222]/15 opacity-60")}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-[#B22222]/10"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2"><span className="text-sm font-bold">{item.label}</span><span className="font-mono text-[10px]">{st === "owned" ? "OWNED" : costLabel(effectiveCost(game, f, item))}</span></span>
                <span className="block text-[11px] leading-tight">{item.desc}</span>
              </span>
              <kbd className="hidden rounded border border-[#B22222]/30 px-1 font-mono text-[10px] sm:block">{i + 1}</kbd>
            </button>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider">Keys 1-8 buy while open. B closes.</p>
    </div>
  );
}
