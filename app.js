/* Horizon Skillchains — UI wiring */
(function () {
  "use strict";

  var selA, selB, selC, resultsEl, selEnemy, enemyClear, enemyBar;
  var selCloser, closerPick;
  var showAllChains = false;   // enemy filter: false = weak-only (default), true = show all

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Build an orb element for a property/skillchain token.
  function orb(token, small) {
    var colors = Engine.orbColors(token);
    var n = el("span", "orb" + (small ? " small" : ""));
    if (colors.length === 1) {
      n.style.background = "radial-gradient(circle at 35% 30%, " +
        lighten(colors[0]) + ", " + colors[0] + ")";
    } else {
      n.style.background = "conic-gradient(from 135deg, " +
        colors[0] + " 0deg 180deg, " + colors[1] + " 180deg 360deg)";
    }
    n.title = Engine.propLabel(token);
    return n;
  }
  // crude lighten for the highlight side of the radial
  function lighten(hex) {
    var c = hex.replace("#", "");
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    var r = Math.min(255, parseInt(c.substr(0,2),16) + 60);
    var g = Math.min(255, parseInt(c.substr(2,2),16) + 60);
    var b = Math.min(255, parseInt(c.substr(4,2),16) + 60);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function buildSelect(sel, selectedId) {
    var sources = Engine.listSources();
    sel.innerHTML = "";
    var ph = el("option", null, "Choose…");
    ph.value = "";
    sel.appendChild(ph);

    var groups = [
      { label: "Weapons", kind: "weapon" },
      { label: "Avatars (Summoner)", kind: "avatar" }
    ];
    groups.forEach(function (g) {
      var og = document.createElement("optgroup");
      og.label = g.label;
      sources.filter(function (s) { return s.kind === g.kind; })
             .forEach(function (s) {
        var o = el("option", null, s.label);
        o.value = s.id;
        if (s.id === selectedId) o.selected = true;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  // ----- closing weapon-skill filter -----
  // Rebuild the "Ends with" dropdown from the selected combatants' arsenals, one optgroup per
  // source (deduped when the same weapon type is picked twice). Hidden until results can render.
  function buildCloserSelect() {
    if (!selA.value || !selB.value) {
      closerPick.hidden = true;
      selCloser.innerHTML = "";
      return;
    }
    var prev = selCloser.value;
    selCloser.innerHTML = "";
    var ph = el("option", null, "Any weapon skill");
    ph.value = "";
    selCloser.appendChild(ph);

    var seen = {};
    [selA.value, selB.value, selC.value].filter(Boolean).forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      var src = Engine.getSource(id);
      if (!src) return;
      var og = document.createElement("optgroup");
      og.label = src.label;
      src.skills.forEach(function (ws) {
        var o = el("option", null, ws.name);
        o.value = ws.name;
        og.appendChild(o);
      });
      selCloser.appendChild(og);
    });

    // Keep the previous pick if it's still in an arsenal; otherwise fall back to Any.
    selCloser.value = prev;
    if (selCloser.value !== prev) selCloser.value = "";
    closerPick.hidden = false;
  }

  // Keep only the ways that end with the chosen weapon skill; drop chains left with none.
  function filterByCloser(chains, wsName) {
    return chains.map(function (c) {
      var out = {};
      Object.keys(c).forEach(function (k) { out[k] = c[k]; });
      out.pairs = c.pairs.filter(function (p) { return p.closer === wsName; });
      return out;
    }).filter(function (c) { return c.pairs.length; });
  }
  // Doubles: the ending weapon skill is link 2's closer (the one that lands the final chain).
  function filterDoublesByCloser(groups, wsName) {
    return groups.map(function (g) {
      var out = {};
      Object.keys(g).forEach(function (k) { out[k] = g[k]; });
      out.sequences = g.sequences.filter(function (s) { return s.link2.closer === wsName; });
      return out;
    }).filter(function (g) { return g.sequences.length; });
  }

  // Build a small orb straight from a raw element token (for the enemy's weakness display).
  // Pass mb=true for the larger magic-burst orbs on result cards. All element orbs carry
  // data-elem so the shared tooltip (hover on desktop, tap on touch) can name them.
  function elementOrb(e, mb) {
    var color = Engine.elementColorOf(e);
    var label = e.charAt(0).toUpperCase() + e.slice(1);
    var n = el("span", "orb small" + (mb ? " mb" : ""));
    n.style.background = "radial-gradient(circle at 35% 30%, " + lighten(color) + ", " + color + ")";
    n.setAttribute("data-elem", label);
    n.setAttribute("aria-label", label + " element");
    return n;
  }

  // ----- element help tooltip: hover (desktop) + tap (touch) name popup -----
  var elemTip;
  function showElemTip(orb) {
    var label = orb.getAttribute("data-elem");
    if (!label) return;
    if (!elemTip) {
      elemTip = el("div", "elem-tip");
      document.body.appendChild(elemTip);
    }
    elemTip.textContent = label;
    elemTip.hidden = false;
    var r = orb.getBoundingClientRect();
    var t = elemTip.getBoundingClientRect();
    var top = r.top - t.height - 8;
    if (top < 6) top = r.bottom + 8;                 // flip below if no room above
    var left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - t.width - 6));
    elemTip.style.top = top + "px";
    elemTip.style.left = left + "px";
  }
  function hideElemTip() { if (elemTip) elemTip.hidden = true; }
  var elemTipTimer;
  function initElemTips() {
    function orbFrom(e) { return e.target.closest ? e.target.closest(".orb[data-elem]") : null; }
    document.addEventListener("mouseover", function (e) { var o = orbFrom(e); if (o) showElemTip(o); });
    document.addEventListener("mouseout", function (e) { if (orbFrom(e)) hideElemTip(); });
    document.addEventListener("click", function (e) {
      var o = orbFrom(e);
      if (o) {
        showElemTip(o);
        clearTimeout(elemTipTimer);
        elemTipTimer = setTimeout(hideElemTip, 2000);   // auto-dismiss the tap popup
      } else { hideElemTip(); }
    });
    window.addEventListener("scroll", hideElemTip, true);
  }
  function rainbowOrb(titleText) {
    var n = el("span", "orb small rainbow");
    n.title = titleText || "All elements";
    return n;
  }

  // ----- enemy combobox (custom dropdown; native <datalist> is unreliable on iOS) -----
  var mobMenu, enemyCaret;     // DOM refs, set in init()
  var mobFiltered = [];        // names currently shown, in menu order
  var mobActiveIndex = -1;     // keyboard-highlighted option

  // Render the menu options filtered by the typed query (empty query = all families).
  function renderMobMenu(query) {
    var names = Engine.listMobs().map(function (m) { return m.name; });
    var q = (query || "").trim().toLowerCase();
    mobFiltered = q ? names.filter(function (n) { return n.toLowerCase().indexOf(q) !== -1; }) : names;
    mobMenu.innerHTML = "";
    mobActiveIndex = -1;
    selEnemy.removeAttribute("aria-activedescendant");
    if (!mobFiltered.length) {
      mobMenu.appendChild(el("li", "enemy-menu-empty", "No enemy family matches."));
      return;
    }
    var selected = (selEnemy.value || "").trim().toLowerCase();
    mobFiltered.forEach(function (name, i) {
      var li = document.createElement("li");
      li.className = "enemy-option";
      li.id = "mob-opt-" + i;
      li.setAttribute("role", "option");
      li.textContent = name;
      if (name.toLowerCase() === selected) li.setAttribute("aria-selected", "true");
      // mousedown (not click) fires before the input blurs, so the pick registers.
      li.addEventListener("mousedown", function (e) { e.preventDefault(); selectMob(name); });
      mobMenu.appendChild(li);
    });
  }

  function openMobMenu() {
    renderMobMenu(selEnemy.value);
    mobMenu.hidden = false;
    selEnemy.setAttribute("aria-expanded", "true");
  }
  function closeMobMenu() {
    mobMenu.hidden = true;
    mobActiveIndex = -1;
    selEnemy.setAttribute("aria-expanded", "false");
    selEnemy.removeAttribute("aria-activedescendant");
  }
  function selectMob(name) {
    selEnemy.value = name;
    showAllChains = false;
    closeMobMenu();
    render();
  }
  // Move the keyboard highlight, wrapping at both ends, and keep it in view.
  function setMobActive(i) {
    var opts = mobMenu.querySelectorAll(".enemy-option");
    if (!opts.length) return;
    if (i < 0) i = opts.length - 1;
    else if (i >= opts.length) i = 0;
    mobActiveIndex = i;
    opts.forEach(function (o, idx) { o.classList.toggle("active", idx === i); });
    selEnemy.setAttribute("aria-activedescendant", "mob-opt-" + i);
    opts[i].scrollIntoView({ block: "nearest" });
  }
  function onEnemyKeydown(e) {
    if (mobMenu.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) { openMobMenu(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setMobActive(mobActiveIndex + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMobActive(mobActiveIndex - 1); }
    else if (e.key === "Enter" && !mobMenu.hidden && mobActiveIndex >= 0) {
      e.preventDefault(); selectMob(mobFiltered[mobActiveIndex]);
    } else if (e.key === "Escape") { closeMobMenu(); }
  }

  // Resolve the typed enemy value to a known family name (case-insensitive), or null.
  function resolveMob(value) {
    if (!value) return null;
    var v = value.trim().toLowerCase();
    if (!v) return null;
    var hit = Engine.listMobs().filter(function (m) { return m.name.toLowerCase() === v; })[0];
    return hit ? hit.name : null;
  }

  // ----- retail cross-reference (2.7) -----
  // Two enemy-weakness layers: the PDF/Horizon values the engine uses (mob.weak/strong) and a
  // retail cross-ref (mob.retail). Surface the divergence subtly; never let retail override PDF.
  var RETAIL_SOURCE = {
    allakhazam: "Allakhazam", bg: "BG Wiki", ffxiclopedia: "FFXIclopedia",
    both: "BG Wiki + FFXIclopedia"
  };
  function sameSet(a, b) {
    a = a || []; b = b || [];
    if (a.length !== b.length) return false;
    var s = {}; a.forEach(function (x) { s[x] = true; });
    return b.every(function (x) { return s[x]; });
  }
  // Returns divergence info when the retail layer disagrees with the PDF values, else null.
  function retailDivergence(mob) {
    var r = mob && mob.retail;
    if (!r) return null;
    var weakDiff = !sameSet(mob.weak, r.weak);
    var strongDiff = !sameSet(mob.strong, r.strong);
    if (!weakDiff && !strongDiff) return null;
    return { weakDiff: weakDiff, strongDiff: strongDiff, retail: r,
      source: RETAIL_SOURCE[r.source] || r.source || "retail" };
  }
  function elemsText(list) {
    if (!list || !list.length) return "none";
    return list.map(function (e) { return e.charAt(0).toUpperCase() + e.slice(1); }).join(", ");
  }

  // The enemy summary bar: weakness orbs + how many chains land, + weak-only/show-all toggle.
  function buildEnemyBar(tag, shownCount, totalCount, canToggle) {
    enemyBar.innerHTML = "";
    enemyBar.hidden = false;

    var top = el("div", "enemy-bar-top");
    top.appendChild(el("span", "enemy-name", tag.mob.name));

    var orbs = el("span", "enemy-orbs");
    orbs.appendChild(el("span", "enemy-orbs-label", "weak"));
    if (tag.weakAll) {
      orbs.appendChild(rainbowOrb("Weak to all elements"));
      orbs.appendChild(el("span", "enemy-orbs-all", "all elements"));
    } else if (tag.mob.weak.length) {
      tag.mob.weak.forEach(function (e) { orbs.appendChild(elementOrb(e)); });
    } else {
      orbs.appendChild(el("span", "enemy-orbs-none", "none listed"));
    }
    top.appendChild(orbs);

    // Retail-divergence flag: subtle badge; tap/click toggles a "guide vs retail" note (2.7).
    var div = retailDivergence(tag.mob);
    if (div) {
      var flag = el("button", "retail-flag", "retail differs");
      flag.type = "button";
      flag.setAttribute("aria-expanded", "false");
      top.appendChild(flag);
    }
    enemyBar.appendChild(top);

    if (div) {
      var note = el("div", "retail-note");
      note.hidden = true;
      var parts = [];
      if (div.weakDiff) parts.push("weak — guide: " + elemsText(tag.mob.weak) +
        " · retail: " + elemsText(div.retail.weak));
      if (div.strongDiff) parts.push("resists — guide: " + elemsText(tag.mob.strong) +
        " · retail: " + elemsText(div.retail.strong));
      note.appendChild(el("span", "retail-note-body", parts.join("  |  ")));
      note.appendChild(el("span", "retail-note-src", "source: " + div.source));
      enemyBar.appendChild(note);
      flag.addEventListener("click", function () {
        note.hidden = !note.hidden;
        flag.setAttribute("aria-expanded", note.hidden ? "false" : "true");
      });
    }

    var bottom = el("div", "enemy-bar-bottom");
    var summary = el("span", "enemy-summary");
    if (tag.strongAll) {
      summary.textContent = "Resists every element — no super-effective chains. Showing all.";
    } else if (tag.weakCount === 0) {
      summary.textContent = tag.hasWeak
        ? "None of these chains land on its weaknesses. Showing all."
        : "No listed weaknesses. Showing all.";
    } else if (tag.weakAll) {
      summary.textContent = "Weak to all elements — every chain lands.";
    } else {
      summary.textContent = showAllChains
        ? (tag.weakCount + " of " + totalCount + " land on a weakness")
        : ("Showing " + shownCount + " that land on a weakness");
    }
    bottom.appendChild(summary);

    if (canToggle) {
      var btn = el("button", "enemy-toggle", showAllChains ? "Weak only" : ("Show all " + totalCount));
      btn.type = "button";
      btn.addEventListener("click", function () { showAllChains = !showAllChains; render(); });
      bottom.appendChild(btn);
    }
    enemyBar.appendChild(bottom);
  }

  function sortForDisplay(chains) {
    return chains.slice().sort(function (x, y) {
      var wx = x.weakHit ? 0 : 1, wy = y.weakHit ? 0 : 1;
      if (wx !== wy) return wx - wy;                  // weak hits first
      var rx = x.resisted ? 1 : 0, ry = y.resisted ? 1 : 0;
      if (rx !== ry) return rx - ry;                  // resisted last
      if (y.tier !== x.tier) return y.tier - x.tier;  // then higher tier
      return x.chain.localeCompare(y.chain);
    });
  }

  function render() {
    var a = selA.value, b = selB.value, c = selC.value;
    resultsEl.innerHTML = "";

    var mobName = resolveMob(selEnemy.value);
    enemyClear.hidden = !selEnemy.value;
    enemyCaret.hidden = !!selEnemy.value;   // caret when empty, clear (×) when filled

    // Three combatants → double-skillchain mode (doubles only). Two → the single-chain finder.
    if (a && b && c) { renderDoubles(a, b, c, mobName); return; }

    if (!a || !b) {
      enemyBar.hidden = true;
      resultsEl.appendChild(emptyState("Pick two combatants to see the skillchains they can make."));
      return;
    }

    var chains = Engine.findSkillchains(a, b);
    if (!chains.length) {
      enemyBar.hidden = true;
      resultsEl.appendChild(emptyState("No skillchains — these two can’t chain together."));
      return;
    }

    var closerWS = selCloser.value;
    if (closerWS) {
      chains = filterByCloser(chains, closerWS);
      if (!chains.length) {
        enemyBar.hidden = true;
        resultsEl.appendChild(emptyState("No skillchains end with " + closerWS + "."));
        return;
      }
    }

    // No enemy chosen → v1 behavior.
    if (!mobName) {
      enemyBar.hidden = true;
      var count = chains.reduce(function (n, c) { return n + c.pairs.length; }, 0);
      resultsEl.appendChild(el("p", "count-line",
        chains.length + " skillchain" + (chains.length > 1 ? "s" : "") +
        " · " + count + " way" + (count > 1 ? "s" : "")));
      chains.forEach(function (c) { resultsEl.appendChild(chainCard(c)); });
      return;
    }

    // Enemy chosen → tag, then filter/highlight.
    var tag = Engine.tagAgainstMob(chains, mobName);
    var total = tag.chains.length;
    var display, canToggle;

    if (tag.weakCount === 0) {
      display = sortForDisplay(tag.chains);   // nothing to trim to; show all, dim resisted
      canToggle = false;
    } else if (tag.weakAll) {
      display = sortForDisplay(tag.chains);   // all are weak hits
      canToggle = false;
    } else if (showAllChains) {
      display = sortForDisplay(tag.chains);
      canToggle = true;
    } else {
      display = sortForDisplay(tag.chains.filter(function (c) { return c.weakHit; }));
      canToggle = true;
    }

    buildEnemyBar(tag, display.length, total, canToggle);
    display.forEach(function (c) { resultsEl.appendChild(chainCard(c)); });
  }

  function emptyState(msg) { return el("div", "empty", msg); }

  // ----- double skillchains (v3): three combatants, two-step sequences -----
  function renderDoubles(a, b, c, mobName) {
    var groups = Engine.findDoubleChains(a, b, c);
    if (!groups.length) {
      enemyBar.hidden = true;
      resultsEl.appendChild(emptyState("No double skillchains — these three can’t chain in sequence."));
      return;
    }

    var closerWS = selCloser.value;
    if (closerWS) {
      groups = filterDoublesByCloser(groups, closerWS);
      if (!groups.length) {
        enemyBar.hidden = true;
        resultsEl.appendChild(emptyState("No doubles end with " + closerWS + "."));
        return;
      }
    }

    // No enemy → show every double.
    if (!mobName) {
      enemyBar.hidden = true;
      var ways = groups.reduce(function (n, g) { return n + g.sequences.length; }, 0);
      resultsEl.appendChild(el("p", "count-line",
        groups.length + " double" + (groups.length > 1 ? "s" : "") +
        " · " + ways + " way" + (ways > 1 ? "s" : "")));
      groups.forEach(function (g) { resultsEl.appendChild(doubleCard(g)); });
      return;
    }

    // Enemy chosen → tag on the FINAL chain's elements (tagAgainstMob preserves .sequences),
    // then filter/highlight exactly like the v2 single-chain path.
    var tag = Engine.tagAgainstMob(groups, mobName);
    var total = tag.chains.length;
    var display, canToggle;
    if (tag.weakCount === 0) { display = sortForDisplay(tag.chains); canToggle = false; }
    else if (tag.weakAll) { display = sortForDisplay(tag.chains); canToggle = false; }
    else if (showAllChains) { display = sortForDisplay(tag.chains); canToggle = true; }
    else { display = sortForDisplay(tag.chains.filter(function (g) { return g.weakHit; })); canToggle = true; }

    buildEnemyBar(tag, display.length, total, canToggle);
    display.forEach(function (g) { resultsEl.appendChild(doubleCard(g)); });
  }

  // Card for one final skillchain, with every 2-step sequence that reaches it.
  function doubleCard(g) {
    var card = el("div", "sc-card dbl tier-" + g.tier);
    if (g.weakHit) card.className += " weak-hit";
    else if (g.resisted) card.className += " resisted";
    var head = el("div", "sc-head");
    head.appendChild(orb(g.chain, false));
    var title = el("div", "sc-title");
    var name = el("div", "sc-name");
    name.appendChild(el("span", "sc-name-text", Engine.chainLabel(g.chain)));
    name.appendChild(el("span", "tier-badge", "Level " + Engine.tierRoman(g.tier)));
    if (g.weakHit) name.appendChild(el("span", "weak-flag", "weak"));
    var mb = el("div", "sc-mb");                       // MB window = final chain's elements (Q2)
    mb.appendChild(el("span", "sc-meta-label", "Magic Burst:"));
    var hot = {};
    (g.weakElements || []).forEach(function (e) { hot[e] = true; });
    g.elements.forEach(function (e) {
      var o = elementOrb(e, true);
      if (hot[e]) o.className += " hot";
      mb.appendChild(o);
    });
    name.appendChild(mb);
    title.appendChild(name);
    head.appendChild(title);
    card.appendChild(head);

    var seqs = el("div", "seqs");
    g.sequences.forEach(function (s) { seqs.appendChild(sequenceRow(s)); });
    card.appendChild(seqs);
    return card;
  }

  // Two rows on a shared grid: link 1 (WS→WS ⇒ float) split across both columns, then link 2
  // (↳ WS ⇒ final) in column 2 only — so the ↳ sits under link 1's closer instead of repeating
  // the float token it carries.
  function sequenceRow(s) {
    var wrap = el("div", "seq");

    var open = el("div", "seq-cell seq-open");
    open.appendChild(wsSpan(s.link1.opener, s.link1.openerSource, s.link1.openProp));
    open.appendChild(el("span", "arrow", "→"));
    wrap.appendChild(open);

    var close = el("div", "seq-cell seq-close");
    close.appendChild(wsSpan(s.link1.closer, s.link1.closerSource, s.link1.closeProp));
    close.appendChild(el("span", "seq-eq", "="));
    close.appendChild(scResult(s.link1.result));
    if (s.link1.status === "confirmed") close.appendChild(tick());
    wrap.appendChild(close);

    var r2 = el("div", "seq-cell seq-step2");
    r2.appendChild(el("span", "seq-carry", "↳"));     // the float carries into link 2
    r2.appendChild(wsSpan(s.link2.closer, s.link2.closerSource, s.link2.closeProp));
    r2.appendChild(el("span", "seq-eq", "="));
    r2.appendChild(scResult(s.link2.result));
    if (s.link2.status === "confirmed") r2.appendChild(tick());
    wrap.appendChild(r2);

    return wrap;
  }

  // A small inline chip for a skillchain result: its orb (element-colored) + name.
  function scResult(token) {
    var s = el("span", "sc-result");
    s.appendChild(orb(token, true));
    s.appendChild(el("span", "sc-result-name", Engine.chainLabel(token)));
    return s;
  }
  function tick() {
    var t = el("span", "confirm-tick", "✓");
    t.title = "Confirmed on Horizon";
    return t;
  }

  function chainCard(c) {
    var card = el("div", "sc-card tier-" + c.tier);
    if (c.weakHit) card.className += " weak-hit";
    else if (c.resisted) card.className += " resisted";

    var head = el("div", "sc-head");
    head.appendChild(orb(c.chain, false));
    var title = el("div", "sc-title");
    var name = el("div", "sc-name");
    name.appendChild(el("span", "sc-name-text", Engine.chainLabel(c.chain)));
    name.appendChild(el("span", "tier-badge", "Level " + Engine.tierRoman(c.tier)));
    if (c.weakHit) name.appendChild(el("span", "weak-flag", "weak"));
    var mb = el("div", "sc-mb");
    mb.appendChild(el("span", "sc-meta-label", "Magic Burst:"));
    var hot = {};
    (c.weakElements || []).forEach(function (e) { hot[e] = true; });
    c.elements.forEach(function (e) {
      var o = elementOrb(e, true);
      if (hot[e]) o.className += " hot";
      mb.appendChild(o);
    });
    name.appendChild(mb);
    title.appendChild(name);
    head.appendChild(title);
    card.appendChild(head);

    var pairs = el("div", "pairs");
    c.pairs.forEach(function (p) { pairs.appendChild(pairRow(p)); });
    card.appendChild(pairs);
    return card;
  }

  function pairRow(p) {
    var row = el("div", "pair");
    row.appendChild(wsSpan(p.opener, p.openerSource, p.openProp));
    row.appendChild(el("span", "arrow", "→"));
    row.appendChild(wsSpan(p.closer, p.closerSource, p.closeProp));
    if (p.status === "confirmed") {
      var t = el("span", "confirm-tick", "✓");
      t.title = "Confirmed on Horizon";
      row.appendChild(t);
    }
    return row;
  }

  function wsSpan(name, source, prop) {
    var s = el("span", "ws");
    s.appendChild(orb(prop, true));
    s.appendChild(el("span", "ws-name", name));
    s.appendChild(el("span", "ws-src", source));
    return s;
  }

  function init() {
    selA = document.getElementById("selA");
    selB = document.getElementById("selB");
    selC = document.getElementById("selC");
    resultsEl = document.getElementById("results");
    selEnemy = document.getElementById("selEnemy");
    enemyClear = document.getElementById("enemyClear");
    enemyBar = document.getElementById("enemyBar");
    mobMenu = document.getElementById("mob-menu");
    enemyCaret = document.getElementById("enemyCaret");
    selCloser = document.getElementById("selCloser");
    closerPick = document.getElementById("closerPick");

    Engine.load("data/").then(function () {
      buildSelect(selA);
      buildSelect(selB);
      buildSelect(selC);
      function onSourceChange() { buildCloserSelect(); render(); }
      selA.addEventListener("change", onSourceChange);
      selB.addEventListener("change", onSourceChange);
      selC.addEventListener("change", onSourceChange);
      selCloser.addEventListener("change", render);
      // Combobox: open on focus/click (shows all families), filter as you type.
      selEnemy.addEventListener("focus", openMobMenu);
      selEnemy.addEventListener("click", openMobMenu);
      selEnemy.addEventListener("input", function () { showAllChains = false; openMobMenu(); render(); });
      selEnemy.addEventListener("keydown", onEnemyKeydown);
      // Blur closes the menu (deferred so an option's mousedown can land first).
      selEnemy.addEventListener("blur", function () { setTimeout(closeMobMenu, 120); });
      enemyClear.addEventListener("click", function () {
        selEnemy.value = ""; showAllChains = false; render(); selEnemy.focus();
      });
      initElemTips();
      render();
    }).catch(function (err) {
      resultsEl.appendChild(emptyState("Couldn’t load data: " + err.message +
        ". If viewing locally, serve the folder (e.g. python3 -m http.server)."));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
