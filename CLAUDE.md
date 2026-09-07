---
name: horizon-toolkit
purpose: Mobile-first static toolkit of simple lookup/tracker web tools for FFXI players on the Horizon private server (skillchains, clamming).
status: active
stage: stable
tags: [ffxi, horizon, skillchains, clamming, web, static-site, github-pages, toolkit]
data_sources: [Skillchain_Guide PDF (Scott's own), Horizon wiki (skillchains cross-check; clamming source of truth via Sushomi's guides)]
input: user selections in tool UIs (combatants, enemies, clammed items, bucket capacity)
output: skillchain lists with tier + magic-burst elements; live clamming bucket tracking with cash-out advice
depends_on: []
updated: 2026-09-07
---

# Horizon Toolkit

A collection of dead-simple, mobile-first web tools for **Final Fantasy XI on the Horizon
private server**. One repo, one GitHub Pages site, one tool per directory.

**Guiding principle: simplicity is the ultimate sophistication.** Concept, UX, and UI must all
be simple at their core. Mobile-first, always.

## Shared facts (all tools)

- **Live:** https://sdjohnso.github.io/horizon-toolkit/ (repo renamed from `horizon-skillchains` 2026-09-07; local dir not yet renamed)
- **Deploy target:** GitHub Pages (free, public, no purchased domain). Repo is the site.
- **Stack:** pure client-side static (HTML/CSS/vanilla JS). No backend, no build step — all data lookups.
- **Layout:** ~620px paper-column width, dark "crystal" theme (`:root` tokens copied per tool for full independence).
- **Structure:** `/` is a minimal landing page (self-contained HTML, one tappable card per tool);
  each tool lives in its own directory with its own `index.html` / `styles.css` / `app.js` / `data/`.
  Keep the landing as cards-and-nothing-else; no shared nav chrome until there are 3+ tools.

---

## Tool: Skillchains (`skillchains/`)

A player picks two combatants (job + weapon, or Summoner + avatar) — or three for a double —
and instantly sees every **skillchain** they can make, tagged by tier (I/II/III) and the
elements to magic-burst with.

Built because every existing skillchain resource is hard to use. Scott's own PDF guide
(`~/Downloads/Skillchain_Guide (5) (1).pdf`) is the **authoritative source** for weapon-skill
properties — Horizon customizes these, so the FFXI wikis are only a cross-check, never truth.
Icons recreate the guide's colored-orb element icons (CSS, crisp on mobile).

### Engine rules (confirmed with Scott)

- Weapon skills carry an **ordered list** of properties (1, 2, or more). We do NOT hand-tag tiers
  onto weapon skills — the engine derives tier from the combination table in `data/skillchains.json`.
- **Order matters** for Tier 1 & Tier 2 chains. **Tier 3** (Light/Darkness) is order-free.
- **Chaining:** a floating Tier-1 result can open another Tier-1 OR go up to Tier-2. A floating
  Tier-2 result can ONLY go up to Tier-3 — never T2->T2, never back to T1. Tier-3 ends the chain.
- Combination table (property -> skillchain) is standard FFXI logic; the Horizon-custom part is
  purely which weapon skills / blood pacts have which properties.

### Data files (`skillchains/data/`)

- `skillchains.json` — properties, skillchain definitions + elements, combination table. **DONE (verified by Scott).**
- `weapons.json` — weapon type -> weapon skills -> ordered properties. From PDF pp.2-4. **DONE.** 14 types, 121 WS. Clean PDF transcription — do NOT edit for Horizon corrections (use overrides).
- `summons.json` — avatar -> blood pacts -> ordered properties. PDF p.5. **DONE.** 8 avatars.
- `overrides.json` — **Horizon in-game confirmations & corrections layer.** See workflow below.
- `mobs.json` — enemy -> weak/strong elements & weapon types. PDF pp.6-8. **DONE.**
- (No `jobs.json` — the tool selects weapon type directly, not job.)

### Horizon adjustment workflow (IMPORTANT)

The PDF is our starting truth, but **Horizon differs and we discover the differences by testing weapon
skills in-game.** The base data files stay pristine; every Horizon-verified change goes in
`overrides.json`, which the engine layers on top at load time. This keeps "what the guide said"
separate from "what we confirmed on Horizon," and lets us weed out what doesn't work over time.

