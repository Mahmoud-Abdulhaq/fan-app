import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Heart, Lock, Star, RotateCw } from "lucide-react";
import type { Kit } from "@workspace/api-client-react";
import { CATEGORY_STYLE, TIER_STYLE, ATTRIBUTION, SNAPSHOT_LABEL, type Category, type Tier } from "@/lib/bw";
import { useFavorite, useProfile, useRate } from "@/hooks/use-personal";
import { cn } from "@/lib/utils";

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const s = CATEGORY_STYLE[category as Category];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider", s?.chip, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s?.dot)} />
      {category}
    </span>
  );
}

export function TierBadge({ tier, size = "sm" }: { tier: string; size?: "sm" | "lg" }) {
  return (
    <span
      data-testid={`tier-${tier}`}
      className={cn(
        "inline-grid place-items-center font-display font-bold rounded-md shrink-0",
        TIER_STYLE[tier as Tier],
        size === "lg" ? "h-14 w-14 text-3xl" : "h-7 w-7 text-sm",
      )}
    >
      {tier}
    </span>
  );
}

export function KitName({ kit, className }: { kit: Pick<Kit, "name" | "tier">; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span className="truncate">{kit.name}</span>
      {kit.tier === "S" && (
        <span role="img" aria-label="S-tier" title="S-tier" className="inline-flex shrink-0">
          <Star className="h-4 w-4 fill-current text-primary" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}

export function RatingReadout({ kit }: { kit: Kit }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
      {kit.ratingCount > 0 ? (
        <>
          {kit.averageRating.toFixed(1)} <span className="opacity-60">({kit.ratingCount})</span>
        </>
      ) : (
        <span className="opacity-70">no ratings yet</span>
      )}
    </span>
  );
}

export function SignInLink({ children = "Sign in", className }: { children?: ReactNode; className?: string }) {
  return (
    <Link href="/sign-in" data-testid="link-sign-in-prompt" className={cn("inline-flex items-center gap-1.5 font-semibold text-primary hover:underline", className)}>
      <Lock className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}

export function SignInPrompt({ action }: { action: string }) {
  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
      <p className="text-muted-foreground">Guests have read-only access. Sign in to {action}.</p>
      <div className="mt-2 flex gap-4">
        <SignInLink />
        <Link href="/sign-up" className="font-semibold text-foreground hover:underline" data-testid="link-sign-up-prompt">Create account</Link>
      </div>
    </div>
  );
}

export function FavoriteButton({ kitId, compact }: { kitId: string; compact?: boolean }) {
  const { isSignedIn } = useProfile();
  const { isFav, toggle, pending } = useFavorite(kitId);
  if (!isSignedIn) {
    return (
      <Link href="/sign-in" title="Sign in to save favorites" data-testid={`button-favorite-${kitId}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:text-foreground">
        <Heart className="h-4 w-4" />{!compact && "Sign in to save"}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      data-testid={`button-favorite-${kitId}`}
      aria-pressed={isFav}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-all active:scale-90",
        isFav ? "border-pink-400/60 bg-pink-400/15 text-pink-300" : "border-border text-muted-foreground hover:text-foreground hover:border-pink-400/50",
      )}
    >
      <Heart className={cn("h-4 w-4 transition-transform", isFav && "fill-pink-400 scale-110")} />
      {!compact && (isFav ? "Favorited" : "Favorite")}
    </button>
  );
}

export function StarRater({ kitId }: { kitId: string }) {
  const { isSignedIn } = useProfile();
  const { mine, rate, pending } = useRate(kitId);
  const [hover, setHover] = useState(0);
  if (!isSignedIn) return <SignInPrompt action="rate this kit" />;
  const shown = hover || mine;
  return (
    <div>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" disabled={pending} onMouseEnter={() => setHover(n)} onClick={() => rate(n)}
            data-testid={`button-rate-${n}`} aria-label={`Rate ${n}`}
            className="p-1 transition-transform hover:scale-125 active:scale-95">
            <Star className={cn("h-7 w-7 transition-colors", n <= shown ? "fill-primary text-primary" : "text-slate-600")} />
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground" data-testid="text-my-rating">
        {mine ? `Your rating: ${mine} of 5` : "You have not rated this kit."}
      </p>
    </div>
  );
}

export function KitCard({ kit, index = 0, action }: { kit: Kit; index?: number; action?: ReactNode }) {
  const s = CATEGORY_STYLE[kit.category as Category];
  return (
    <div className="rise group relative min-w-0" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
      <Link href={`/kits/${kit.id}`} data-testid={`card-kit-${kit.id}`}
        className="flex h-full flex-col overflow-hidden rounded-lg border border-card-border bg-card/90 p-4 pl-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
        <span className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r", s?.bar)} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold" data-testid={`text-kit-name-${kit.id}`}><KitName kit={kit} /></h3>
            <CategoryBadge category={kit.category} className="mt-1" />
          </div>
          <TierBadge tier={kit.tier} />
        </div>
        <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{kit.strategy}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <RatingReadout kit={kit} />
          <span className="font-mono text-[11px] text-muted-foreground">#{kit.rank} in {kit.category}</span>
        </div>
      </Link>
      {action && <div className="absolute right-3 top-12">{action}</div>}
    </div>
  );
}

export function KitGridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-lg border border-card-border bg-card/60" />
      ))}
    </div>
  );
}

export function ErrorState({ onRetry, what = "data" }: { onRetry: () => void; what?: string }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-sm" data-testid="status-error">
      <p className="font-semibold text-red-300">Could not load {what}.</p>
      <p className="mt-1 text-muted-foreground">The server may be warming up. Try again.</p>
      <button type="button" onClick={onRetry} data-testid="button-retry"
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-semibold hover:border-primary/60">
        <RotateCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="rise mb-6">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-muted-foreground">{children}</div>}
    </header>
  );
}

export function SnapshotNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)} data-testid="text-attribution">
      <span className="font-mono font-semibold text-primary/90">{SNAPSHOT_LABEL}.</span> {ATTRIBUTION}
    </p>
  );
}
