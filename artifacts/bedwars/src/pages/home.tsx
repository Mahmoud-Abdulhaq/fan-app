import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, Flame, Trophy, Crown } from "lucide-react";
import { useGetDashboard, type Kit } from "@workspace/api-client-react";
import { useKits, usePageMeta, usePrefs, CATEGORY_STYLE, type Category } from "@/lib/bw";
import { CategoryBadge, ErrorState, KitCard, KitGridSkeleton, RatingReadout, SnapshotNote, TierBadge } from "@/components/bw";
import { TriviaCard } from "@/components/trivia";
import { cn } from "@/lib/utils";

export function FeaturedKit({ kit }: { kit: Kit }) {
  const s = CATEGORY_STYLE[kit.category as Category];
  return (
    <Link href={`/kits/${kit.id}`} data-testid="card-featured-kit"
      className="hud-corner group block overflow-hidden rounded-lg border border-primary/40 bg-gradient-to-br from-card to-background p-6 transition-all hover:border-primary">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Featured kit of the day</p>
      <div className="mt-3 flex items-center gap-4">
        <TierBadge tier={kit.tier} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-3xl font-bold sm:text-4xl">{kit.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2"><CategoryBadge category={kit.category} /><RatingReadout kit={kit} /></div>
        </div>
      </div>
      <p className="mt-4 text-foreground/90">{kit.ability}</p>
      <p className={cn("mt-2 text-sm", s?.text)}>{kit.strategy}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">Open breakdown <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
    </Link>
  );
}

export function KitList({ title, icon, ids, map, empty }: { title: string; icon: ReactNode; ids: string[]; map: Map<string, Kit>; empty: string }) {
  const kits = ids.map((id) => map.get(id)).filter(Boolean) as Kit[];
  return (
    <section className="rounded-lg border border-card-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">{icon}{title}</h2>
      {kits.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{empty}</p> : (
        <ol className="mt-3 divide-y divide-border">
          {kits.slice(0, 5).map((k, i) => (
            <li key={k.id}>
              <Link href={`/kits/${k.id}`} data-testid={`link-list-kit-${k.id}`} className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary">
                <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <TierBadge tier={k.tier} />
                <span className="min-w-0 flex-1 truncate font-semibold">{k.name}</span>
                <RatingReadout kit={k} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function Home() {
  usePageMeta("Kit picks before the next match", "Pick the right Roblox BedWars kit fast: tiers, counters, comparisons and a daily trivia question.");
  const dash = useGetDashboard();
  const { kits, map, isLoading, isError, refetch } = useKits();
  const { mode } = usePrefs();
  const featured = dash.data ? map.get(dash.data.featuredId) : undefined;
  const sTier = kits.filter((k) => k.tier === "S");

  return (
    <div>
      <section className="rise grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Queueing {mode}</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.02] sm:text-6xl">
            Lock in the right kit<br /><span className="text-primary">before the bed drops.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            30 kits. Clear tiers. Instant counters for the enemy draft. No spreadsheets.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/counter" data-testid="link-cta-counter" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">
              Counter the enemy draft <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/kits" data-testid="link-cta-kits" className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 font-bold hover:border-primary/60">
              Browse kits
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_STYLE) as Category[]).map((c) => (
              <Link key={c} href={`/kits?cat=${c}`} data-testid={`link-cat-${c}`}><CategoryBadge category={c} className="transition-transform hover:-translate-y-0.5" /></Link>
            ))}
          </div>
        </div>
        <div>
          {dash.isLoading || isLoading ? <div className="h-72 animate-pulse rounded-lg border border-card-border bg-card/60" />
            : dash.isError ? <ErrorState onRetry={() => dash.refetch()} what="the dashboard" />
            : featured ? <FeaturedKit kit={featured} /> : null}
        </div>
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <KitList title="Trending" icon={<Flame className="h-5 w-5 text-orange-400" />} ids={dash.data?.trending ?? []} map={map} empty="Trending fills in as players rate kits." />
        <KitList title="Top rated" icon={<Trophy className="h-5 w-5 text-yellow-300" />} ids={dash.data?.topRated ?? []} map={map} empty="No ratings yet. Be the first to rate a kit." />
        <TriviaCard />
      </div>
      {dash.data && (
        <p className="mt-3 font-mono text-xs text-muted-foreground" data-testid="text-total-ratings">
          {dash.data.totalRatings} player rating{dash.data.totalRatings === 1 ? "" : "s"} recorded in this app.
        </p>
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-bold"><Crown className="h-6 w-6 text-primary" /> S-tier this snapshot</h2>
          <Link href="/kits" className="text-sm font-semibold text-primary hover:underline" data-testid="link-all-kits">All 30 kits</Link>
        </div>
        {isLoading ? <KitGridSkeleton n={4} /> : isError ? <ErrorState onRetry={() => refetch()} what="kits" /> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sTier.map((k, i) => <KitCard key={k.id} kit={k} index={i} />)}
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-card-border bg-card p-5">
          <h2 className="text-xl font-bold">Ranked 5v5 draft template</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[["Economy engine", "Bounty Hunter or Milo"], ["Primary carry", "Grim Reaper, Hannah or Aery"], ["Flex disrupter", "Void Regent or Jade"], ["Support buffer", "Baker or Whisper"], ["Ranged / defense", "Archer or Trapper"]].map(([r, k]) => (
              <li key={r} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"><span className="w-36 shrink-0 font-mono text-xs uppercase text-primary">{r}</span><span>{k}</span></li>
            ))}
          </ul>
          <Link href="/guide" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline" data-testid="link-guide">Read the full guide</Link>
        </div>
        <div className="rounded-lg border border-dashed border-border p-5">
          <h2 className="text-lg font-bold">Your corner</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to favorite kits, rate them, keep notes and track your trivia streak.</p>
          <div className="mt-3 flex gap-3">
            <Link href="/sign-up" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground" data-testid="link-home-signup">Create account</Link>
            <Link href="/sign-in" className="rounded-md border border-border px-4 py-2 text-sm font-bold" data-testid="link-home-signin">Sign in</Link>
          </div>
        </div>
      </section>

      <SnapshotNote className="mt-10" />
    </div>
  );
}
