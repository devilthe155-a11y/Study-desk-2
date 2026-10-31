"use strict";
/* Papers: a bank of REAL past questions that you and your friends add. The analysis only uses what is saved here. */

const DEMO_PAPERS = [
  { subject: "Demo: Physics (made-up questions)", year: 2022, exam: "Demo", questions: [
    { t: "State and explain Kirchhoff's current law with a neat diagram.", m: 5 }, { t: "Derive the expression for the energy stored in a capacitor.", m: 10 }, { t: "What is Gauss's law? Write its integral form.", m: 2 }] },
  { subject: "Demo: Physics (made-up questions)", year: 2023, exam: "Demo", questions: [
    { t: "Explain Kirchhoff's current law and give one example.", m: 5 }, { t: "Derive an expression for energy stored in a charged capacitor.", m: 10 }, { t: "Define electric flux and state Coulomb's law.", m: 2 }] },
  { subject: "Demo: Physics (made-up questions)", year: 2024, exam: "Demo", questions: [
    { t: "State Gauss's law and write its integral form.", m: 2 }, { t: "Derive the expression for energy stored in a capacitor.", m: 10 }, { t: "Explain the working of a transformer.", m: 5 }] }
];

let papersState = { subject: "" };

function viewPapers() {
  let bank = load("bank", []);
  const persist = () => save("bank", bank);
  const subjects = subjectsInBank();
  if (!papersState.subject || !subjects.includes(papersState.subject)) papersState.subject = subjects[0] || "";

  /* ----- add a paper ----- */
  const sub = h("input", { id: "pa-sub", placeholder: "Subject, e.g. Chemistry Hons Sem 2", list: "pa-subs", value: papersState.subject });
  const subList = h("datalist", { id: "pa-subs" }, subjects.map(s => h("option", { value: s })));
  const yr = h("input", { id: "pa-year", type: "number", value: new Date().getFullYear() - 1, min: 1990, max: 2100 });
  const exam = h("input", { id: "pa-exam", placeholder: "Exam name (optional)" });
  const txt = h("textarea", { id: "pa-text", class: "tall", placeholder: "Paste or type the questions of one paper.\nPut marks like [5] or (5 marks) at the end if you know them." });
  const byNum = h("input", { id: "pa-num", type: "checkbox" });
  const addPanel = panel(h("h2", {}, "Add a question paper"),
    h("p", { class: "note" }, "Use papers you really have: from your department, library, seniors or the university. Copy the text from a PDF, or type it. Only real questions give real analysis."),
    h("div", { class: "grid" }, field("Subject", sub, "pa-sub"), field("Year", yr, "pa-year"), field("Exam", exam, "pa-exam")), subList,
    field("Questions", txt, "pa-text"),
    h("label", { class: "check", for: "pa-num" }, byNum, "Questions are numbered (1. 2. Q3 a) ...) and may wrap over several lines"),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => {
      const s = sub.value.trim(), y = Math.round(Number(yr.value));
      if (!s) { sub.focus(); toast("Add the subject"); return; }
      if (!(y >= 1990 && y <= 2100)) { yr.focus(); toast("Check the year"); return; }
      const qs = parseQuestions(txt.value, byNum.checked);
      if (!qs.length) { txt.focus(); toast("No questions found. Put one question per line."); return; }
      bank.push({ id: uid(), subject: s.slice(0, 80), year: y, exam: exam.value.trim().slice(0, 80), questions: qs });
      persist(); papersState.subject = s; toast(qs.length + " questions saved"); go("papers");
    } }, "Save paper"),
    h("button", { class: "ghost", type: "button", onclick: () => { bank = bank.concat(sanitizeBank(DEMO_PAPERS)); persist(); papersState.subject = DEMO_PAPERS[0].subject; go("papers"); } }, "Try with demo data")));

  /* ----- analysis ----- */
  const results = col();
  function drawResults() {
    results.replaceChildren();
    const papers = bank.filter(p => p.subject === papersState.subject);
    if (!papers.length) { results.append(h("p", { class: "note" }, "Add at least two papers of one subject to see repeats. Three or more works best.")); return; }
    const a = analyse(papers);
    results.append(h("p", { class: "note" }, a.papers + " papers, " + a.questions + " questions" + (a.avgMarks ? ", average " + a.avgMarks + " marks per question" : "") +
      ". Years: " + [...new Set(papers.map(p => p.year))].sort().join(", ") + ". This shows patterns in the papers you saved. It is not a promise of what will come."));
    if (a.papers < 2) results.append(h("p", { class: "err" }, "Only one paper saved, so nothing can repeat yet."));

    results.append(h("h3", {}, "Hot topics"));
    results.append(a.hot.length ? h("div", { class: "chips" }, a.hot.map(t => h("span", { class: "tag" }, t.term + " · " + t.n + "x"))) : h("p", { class: "note" }, "No topic repeated yet."));

    const q = (g, i) => {
      const hint = h("div", { hidden: true }); let shown = false;
      return h("div", { class: "item" },
        h("div", { class: "row" }, h("span", { class: "tag" }, "Asked " + g.count + "x"), h("span", { class: "note" }, "Years: " + g.years.join(", ") + (g.marks.length ? " · " + g.marks.join("/") + " marks" : ""))),
        h("div", {}, g.text),
        h("button", { class: "ghost", type: "button", onclick: () => {
          shown = !shown; hint.hidden = !shown; if (shown && !hint.firstChild) hint.append(aiBox(() => wrapPrompt("Write a model answer to this exam question, sized to its marks. If marks are unknown, write for 5 marks.", "Question: " + g.text + (g.marks.length ? "\nMarks: " + g.marks[0] : "") + "\nSubject: " + papersState.subject), { onSave: text => { addNote({ title: g.text.slice(0, 70), subject: papersState.subject, body: g.text + "\n\n" + text }); toast("Saved to Notes"); } }));
        } }, "Answer help"), hint);
    };
    results.append(h("h3", {}, "Most repeated questions"));
    if (a.repeated.length) a.repeated.slice(0, 15).forEach((g, i) => results.append(q(g, i)));
    else results.append(h("p", { class: "note" }, "No question was repeated."));
    if (a.due.length) {
      results.append(h("h3", {}, "Repeated before, missing recently"));
      results.append(h("p", { class: "note" }, "Asked more than once but not in the last two years on file."));
      a.due.slice(0, 10).forEach((g, i) => results.append(q(g, i)));
    }
    results.append(h("h3", {}, "Practice set"));
    const n = h("select", { id: "pa-n", "aria-label": "Set size" }, [5, 10, 15, 20].map(x => h("option", { value: x }, x + " questions")));
    const setOut = h("div", { class: "say", hidden: true });
    results.append(row(n, h("button", { class: "ghost", type: "button", onclick: () => {
      const pick = a.repeated.concat(a.groups.filter(g => g.count < 2).sort((x, y) => y.years[0] - x.years[0])).slice(0, Number(n.value));
      setOut.hidden = false;
      setOut.textContent = papersState.subject + " practice set\n\n" + pick.map((g, i) => (i + 1) + ". " + g.text + (g.marks.length ? " [" + g.marks[0] + "]" : "") + "   (asked " + g.count + "x: " + g.years.join(", ") + ")").join("\n");
    } }, "Make practice set"), h("button", { class: "ghost", type: "button", onclick: async () => { if (setOut.textContent) toast(await copyText(setOut.textContent) ? "Copied" : "Select and copy"); } }, "Copy")), setOut);
  }

  const pick = h("select", { id: "pa-pick", "aria-label": "Subject to analyse", onchange: e => { papersState.subject = e.target.value; drawResults(); drawList(); } },
    subjects.map(s => h("option", { selected: s === papersState.subject }, s)));

  /* ----- saved papers, share, import ----- */
  const listBox = col();
  function drawList() {
    listBox.replaceChildren();
    bank.filter(p => p.subject === papersState.subject).sort((a, b) => b.year - a.year).forEach(p => {
      let sure = false;
      const b = h("button", { class: "ghost danger", type: "button", onclick: () => {
        if (!sure) { sure = true; b.textContent = "Tap again"; setTimeout(() => { sure = false; b.textContent = "Remove"; }, 3000); return; }
        bank = bank.filter(x => x.id !== p.id); persist(); go("papers");
      } }, "Remove");
      listBox.append(h("div", { class: "row split" }, h("span", {}, p.year + (p.exam ? " · " + p.exam : "") + " · " + p.questions.length + " questions"), b));
    });
  }
  drawResults(); drawList();

  const box = h("textarea", { id: "pa-share", class: "short", placeholder: "To share, press Copy bank and send the text to a friend. To add a friend's bank, paste it here and press Import." });
  const share = panel(h("h2", {}, "Share with friends"),
    h("p", { class: "note" }, "One friend's papers help everyone. The bank is plain text that you can send on WhatsApp. Imports are checked and limited before saving."),
    box, h("div", { class: "row" },
      h("button", { class: "ghost", type: "button", onclick: async () => { box.value = JSON.stringify({ papers: bank }); toast(await copyText(box.value) ? "Bank copied" : "Select and copy"); } }, "Copy bank"),
      h("button", { class: "ghost", type: "button", onclick: () => {
        let obj; try { obj = JSON.parse(box.value); } catch (e) { toast("That is not a valid bank"); return; }
        const sig = p => p.subject + "|" + p.year + "|" + p.exam + "|" + p.questions.length;
        const have = new Set(bank.map(sig)); const add = sanitizeBank(obj).filter(p => !have.has(sig(p)));
        if (!add.length) { toast("Nothing new to import"); return; }
        bank = bank.concat(add).slice(-400); persist(); toast(add.length + " papers imported"); go("papers");
      } }, "Import")));

  return col(
    panel(h("h2", {}, "Past question analysis"),
      subjects.length ? col(field("Subject", pick, "pa-pick"), results) : h("p", { class: "note" }, "Your bank is empty. Add a paper below, or try the demo data to see how it works.")),
    subjects.length ? panel(h("h3", {}, "Saved papers for this subject"), listBox) : null,
    addPanel, share);
}
