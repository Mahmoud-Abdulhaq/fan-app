# BedWars Master Spec: Competitive Guide + Kit Explorer & Team Counter App

> **Repo alignment note:** This repository's scaffold is a pnpm workspace (React 19 + Vite, Express 5 API, PostgreSQL + Drizzle ORM, Zod validation). Where the spec below mentions SQLite/Vercel/Supabase as example deployments, the implemented stack here is: **PostgreSQL + Drizzle for persistence, Express 5 + session auth for accounts and protected routes, React views for the 5 domain views, deployed via Replit**. All MVP requirements in Part C map 1:1 onto this stack.

**Project:** Roblox BedWars (Easy.gg) — competitive knowledge base and companion web app
**Audience:** Competitive players and the development team building the Kit Explorer & Team Counter tool
**Meta reference:** Season 17, October 2026 (community tier data + official patch history)

This document has three parts:

- **Part A — The Game:** what BedWars is, why it matters competitively, and current meta knowledge.
- **Part B — The App:** the original product spec for the Kit Explorer & Team Counter tool (scope, UI design, architecture, QA).
- **Part C — The Fan Project MVP:** the Panel of Experts, MVP requirement mapping, the 5 domain views, and the 10 selected custom features.

---

# Part A — The Game

## A1. Why BedWars Matters

BedWars compresses macro strategy and mechanical skill into short, high-stakes matches, which is why it stays one of Roblox's most-played competitive games.

- **Core loop:** Protect your team's bed, gather resources, upgrade your gear and base, destroy enemy beds, then eliminate every opponent. Lose your bed and you stop respawning; lose your bed and your last life, and your team is out.
- **Strategic depth:** Economy management, map control, upgrade timing (macro) meet bridging, PvP, and clutch defense (micro) in 10-20 minute matches.
- **Competitive ecosystem:** Ranked 5v5 drafts with kit bans, monthly balance patches, and community tournaments mean the draft often decides the match before the first bridge is placed.
- **Kit identity:** Every kit locks in a role: economy engine, frontliner, rusher, support, or defender. A balanced composition beats five duelists almost every time.

## A2. Core Mechanics Every Competitive Player Must Master

1. **Bridging and clutching:** The highest-leverage mechanical skills in the game. Fast, clean bridging wins map control; clutch saves win matches.
2. **Resource economy:** Iron and gold buy gear, diamonds fund team upgrades, emeralds fund top-tier equipment.
3. **Upgrade shop priority:** Sharpened Swords → Armor tier → Heal Pool → traps, adjusted per map and matchup.
4. **Bed defense layering:** An outer wood/wool layer to break tool symmetry, an endstone or blast-resistant inner layer, and trap coverage. A clutch save beats a thick wall.
5. **Bed-break timing:** Season 16 tightened the bed-trade window, favoring mobility and support over raw damage. Only trade beds when you can convert the respawn advantage.
6. **Draft and counterplay:** Ban enemy economy engines first, reserve anti-heal for Baker compositions, and pair tether supports with frontliners.

## A3. Kit Categories: Top 5 Kits per Category (Season 17 Meta)

The rankings below use **exactly the 30 kits from the app's database (Section B2)**, five per category, ranked strongest to weakest within each category. Meta reflects ranked 5v5 consensus as of October 2026; the meta shifts every season.

### Fighter

| # | Kit | Why it ranks here |
|---|-----|-------------------|
| 1 | Grim Reaper | Strong solo-queue carry; currently featured in the free rotation |
| 2 | Hannah | High-consistency fighter pick in creator rankings |
| 3 | Aery | Teleport and shield passive; consistently S/A-tier across seasons |
| 4 | Barbarian | Rage-stacking brawler; strong with a support feeding him fights |
| 5 | Adetunde | Solid aggro fighter; needs early tempo to stay relevant |

### Movement

