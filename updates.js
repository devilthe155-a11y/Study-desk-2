"use strict";
/* Updates: reads the notice pages of official sites and shows what is new. Runs on the phone, only in the Android app. */

const RELEVANT = /notice|notification|exam|result|admit|schedule|date|registr|application|answer|key|time ?table|routine|form|admission|advert|syllabus|scholar|revis|postpon|city|slip|brochure|bulletin|circular|merit|counsel|re-?open/i;

function parseSource(html, src) {
  const doc = new DOMParser().parseFromString(html, "text/html");   // inert: scripts in it never run
  const seen = new Set(), items = [];
  for (const a of doc.querySelectorAll("a[href]")) {
    const raw = (a.getAttribute("href") || "").trim();
    if (!raw || raw[0] === "#" || /^(javascript|mailto|tel|data):/i.test(raw)) continue;
    let u; try { u = new URL(raw, src.url); } catch (e) { continue; }
    if (u.protocol === "http:") u.protocol = "https:";
    if (u.protocol !== "https:") continue;
    const text = (a.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length < 12 || text.length > 260) continue;
    const pdf = /\.pdf($|\?)/i.test(u.pathname + u.search);
    if (!pdf && !RELEVANT.test(text)) continue;
    const href = u.href; if (seen.has(href)) continue; seen.add(href);
    let date = "";
    const tr = a.closest("tr");
    if (tr) { const c = tr.querySelector("td,th"); const t = c && c.textContent.replace(/\s+/g, " ").trim(); if (t && t.length < 20 && /\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}/.test(t)) date = t; }
    items.push({ title: text, href, date, src: src.id, srcName: src.name, group: src.group });
    if (items.length >= 30) break;
  }
  return items;
}

async function refreshFeed() {
  const feed = load("feed", { items: [], seen: {}, last: 0, errs: [] });
  const firstRun = !Object.keys(feed.seen).length, now = Date.now(), all = [], errs = [];
  const srcs = sourceList();
  await Promise.all(srcs.map(async s => {
    try { parseSource(await fetchText(s.url), s).forEach(i => all.push(i)); } catch (e) { errs.push(s.id); }
  }));
  const kept = feed.items.filter(i => errs.includes(i.src));
  const items = all.concat(kept);
  for (const i of items) { if (feed.seen[i.href] == null) feed.seen[i.href] = firstRun ? 0 : now; i.first = feed.seen[i.href]; }
  const keys = Object.keys(feed.seen);
  if (keys.length > 4000) keys.sort((a, b) => feed.seen[a] - feed.seen[b]).slice(0, keys.length - 3000).forEach(k => delete feed.seen[k]);
  feed.items = items.slice(0, 400); feed.last = now; feed.errs = errs;
  save("feed", feed);
  return feed;
}

function newCount() {
  const f = load("feed", { items: [] });
  return f.items.filter(i => i.first > cfg.lastViewed).length;
}

let updFilter = "All";

function viewUpdates() {
  const feed = load("feed", { items: [], seen: {}, last: 0, errs: [] });
  const list = col();
  const status = h("p", { class: "note" });
  const chips = h("div", { class: "chips" });
  const refreshBtn = h("button", { class: "btn", type: "button", onclick: async () => {
    refreshBtn.disabled = true; status.textContent = "Checking official sites...";
    try { Object.assign(feed, await refreshFeed()); draw(); updateBadge(); } finally { refreshBtn.disabled = false; }
  } }, "Check for updates");

  function draw() {
    const groups = ["All", "University", "Exams"].concat(cfg.custom.length ? ["Mine"] : []);
    chips.replaceChildren(...groups.map(g => h("button", { class: "chip", type: "button", "aria-pressed": String(g === updFilter), onclick: () => { updFilter = g; draw(); } }, g)));
    const when = feed.last ? "Last checked " + new Date(feed.last).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) + "." : "Not checked yet.";
    status.textContent = IS_NATIVE ? when + (feed.errs && feed.errs.length ? " Could not read: " + feed.errs.map(id => (sourceList().find(s => s.id === id) || {}).name).filter(Boolean).join(", ") + ". Open those sites below." : "")
      : "Live checking works in the Android app. In a browser, use the official links below.";
    const items = feed.items.filter(i => updFilter === "All" || i.group === updFilter).sort((a, b) => b.first - a.first);
    list.replaceChildren();
    if (!items.length) list.append(h("p", { class: "note" }, IS_NATIVE ? "Nothing yet. Press Check for updates." : "No updates are loaded in the browser version."));
    items.slice(0, 80).forEach(i => {
      const fresh = i.first > cfg.lastViewed;
      const ok = urlAllowed(i.href);
      list.append(h("div", { class: "item" },
        h("div", { class: "row" }, fresh ? h("span", { class: "tag new" }, "NEW") : null, h("span", { class: "note" }, [i.srcName, i.date].filter(Boolean).join(" · "))),
        ok ? h("a", { href: i.href, target: "_blank", rel: "noopener noreferrer" }, i.title)
           : h("span", {}, i.title, h("span", { class: "note" }, " (link hidden: " + hostOf(i.href) + " is not an approved site)"))));
    });
  }
  draw();

  const official = panel(h("h2", {}, "Official sites"),
    h("p", { class: "note" }, "Always confirm important dates on the official site."),
    h("div", { class: "col" }, sourceList().map(s => h("div", { class: "row split" },
      h("span", {}, s.name), h("a", { class: "ghost", href: s.url, target: "_blank", rel: "noopener noreferrer" }, "Open")))));

  const nm = h("input", { id: "cs-name", placeholder: "Name, e.g. My college" });
  const ur = h("input", { id: "cs-url", placeholder: "https://...", inputmode: "url" });
  const custom = panel(h("h2", {}, "Add a site to watch"),
    h("p", { class: "note" }, "Only https addresses of public websites. The app will be allowed to read this one page, nothing else on it runs."),
    h("div", { class: "grid" }, field("Name", nm, "cs-name"), field("Address", ur, "cs-url")),
    h("div", { class: "row" }, h("button", { class: "ghost", type: "button", onclick: () => {
      const url = ur.value.trim(), name = nm.value.trim() || hostOf(url);
      if (!validCustomUrl(url)) { toast("Use a full https address of a public website"); return; }
      if (cfg.custom.length >= 10) { toast("Maximum 10 added sites"); return; }
      cfg.custom.push({ name: name.slice(0, 60), url }); saveCfg(); go("updates");
    } }, "Add site"),
    cfg.custom.length ? h("button", { class: "ghost danger", type: "button", onclick: () => { cfg.custom.pop(); saveCfg(); go("updates"); } }, "Remove last added") : null));

  return col(
    panel(h("h2", {}, "Updates"),
      h("div", { class: "row" }, refreshBtn, h("button", { class: "ghost", type: "button", onclick: () => { cfg.lastViewed = Date.now(); saveCfg(); draw(); updateBadge(); } }, "Mark all as read")),
      status, chips),
    panel(list), official, custom);
}
