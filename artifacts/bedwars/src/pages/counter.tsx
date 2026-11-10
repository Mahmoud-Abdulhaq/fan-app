import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Search, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { useGetCounters, type Counter } from "@workspace/api-client-react";
import { useKits, usePageMeta, CATEGORIES, CATEGORY_STYLE, type Category } from "@/lib/bw";
import { CategoryBadge, ErrorState, KitName, PageHeader, SnapshotNote, TierBadge } from "@/components/bw";
import { cn } from "@/lib/utils";

const MAX = 4;

export default function CounterPage() {
  usePageMeta("Team Counter", "Pick up to 4 enemy BedWars kits and get counter recommendations with threat tags and strategy tips.");
  const { kits, map, isLoading, isError, refetch } = useKits();
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [reject, setReject] = useState(0);
  const [results, setResults] = useState<Counter[]>([]);
  const counters = useGetCounters();
  const mutateRef = useRef(counters.mutate);
  mutateRef.current = counters.mutate;
  const key = selected.join(",");

  useEffect(() => {
    if (!key) { setResults([]); return; }
    mutateRef.current({ data: { enemyIds: key.split(",") } }, { onSuccess: (r) => setResults(r) });
  }, [key]);

  const toggle = (id: string) => {
    if (selected.includes(id)) return setSelected((s) => s.filter((x) => x !== id));
    if (selected.length >= MAX) { setReject((n) => n + 1); return; }
    setSelected((s) => [...s, id]);
  };

  const pool = kits.filter((k) => !q || k.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader eyebrow="Team Counter" title="Read their draft. Answer it.">Tap up to four enemy kits. Recommendations update instantly.</PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold">Enemy kits</h2>
            <span key={reject} className={cn("font-mono text-sm", reject > 0 && selected.length >= MAX && "shake text-red-300")} data-testid="text-selection-count">{selected.length}/{MAX} selected</span>
          </div>
          <div className="mb-3 flex min-h-11 flex-wrap gap-2 rounded-lg border border-border bg-card/60 p-2">
            {selected.length === 0 ? <span className="px-1 py-1.5 text-sm text-muted-foreground">No enemies picked</span> : selected.map((id) => (
              <button key={id} type="button" onClick={() => toggle(id)} data-testid={`button-remove-enemy-${id}`}
                className="rise inline-flex items-center gap-1 rounded-md border border-red-500/50 bg-red-500/10 px-2 py-1 text-sm font-semibold text-red-200">
                {map.get(id) ? <KitName kit={map.get(id)!} /> : id}<X className="h-3.5 w-3.5" />
              </button>
            ))}
            {selected.length > 0 && <button type="button" onClick={() => setSelected([])} className="ml-auto text-xs font-semibold text-primary" data-testid="button-clear-enemies">Clear</button>}
          </div>
          {reject > 0 && selected.length >= MAX && (
            <p role="alert" className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" data-testid="text-limit-error">
              Limit reached: you can select at most 4 enemy kits. Remove one to add another.
            </p>
          )}
          <label className="relative mb-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a kit" data-testid="input-enemy-search"
              className="h-10 w-full rounded-md border border-input bg-card pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </label>
          {isLoading ? <div className="h-96 animate-pulse rounded-lg bg-card/60" /> : isError ? <ErrorState onRetry={() => refetch()} what="kits" /> : (
            <div className="space-y-4">
              {CATEGORIES.map((c) => {
                const group = pool.filter((k) => k.category === c);
                if (!group.length) return null;
                return (
                  <div key={c}>
                    <p className={cn("mb-1.5 text-xs font-bold uppercase tracking-widest", CATEGORY_STYLE[c as Category].text)}>{c}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {group.map((k) => {
                        const on = selected.includes(k.id);
                        return (
                          <button key={k.id} type="button" onClick={() => toggle(k.id)} aria-pressed={on} data-testid={`button-enemy-${k.id}`}
                            className={cn("flex min-w-0 items-center gap-2 rounded-md border px-2 py-2 text-left text-sm font-semibold transition-all active:scale-95",
                              on ? "border-red-500/70 bg-red-500/15 text-red-100" : "border-border bg-card hover:border-primary/50")}>
                            <TierBadge tier={k.tier} /><KitName kit={k} className="truncate" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-3 font-bold">Recommendations</h2>
          {selected.length === 0 ? (
            <div className="hud-corner grid min-h-64 place-items-center rounded-lg border border-dashed border-border p-8 text-center" data-testid="status-counter-empty">
              <div>
                <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-semibold">Select enemy kits to view counter recommendations</p>
              </div>
            </div>
          ) : counters.isError ? (
            <ErrorState onRetry={() => mutateRef.current({ data: { enemyIds: selected } }, { onSuccess: setResults })} what="counters" />
          ) : counters.isPending && results.length === 0 ? (
            <div className="space-y-3">{selected.map((s) => <div key={s} className="h-36 animate-pulse rounded-lg bg-card/60" />)}</div>
          ) : (
            <div className={cn("space-y-3 transition-opacity", counters.isPending && "opacity-60")}>
              {results.map((r) => {
                const enemy = map.get(r.enemyId);
                return (
                  <article key={r.enemyId} className="rise rounded-lg border border-card-border bg-card p-4" data-testid={`card-counter-${r.enemyId}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">vs</span>
                      <h3 className="text-lg font-bold">{enemy ? <KitName kit={enemy} /> : r.enemyId}</h3>
                      {enemy && <CategoryBadge category={enemy.category} />}
                      {r.highThreat && <span className="inline-flex items-center gap-1 rounded-sm bg-red-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white" data-testid={`tag-high-threat-${r.enemyId}`}><AlertTriangle className="h-3 w-3" />High Threat</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.counterIds.map((cid, i) => {
                        const ck = map.get(cid);
                        return (
                          <Link key={cid} href={`/kits/${cid}`} data-testid={`link-rec-${r.enemyId}-${cid}`}
                            className="inline-flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-2 py-1.5 text-sm font-semibold hover:border-green-400">
                            {ck && <TierBadge tier={ck.tier} />}{ck ? <KitName kit={ck} /> : cid}
                            {i === 0 && <span className="rounded-sm bg-green-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-950">Strong Counter</span>}
                          </Link>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-sm text-foreground/85">{r.tip}</p>
                  </article>
                );
              })}
            </div>
          )}
          <SnapshotNote className="mt-4" />
        </section>
      </div>
    </div>
  );
}