| # | Kit | Why it ranks here |
|---|-----|-------------------|
| 1 | Void Regent | Dash mobility stays elite for traversal despite reduced burst |
| 2 | Jade | Hammer lunge (buffed in the Aug 2026 "Legacy!" rework) closes gaps for breaks |
| 3 | Yamini | Agile repositioning and escape utility |
| 4 | Yuzi | Speed-based flanking and bridge pressure |
| 5 | Elektra | Post-nerf utility only; dash can no longer chain into sword swings |

### Support

| # | Kit | Why it ranks here |
|---|-----|-------------------|
| 1 | Baker | Golden apples grant rapid regeneration; the historical sustain king |
| 2 | Whisper | Tether buffs turn a frontliner into a hyper-carry; staple of coordinated 5-stacks |
| 3 | Melody | Team-wide support and healing |
| 4 | Axolotl Amy | Reliable utility and survivability support |
| 5 | Silas | Situational support; solid in lower divisions |

### Economy

| # | Kit | Why it ranks here |
|---|-----|-------------------|
| 1 | Bounty Hunter | Reworked Aug 2026 with leveling bounty progression; kill-based economy |
| 2 | Milo | Disguise shield soaks bed traps while funding aggressive tempo |
| 3 | Miner | Resource statues from duels; high-risk, high-reward |
| 4 | Lucia | Steady resource contribution with fighter utility |
| 5 | Fisherman | Creator-consensus S/A/A; consistent utility and pick potential |

### Defender

| # | Kit | Why it ranks here |
|---|-----|-------------------|
| 1 | Trapper | Buffed Oct 2026: trap limit raised from 8 to 10, plus a snap trap per kill |
| 2 | Marina | Niche defensive lockdown for base-heavy comps |
| 3 | Builder | Block utility; direct break tools outclass it at high rank |
| 4 | Vulcan | Turrets countered by one fireball or bow shot |
| 5 | Marcel | Slow brewing wastes early-game momentum |

### Ranged

| # | Kit | Why it ranks here |
|---|-----|-------------------|
| 1 | Ares | High-damage spear snipes; creator-consensus S-tier |
| 2 | Archer | Discounted crossbows and boosted headshot crits control bridge approaches |
| 3 | Zeno | Anti-heal specialist; the mandatory counterpick into Baker |
| 4 | Vanessa | Consistent A/B-tier ranged pressure |
| 5 | Lyla | Situational poke utility |

## A4. Draft Template for Ranked 5v5 (using only the 30-kit database)

```
[1 Economy Engine]   Bounty Hunter or Milo
[1 Primary Carry]    Grim Reaper, Hannah, or Aery
[1 Flex Disrupter]   Void Regent or Jade
[1 Support Buffer]   Baker or Whisper (tethered to the carry)
[1 Ranged/Defense]   Archer or Trapper
```

**Draft rules:**

1. **Never forfeit economy.** If Bounty Hunter is banned, lock Milo immediately.
2. **Scout for Baker.** Reserve a Zeno slot, or you lose every extended trade.
3. **Whisper never roams alone.** Tether only with a tanky carry.

## A5. Kits to Avoid in Ranked (from the 30-kit database)

- **Marcel:** slow brewing wastes early-game momentum.
- **Vulcan:** fragile turret setups, destroyed by cheap fireballs and TNT.
- **Builder:** outclassed by direct break tools at high rank.
- **Elektra:** post-nerf, utility-only; no longer a combat finisher.

## A6. Recent Meta-Changing Patches (2026)

| Patch | Impact |
|-------|--------|
| **Season 16 (May 2026)** | Bed-trade window tightened; mobility and support over raw damage |
| **Jul 31, 2026** | All kits temporarily free; kit shop countdown added |
| **Aug 14, 2026 "Legacy!"** | Jade and Bounty Hunter reworks (bounty leveling, Focus ability) |
| **Oct 2, 2026** | Trapper buffed (10 traps, kill = snap trap); Evelynn spirit orb buffed |
| **Oct 16, 2026 (Halloween)** | Marrow/Arachne boss reworks; free rotation (Grim Reaper, Raven, Crypt, Arachne) |

