import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, GitCompare, Pencil, Trash2, Swords, ShieldAlert } from "lucide-react";
import { useCreateNote, useDeleteNote, useUpdateNote, type Kit } from "@workspace/api-client-react";
import { useKits, usePageMeta } from "@/lib/bw";
import { CategoryBadge, ErrorState, FavoriteButton, KitCard, RatingReadout, SignInPrompt, SnapshotNote, StarRater, TierBadge } from "@/components/bw";
import { useInvalidate, useProfile } from "@/hooks/use-personal";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function Notes({ kitId }: { kitId: string }) {
  const { profile, isSignedIn } = useProfile();
  const invalidate = useInvalidate();
  const { toast } = useToast();
  const create = useCreateNote();
  const update = useUpdateNote();
  const del = useDeleteNote();
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  if (!isSignedIn) return <SignInPrompt action="keep private notes on this kit" />;
  const notes = profile?.notes.filter((n) => n.kitId === kitId) ?? [];
  const done = (msg: string) => () => { invalidate(["profile"]); toast({ title: msg }); };
  const fail = () => toast({ title: "Something went wrong", variant: "destructive" });

  const add = () => {
    const t = text.trim();
    if (!t) return;
    create.mutate({ data: { kitId, text: t } }, { onSuccess: () => { setText(""); done("Note saved")(); }, onError: fail });
  };

  return (
    <div>
      <div className="space-y-2">
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={3} placeholder="Matchup reminders, combos, what beat you last game..." data-testid="input-note"
          className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">{text.length}/2000</span>
          <button type="button" onClick={add} disabled={!text.trim() || create.isPending} data-testid="button-add-note"
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{create.isPending ? "Saving..." : "Add note"}</button>
        </div>
      </div>
      {notes.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No notes on this kit yet.</p> : (
        <ul className="mt-4 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rise rounded-md border border-border bg-background/60 p-3" data-testid={`note-${n.id}`}>
              {editId === n.id ? (
                <div className="space-y-2">
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value.slice(0, 2000))} rows={3} data-testid="input-edit-note"
                    className="w-full rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditId(null)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold" data-testid="button-cancel-edit">Cancel</button>
                    <button type="button" disabled={!editText.trim() || update.isPending} data-testid="button-save-note"
                      onClick={() => update.mutate({ id: n.id, data: { kitId, text: editText.trim() } }, { onSuccess: () => { setEditId(null); done("Note updated")(); }, onError: fail })}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm">{n.text}</p>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => { setEditId(n.id); setEditText(n.text); }} aria-label="Edit note" data-testid={`button-edit-note-${n.id}`} className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setConfirmId(n.id)} aria-label="Delete note" data-testid={`button-delete-note-${n.id}`} className="p-1.5 text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this note?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-note">Keep it</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-delete-note" className="bg-destructive text-destructive-foreground"
              onClick={() => confirmId && del.mutate({ id: confirmId }, { onSuccess: done("Note deleted"), onError: fail })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function KitDetail() {
  const { id } = useParams<{ id: string }>();
  const { kits, map, isLoading, isError, refetch } = useKits();
  const kit = map.get(id ?? "");
  usePageMeta(kit ? `${kit.name} kit` : "Kit detail", kit ? `${kit.name}: ${kit.tier}-tier ${kit.category}. ${kit.strategy}` : "BedWars kit breakdown.");

  if (isLoading) return <div className="space-y-4"><div className="h-48 animate-pulse rounded-lg bg-card/60" /><div className="h-64 animate-pulse rounded-lg bg-card/60" /></div>;
  if (isError) return <ErrorState onRetry={() => refetch()} what="this kit" />;
  if (!kit) return (
    <div className="py-16 text-center"><h1 className="text-3xl font-bold">Kit not found</h1><Link href="/kits" className="mt-4 inline-block font-semibold text-primary">Back to explorer</Link></div>
  );

  const counters = kit.counters.map((c) => map.get(c)).filter(Boolean) as Kit[];
  const countersOf = kits.filter((k) => k.counters.includes(kit.id));
  const sameCat = kits.filter((k) => k.category === kit.category && k.id !== kit.id).sort((a, b) => a.rank - b.rank);

  return (
    <div>
      <Link href="/kits" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="h-4 w-4" />All kits</Link>
      <section className="rise hud-corner rounded-lg border border-card-border bg-card p-6">
        <div className="flex flex-wrap items-start gap-5">
          <TierBadge tier={kit.tier} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-bold sm:text-5xl" data-testid="text-kit-name">{kit.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <CategoryBadge category={kit.category} />
              <span className="font-mono text-xs text-muted-foreground">#{kit.rank} of 5 in {kit.category}</span>
              <RatingReadout kit={kit} />
            </div>
          </div>
          <div className="flex gap-2">
            <FavoriteButton kitId={kit.id} />
            <Link href={`/compare?a=${kit.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold hover:border-primary/60" data-testid="link-compare-kit"><GitCompare className="h-4 w-4" />Compare</Link>
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div><h2 className="font-mono text-xs uppercase tracking-widest text-primary">Ability</h2><p className="mt-1 text-lg" data-testid="text-ability">{kit.ability}</p></div>
          <div><h2 className="font-mono text-xs uppercase tracking-widest text-primary">Strategy</h2><p className="mt-1 text-lg text-foreground/90" data-testid="text-strategy">{kit.strategy}</p></div>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Source: {kit.source}</p>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-lg border border-card-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Swords className="h-5 w-5 text-green-400" />Counter relationships</h2>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Picks that beat {kit.name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {counters.length ? counters.map((c) => (
              <Link key={c.id} href={`/kits/${c.id}`} data-testid={`link-counter-${c.id}`} className="inline-flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-2.5 py-1.5 text-sm font-semibold text-green-200 hover:border-green-400">
                <TierBadge tier={c.tier} />{c.name}
              </Link>
            )) : <span className="text-sm text-muted-foreground">No listed counters.</span>}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{kit.name} counters</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {countersOf.length ? countersOf.map((c) => (
              <Link key={c.id} href={`/kits/${c.id}`} data-testid={`link-countered-${c.id}`} className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-sm font-semibold text-red-200 hover:border-red-400">
                <ShieldAlert className="h-4 w-4" />{c.name}
              </Link>
            )) : <span className="text-sm text-muted-foreground">Not listed as a counter for any kit.</span>}
          </div>
        </section>
        <section className="rounded-lg border border-card-border bg-card p-5">
          <h2 className="text-lg font-bold">Your rating</h2>
          <div className="mt-3"><StarRater kitId={kit.id} /></div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-card-border bg-card p-5">
        <h2 className="mb-3 text-lg font-bold">Personal notes</h2>
        <Notes kitId={kit.id} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Related kits</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...sameCat.slice(0, 2), ...counters.filter((c) => c.category !== kit.category).slice(0, 2)].map((k, i) => <KitCard key={k.id} kit={k} index={i} />)}
        </div>
      </section>
      <SnapshotNote className="mt-8" />
    </div>
  );
}
