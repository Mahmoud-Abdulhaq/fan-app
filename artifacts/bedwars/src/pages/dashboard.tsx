import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { Flame, Trophy, Heart, Star, NotebookPen, ListOrdered, Shield, GitCompare } from "lucide-react";
import { getListRankingsQueryKey, useGetDashboard, useListRankings, type Kit } from "@workspace/api-client-react";
import { useKits, usePageMeta } from "@/lib/bw";
import { ErrorState, KitCard, SnapshotNote } from "@/components/bw";
import { TriviaCard } from "@/components/trivia";
import { FeaturedKit, KitList } from "@/pages/home";
import { useProfile } from "@/hooks/use-personal";

export default function Dashboard() {
  usePageMeta("Your dashboard", "Your favorites, ratings, notes, tier lists and trivia streak.");
  const { user } = useUser();
  const dash = useGetDashboard();
  const { map } = useKits();
  const { profile, isLoading, isError, refetch, isSignedIn } = useProfile();
  const rankings = useListRankings({ query: { enabled: isSignedIn, queryKey: getListRankingsQueryKey() } });
  const featured = dash.data ? map.get(dash.data.featuredId) : undefined;
  const favKits = (profile?.favorites ?? []).map((id) => map.get(id)).filter(Boolean) as Kit[];
  const triviaRight = profile?.triviaScores.filter((s) => s.correct).length ?? 0;

  const stats = [
    { label: "Favorites", value: profile?.favorites.length ?? 0, icon: Heart },
    { label: "Ratings", value: profile?.ratings.length ?? 0, icon: Star },
    { label: "Notes", value: profile?.notes.length ?? 0, icon: NotebookPen },
    { label: "Tier lists", value: rankings.data?.length ?? 0, icon: ListOrdered },
  ];

  return (
    <div>
      <header className="rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Pre-match brief</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Ready up, {user?.firstName || user?.username || "player"}.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/counter" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" data-testid="link-quick-counter"><Shield className="h-4 w-4" />Counter</Link>
          <Link href="/compare" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-bold" data-testid="link-quick-compare"><GitCompare className="h-4 w-4" />Compare</Link>
          <Link href="/rankings" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-bold" data-testid="link-quick-rankings"><ListOrdered className="h-4 w-4" />Tier lists</Link>
        </div>
      </header>

      {isError ? <ErrorState onRetry={() => refetch()} what="your profile" /> : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5" data-testid="card-user-stats">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-card-border bg-card p-4">
              <s.icon className="h-4 w-4 text-primary" />
              <p className="mt-2 font-display text-3xl font-bold" data-testid={`stat-${s.label.toLowerCase().replace(" ", "-")}`}>{isLoading ? "-" : s.value}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-lg border border-card-border bg-card p-4 md:col-span-1">
            <p className="font-display text-3xl font-bold" data-testid="stat-trivia">{triviaRight}<span className="text-lg text-muted-foreground">/{profile?.triviaScores.length ?? 0}</span></p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Trivia correct</p>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {featured ? <FeaturedKit kit={featured} /> : <div className="h-64 animate-pulse rounded-lg bg-card/60" />}
        <TriviaCard />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Heart className="h-5 w-5 text-pink-400" /> Your favorites</h2>
        {favKits.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No favorites yet. Tap the heart on any kit in the <Link href="/kits" className="font-semibold text-primary">explorer</Link> to pin it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{favKits.map((k, i) => <KitCard key={k.id} kit={k} index={i} />)}</div>
        )}
      </section>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <KitList title="Trending" icon={<Flame className="h-5 w-5 text-orange-400" />} ids={dash.data?.trending ?? []} map={map} empty="Trending fills in as players rate kits." />
        <KitList title="Top rated" icon={<Trophy className="h-5 w-5 text-yellow-300" />} ids={dash.data?.topRated ?? []} map={map} empty="No ratings yet." />
      </div>

      <section className="mt-8 rounded-lg border border-card-border bg-card p-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Recent tier lists</h2><Link href="/rankings" className="text-sm font-semibold text-primary" data-testid="link-manage-rankings">Manage</Link></div>
        {(rankings.data ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">You have not built a tier list yet.</p> : (
          <ul className="mt-2 divide-y divide-border">
            {rankings.data!.slice(0, 4).map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-2 text-sm"><span className="truncate font-semibold">{r.name}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">{r.items.length} kits</span></li>
            ))}
          </ul>
        )}
      </section>
      <SnapshotNote className="mt-8" />
    </div>
  );
}