---

# Part B — The App: Kit Explorer & Team Counter

## B1. Scope & Features (Master Spec)

### Core Rules & Modes Represented

- **Game modes:** Solos, Doubles, Squads, Ranked 5v5, Kit Fusion.
- **Resources:** Iron, Diamonds, Emeralds.

### Interactive Features

1. **Kit Explorer:** A live search bar plus category filters covering all 30 kits in the database (Section B2). Each kit card shows name, category badge, tier, and a one-line strategy summary.
2. **Team Counter Tool:** Select up to 4 enemy kits to see recommended counter kits and tactical strategy tips (for example: enemy Defenders trigger Mobility counters; enemy Fighters trigger Defender/Trap counters).

## B2. Kit Database (30 Kits by Category)

| Category | Kits |
|----------|------|
| Fighter | Grim Reaper, Hannah, Aery, Barbarian, Adetunde |
| Movement | Yamini, Void Regent, Jade, Yuzi, Elektra |
| Support | Baker, Whisper, Axolotl Amy, Melody, Silas |
| Economy | Bounty Hunter, Lucia, Milo, Fisherman, Miner |
| Defender | Marina, Builder, Vulcan, Trapper, Marcel |
| Ranged | Ares, Archer, Zeno, Lyla, Vanessa |

Each kit record stores: name, category, tier (S/A/B/C/D per Part A), one-line ability description, and counter relationships.

## B3. UI / UX Design

### Visual Theme & Badges

- **Theme:** Dark gaming slate background (`#0F172A`), white text.
- **Team color tags:** Blue, Yellow, Orange, Pink.
- **Category badge colors:** Fighter (red), Movement (cyan), Support (green), Economy (yellow), Defender (gray), Ranged (purple).
- **Counter badges:** "High Threat" (red tag), "Strong Counter" (green tag).

### Layout Structure

1. **Header and navigation:** Game-mode selector, team colors, and two main tabs (Kit Explorer vs. Team Counter).
2. **Kit grid:** Responsive card layout, 1 column on mobile, 3-4 columns on desktop.
3. **Counter dashboard:** Two-column view on desktop; enemy kit selection on the left, recommended counters and strategy tips on the right. Columns stack vertically on mobile.

## B4. Architecture & Master Coding Prompt

```text
[TASK]: Build a single-page Roblox BedWars Kit Explorer and Team Counter web application.

[TECH STACK]: HTML5, Tailwind CSS (via CDN), Vanilla JavaScript.

[REQUIREMENTS]:
1. Dark theme styling using Tailwind slate classes (bg-slate-900, text-white).
2. Kit Explorer tab:
   - Live text search bar that filters kits by name as the user types.
   - Category filter buttons (Fighter, Movement, Support, Economy, Defender,
     Ranged) with the badge colors defined in Section B3.
   - Responsive grid showing all 30 kits, each card with the kit name,
     category badge, tier, and a brief description.
3. Team Counter tab:
   - Clickable enemy kit list, limited to a maximum of 4 selections.
   - Counter recommendations derived from category matchups (an enemy
     Defender recommends Mobility counters; an enemy Fighter recommends
     Defender/Trap counters; an enemy Baker recommends Zeno, and so on).
   - Counter cards rendered with strategy tips and visual tags
     ("High Threat", "Strong Counter").
4. Mobile responsiveness: the grid and the counter dashboard stack vertically
   on small screens with no horizontal scrolling.

[CONSTRAINTS]:
- Ship everything as one self-contained HTML file.
- Use standard DOM event listeners and vanilla JavaScript only; no external
  framework dependencies.
```

> **Superseded by Part C:** the MVP requirements below upgrade this static-file prototype into the full-stack app implemented in this repository (React + Express + Postgres/Drizzle). Part B4 is kept as the original prototype prompt.

## B5. QA & Bug-Audit Criteria

