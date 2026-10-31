"use strict";
/* Router and start-up. */

const TABS = [
  ["updates", "Updates", viewUpdates], ["explain", "Explain", viewExplain], ["notes", "Notes", viewNotes], ["papers", "Papers", viewPapers],
  ["cards", "Cards", viewCards], ["tools", "Tools", viewTools], ["me", "Me", viewMe]
];
let current = "updates";

function updateBadge() {
  const n = newCount();
  const btn = $("nav").children[0];
  if (btn) btn.textContent = n ? "Updates (" + n + ")" : "Updates";
}

function go(id) {
  current = id; save("tab", id);
  if (id !== "notes") notesState.editing = null;
  [...$("nav").children].forEach((b, i) => b.setAttribute("aria-selected", String(TABS[i][0] === id)));
  const tab = TABS.find(t => t[0] === id) || TABS[0];
  $("view").replaceChildren(tab[2]());
  window.scrollTo(0, 0);
}

TABS.forEach(t => $("nav").append(h("button", { type: "button", role: "tab", onclick: () => go(t[0]) }, t[1])));
const startTab = load("tab", "updates");
go(TABS.some(t => t[0] === startTab) ? startTab : "updates");
updateBadge();

/* In the Android app, look for new announcements when the app opens (at most every 3 hours). */
if (IS_NATIVE) {
  const feed = load("feed", { last: 0 });
  if (Date.now() - feed.last > 3 * 3600 * 1000) {
    refreshFeed().then(() => { updateBadge(); if (current === "updates") go("updates"); }).catch(() => { /* offline */ });
  }
}

/* Offline use for the web version. */
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !IS_NATIVE) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* optional */ });
}
