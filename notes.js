"use strict";
/* Notes: write, search and store notes. AI can draft or summarise them. */

function addNote(n) {
  const notes = load("notes", []);
  const note = { id: uid(), title: n.title || "Untitled", subject: n.subject || "", body: n.body || "", updated: Date.now() };
  notes.unshift(note); save("notes", notes); return note;
}

let notesState = { editing: null, q: "", subject: "All" };

function viewNotes() {
  return notesState.editing ? noteEditor(notesState.editing) : noteList();
}

function noteList() {
  const notes = load("notes", []);
  const q = h("input", { id: "n-q", type: "search", placeholder: "Search notes", value: notesState.q, "aria-label": "Search notes" });
  const chips = h("div", { class: "chips" });
  const list = col();
  const subjects = ["All"].concat([...new Set(notes.map(n => n.subject).filter(Boolean))].sort());
  function draw() {
    chips.replaceChildren(...subjects.map(s => h("button", { class: "chip", type: "button", "aria-pressed": String(s === notesState.subject), onclick: () => { notesState.subject = s; draw(); } }, s)));
    const t = notesState.q.toLowerCase();
    const hits = notes.filter(n => (notesState.subject === "All" || n.subject === notesState.subject) && (!t || (n.title + " " + n.body + " " + n.subject).toLowerCase().includes(t)));
    list.replaceChildren();
    if (!notes.length) list.append(h("p", { class: "note" }, "No notes yet. Press New note, or save any AI answer here with Save to notes."));
    else if (!hits.length) list.append(h("p", { class: "note" }, "No notes match."));
    hits.forEach(n => list.append(h("button", { class: "noteitem", type: "button", onclick: () => { notesState.editing = n.id; go("notes"); } },
      h("b", {}, n.title), h("span", { class: "note" }, [n.subject, new Date(n.updated).toLocaleDateString("en-IN")].filter(Boolean).join(" · ")),
      h("span", { class: "snip" }, n.body.replace(/\s+/g, " ").slice(0, 110)))));
  }
  q.oninput = () => { notesState.q = q.value; draw(); };
  draw();
  return col(panel(h("h2", {}, "My notes"),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { notesState.editing = addNote({ title: "New note" }).id; go("notes"); } }, "New note")),
    q, chips), panel(list));
}

function noteEditor(id) {
  const notes = load("notes", []);
  const note = notes.find(n => n.id === id);
  if (!note) { notesState.editing = null; return noteList(); }
  const title = h("input", { id: "ne-title", value: note.title, "aria-label": "Title" });
  const subj = h("input", { id: "ne-subj", value: note.subject, placeholder: "Subject", list: "note-subjects", "aria-label": "Subject" });
  const subjList = h("datalist", { id: "note-subjects" }, [...new Set(notes.map(n => n.subject).filter(Boolean))].map(s => h("option", { value: s })));
  const body = h("textarea", { id: "ne-body", value: note.body, class: "tall", placeholder: "Write your note here..." });
  let timer; const saved = h("span", { class: "note" }, "Saved");
  const persist = () => {
    note.title = title.value.trim() || "Untitled"; note.subject = subj.value.trim(); note.body = body.value; note.updated = Date.now();
    save("notes", notes); saved.textContent = "Saved";
  };
  [title, subj, body].forEach(el => { el.oninput = () => { saved.textContent = "Saving..."; clearTimeout(timer); timer = setTimeout(persist, 500); }; });
  const task = h("select", { id: "ne-task" }, Object.keys(NOTE_TASKS).map(k => h("option", {}, k)));
  const box = aiBox(() => {
    persist();
    return wrapPrompt(NOTE_TASKS[task.value], "Note title: " + note.title + (note.subject ? "\nSubject: " + note.subject : "") + "\n\nNote text:\n" + note.body.slice(0, 6000));
  }, { saveLabel: "Add to this note", onSave: text => { body.value = body.value.replace(/\s+$/, "") + "\n\n" + text + "\n"; persist(); toast("Added to your note"); } });
  let confirmDel = false;
  const del = h("button", { class: "ghost danger", type: "button", onclick: () => {
    if (!confirmDel) { confirmDel = true; del.textContent = "Tap again to delete"; setTimeout(() => { confirmDel = false; del.textContent = "Delete"; }, 3000); return; }
    save("notes", notes.filter(n => n.id !== id)); notesState.editing = null; go("notes");
  } }, "Delete");
  const toCards = h("button", { class: "ghost", type: "button", onclick: () => {
    persist(); const n = importCards(body.value, subj.value.trim()); toast(n ? n + " cards added" : "No lines like  question :: answer  found");
  } }, "Lines with :: to cards");
  return col(panel(
    h("div", { class: "row split" }, h("button", { class: "ghost", type: "button", onclick: () => { persist(); notesState.editing = null; go("notes"); } }, "Back to notes"), saved),
    field("Title", title, "ne-title"), field("Subject", subj, "ne-subj"), subjList, field("Note", body, "ne-body"),
    h("div", { class: "row" },
      h("button", { class: "ghost", type: "button", onclick: async () => toast(await copyText(note.title + "\n\n" + body.value) ? "Copied" : "Select and copy") }, "Copy"),
      h("button", { class: "ghost", type: "button", onclick: async () => { const r = await shareText(note.title + "\n\n" + body.value, note.title); if (r === "copied") toast("Copied"); } }, "Share"),
      toCards, del)),
    panel(h("h2", {}, "AI help on this note"), field("What do you want?", task, "ne-task"), box));
}