| # | Test case | Pass condition |
|---|-----------|----------------|
| 1 | Selection limit | Team Counter strictly caps enemy selection at 4 kits; a 5th click is rejected with clear feedback |
| 2 | Empty state | With no kits selected, the dashboard shows "Select enemy kits to view counter recommendations" |
| 3 | Search/filter sync | Clearing the search bar resets the grid to the current category filter (or all 30 kits if no filter is active) |
| 4 | Mobile breakpoints | Zero horizontal scrolling at 360px, 768px, and 1024px viewports; grid and dashboard stack vertically |
| 5 | Counter logic | Each recommendation maps to the category matchup table, and every "High Threat" enemy shows at least one "Strong Counter" |
| 6 | Data integrity | All 30 kits render with the correct name, category badge color, and tier |

---

# Part C — Fan Project MVP: Panel of Experts, MVP Requirements & Custom Features

Part C upgrades the app from a static single-page demo (Part B) into a full-stack fan project meeting the MVP requirements below.

## C1. Purpose & Target Audience

- **Fandom:** Roblox BedWars (Easy.gg) competitive community.
- **Target user:** Ranked and squad players who need to pick the right kit before the match starts, and drafters who need counterpicks against enemy compositions.
- **Problem solved:** The live game has 100+ kits and a meta that changes monthly, but there is no single place to browse the 30 most-played kits, compare them side by side, and get counter recommendations for an enemy draft. This app is that place.

## C2. Panel of Experts

The project is guided by five experts. Their definitions below are the persistent reference for all design decisions.

1. **The Competitive Analyst (meta expert):** A high-rank BedWars player who tracks patch notes, creator tier lists, and ranked win rates. Owns all kit data, tiers, ability descriptions, and counter matchup logic. Rule: no tier or counter claim enters the database without a source from the current season.
2. **The Full-Stack Developer (lead engineer):** Owns the tech stack, architecture, authentication, CRUD routes, and deployment pipeline. Rule: every MVP requirement maps to a concrete route, model, or component before it is built.
3. **The UI/UX Designer:** Owns the dark slate theme, category badge system, responsive layouts, and interaction feedback (toasts, empty states, loading states). Rule: mobile parity first; no feature ships that breaks a 360px viewport.
4. **The Data Architect:** Owns the database schema, seed data, and persistent storage. Rule: all user-created data (favorites, ratings, rankings, notes) must survive page refreshes and new sessions.
5. **The QA & Code Inspector:** Owns the audit checklist from Section B5, extended with the MVP tests in Section C4. Rule: every view and CRUD action is tested at three breakpoints before release.

## C3. MVP Requirement Mapping

| MVP requirement | How this app meets it |
|-----------------|----------------------|
| Clear purpose & audience | Section C1 above |
| Database & persistent data | PostgreSQL + Drizzle ORM (this repo): `kits`, `users`, `favorites`, `ratings`, `rankings`, `ranking_items`, `notes`, `trivia_scores` tables |
| User accounts & authentication | Register, login, logout; only logged-in users can favorite, rate, rank, or take notes; guest users get read-only access |
| At least 5 domain views | See Section C4 |
| Navigation | Persistent top navbar with tab links; category-colored active states; collapses to a bottom bar on mobile |
| Full CRUD functionality | **Primary entity: Personal Kit Rankings.** Create, read, update, delete custom tier lists; also full CRUD on personal notes |
| Meaningful seed content | The 30-kit database (Section B2) seeded with name, category, tier, ability description, and counter relationships (8+ entries requirement far exceeded) |
| Search & filtering | Live search bar plus category filters and multi-select filtering across the Kit Explorer |
| Fan-specific interactive feature | **Team Counter Tool** (up to 4 enemy kits → recommended counters and strategy tips), plus kit head-to-head comparison |
| Responsive design | 360px / 768px / 1024px breakpoints, stacked layouts, no horizontal scroll |
| Validation & feedback | Client and server validation (Zod) on all forms; success toasts, error banners, and graceful empty states throughout |
| Deployment | Live URL via Replit deployment (publicly reachable) |

