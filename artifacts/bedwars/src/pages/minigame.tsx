import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Lock, ShoppingBag, Swords, Trophy } from "lucide-react";
import {
  getGetGameProfileQueryKey, useEquipGameSkin, useFinishGameMatch, useGetGameProfile, useOpenSkinCrate, useStartGameMatch, useUnlockGameKit,
  type EquipSkinInputSlot, type GameProfile, type Kit, type SkinCrateInputCrate,
} from "@workspace/api-client-react";
import { useKits, usePageMeta } from "@/lib/bw";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/bw";
import { buildLoadouts, isOwned, NO_KIT_LOADOUT, unlockPrice, type KitLoadout } from "@/game/abilities";
import { useMinigameSettings } from "@/game/settings";
import type { GameMode } from "@/game/types";
import { rankForRp } from "@/game/ranked";
import type { ArenaMapId } from "@/game/maps";
import type { CosmeticCrate, CosmeticSlot } from "@/game/cosmetics";
import { MIN_REWARD_SECONDS } from "@/game/core";
import { GameView, type MatchOutcome } from "@/components/minigame/game-view";
import { KitPicker, KitShopPanel, PlayPanel, RankedPanel } from "@/components/minigame/lobby-panels";
import { CosmeticsShopPanel } from "@/components/minigame/cosmetics-shop";
import { ResultScreen, type SettleState } from "@/components/minigame/result-screen";
import { cn } from "@/lib/utils";

export default function MinigamePage() {
  usePageMeta("Arena", "Play casual or ranked 1v1 BedWars against a bot, earn rank points, and unlock kits and skins.");
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded) {
    return (
      <div className="space-y-4" data-testid="status-arena-loading">
        <div className="h-10 w-64 animate-pulse rounded bg-[#171719]/30" />
        <div className="h-72 animate-pulse rounded-lg bg-[#171719]/30" />
      </div>
    );
  }
  if (!isSignedIn || !user) return <SignedOut />;
  return <Arena key={user.id} userId={user.id} />;
}

function SignedOut() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="mg-paper mg-ticket rise rounded-xl p-8 text-center" data-testid="card-arena-signed-out">
        <Lock className="mx-auto h-8 w-8" />
        <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-wider">The Arena is members only</h1>
        <p className="mt-2 text-sm">Coins, wins, ranked points and kit unlocks are saved to your account, so you need to sign in before the gate opens.</p>
        <Link href="/sign-in" className="mg-cta mt-6 inline-flex items-center gap-2 rounded-lg border-2 border-[#B22222] bg-[#202023] px-6 py-3 font-display text-lg font-bold uppercase tracking-widest" data-testid="link-arena-sign-in">
          <Swords className="h-5 w-5" />Sign in to play
        </Link>
      </div>
    </div>
  );
}

type Phase = "lobby" | "playing" | "result";
type Tab = "pit" | "ranked" | "shop";
interface MatchInfo { id: string; mode: GameMode; kit: KitLoadout; bot: KitLoadout; mapId: ArenaMapId; n: number }

function errMessage(e: unknown) {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "Network or server error.";
}

