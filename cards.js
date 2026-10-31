"use strict";
/* Cards: flashcards with spaced repetition (Leitner boxes). */

const BOX_DAYS = [0, 1, 2, 4, 8, 16];

function importCards(text, subject) {
  const cards = load("cards", []);
  let n = 0;
  for (const line of String(text).split(/\r?\n/)) {
    const i = line.indexOf("::"); if (i < 1) continue;
    const q = line.slice(0, i).replace(/^\s*(?:[-*\d.)]+\s*)?(?:Q[:.]?\s*)?/i, "").trim().slice(0, 300), a = line.slice(i + 2).replace(/^\s*A[:.]?\s*/i, "").trim().slice(0, 600);
    if (q.length < 3 || a.length < 1 || cards.some(c => c.q === q)) continue;
    cards.push({ id: uid(), q, a, subject: subject || "", box: 1, due: today() }); n++;
  }
  if (n) save("cards", cards.slice(-1000));
  return n;
}

let reviewState = { i: 0, shown: false };

function viewCards() {
  let cards = load("cards", []);
  const persist = () => save("cards", cards);
  const due = cards.filter(c => c.due <= today());
  const review = col();
  function drawReview() {
    review.replaceChildren();
    if (!cards.length) { review.append(h("p", { class: "note" }, "No cards yet. Add one below, or write lines like  question :: answer  in a note and press Lines with :: to cards.")); return; }
    if (!due.length) { review.append(h("div", { class: "win" }, "All done for today. " + cards.length + " cards in the deck.")); return; }
    const c = due[reviewState.i % due.length];
    review.append(h("p", { class: "note" }, due.length + " cards due · Box " + c.box + (c.subject ? " · " + c.subject : "")),
      h("div", { class: "flash" }, c.q), reviewState.shown ? h("div", { class: "say" }, c.a) : null,
      reviewState.shown
        ? row(h("button", { class: "btn", type: "button", onclick: () => grade(c, true) }, "I knew it"), h("button", { class: "ghost", type: "button", onclick: () => grade(c, false) }, "I missed it"))
        : h("button", { class: "btn", type: "button", onclick: () => { reviewState.shown = true; drawReview(); } }, "Show answer"));
  }
  function grade(c, ok) {
    c.box = ok ? Math.min(5, c.box + 1) : 1; c.due = addDays(today(), ok ? BOX_DAYS[c.box] : 1);
    persist(); reviewState = { i: 0, shown: false }; go("cards");
  }
  drawReview();

  const q = h("input", { id: "cd-q", placeholder: "Question or term" });
  const a = h("input", { id: "cd-a", placeholder: "Answer" });
  const s = h("input", { id: "cd-s", placeholder: "Subject (optional)" });
  const bulk = h("textarea", { id: "cd-bulk", class: "short", placeholder: "Many at once, one per line:\nWhat is Ohm's law? :: V = IR" });
  return col(
    panel(h("h2", {}, "Review today"), review),
    panel(h("h2", {}, "Add a card"),
      h("div", { class: "grid" }, field("Question", q, "cd-q"), field("Answer", a, "cd-a"), field("Subject", s, "cd-s")),
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => {
        if (!q.value.trim() || !a.value.trim()) { toast("Fill the question and the answer"); return; }
        cards.push({ id: uid(), q: q.value.trim().slice(0, 300), a: a.value.trim().slice(0, 600), subject: s.value.trim(), box: 1, due: today() }); persist(); go("cards");
      } }, "Add card")),
      field("Add many", bulk, "cd-bulk"),
      h("div", { class: "row" }, h("button", { class: "ghost", type: "button", onclick: () => { const n = importCards(bulk.value, s.value.trim()); toast(n ? n + " cards added" : "No lines like  question :: answer  found"); if (n) go("cards"); } }, "Add these cards"),
        cards.length ? h("button", { class: "ghost danger", type: "button", onclick: () => { if (confirmCards) { save("cards", []); confirmCards = false; go("cards"); } else { confirmCards = true; toast("Tap again to delete all cards"); setTimeout(() => { confirmCards = false; }, 3000); } } }, "Delete all cards") : null)));
}
let confirmCards = false;