## C4. The 5 Domain Views

| # | View | Contents |
|---|------|----------|
| 1 | **Home / Dashboard** | Trending kits, featured kit of the day, top-rated kits, quick links, user stats card |
| 2 | **Kit Explorer** | Search, category filters, sorting; all 30 kit cards with badge, tier, and description |
| 3 | **Kit Detail View** | Full ability breakdown, tier, counter relationships, related kits, personal notes, rating |
| 4 | **Team Counter Tool** | Select up to 4 enemy kits → counter recommendations with strategy tips and threat tags |
| 5 | **My Rankings** | Create and edit personal tier lists; the primary CRUD entity |

(Login/Sign-Up and account views exist but do not count toward the five, per the MVP rules.)

## C5. The 10 Custom Features (final list)

Exactly 10 features from the custom-features catalog were selected because they fit the Kit Explorer and Team Counter concept:

| # | Feature | How it fits |
|---|---------|-------------|
| 1 | **Search bar** | Live keyword search across all 30 kits by name or ability keyword |
| 2 | **Category filters** | Fighter, Movement, Support, Economy, Defender, Ranged buttons with the badge colors from B3 |
| 3 | **Multi-select filter** | Combine several categories at once (e.g., show Economy + Support only) |
| 4 | **Sorting options** | Sort kits alphabetically, by tier, or by average user rating |
| 5 | **Rating system** | Users rate kits 1-5 stars; average rating feeds the sorting and Trending section |
| 6 | **Favorites button** | Logged-in users save kits for later; favorites surface on the dashboard and profile card |
| 7 | **Comparison tool** | Compare any two kits side by side: category, tier, ability, counters, community rating |
| 8 | **Personal ranking list** | Build custom tier lists of favorite kits; the app's primary CRUD entity |
| 9 | **Related items** | Kit Detail view suggests similar kits by category and by counter relationship |
| 10 | **Trivia question** | Daily BedWars trivia multiple-choice question (meta and mechanics based) with score tracking |

Features intentionally skipped (overlap or poor fit): image galleries/carousels and video embeds (no media assets per kit), spoiler toggles (no plot content), countdown timers and calendar widgets (no fixed event schedule), and collection/wishlist mechanics (kits are not collectibles).

## C6. QA Checklist Additions

| # | Test case | Pass condition |
|---|-----------|----------------|
| 1 | Auth protection | Guests cannot favorite, rate, rank, or note; they see a login prompt instead |
| 2 | Persistence | Favorites, ratings, rankings, and notes survive logout, login, and page refresh |
| 3 | CRUD completeness | A ranking can be created, renamed, reordered, and deleted, with a confirmation on delete |
| 4 | Comparison tool | Any two distinct kits render a side-by-side view; selecting the same kit twice is rejected |
| 5 | Trivia scoring | A wrong trivia answer shows feedback and records the score to the user's history |

---

## Resources

**Official / core:**

- Roblox BedWars game page: `roblox.com/games/6872265039`
- Easy.gg official communications and in-game patch notes
- BedWars Wiki (Fandom) — updates, kit pages, patch history: `robloxbedwars.fandom.com`

**Competitive data and tier lists:**

- RBXBedWars creator-consensus tier list: `rbxbedwars.com`
- Season 17 ranked 5v5 kit tier list: `bedwarsroblox.wiki`
- Kit stats comparator and S16 match data: `bedwarsroblox.com`

**Guides and communities:**

- Roblox Den BedWars kit rankings: `robloxden.com`
- BedWars Discord ranked channels (win-rate discussion, scrims)
- YouTube tier-list creators (source of the October 2026 consensus data)

---

*Meta snapshot: October 2026 (Season 17). Re-verify tier placements after each balance patch; kits are added, reworked, and rotated roughly monthly.*
