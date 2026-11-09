import { useMemo, useState } from "react";
import { Search, X, Heart } from "lucide-react";
import { useKits, usePageMeta, CATEGORIES, CATEGORY_STYLE, tierIndex, type Category } from "@/lib/bw";
import { ErrorState, KitCard, KitGridSkeleton, PageHeader, SnapshotNote, FavoriteButton } from "@/components/bw";
import { useProfile } from "@/hooks/use-personal";
import { cn } from "@/lib/utils";

type Sort = "tier" | "name" | "rating";

export default function Kits() {
  usePageMeta("Kit Explorer", "Search and filter all 30 BedWars kits by name, ability, category, tier and player rating.");
  const { kits, isLoading, isError, refetch } = useKits();
  const { profile, isSignedIn } = useProfile();
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>(() => {
    const c = new URLSearchParams(window.location.search).get("cat");
    return c && (CATEGORIES as readonly string[]).includes(c) ? [c as Category] : [];
  });
  const [sort, setSort] = useState<Sort>("tier");
  const [favOnly, setFavOnly] = useState(false);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = kits.filter((k) =>
      (cats.length === 0 || cats.includes(k.category as Category)) &&
      (!term || k.name.toLowerCase().includes(term) || k.ability.toLowerCase().includes(term) || k.strategy.toLowerCase().includes(term)) &&
      (!favOnly || profile?.favorites.includes(k.id)));
    list = [...list].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name)
      : sort === "rating" ? b.averageRating - a.averageRating || b.ratingCount - a.ratingCount || a.name.localeCompare(b.name)
      : tierIndex(a.tier) - tierIndex(b.tier) || a.rank - b.rank);
    return list;
  }, [kits, q, cats, sort, favOnly, profile]);

  const toggleCat = (c: Category) => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <div>
      <PageHeader eyebrow="Kit Explorer" title="All 30 kits, sorted for the draft">Search by name or ability keyword. Stack categories to narrow the pool.</PageHeader>

      <div className="sticky top-[6.5rem] lg:top-14 z-30 -mx-4 mb-5 border-y border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search kits or abilities, e.g. teleport, anti-heal" data-testid="input-search"
              className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {q && <button type="button" onClick={() => setQ("")} data-testid="button-clear-search" aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </label>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} data-testid="select-sort" aria-label="Sort"
              className="h-10 rounded-md border border-input bg-card px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="tier">Sort: Tier</option>
              <option value="name">Sort: Name A-Z</option>
              <option value="rating">Sort: Player rating</option>
            </select>
            {isSignedIn && (
              <button type="button" onClick={() => setFavOnly((v) => !v)} data-testid="button-filter-favorites" aria-pressed={favOnly}
                className={cn("inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold", favOnly ? "border-pink-400/60 bg-pink-400/15 text-pink-300" : "border-border text-muted-foreground")}>
                <Heart className={cn("h-4 w-4", favOnly && "fill-pink-400")} /> Favorites
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = cats.includes(c);
            return (
              <button key={c} type="button" onClick={() => toggleCat(c)} aria-pressed={on} data-testid={`button-category-${c.toLowerCase()}`}
                className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95",
                  on ? CATEGORY_STYLE[c].chip : "border-border text-muted-foreground hover:text-foreground")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_STYLE[c].dot)} />{c}
              </button>
            );
          })}
          {cats.length > 0 && <button type="button" onClick={() => setCats([])} className="text-xs font-semibold text-primary hover:underline" data-testid="button-clear-categories">Clear filters</button>}
        </div>
      </div>

      <p className="mb-3 font-mono text-xs text-muted-foreground" data-testid="text-result-count">{shown.length} of {kits.length} kits</p>

      {isLoading ? <KitGridSkeleton n={12} /> : isError ? <ErrorState onRetry={() => refetch()} what="kits" /> : shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center" data-testid="status-empty">
          <p className="font-display text-xl font-bold">No kit matches that.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a broader keyword or clear the category filters.</p>
          <button type="button" onClick={() => { setQ(""); setCats([]); setFavOnly(false); }} className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-semibold" data-testid="button-reset">Reset everything</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((k, i) => <KitCard key={k.id} kit={k} index={i} action={isSignedIn ? <FavoriteButton kitId={k.id} compact /> : undefined} />)}
        </div>
      )}
      <SnapshotNote className="mt-10" />
    </div>
  );
}
