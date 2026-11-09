import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeftRight } from "lucide-react";
import type { Kit } from "@workspace/api-client-react";
import { useKits, usePageMeta, tierIndex } from "@/lib/bw";
import { CategoryBadge, ErrorState, PageHeader, RatingReadout, SnapshotNote, TierBadge } from "@/components/bw";
import { cn } from "@/lib/utils";

function Picker({ value, onChange, kits, label, testid }: { value: string; onChange: (v: string) => void; kits: Kit[]; label: string; testid: string }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}
        className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 font-semibold focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">Choose a kit</option>
        {[...kits].sort((a, b) => a.name.localeCompare(b.name)).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
      </select>
    </label>
  );
}

function Side({ kit, other, map }: { kit: Kit; other: Kit; map: Map<string, Kit> }) {
  const better = tierIndex(kit.tier) < tierIndex(other.tier);
  const countersOther = kit.counters.includes(other.id);
  const counteredByOther = other.counters.includes(kit.id);
  return (
    <div className="rise min-w-0 rounded-lg border border-card-border bg-card p-5" data-testid={`compare-side-${kit.id}`}>
      <div className="flex items-center gap-3">
        <TierBadge tier={kit.tier} size="lg" />
        <div className="min-w-0"><Link href={`/kits/${kit.id}`} className="block truncate text-2xl font-bold hover:text-primary">{kit.name}</Link><CategoryBadge category={kit.category} className="mt-1" /></div>
      </div>
      {better && <p className="mt-3 inline-block rounded-sm bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">Higher tier</p>}
      {countersOther && <p className="mt-3 inline-block rounded-sm bg-green-500/15 px-2 py-0.5 text-xs font-bold text-green-300">Recommended counter to {other.name}</p>}
      {counteredByOther && <p className="mt-3 ml-2 inline-block rounded-sm bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-300">Countered by {other.name}</p>}
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="font-mono text-xs uppercase text-primary">Ability</dt><dd>{kit.ability}</dd></div>
        <div><dt className="font-mono text-xs uppercase text-primary">Strategy</dt><dd className="text-foreground/85">{kit.strategy}</dd></div>
        <div><dt className="font-mono text-xs uppercase text-primary">Category rank</dt><dd>#{kit.rank} in {kit.category}</dd></div>
        <div><dt className="font-mono text-xs uppercase text-primary">Player rating</dt><dd><RatingReadout kit={kit} /></dd></div>
        <div><dt className="font-mono text-xs uppercase text-primary">Recommended counter picks</dt>
          <dd className="mt-1 flex flex-wrap gap-1">{kit.counters.map((c) => <span key={c} className={cn("rounded px-2 py-0.5 text-xs font-semibold", c === other.id ? "bg-green-500/20 text-green-200" : "bg-muted")}>{map.get(c)?.name ?? c}</span>)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function Compare() {
  usePageMeta("Compare kits", "Put two BedWars kits side by side: tier, ability, counters and player rating.");
  const { kits, map, isLoading, isError, refetch } = useKits();
  const params = new URLSearchParams(window.location.search);
  const [a, setA] = useState(params.get("a") ?? "");
  const [b, setB] = useState(params.get("b") ?? "");
  const same = !!a && a === b;
  const ka = map.get(a), kb = map.get(b);

  return (
    <div>
      <PageHeader eyebrow="Head to head" title="Compare two kits">Choose two different kits. Counter matchups and category ranks are shown separately so the comparison stays clear.</PageHeader>
      {isLoading ? <div className="h-24 animate-pulse rounded-lg bg-card/60" /> : isError ? <ErrorState onRetry={() => refetch()} what="kits" /> : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Picker value={a} onChange={(value) => { setA(value); if (value && value === b) setB(""); }} kits={kits} label="Kit one" testid="select-compare-a" />
            <button type="button" onClick={() => { setA(b); setB(a); }} aria-label="Swap" data-testid="button-swap"
              className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-md border border-border transition-transform hover:rotate-180 sm:self-end"><ArrowLeftRight className="h-4 w-4" /></button>
            <Picker value={b} onChange={(value) => { setB(value); if (value && value === a) setA(""); }} kits={kits} label="Kit two" testid="select-compare-b" />
          </div>
          {same && <p role="alert" className="shake mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" data-testid="text-compare-error">You picked the same kit twice. Choose two different kits to compare.</p>}
          {!same && ka && kb ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2"><Side kit={ka} other={kb} map={map} /><Side kit={kb} other={ka} map={map} /></div>
          ) : !same && (
            <div className="mt-6 rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground" data-testid="status-compare-empty">Choose two kits to see them side by side.</div>
          )}
        </>
      )}
      <SnapshotNote className="mt-8" />
    </div>
  );
}