When Scott reports a result from in-game, update `overrides.json` (never the base files):

- **A pair actually made a *different* skillchain** → add to `pairConfirmations`:
  `{ "a": "Opener WS", "b": "Closer WS", "result": "actualChain", "status": "different", "note": "..." }`
- **A pair did NOT skillchain** (fizzled) → `pairConfirmations` with `"status": "fizzles"` (engine hides it).
- **A pair worked as predicted** → `pairConfirmations` with `"status": "confirmed"` (engine can show a ✓).
- **A weapon skill's *properties* are wrong on Horizon** → add to `weaponSkillProperties`:
  `"Weapon Skill Name": ["prop1", "prop2"]` (replaces that WS's properties everywhere).
- **The property *combination rule* differs on Horizon** (e.g. Detonation->Compression makes something
  else, or nothing) → add to `comboOverrides`: `{ "open": "...", "close": "...", "chain": "..."|null }`.
- **A *double skillchain's second link* behaves differently** (a floating result token + a specific
  closing WS) → add to `chainConfirmations`: `{ "from": "liquefaction", "ws": "Closer WS", "result":
  "..."|null, "status": "confirmed"|"fizzles"|"different" }`. Note: `pairConfirmations` (link 1),
  `weaponSkillProperties`, and `comboOverrides` already apply to **both** links automatically — use
  `chainConfirmations` only for a link-2 result that hinges on the specific closing weapon skill.

Property tokens = the 8 tier-1 names + the 4 tier-2 names (fusion/fragmentation/gravitation/distortion).
`a` opens, `b` closes (order matters for tier 1 & 2). Note `Thunder Thrust` was already set to retail
(Transfixion+Impaction) in the base data per Scott.

### Shipped scope

v1 two-combatant finder (+ Summoner/avatar) → v2 enemy weakness filter → v3 3rd combatant double
skillchains (`findDoubleChains`; combo table enforces the tier gate) → "Ends with" closer filter
(pure post-filter in app.js). All live.
**Later:** 4-6 party + triple+ chaining; per-job weapon-skill level gating; weapon damage-type weakness.

---

## Tool: Clamming (`clamming/`)

Tap-to-log tracker for Bibiki Bay clamming. Shows live bucket weight/capacity, NPC value,
profit (value − 500g kit), and a **decision flag** — the headline feature, per Scott's call
(flag over raw percentage; the % shows as small secondary text):

- **Purple "Free upgrade":** within 5pz of capacity (cap < 200). On Horizon the cash-out chat
  with Toh Zonikki upgrades the bucket 50→100→150→200pz **in place, keeping contents/weight**
  (Scott confirmed in-game 2026-09-07). Never decline. In the UI, an upgrade = tapping the next
  capacity chip.
- **Green / yellow / red (EV rule):** dig again iff `(1−p)·avgDig > p·bucketValue`, where
  `p = Σ normalized rates of items with pz > remaining capacity` — exact math from measured
  drop rates, not a guess. Yellow at ≥50% of the threshold, red past it.
- At 200pz cap, a flat per-dig mandragora incident (10% base, 5% with HQ swimsuit top — toggle,
  only visible at 200) is combined into `p`.
- Cash-out and breaks reset capacity to 50 (new 500g kit). Session totals (buckets cashed/broken,
  gil banked, kits, net profit) persist in localStorage (`hxtk-clamming-v1`).

### Data (`clamming/data/items.json`)

31-item Horizon drop pool with `pz` (weight), `gil` (NPC price, fame-approximate), `rate`
(observed appearance %). Source: **Sushomi's Clamming Guide + "Clamming: An Analysis By Sushomi"
(horizonffxi.wiki)** — ~9.3k logged digs, post-patch-1.2, standard-gear column. Rates/values are
data, not code — Horizon patches can shift the drop table; update the JSON when the wiki does.
Goblin Armor/Mask/Mail + Broken Willow Rod have `gil: 0` (unconfirmed NPC values — fix when
Scott checks in-game).

**Context:** community addons (hxiclam, Clammy — PC overlays) track weight/value but give no
decision advice and don't work on phones; that gap is this tool's reason to exist. A dig timer
was deliberately skipped (addon turf). Possible later: HQ-pants drop-table variant (wiki has a
separate HQ-gear column).

---

Plans live in `plans/` (`completed/` for shipped work); see `plans/ROADMAP.md`.