function Arena({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { settings, update } = useMinigameSettings(userId);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [tab, setTab] = useState<Tab>("pit");
  const kitsQ = useKits();
  const loadouts = useMemo(() => buildLoadouts(kitsQ.kits), [kitsQ.kits]);
  const profileQ = useGetGameProfile({ query: { queryKey: getGetGameProfileQueryKey(), refetchInterval: phase === "lobby" ? 20_000 : false } });
  const unlock = useUnlockGameKit();
  const start = useStartGameMatch();
  const finish = useFinishGameMatch();
  const openCrate = useOpenSkinCrate();
  const equipSkin = useEquipGameSkin();
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);
  const [settle, setSettle] = useState<SettleState>({ status: "short" });
  const [pendingUnlock, setPendingUnlock] = useState<string | null>(null);
  const [openingCrate, setOpeningCrate] = useState<CosmeticCrate | null>(null);
  const [equippingSlot, setEquippingSlot] = useState<CosmeticSlot | null>(null);
  const [latestAward, setLatestAward] = useState<string | null>(null);
  const [lastOpenedCrate, setLastOpenedCrate] = useState<CosmeticCrate | null>(null);
  const matchCount = useRef(0);

  const profile = profileQ.data;
  const unlocked = profile?.unlocked ?? [];
  const setProfile = (p: GameProfile) => qc.setQueryData(getGetGameProfileQueryKey(), p);
  const handleOpenCrate = async (crate: CosmeticCrate) => {
    if (openCrate.isPending || equipSkin.isPending) return;
    setLatestAward(null);
    setLastOpenedCrate(crate);
    setOpeningCrate(crate);
    try {
      const result = await openCrate.mutateAsync({ data: { crate: crate as SkinCrateInputCrate } });
      setProfile(result.profile);
      setLatestAward(result.skinId);
      toast({ title: "Crate opened", description: "The new skin is in your collection." });
    } catch (e) {
      toast({ title: "Could not open crate", description: errMessage(e), variant: "destructive" });
    } finally {
      setOpeningCrate(null);
    }
  };
  const handleEquipSkin = async (slot: CosmeticSlot, skinId: string | null) => {
    if (openCrate.isPending || equipSkin.isPending) return;
    setEquippingSlot(slot);
    try {
      const updated = await equipSkin.mutateAsync({ data: { slot: slot as EquipSkinInputSlot, skinId } });
      setProfile(updated);
      toast({ title: skinId ? "Loadout updated" : "Slot cleared", description: "Your Arena cosmetics were saved." });
    } catch (e) {
      toast({ title: "Could not update loadout", description: errMessage(e), variant: "destructive" });
    } finally {
      setEquippingSlot(null);
    }
  };

  const ownedKits = kitsQ.kits.filter((k) => isOwned(k, unlocked));
  const selectedId = settings.kitId && ownedKits.some((k) => k.id === settings.kitId) ? settings.kitId : ownedKits[0]?.id ?? null;
  const selected = selectedId ? loadouts.get(selectedId) ?? null : null;
  const selectedKit = selectedId ? kitsQ.map.get(selectedId) : undefined;

  const pickBot = (playerKit: string): KitLoadout | null => {
    const pool = kitsQ.kits.filter((k) => k.id !== playerKit);
    const list = pool.length ? pool : kitsQ.kits;
    const k = list[Math.floor(Math.random() * list.length)];
    return k ? loadouts.get(k.id) ?? null : null;
  };

  const startMatch = (mode: GameMode) => {
    if ((mode === "pit" && !selected) || start.isPending) return;
    const kit = mode === "ranked" ? NO_KIT_LOADOUT : selected!;
    start.mutate({ data: { mode, ...(mode === "pit" ? { kitId: kit.kitId } : {}) } }, {
      onSuccess: (ticket) => {
        const bot = mode === "ranked" ? NO_KIT_LOADOUT : pickBot(kit.kitId) ?? kit;
        matchCount.current += 1;
        setMatch({ id: ticket.matchId, mode, kit, bot, mapId: mode === "ranked" ? "classic" : settings.mapId, n: matchCount.current });
        setOutcome(null);
        setSettle({ status: "short" });
        setPhase("playing");
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: (e) => toast({ title: "Match did not start", description: errMessage(e), variant: "destructive" }),
    });
  };

  const submit = (m: MatchInfo, o: MatchOutcome) => {
    setSettle({ status: "saving" });
    const before = qc.getQueryData<GameProfile>(getGetGameProfileQueryKey());
    finish.mutate({ data: { matchId: m.id, won: o.won } }, {
      onSuccess: (p) => {
        setProfile(p);
        setSettle({
          status: "saved",
          gained: before ? Math.max(0, p.coins - before.coins) : o.won ? 15 : 5,
          coins: p.coins,
          rpDelta: m.mode === "ranked" ? p.rankedRp - (before?.rankedRp ?? p.rankedRp) : undefined,
          rankedRp: p.rankedRp,
        });
      },
      onError: (e) => setSettle({ status: "error", message: errMessage(e) }),
    });
  };

  const onFinish = (o: MatchOutcome) => {
    setOutcome(o);
    setPhase("result");
    if (match && (match.mode === "ranked" || o.elapsed >= MIN_REWARD_SECONDS)) submit(match, o);
    else setSettle({ status: "short" });
  };

  const doUnlock = (k: Kit) => {
    setPendingUnlock(k.id);
    unlock.mutate({ data: { kitId: k.id } }, {
      onSuccess: (p) => {
        setProfile(p);
        update({ kitId: k.id });
        toast({ title: `${k.name} unlocked`, description: "Equipped and ready for your next match." });
      },
      onError: (e) => toast({ title: "Unlock failed", description: errMessage(e), variant: "destructive" }),
      onSettled: () => setPendingUnlock(null),
    });
  };

  if (phase === "playing" && match) {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em]">{match.mode === "ranked" ? "Ranked match" : `Match ${match.n} / ${match.mapId}`}</p>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wider">Blue vs Orange</h1>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider">Ticket {match.id.slice(0, 8)}</p>
        </div>
        <GameView key={match.id} playerKit={match.kit} botKit={match.bot} mapId={match.mapId} mode={match.mode}
          equippedSkins={profile?.equippedSkins ?? { sword: null, axe: null, block: null, kit: null }}
          settings={settings} onFinish={onFinish} />
      </div>
    );
  }

  if (phase === "result" && match && outcome) {
    const leave = () => { setPhase("lobby"); setMatch(null); setOutcome(null); profileQ.refetch(); };
    return (
      <ResultScreen outcome={outcome} kit={match.kit} mode={match.mode} settle={settle}
        onRetry={() => submit(match, outcome)}
        onDiscard={() => setSettle({ status: "discarded" })}
        onRematch={leave} rematchPending={false}
        onLobby={leave} />
    );
  }

  const winRate = profile && profile.games > 0 ? ((profile.wins / profile.games) * 100).toFixed(1) : "0.0";
  const TABS: { id: Tab; label: string; icon: typeof Swords }[] = [
    { id: "pit", label: "The Pit", icon: Swords }, { id: "ranked", label: "Ranked", icon: Trophy }, { id: "shop", label: "Shop", icon: ShoppingBag },
  ];
  const rankedRp = profile?.rankedRp ?? 0;
  const rankedInfo = rankForRp(rankedRp);

  return (
    <div>
      <header className="rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em]">BedWars practice / blue vs orange</p>
          <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none tracking-wide sm:text-5xl">Arena</h1>
          <p className="mt-2 max-w-xl text-sm">Play a casual match in The Pit or build your rank in a kit-free ranked match.</p>
        </div>
        {profileQ.isError ? (
          <ErrorState onRetry={() => profileQ.refetch()} what="your arena profile" />
        ) : (
          <div className="mg-paper mg-ticket flex divide-x divide-[#B22222]/25 rounded-lg" data-testid="card-arena-profile">
            {[
              { label: "Coins", value: profile?.coins, icon: Coins, id: "coins" },
              { label: "Wins", value: profile?.wins, icon: Trophy, id: "wins" },
              { label: "Games", value: profile?.games, icon: Swords, id: "games" },
            ].map((s) => (
              <div key={s.id} className="px-4 py-2.5 text-center">
                <s.icon className="mx-auto h-4 w-4" />
                <p className="font-display text-2xl font-bold tabular-nums" data-testid={`stat-arena-${s.id}`}>{profileQ.isLoading ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-[#B22222]/15" /> : s.value ?? 0}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
            <div className="px-4 py-2.5 text-center" data-testid="card-ranked-rank">
              <p className="font-mono text-[9px] uppercase tracking-widest">Rank</p>
              <p className="font-display text-xl font-bold uppercase">{rankedInfo.name}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest">{rankedRp} RP</p>
            </div>
            <div className="hidden px-4 py-2.5 text-center sm:block">
              <p className="mt-4 font-display text-2xl font-bold tabular-nums">{winRate}%</p>
              <p className="font-mono text-[9px] uppercase tracking-widest">Win rate</p>
            </div>
          </div>
        )}
      </header>

      <nav className="mb-5 flex gap-1 border-b border-[#B22222]/30" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} data-testid={`tab-arena-${t.id}`}
            className={cn("relative -mb-px flex items-center gap-1.5 rounded-t-md border border-b-0 px-4 py-2 text-sm font-bold transition-colors",
              tab === t.id ? "mg-paper border-[#B22222]/50 bg-[#2c2c2f]" : "border-transparent hover:bg-[#B22222]/10")}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </nav>

      <div key={tab} className="rise">
        {tab === "ranked" && <RankedPanel rankedRp={rankedRp} onPlay={() => startMatch("ranked")} starting={start.isPending} startError={start.isError} />}
        {tab === "pit" && (
          kitsQ.isError ? <ErrorState onRetry={() => kitsQ.refetch()} what="the kit list" /> : kitsQ.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]"><div className="h-80 animate-pulse rounded-lg bg-[#171719]/30" /><div className="h-80 animate-pulse rounded-lg bg-[#171719]/30" /></div>
          ) : (
            <PlayPanel loadout={selected} kit={selectedKit} mapId={settings.mapId} onMapChange={(mapId) => update({ mapId })}
              onPlay={() => startMatch("pit")} starting={start.isPending} startError={start.isError}>
              <KitPicker kits={kitsQ.kits} loadouts={loadouts} unlocked={unlocked} selected={selectedId} onSelect={(id) => update({ kitId: id })} onShop={() => setTab("shop")} />
            </PlayPanel>
          )
        )}
        {tab === "shop" && (
          kitsQ.isError ? <ErrorState onRetry={() => kitsQ.refetch()} what="the kit list" /> : kitsQ.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-lg bg-[#171719]/30" /><div className="h-80 animate-pulse rounded-lg bg-[#171719]/30" /></div>
          ) : (
            <div className="space-y-6">
              {profileQ.isError ? <ErrorState onRetry={() => profileQ.refetch()} what="your shop inventory" />
                : profile ? <CosmeticsShopPanel kits={kitsQ.kits} profile={profile} openingCrate={openingCrate}
                  equippingSlot={equippingSlot} latestAward={latestAward} lastOpenedCrate={lastOpenedCrate}
                  onOpenCrate={handleOpenCrate} onEquip={handleEquipSkin} />
                : <div className="mg-paper h-72 animate-pulse rounded-lg" />}
              <KitShopPanel kits={kitsQ.kits} loadouts={loadouts} unlocked={unlocked} coins={profile?.coins ?? 0} pendingId={pendingUnlock} onUnlock={doUnlock} />
            </div>
          )
        )}
      </div>

      <p className="mt-8 border-t border-[#B22222]/25 pt-4 text-xs">
        Minigame kits are simplified interpretations: each kit gets its category passive plus one arena ability. They are not exact Roblox BedWars mechanics. Unlock prices: D free, C {unlockPrice("C")}, B {unlockPrice("B")}, A {unlockPrice("A")}, S {unlockPrice("S")} coins.
      </p>
    </div>
  );
}
