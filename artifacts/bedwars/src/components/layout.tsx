import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser, Show } from "@clerk/react";
import { LayoutGrid, Shield, ListOrdered, GitCompare, BookOpen, LogOut, Gauge } from "lucide-react";
import { MODES, TEAMS, usePrefs, SNAPSHOT_LABEL } from "@/lib/bw";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV = [
  { href: "/kits", label: "Kits", icon: LayoutGrid },
  { href: "/counter", label: "Counter", icon: Shield },
  { href: "/rankings", label: "Rankings", icon: ListOrdered },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/guide", label: "Guide", icon: BookOpen },
];

const TEAM_RING: Record<string, string> = {
  Blue: "ring-blue-500", Yellow: "ring-yellow-400", Orange: "ring-orange-500", Pink: "ring-pink-400",
};

function Selectors() {
  const { mode, setMode, team, setTeam } = usePrefs();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <select value={mode} onChange={(e) => setMode(e.target.value)} data-testid="select-mode" aria-label="Game mode"
        className="h-8 min-w-0 rounded-md border border-input bg-card px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring">
        {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Team color">
        {TEAMS.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={team === t.id} title={`${t.id} team`}
            onClick={() => setTeam(t.id)} data-testid={`button-team-${t.id.toLowerCase()}`}
            className={cn("h-5 w-5 rounded-sm transition-transform hover:scale-110", t.swatch,
              team === t.id && `ring-2 ring-offset-2 ring-offset-background scale-110 ${TEAM_RING[t.id]}`)} />
        ))}
      </div>
    </div>
  );
}

function UserChip() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const initials = (user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress?.[0] ?? "P").toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" data-testid="link-dashboard" title="My dashboard"
        className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display font-bold text-primary-foreground">{initials}</Link>
      <button type="button" onClick={() => signOut({ redirectUrl: basePath || "/" })} data-testid="button-logout" title="Log out"
        className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { team } = usePrefs();
  const active = (h: string) => loc === h || loc.startsWith(h + "/");
  return (
    <div className="min-h-[100dvh] pb-20 md:pb-0">
      <div className={cn("h-1", TEAMS.find((t) => t.id === team)?.swatch)} />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home">
            <img src={`${basePath}/logo.svg`} alt="" className="h-8 w-8" />
            <span className="font-display text-lg font-bold leading-none">BedWars<span className="text-primary">Intel</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} data-testid={`link-nav-${n.label.toLowerCase()}`}
                className={cn("relative rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  active(n.href) ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                {n.label}
                {active(n.href) && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 bg-primary" />}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden lg:block"><Selectors /></div>
            <Show when="signed-in"><UserChip /></Show>
            <Show when="signed-out">
              <Link href="/sign-in" data-testid="link-sign-in" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link href="/sign-up" data-testid="link-sign-up" className="hidden sm:inline-flex rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">Join</Link>
            </Show>
          </div>
        </div>
        <div className="lg:hidden border-t border-border/60 px-4 py-2 flex items-center justify-between gap-2">
          <Selectors />
          <Show when="signed-in">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Gauge className="h-4 w-4" />Dashboard</Link>
          </Show>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-muted-foreground">
        <div className="border-t border-border pt-5 flex flex-col gap-1 sm:flex-row sm:justify-between">
          <span>Unofficial fan companion. Not affiliated with Roblox or Easy.gg.</span>
          <span className="font-mono">{SNAPSHOT_LABEL}</span>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur grid grid-cols-5">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} data-testid={`link-tab-${n.label.toLowerCase()}`}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold",
              active(n.href) ? "text-primary" : "text-muted-foreground")}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

