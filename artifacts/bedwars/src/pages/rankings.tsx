import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Pencil, X, ListOrdered } from "lucide-react";
import { getListRankingsQueryKey, useCreateRanking, useDeleteRanking, useListRankings, useUpdateRanking, type Ranking, type RankingItem } from "@workspace/api-client-react";
import { useKits, usePageMeta, TIERS, TIER_STYLE, type Tier } from "@/lib/bw";
import { ErrorState, PageHeader, SignInPrompt } from "@/components/bw";
import { useInvalidate, useProfile } from "@/hooks/use-personal";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Draft = { id?: string; name: string; items: RankingItem[] };

function Editor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { kits, map } = useKits();
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const create = useCreateRanking();
  const update = useUpdateRanking();
  const [name, setName] = useState(draft.name);
  const [items, setItems] = useState<RankingItem[]>(draft.items);
  const [addKit, setAddKit] = useState("");
  const [addTier, setAddTier] = useState<Tier>("A");
  const [err, setErr] = useState("");
  const pending = create.isPending || update.isPending;
  const available = kits.filter((k) => !items.some((i) => i.kitId === k.id)).sort((a, b) => a.name.localeCompare(b.name));

  const move = (idx: number, dir: -1 | 1) => setItems((arr) => {
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return arr;
    const c = [...arr]; [c[idx], c[j]] = [c[j], c[idx]]; return c;
  });

  const save = () => {
    const n = name.trim();
    if (!n) return setErr("Give your tier list a name.");
    if (n.length > 80) return setErr("Name must be 80 characters or fewer.");
    setErr("");
    const ordered = TIERS.flatMap((t) => items.filter((i) => i.tier === t));
    const opts = {
      onSuccess: () => { invalidate(["rankings"]); toast({ title: draft.id ? "Tier list updated" : "Tier list created" }); onClose(); },
      onError: () => setErr("Save failed. Check your connection and try again."),
    };
    if (draft.id) update.mutate({ id: draft.id, data: { name: n, items: ordered } }, opts);
    else create.mutate({ data: { name: n, items: ordered } }, opts);
  };

  return (
    <section className="rise hud-corner rounded-lg border border-primary/40 bg-card p-5" data-testid="form-ranking">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{draft.id ? "Edit tier list" : "New tier list"}</h2>
        <button type="button" onClick={onClose} aria-label="Close editor" className="p-1 text-muted-foreground hover:text-foreground" data-testid="button-close-editor"><X className="h-5 w-5" /></button>
      </div>
      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Solo queue picks" data-testid="input-ranking-name"
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select value={addKit} onChange={(e) => setAddKit(e.target.value)} data-testid="select-add-kit" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Add a kit...</option>
          {available.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select value={addTier} onChange={(e) => setAddTier(e.target.value as Tier)} data-testid="select-add-tier" className="h-10 rounded-md border border-input bg-background px-2 text-sm">
            {TIERS.map((t) => <option key={t} value={t}>Tier {t}</option>)}
          </select>
          <button type="button" disabled={!addKit || items.length >= 30} data-testid="button-add-item"
            onClick={() => { setItems((a) => [...a, { kitId: addKit, tier: addTier }]); setAddKit(""); }}
            className="inline-flex h-10 items-center gap-1 rounded-md border border-border px-3 text-sm font-semibold disabled:opacity-50"><Plus className="h-4 w-4" />Add</button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {TIERS.map((t) => {
          const rows = items.map((it, idx) => ({ it, idx })).filter((r) => r.it.tier === t);
          return (
            <div key={t} className="flex gap-2">
              <span className={cn("grid w-10 shrink-0 place-items-center rounded-md font-display text-xl font-bold", TIER_STYLE[t])}>{t}</span>
              <div className="min-h-12 min-w-0 flex-1 space-y-1 rounded-md border border-border bg-background/50 p-1.5">
                {rows.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">Empty</p>}
                {rows.map(({ it, idx }) => {
                  const k = map.get(it.kitId);
                  return (
                    <div key={it.kitId} className="flex items-center gap-1 rounded bg-card px-2 py-1 text-sm" data-testid={`row-item-${it.kitId}`}>
                      <span className="min-w-0 flex-1 truncate font-semibold">{k?.name ?? it.kitId}</span>
                      <select value={it.tier} aria-label="Change tier" data-testid={`select-tier-${it.kitId}`}
                        onChange={(e) => setItems((a) => a.map((x, i) => (i === idx ? { ...x, tier: e.target.value as Tier } : x)))}
                        className="h-7 rounded border border-input bg-background px-1 text-xs">
                        {TIERS.map((tt) => <option key={tt} value={tt}>{tt}</option>)}
                      </select>
                      <button type="button" onClick={() => move(idx, -1)} aria-label="Move up" data-testid={`button-up-${it.kitId}`} className="p-1 text-muted-foreground hover:text-foreground"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => move(idx, 1)} aria-label="Move down" data-testid={`button-down-${it.kitId}`} className="p-1 text-muted-foreground hover:text-foreground"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setItems((a) => a.filter((_, i) => i !== idx))} aria-label="Remove" data-testid={`button-remove-${it.kitId}`} className="p-1 text-muted-foreground hover:text-red-400"><X className="h-4 w-4" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {err && <p role="alert" className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-200" data-testid="text-ranking-error">{err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-semibold" data-testid="button-cancel-ranking">Cancel</button>
        <button type="button" onClick={save} disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid="button-save-ranking">{pending ? "Saving..." : "Save tier list"}</button>
      </div>
    </section>
  );
}

function RankingCard({ r, onEdit, onDelete }: { r: Ranking; onEdit: () => void; onDelete: () => void }) {
  const { map } = useKits();
  return (
    <article className="rise rounded-lg border border-card-border bg-card p-4" data-testid={`card-ranking-${r.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold" data-testid={`text-ranking-name-${r.id}`}>{r.name}</h3>
          <p className="font-mono text-xs text-muted-foreground">{r.items.length} kits · updated {new Date(r.updatedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} aria-label="Edit" data-testid={`button-edit-ranking-${r.id}`} className="rounded-md border border-border p-2 hover:border-primary/60"><Pencil className="h-4 w-4" /></button>
          <button type="button" onClick={onDelete} aria-label="Delete" data-testid={`button-delete-ranking-${r.id}`} className="rounded-md border border-border p-2 hover:border-red-500/60 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {TIERS.map((t) => {
          const row = r.items.filter((i) => i.tier === t);
          if (!row.length) return null;
          return (
            <div key={t} className="flex gap-2">
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded font-display text-sm font-bold", TIER_STYLE[t])}>{t}</span>
              <div className="flex min-w-0 flex-wrap gap-1">
                {row.map((i) => <span key={i.kitId} className="rounded bg-muted px-2 py-1 text-xs font-semibold">{map.get(i.kitId)?.name ?? i.kitId}</span>)}
              </div>
            </div>
          );
        })}
        {r.items.length === 0 && <p className="text-sm text-muted-foreground">No kits placed yet.</p>}
      </div>
    </article>
  );
}

export default function Rankings() {
  usePageMeta("My Rankings", "Build, rename, reorder and delete your personal BedWars kit tier lists.");
  const { isSignedIn } = useProfile();
  const list = useListRankings({ query: { enabled: isSignedIn, queryKey: getListRankingsQueryKey() } });
  const del = useDeleteRanking();
  const invalidate = useInvalidate();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<Ranking | null>(null);

  return (
    <div>
      <PageHeader eyebrow="My Rankings" title="Your tier lists, your call">The snapshot is a starting point. Disagree with it here.</PageHeader>
      {!isSignedIn ? <SignInPrompt action="create and save personal tier lists" /> : (
        <>
          {!draft && (
            <button type="button" onClick={() => setDraft({ name: "", items: [] })} data-testid="button-new-ranking"
              className="mb-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"><Plus className="h-4 w-4" />New tier list</button>
          )}
          {draft && <div className="mb-6"><Editor key={draft.id ?? "new"} draft={draft} onClose={() => setDraft(null)} /></div>}
          {list.isLoading ? <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-48 animate-pulse rounded-lg bg-card/60" />)}</div>
            : list.isError ? <ErrorState onRetry={() => list.refetch()} what="your tier lists" />
            : (list.data ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center" data-testid="status-rankings-empty">
                <ListOrdered className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-display text-xl font-bold">No tier lists yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Start one for solo queue, one for squads. Rank what actually works for you.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {list.data!.map((r) => <RankingCard key={r.id} r={r} onEdit={() => setDraft({ id: r.id, name: r.name, items: r.items })} onDelete={() => setToDelete(r)} />)}
              </div>
            )}
        </>
      )}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This tier list will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-ranking">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-delete-ranking" className="bg-destructive text-destructive-foreground"
              onClick={() => toDelete && del.mutate({ id: toDelete.id }, {
                onSuccess: () => { invalidate(["rankings"]); toast({ title: "Tier list deleted" }); if (draft?.id === toDelete.id) setDraft(null); },
                onError: () => toast({ title: "Delete failed", variant: "destructive" }),
              })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

