# Horizon Toolkit Pivot + Clamming Tracker
**Branch:** `main`
**Created:** 2026-09-07
**Status:** In Progress - Phase 1, Step 1.1
**Next Action:** Rename GitHub repo to `horizon-toolkit` and update remote/URL references.
**Purpose:** Rebrand the project as a multi-tool Horizon Toolkit (minimal landing + per-tool pages) and ship a mobile-first clamming tracker with a "cash out / keep clamming" decision flag.
**Security:** No DB, API, endpoints, or server-side user input — pure static client-side site. Security review skipped per global policy (exempt category).

## Context

Scott asked whether the skillchain project should become a broader "Horizon Toolkit" and whether a
clamming tracker is worth building. Decision (2026-09-07 session): yes to both. The repo renames to
`horizon-toolkit` (site not circulating yet, so breaking the old Pages URL is acceptable). Research
established: Sushomi's Clamming Guide + Analysis on horizonffxi.wiki provide exact item weights, NPC
values, and drop rates (~9.3k samples, post-patch-1.2), making break-chance math exact. Existing
tools (hxiclam, Clammy) are PC overlay addons with no decision advice and nothing works on a phone.
Scott confirmed in-game: the free bucket upgrade (offered when cashing out within 5pz of capacity)
upgrades **in place**, keeping current contents/weight — it is NOT a cash-out.

## Architecture

```
/                      → landing page (self-contained HTML, two tool cards)
/skillchains/          → existing app moved wholesale (all paths relative — no code edits)
/clamming/             → new tool: index.html, styles.css, app.js
/clamming/data/items.json → {name, pz, gil, rate} per clammable item (Horizon pool, 31 items)
```

Clamming app: no engine file needed — all logic in app.js. State in localStorage
(`hxtk-clamming-v1`): bucket capacity (50/100/150/200), tapped item list, session totals.
Derived each render: weight, bucket NPC value, remaining capacity,
`P(break next dig) = Σ normalized rate of items with pz > remaining`
(at 200pz cap, combine with flat mandragora incident: 10%, 5% w/ HQ top toggle),
`EV(dig) = Σ P·gil` (~400g). Flag states:
- **UPGRADE** (purple): cap < 200 and weight ≥ cap−5 → "Free upgrade — talk to Toh Zonikki (keeps your haul)"
- **Keep clamming** (green): P(break)×value ≤ ~0.5×EV(dig)
- **Getting risky** (yellow): ratio 0.5–1
- **Cash out** (red): P(break)×value > EV(dig)
Break % shown as small secondary text. Cash out / bucket-broke reset capacity to 50 (new 500g kit).
Upgrade = tapping the next capacity chip; contents kept.

## Files to Modify

| File | Reason |
|---|---|
| (GitHub repo) | rename `horizon-skillchains` → `horizon-toolkit` |
| `index.html`, `app.js`, `engine.js`, `styles.css`, `data/` | `git mv` into `skillchains/` |
| `index.html` (new, root) | landing page, self-contained |
| `clamming/index.html`, `styles.css`, `app.js`, `data/items.json` | new tool |
| `CLAUDE.md` | add registry frontmatter; restructure: shared toolkit facts + per-tool sections |
| `plans/ROADMAP.md` | new live URL, this plan in progress |

## Success Criteria

- Repo is `sdjohnso/horizon-toolkit`; Pages serves landing at root; both tools load at `/skillchains/` and `/clamming/`.
- Skillchain tool behaves identically at its new path (pickers populate, chains render).
- Clamming: tapping items updates weight/value/profit(−500g); flag transitions green→yellow→red per EV rule; upgrade banner at within-5pz; capacity chips 50–200 with in-place upgrade (contents kept); undo, cash out, broke, session totals; state survives reload (localStorage); 200pz incident toggle.
- Landing + clamming match the existing dark crystal theme, thumb-sized tap targets, ~620px column.

## Open Questions

- Local directory still named `horizon-skillchains` — rename to `~/Developer/horizon-toolkit` in a later session (registry crawler will pick it up).
- Goblin Armor/Mail/Mask, Broken Willow Rod NPC values unknown (gil: 0 for now; correct when Scott checks in-game).

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-07 | Rename repo despite Pages URL break | Site not circulating yet; cheapest moment |
| 2026-09-07 | Flag over raw % as primary signal | Scott's call; %, shown small, for the curious |
| 2026-09-07 | Upgrade keeps bucket contents | Scott confirmed in-game on Horizon |
| 2026-09-07 | Landing = two cards only, no nav chrome | Simplicity; revisit at 3+ tools |

## Phase 1 — Toolkit restructure

- [ ] **1.1 Rename repo + move skillchains + landing page**
  - Resources: repo remote, all root app files, new root `index.html`. Partition: whole repo (single-partition project).
  - [ ] `gh repo rename horizon-toolkit` (inside repo; verify remote updated)
  - [ ] `git mv` app files into `skillchains/`
  - [ ] Root landing page (self-contained, two cards)
  - [ ] Update live URL in ROADMAP
  - Validation: `git status` clean after commit; open landing + `/skillchains/` locally, chains render.
  - Next Session Prompt: I'm on `main`. Toolkit restructure done. Review `plans/toolkit-clamming.md`, continue Phase 2.

## Phase 2 — Clamming tracker

- [ ] **2.1 Data file** — `clamming/data/items.json` from Sushomi tables (31 items, weight/gil/rate).
- [ ] **2.2 App** — `clamming/index.html` + `styles.css` + `app.js` per Architecture.
  - Validation: manual walkthrough in Chrome mobile viewport — tap to 44pz on a 50 bucket → red flag ~33%; 45pz → upgrade banner; tap 100 chip → contents kept; cash out → session updates; reload → state persists.
- [ ] **2.3 CLAUDE.md restructure + frontmatter; ROADMAP update; move plan to completed.**

## Follow-Up Plans

- Dig timer (10s) with optional sound — only if Scott wants it; addon turf.
- HQ-pants drop-table variant (wiki has separate std/HQ columns) — needs the HQ column data.
- Skillchains parking lot: 4-6 party triple+ chains, WS level gating (unchanged).
