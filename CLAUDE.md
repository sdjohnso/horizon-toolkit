---
name: horizon-skillchains
purpose: Mobile-first web tool that shows FFXI (Horizon private server) players which skillchains a party can make from their jobs/weapons.
status: active
stage: build
tags: [ffxi, horizon, skillchains, web, static-site, github-pages]
data_sources: [Skillchain_Guide PDF (Scott's own), Horizon wiki (cross-check only)]
input: user-selected jobs + weapons (or summoner + avatar)
output: list of formable skillchains with tier + magic-burst elements
depends_on: []
updated: 2026-07-20
---

# Horizon Skillchains

A dead-simple, mobile-first web page for **Final Fantasy XI on the Horizon private server**.
A player picks two combatants (job + weapon, or Summoner + avatar) and instantly sees every
**skillchain** they can make, tagged by tier (I/II/III) and the elements to magic-burst with.

Built because every existing skillchain resource is hard to use. Scott's own PDF guide
(`~/Downloads/Skillchain_Guide (5) (1).pdf`) is the **authoritative source** for weapon-skill
properties — Horizon customizes these, so the FFXI wikis are only a cross-check, never truth.

## Key facts

- **Deploy target:** GitHub Pages (free, public, no purchased domain). Repo is the site.
- **Stack:** pure client-side static site (HTML/CSS/vanilla JS). No backend — it's all data lookups.
- **Icons:** recreate the guide's colored-orb element icons faithfully (as CSS/SVG, crisp on mobile).
- **Layout:** constrained to ~paper-column width, mobile-first.

## Skillchain engine rules (confirmed with Scott)

- Weapon skills carry an **ordered list** of properties (1, 2, or more). We do NOT hand-tag tiers
  onto weapon skills — the engine derives tier from the combination table in `data/skillchains.json`.
- **Order matters** for Tier 1 & Tier 2 chains. **Tier 3** (Light/Darkness) is order-free.
- **Chaining:** a floating Tier-1 result can open another Tier-1 OR go up to Tier-2. A floating
  Tier-2 result can ONLY go up to Tier-3 — never T2->T2, never back to T1. Tier-3 ends the chain.
- Combination table (property -> skillchain) is standard FFXI logic; the Horizon-custom part is
  purely which weapon skills / blood pacts have which properties.

## Data files (`data/`)

- `skillchains.json` — properties, skillchain definitions + elements, combination table. **DONE (verified by Scott).**
- `weapons.json` — weapon type -> weapon skills -> ordered properties. From PDF pp.2-4. **DONE.** 14 types, 121 WS. Clean PDF transcription — do NOT edit for Horizon corrections (use overrides).
- `summons.json` — avatar -> blood pacts -> ordered properties. PDF p.5. **DONE.** 8 avatars.
- `overrides.json` — **Horizon in-game confirmations & corrections layer.** See workflow below.
- `mobs.json` — enemy -> weak/strong elements & weapon types. PDF pp.6-8. Phase 2 (v2). TODO.
- (No `jobs.json` — v1 selects weapon type directly, not job.)

## Horizon adjustment workflow (IMPORTANT)

The PDF is our starting truth, but **Horizon differs and we discover the differences by testing weapon
skills in-game.** The base data files stay pristine; every Horizon-verified change goes in
`data/overrides.json`, which the engine layers on top at load time. This keeps "what the guide said"
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

## Scope

- **v1:** 2 combatants -> skillchain finder, with Summoner + avatar support. **Shipped.**
- **v2:** enemy weakness filter (highlight chains that END on an element the enemy is weak to). **Shipped.**
- **v3:** optional **3rd combatant -> double skillchains** (link 1 floats a result token, link 2
  continues it up a tier). Doubles-only view when three are set; the enemy filter tags the **final**
  chain's elements. Engine: `findDoubleChains(idA,idB,idC)` (link 2 reuses the link-1 combo lookup;
  the combo table itself enforces the tier gate — a floating T2 can only reach T3, T3 never opens). **Shipped.**
- **Closer filter:** optional "Ends with" dropdown listing every WS from the selected arsenals
  (optgroup per source, deduped), trimming results to chains that END on that WS (doubles: link 2's
  closer). Pure post-filter in app.js — no engine changes. **Shipped.**
- **Later:** 4-6 party + triple+ chaining; per-job weapon-skill level gating; weapon damage-type weakness.

Plans live in `plans/` (`completed/` for shipped work); see `plans/ROADMAP.md`.
