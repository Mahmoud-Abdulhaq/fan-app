import type { ReactNode } from "react";
import { usePageMeta, ATTRIBUTION, SNAPSHOT_LABEL } from "@/lib/bw";
import { PageHeader } from "@/components/bw";

const MECHANICS = [
  ["Core loop", "Protect your bed, gather resources, upgrade gear and base, destroy enemy beds, then eliminate every opponent. No bed means no respawn."],
  ["Bridging and clutching", "The highest-leverage mechanical skills. Clean bridging wins map control; clutch saves win matches."],
  ["Resource economy", "Iron and gold buy gear, diamonds fund team upgrades, emeralds fund top-tier equipment."],
  ["Upgrade priority", "Sharpened Swords, then Armor tier, then Heal Pool, then traps. Adjust per map and matchup."],
  ["Bed defense layering", "Outer wood or wool to break tool symmetry, a blast-resistant inner layer, and trap coverage. A clutch save beats a thick wall."],
  ["Bed-break timing", "Season 16 tightened the bed-trade window. Only trade beds when you can convert the respawn advantage."],
];
const DRAFT = [
  ["Economy engine", "Bounty Hunter or Milo"], ["Primary carry", "Grim Reaper, Hannah or Aery"], ["Flex disrupter", "Void Regent or Jade"],
  ["Support buffer", "Baker or Whisper, tethered to the carry"], ["Ranged / defense", "Archer or Trapper"],
];
const PATCHES = [
  ["Season 16 (May 2026)", "Bed-trade window tightened; mobility and support over raw damage."],
  ["Jul 31, 2026", "All kits temporarily free; kit shop countdown added."],
  ["Aug 14, 2026 \u201cLegacy!\u201d", "Jade and Bounty Hunter reworks (bounty leveling, Focus ability)."],
  ["Oct 2, 2026", "Trapper buffed (10 traps, kill grants a snap trap); Evelynn spirit orb buffed."],
  ["Oct 16, 2026 (Halloween)", "Marrow and Arachne boss reworks; free rotation of Grim Reaper, Raven, Crypt, Arachne."],
];
const PANEL = [
  ["Competitive Analyst", "Owns kit data, tiers and counter logic. No claim enters without a current-season source."],
  ["Full-Stack Developer", "Every requirement maps to a concrete route, model or component."],
  ["UI/UX Designer", "Mobile parity first. Nothing ships that breaks a 360px viewport."],
  ["Data Architect", "Favorites, ratings, rankings and notes survive refreshes and new sessions."],
  ["QA & Code Inspector", "Every view and CRUD action tested at three breakpoints."],
];
const RESOURCES = [
  ["Roblox BedWars game page", "https://www.roblox.com/games/6872265039"],
  ["BedWars Wiki (Fandom)", "https://robloxbedwars.fandom.com"],
  ["RBXBedWars creator-consensus tier list", "https://rbxbedwars.com"],
  ["Season 17 ranked 5v5 kit tier list", "https://bedwarsroblox.wiki"],
  ["Kit stats comparator", "https://bedwarsroblox.com"],
  ["Roblox Den BedWars kit rankings", "https://robloxden.com"],
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rise rounded-lg border border-card-border bg-card p-5"><h2 className="mb-3 text-xl font-bold">{title}</h2>{children}</section>;
}

export default function Guide() {
  usePageMeta("Guide", "BedWars mechanics, ranked draft template, kits to avoid, 2026 patches and resources.");
  return (
    <div>
      <PageHeader eyebrow="Field guide" title="What wins BedWars matches">Short, opinionated, and sourced from the supplied spec.</PageHeader>
      <div className="mb-6 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm" data-testid="text-guide-attribution">
        <p className="font-mono font-semibold text-primary">{SNAPSHOT_LABEL}</p><p className="mt-1 text-muted-foreground">{ATTRIBUTION}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Block title="Core mechanics">
          <dl className="space-y-3 text-sm">{MECHANICS.map(([t, d]) => <div key={t}><dt className="font-semibold text-primary">{t}</dt><dd className="text-foreground/85">{d}</dd></div>)}</dl>
        </Block>
        <div className="space-y-5">
          <Block title="Ranked 5v5 draft template">
            <ul className="space-y-2 text-sm">{DRAFT.map(([r, k]) => <li key={r} className="flex flex-col sm:flex-row sm:gap-3"><span className="w-36 shrink-0 font-mono text-xs uppercase text-primary">{r}</span>{k}</li>)}</ul>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Never forfeit economy. If Bounty Hunter is banned, lock Milo immediately.</li>
              <li>Scout for Baker. Reserve a Zeno slot or lose every extended trade.</li>
              <li>Whisper never roams alone. Tether only with a tanky carry.</li>
              <li>Ban enemy economy engines first.</li>
            </ul>
          </Block>
          <Block title="Kits to avoid in ranked">
            <ul className="space-y-1.5 text-sm">
              {[["Marcel", "slow brewing wastes early momentum"], ["Vulcan", "turrets fall to cheap fireballs and TNT"], ["Builder", "outclassed by direct break tools"], ["Elektra", "post-nerf, utility only"]].map(([k, w]) => <li key={k}><span className="font-semibold">{k}</span> <span className="text-muted-foreground">: {w}</span></li>)}
            </ul>
          </Block>
        </div>
        <Block title="2026 meta-changing patches">
          <ol className="relative space-y-4 border-l border-border pl-5 text-sm">
            {PATCHES.map(([d, t]) => <li key={d}><span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" /><p className="font-mono text-xs text-primary">{d}</p><p>{t}</p></li>)}
          </ol>
        </Block>
        <Block title="Game modes and resources">
          <p className="text-sm text-muted-foreground">Modes covered: Solos, Doubles, Squads, Ranked 5v5, Kit Fusion. Set yours in the header; it is remembered on this device.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded bg-slate-400/20 px-2 py-1">Iron</span><span className="rounded bg-yellow-400/20 px-2 py-1 text-yellow-200">Gold</span>
            <span className="rounded bg-cyan-400/20 px-2 py-1 text-cyan-200">Diamonds</span><span className="rounded bg-green-500/20 px-2 py-1 text-green-200">Emeralds</span>
          </div>
        </Block>
        <Block title="Panel of experts">
          <dl className="space-y-2 text-sm">{PANEL.map(([n, r]) => <div key={n}><dt className="font-semibold">{n}</dt><dd className="text-muted-foreground">{r}</dd></div>)}</dl>
        </Block>
        <Block title="Resources">
          <ul className="space-y-1.5 text-sm">
            {RESOURCES.map(([n, u]) => <li key={u}><a href={u} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline" data-testid={`link-resource-${n.split(" ")[0].toLowerCase()}`}>{n}</a></li>)}
            <li className="text-muted-foreground">Easy.gg official communications and in-game patch notes</li>
            <li className="text-muted-foreground">BedWars Discord ranked channels; YouTube tier-list creators</li>
          </ul>
        </Block>
      </div>
    </div>
  );
}
