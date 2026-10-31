"use strict";
/* Me: study profile, AI key, safety information, backup. */

function viewMe() {
  const course = h("input", { id: "me-course", value: cfg.course, placeholder: "e.g. B.Sc Physics Hons" });
  const uni = h("input", { id: "me-uni", value: cfg.uni });
  const sem = h("input", { id: "me-sem", value: cfg.sem, placeholder: "e.g. 3rd" });
  const lang = h("select", { id: "me-lang" }, LANGS.map(l => h("option", { selected: l === cfg.lang }, l)));
  const saveProfile = () => { cfg.course = course.value.trim().slice(0, 80); cfg.uni = uni.value.trim().slice(0, 80); cfg.sem = sem.value.trim().slice(0, 20); cfg.lang = lang.value; saveCfg(); };
  [course, uni, sem].forEach(e => { e.oninput = saveProfile; }); lang.onchange = saveProfile;

  /* ----- AI key ----- */
  const key = h("input", { id: "me-key", type: "password", autocomplete: "off", placeholder: getKey() ? "Key saved (hidden)" : "Paste your key here" });
  const model = h("input", { id: "me-model", value: cfg.model, list: "me-models" });
  const models = h("datalist", { id: "me-models" });
  const keyNote = h("p", { class: "note" });
  const setNote = (t, bad) => { keyNote.textContent = t; keyNote.className = bad ? "err" : "note"; };
  setNote(getKey() ? "A key is saved on this phone." : "No key. You can still use every tool. AI questions go to an AI app you already have.");
  const aiPanel = panel(h("h2", {}, "AI inside the app (optional)"),
    h("p", { class: "note" }, "Free: open aistudio.google.com, sign in with Google, press Get API key, copy it and paste below. Each person should use their own key. Google's free tier may use what you send to improve its products, so keep private details out of questions."),
    field("Your key", key, "me-key"), field("Model", model, "me-model"), models, keyNote,
    row(h("button", { class: "btn", type: "button", onclick: () => {
      if (key.value.trim()) { if (!/^[\w-]{20,200}$/.test(key.value.trim())) { setNote("That does not look like a key. Copy the whole key.", true); return; } save("key", key.value.trim()); key.value = ""; }
      cfg.model = model.value.trim().replace(/[^\w.\-]/g, "").slice(0, 60) || "gemini-2.5-flash"; saveCfg(); setNote("Saved."); key.placeholder = "Key saved (hidden)";
    } }, "Save"),
    h("button", { class: "ghost", type: "button", onclick: async () => {
      if (!getKey()) { setNote("Save a key first.", true); return; }
      setNote("Testing...");
      try { const list = await listModels(); models.replaceChildren(...list.map(m => h("option", { value: m }))); setNote(list.length ? "Key works. " + list.length + " models found. Tap the Model box to pick one, a flash model is fastest." : "Key works but no model was listed.");
        if (list.length && !list.includes(cfg.model)) { cfg.model = list[0]; model.value = list[0]; saveCfg(); setNote("Key works. Model changed to " + list[0] + "."); }
      } catch (e) { setNote("The key was not accepted. Copy it again from aistudio.google.com.", true); }
    } }, "Test my key"),
    h("button", { class: "ghost danger", type: "button", onclick: () => { save("key", ""); setNote("Key removed from this phone."); key.placeholder = "Paste your key here"; } }, "Remove key")));

  /* ----- safety ----- */
  const hosts = [...allowedHosts()].sort();
  const safety = panel(h("h2", {}, "Safety"),
    h("h3", {}, "What the app does to protect you"), h("ul", { class: "mdl" }, SAFETY_POINTS.map(t => h("li", {}, t))),
    h("h3", {}, "What you should do"), h("ul", { class: "mdl" }, USER_TODO.map(t => h("li", {}, t))),
    h("h3", {}, "Websites this app is allowed to contact"), h("p", { class: "note" }, hosts.join(", ") + ", s3.ap-south-1.amazonaws.com (only the caluniv folder)."),
    h("p", { class: "note" }, "No app can promise perfect safety. These steps remove the common risks."));

  /* ----- backup ----- */
  const box = h("textarea", { id: "me-backup", class: "short", placeholder: "Backup text appears here. To restore, paste a backup here and press Restore." });
  const names = ["notes", "cards", "bank", "exams", "grades", "sems"];
  const backup = panel(h("h2", {}, "Backup and reset"),
    h("p", { class: "note" }, "Your data lives only on this phone. Copy a backup and keep it in a note or chat to yourself. The AI key is never included."),
    box, row(
      h("button", { class: "ghost", type: "button", onclick: async () => { const d = { cfg: { course: cfg.course, uni: cfg.uni, sem: cfg.sem, lang: cfg.lang } }; names.forEach(n => { d[n] = load(n, null); }); box.value = JSON.stringify(d); toast(await copyText(box.value) ? "Backup copied" : "Select and copy"); } }, "Make backup"),
      h("button", { class: "ghost", type: "button", onclick: () => {
        let d; try { d = JSON.parse(box.value); } catch (e) { toast("That is not a valid backup"); return; }
        if (!d || typeof d !== "object") { toast("That is not a valid backup"); return; }
        if (Array.isArray(d.notes)) save("notes", d.notes.slice(0, 2000).map(n => ({ id: uid(), title: String(n.title || "Untitled").slice(0, 120), subject: String(n.subject || "").slice(0, 80), body: String(n.body || "").slice(0, 100000), updated: Number(n.updated) || Date.now() })));
        if (Array.isArray(d.cards)) save("cards", d.cards.slice(0, 1000).map(c => ({ id: uid(), q: String(c.q || "").slice(0, 300), a: String(c.a || "").slice(0, 600), subject: String(c.subject || "").slice(0, 80), box: Math.min(5, Math.max(1, Number(c.box) || 1)), due: /^\d{4}-\d\d-\d\d$/.test(c.due) ? c.due : today() })));
        if (d.bank) save("bank", sanitizeBank(d.bank));
        if (Array.isArray(d.exams)) save("exams", d.exams.slice(0, 50).filter(e => e && /^\d{4}-\d\d-\d\d$/.test(e.date)).map(e => ({ name: String(e.name || "Exam").slice(0, 60), date: e.date })));
        toast("Restored"); go("me");
      } }, "Restore"),
      (() => { let sure = false; const b = h("button", { class: "ghost danger", type: "button", onclick: () => {
        if (!sure) { sure = true; b.textContent = "Tap again to erase everything"; setTimeout(() => { sure = false; b.textContent = "Erase all data"; }, 3500); return; }
        wipe(); location.reload();
      } }, "Erase all data"); return b; })()));

  return col(
    panel(h("h2", {}, "About me"), h("p", { class: "note" }, "Added to every AI question so answers fit your course."),
      h("div", { class: "grid" }, field("Course", course, "me-course"), field("University", uni, "me-uni"), field("Semester", sem, "me-sem"), field("Answer language", lang, "me-lang"))),
    aiPanel, safety, backup);
}
