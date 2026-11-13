import { AlertTriangle, ArrowLeft, Check, Coins, RotateCcw, Swords, Trash2 } from "lucide-react";
import type { MatchOutcome } from "./game-view";
import type { KitLoadout } from "@/game/abilities";
import { MIN_REWARD_SECONDS, rewardFor } from "@/game/core";
import { cn } from "@/lib/utils";

export type SettleState =
  | { status: "saving" }
  | { status: "saved"; gained: number; coins: number }
  | { status: "error"; message: string }
  | { status: "short" }
  | { status: "discarded" };

export function ResultScreen({ outcome, kit, settle, onRetry, onDiscard, onRematch, onLobby, rematchPending }: {
  outcome: MatchOutcome; kit: KitLoadout; settle: SettleState; onRetry: () => void; onDiscard: () => void; onRematch: () => void; onLobby: () => void; rematchPending: boolean;
}) {
  const blocked = settle.status === "saving" || settle.status === "error";
  const stats = [
    ["Time", `${Math.floor(outcome.elapsed / 60)}:${String(Math.floor(outcome.elapsed % 60)).padStart(2, "0")}`],
    ["Kills", outcome.kills], ["Deaths", outcome.deaths], ["Beds broken", outcome.bedsBroken], ["Blocks placed", outcome.blocksPlaced],
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mg-paper mg-ticket rise relative overflow-hidden rounded-xl p-6 text-center sm:p-8" data-testid="card-match-result">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em]">{outcome.forfeited ? "Forfeit" : "Final"} / {kit.kitName}</p>
        <h1 className={cn("mg-stamp-in mt-2 font-display text-6xl font-bold uppercase tracking-widest sm:text-7xl")} data-testid="text-result">{outcome.won ? "Victory" : "Defeat"}</h1>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-md border border-[#B22222]/25 bg-[#fbf4ef] p-2">
              <p className="font-display text-2xl font-bold">{v}</p>
              <p className="font-mono text-[9px] uppercase tracking-wider">{k}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border-2 border-dashed border-[#B22222]/50 p-4" data-testid="status-reward">
          {settle.status === "saving" && <p className="flex items-center justify-center gap-2 font-semibold"><RotateCcw className="h-4 w-4 animate-spin" />Saving {rewardFor(outcome.won, outcome.elapsed)} coins to your profile</p>}
          {settle.status === "saved" && (
            <div className="mg-pop">
              <p className="flex items-center justify-center gap-2 font-display text-3xl font-bold"><Coins className="h-7 w-7" />+{settle.gained}</p>
              <p className="flex items-center justify-center gap-1 text-sm"><Check className="h-4 w-4" />Saved. Balance {settle.coins} coins.</p>
            </div>
          )}
          {settle.status === "short" && <p className="text-sm font-semibold">Matches under {MIN_REWARD_SECONDS} seconds do not pay out. Nothing was recorded.</p>}
          {settle.status === "discarded" && <p className="text-sm font-semibold">Reward discarded. This match was not saved.</p>}
          {settle.status === "error" && (
            <div>
              <p className="flex items-center justify-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Reward did not save. {settle.message}</p>
              <p className="mt-1 text-xs">Retrying is safe: each match pays out once.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={onRetry} className="flex items-center gap-1.5 rounded-md border-2 border-[#B22222] bg-[#f7dccf] px-4 py-2 text-sm font-bold" data-testid="button-retry-reward"><RotateCcw className="h-4 w-4" />Retry save</button>
                <button type="button" onClick={onDiscard} className="flex items-center gap-1.5 rounded-md border border-[#B22222]/40 px-4 py-2 text-sm font-bold" data-testid="button-discard-reward"><Trash2 className="h-4 w-4" />Discard reward</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={onRematch} disabled={blocked || rematchPending} data-testid="button-rematch"
            className="mg-cta flex items-center justify-center gap-2 rounded-lg border-2 border-[#B22222] bg-[#f7dccf] px-6 py-3 font-display text-lg font-bold uppercase tracking-widest disabled:opacity-50">
            {rematchPending ? <RotateCcw className="h-5 w-5 animate-spin" /> : <Swords className="h-5 w-5" />}Rematch
          </button>
          <button type="button" onClick={onLobby} disabled={blocked} data-testid="button-back-lobby"
            className="flex items-center justify-center gap-2 rounded-lg border border-[#B22222]/50 px-6 py-3 font-bold disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" />Lobby
          </button>
        </div>
        {blocked && <p className="mt-2 text-xs">{settle.status === "saving" ? "Hold on while your reward saves." : "Retry or discard the reward before moving on."}</p>}
      </div>
    </div>
  );
}
