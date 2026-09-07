/* Horizon Toolkit — Clamming tracker */
(function () {
  "use strict";

  var DATA = null;          // items.json payload
  var rateSum = 0;          // sum of all observed rates (for normalizing)
  var avgDig = 0;           // expected gil of one dig

  var STORE_KEY = "hxtk-clamming-v1";
  var state = {
    cap: 50,
    bucket: [],             // item names, in tap order
    hqTop: false,
    session: { cashed: 0, broken: 0, gil: 0 }
  };

  var capChips, weightFill, statWeight, statValue, statProfit,
      flagEl, btnUndo, btnCash, btnBroke, btnReset,
      itemGrid, contentsCard, contentsList, sessionStats,
      hqToggleWrap, hqTop;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function itemByName(name) {
    for (var i = 0; i < DATA.items.length; i++)
      if (DATA.items[i].name === name) return DATA.items[i];
    return null;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && s.session && Array.isArray(s.bucket)) state = s;
    } catch (e) {}
  }

  // --- derived numbers ---

  function bucketWeight() {
    var w = 0;
    for (var i = 0; i < state.bucket.length; i++) {
      var it = itemByName(state.bucket[i]);
      if (it) w += it.pz;
    }
    return w;
  }

  function bucketValue() {
    var g = 0;
    for (var i = 0; i < state.bucket.length; i++) {
      var it = itemByName(state.bucket[i]);
      if (it) g += it.gil;
    }
    return g;
  }

  // Chance the next dig breaks the bucket: summed normalized rates of items
  // too heavy for the remaining capacity (+ the flat 200pz mandragora incident).
  function breakChance(weight) {
    var remaining = state.cap - weight;
    var p = 0;
    for (var i = 0; i < DATA.items.length; i++)
      if (DATA.items[i].pz > remaining) p += DATA.items[i].rate;
    p = p / rateSum;
    if (state.cap === 200) {
      var inc = (state.hqTop ? DATA.incident200.hqTop : DATA.incident200.base) / 100;
      p = 1 - (1 - p) * (1 - inc);
    }
    return p;
  }

  // --- rendering ---

  function fmtGil(n) {
    return n.toLocaleString("en-US") + "g";
  }

  function renderFlag(weight, value, pBreak) {
    flagEl.className = "flag";
    flagEl.textContent = "";
    var pct = Math.round(pBreak * 1000) / 10;

    var inWindow = state.cap < 200 && weight >= state.cap - 5 && weight <= state.cap;
    if (inWindow) {
      flagEl.classList.add("purple");
      flagEl.appendChild(document.createTextNode("Free upgrade — talk to Toh Zonikki now"));
      flagEl.appendChild(el("small", null,
        "Within 5pz of capacity: the cash-out chat offers a " + (state.cap + 50) +
        "pz bucket and keeps your haul. Never decline it."));
      return;
    }

    // Dig again iff expected gain (1−p)·avgDig beats expected loss p·value.
    var expectedLoss = pBreak * value;
    var expectedGain = (1 - pBreak) * avgDig;
    if (pBreak === 0) {
      flagEl.classList.add("green");
      flagEl.appendChild(document.createTextNode("Keep clamming"));
      flagEl.appendChild(el("small", null, "Nothing in the pool can break this bucket right now."));
    } else if (expectedLoss <= expectedGain * 0.5) {
      flagEl.classList.add("green");
      flagEl.appendChild(document.createTextNode("Keep clamming — worth the risk"));
      flagEl.appendChild(el("small", null, pct + "% chance the next dig breaks the bucket."));
    } else if (expectedLoss <= expectedGain) {
      flagEl.classList.add("yellow");
      flagEl.appendChild(document.createTextNode("Getting risky — cash out on a good haul"));
      flagEl.appendChild(el("small", null,
        pct + "% break chance on " + fmtGil(value) + " — close to the ~" +
        Math.round(avgDig) + "g an average dig is worth."));
    } else {
      flagEl.classList.add("red");
      flagEl.appendChild(document.createTextNode("Cash out — risk outweighs the next dig"));
      flagEl.appendChild(el("small", null,
        pct + "% break chance on " + fmtGil(value) + " at stake beats the ~" +
        Math.round(avgDig) + "g an average dig brings in."));
    }
  }

  function renderContents() {
    contentsList.textContent = "";
    if (!state.bucket.length) { contentsCard.hidden = true; return; }
    contentsCard.hidden = false;

    var counts = {};
    for (var i = 0; i < state.bucket.length; i++)
      counts[state.bucket[i]] = (counts[state.bucket[i]] || 0) + 1;

    Object.keys(counts).sort(function (a, b) {
      return itemByName(b).gil * counts[b] - itemByName(a).gil * counts[a];
    }).forEach(function (name) {
      var it = itemByName(name);
      var li = el("li");
      li.appendChild(el("span", null, name + (counts[name] > 1 ? " ×" + counts[name] : "")));
      li.appendChild(el("span", "c-gil", fmtGil(it.gil * counts[name])));
      contentsList.appendChild(li);
    });
  }

  function renderSession() {
    var s = state.session;
    var kits = s.cashed + s.broken + 1; // every bucket started cost 500g, incl. the current one
    var net = s.gil - kits * DATA.kitCost;
    sessionStats.textContent = "";
    var rows = [
      ["Buckets cashed", String(s.cashed)],
      ["Buckets broken", String(s.broken)],
      ["Gil banked", fmtGil(s.gil)],
      ["Kits bought", kits + " (" + fmtGil(kits * DATA.kitCost) + ")"],
      ["Net profit", fmtGil(net), net >= 0 ? "pos" : "neg"]
    ];
    rows.forEach(function (r) {
      var row = el("div", "s-row");
      row.appendChild(el("span", "s-label", r[0]));
      row.appendChild(el("span", "s-val" + (r[2] ? " " + r[2] : ""), r[1]));
      sessionStats.appendChild(row);
    });
  }

  function render() {
    var weight = bucketWeight();
    var value = bucketValue();
    var pBreak = breakChance(weight);
    var remaining = state.cap - weight;

    // capacity chips
    var chips = capChips.querySelectorAll(".cap-chip");
    for (var i = 0; i < chips.length; i++)
      chips[i].setAttribute("aria-checked", String(Number(chips[i].dataset.cap) === state.cap));

    // weight bar
    var frac = Math.min(1, weight / state.cap);
    weightFill.style.width = (frac * 100) + "%";
    weightFill.style.backgroundColor =
      frac >= 0.9 ? "var(--red)" : frac >= 0.7 ? "var(--yellow)" : "var(--green)";

    statWeight.textContent = "";
    statWeight.appendChild(document.createTextNode(String(weight)));
    statWeight.appendChild(el("small", null, "/" + state.cap + "pz"));

    statValue.textContent = fmtGil(value);
    var profit = value - DATA.kitCost;
    statProfit.textContent = (profit < 0 ? "−" : "") + fmtGil(Math.abs(profit));
    statProfit.className = "stat-num " + (profit >= 0 ? "pos" : "neg");

    hqToggleWrap.hidden = state.cap !== 200;
    hqTop.checked = state.hqTop;

    renderFlag(weight, value, pBreak);

    // item grid break-warning highlights
    var btns = itemGrid.querySelectorAll(".item-btn");
    for (var j = 0; j < btns.length; j++) {
      var it = itemByName(btns[j].dataset.name);
      btns[j].classList.toggle("would-break", it.pz > remaining);
    }

    btnUndo.disabled = !state.bucket.length;
    btnCash.disabled = !state.bucket.length;
    btnBroke.disabled = false;

    renderContents();
    renderSession();
    save();
  }

  // --- actions ---

  function newBucket() {
    state.bucket = [];
    state.cap = 50;
    state.hqTop = false;
  }

  function buildUI() {
    // capacity chips
    DATA.capacities.forEach(function (c) {
      var b = el("button", "cap-chip", String(c));
      b.type = "button";
      b.dataset.cap = String(c);
      b.setAttribute("role", "radio");
      b.addEventListener("click", function () {
        state.cap = c;   // in-place upgrade: contents/weight are kept
        render();
      });
      capChips.appendChild(b);
    });

    // item grid, most common first
    DATA.items.slice().sort(function (a, b) { return b.rate - a.rate; })
      .forEach(function (it) {
        var b = el("button", "item-btn");
        b.type = "button";
        b.dataset.name = it.name;
        b.appendChild(el("span", "i-name", it.name));
        var meta = el("span", "i-meta", it.pz + "pz · ");
        meta.appendChild(el("b", null, it.gil ? fmtGil(it.gil) : "?g"));
        b.appendChild(meta);
        b.addEventListener("click", function () {
          state.bucket.push(it.name);
          render();
        });
        itemGrid.appendChild(b);
      });

    btnUndo.addEventListener("click", function () {
      state.bucket.pop();
      render();
    });

    btnCash.addEventListener("click", function () {
      state.session.gil += bucketValue();
      state.session.cashed += 1;
      newBucket();
      render();
    });

    btnBroke.addEventListener("click", function () {
      state.session.broken += 1;
      newBucket();
      render();
    });

    btnReset.addEventListener("click", function () {
      if (!confirm("Reset session totals?")) return;
      state.session = { cashed: 0, broken: 0, gil: 0 };
      render();
    });

    hqTop.addEventListener("change", function () {
      state.hqTop = hqTop.checked;
      render();
    });
  }

  function init() {
    capChips = document.getElementById("capChips");
    weightFill = document.getElementById("weightFill");
    statWeight = document.getElementById("statWeight");
    statValue = document.getElementById("statValue");
    statProfit = document.getElementById("statProfit");
    flagEl = document.getElementById("flag");
    btnUndo = document.getElementById("btnUndo");
    btnCash = document.getElementById("btnCash");
    btnBroke = document.getElementById("btnBroke");
    btnReset = document.getElementById("btnReset");
    itemGrid = document.getElementById("itemGrid");
    contentsCard = document.getElementById("contentsCard");
    contentsList = document.getElementById("contentsList");
    sessionStats = document.getElementById("sessionStats");
    hqToggleWrap = document.getElementById("hqToggleWrap");
    hqTop = document.getElementById("hqTop");

    fetch("data/items.json").then(function (r) { return r.json(); }).then(function (d) {
      DATA = d;
      rateSum = 0; avgDig = 0;
      d.items.forEach(function (it) { rateSum += it.rate; avgDig += it.rate * it.gil; });
      avgDig = avgDig / rateSum;
      load();
      buildUI();
      render();
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
