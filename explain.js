"use strict";
/* Explain: break down any hard topic, or analyse a whole subject. */

function subjectsInBank() {
  return [...new Set(load("bank", []).map(p => p.subject))].sort();
}

function viewExplain() {
  const topic = h("textarea", { id: "ex-topic", placeholder: "Example: Kirchhoff's laws, Fourier series, Marxist theory of state, double-entry bookkeeping...", class: "short" });
  const subj = h("input", { id: "ex-subj", placeholder: "Subject (optional)" });
  const style = h("select", { id: "ex-style" }, Object.keys(EXPLAIN_STYLES).map(k => h("option", {}, k)));
  const box1 = aiBox(() => {
    if (!topic.value.trim()) { topic.focus(); toast("Type a topic first"); return ""; }
    return wrapPrompt(EXPLAIN_STYLES[style.value], "Topic: " + topic.value.trim() + (subj.value.trim() ? "\nSubject: " + subj.value.trim() : ""));
  }, { onSave: text => { addNote({ title: topic.value.trim().slice(0, 80) || "Explained topic", subject: subj.value.trim(), body: text }); toast("Saved to Notes"); } });

  const sName = h("input", { id: "an-subj", placeholder: "Subject name, e.g. Physics Hons Sem 3", list: "bank-subjects" });
  const sList = h("datalist", { id: "bank-subjects" }, subjectsInBank().map(s => h("option", { value: s })));
  const syl = h("textarea", { id: "an-syl", placeholder: "Paste the syllabus here if you have it (optional).", class: "short" });
  const box2 = aiBox(() => {
    if (!sName.value.trim()) { sName.focus(); toast("Type the subject first"); return ""; }
    const papers = load("bank", []).filter(p => p.subject === sName.value.trim());
    let facts = "";
    if (papers.length) {
      const a = analyse(papers);
      facts = "\n\nReal facts from " + a.papers + " saved past papers of this subject (" + a.questions + " questions): hot topics are " +
        (a.hot.slice(0, 10).map(t => t.term + " (" + t.n + "x)").join(", ") || "none yet") + ". Use these facts as given.";
    }
    return wrapPrompt("Analyse this subject for exam preparation. Give: 1) the main units or topic areas, 2) for each, how important it usually is (High, Medium, Low) and why, 3) the hardest parts and what makes them hard, 4) the usual types of questions asked, 5) a smart order to study the topics in.",
      "Subject: " + sName.value.trim() + (syl.value.trim() ? "\n\nSyllabus:\n" + syl.value.trim().slice(0, 6000) : "") + facts);
  }, { onSave: text => { addNote({ title: "Subject analysis: " + sName.value.trim().slice(0, 60), subject: sName.value.trim(), body: text }); toast("Saved to Notes"); } });

  return col(
    panel(h("h2", {}, "Explain a hard topic"),
      h("p", { class: "note" }, "Answers come in " + cfg.lang + ". Change the language in the Me tab."),
      field("Topic", topic, "ex-topic"),
      h("div", { class: "grid" }, field("Subject", subj, "ex-subj"), field("How should I explain it?", style, "ex-style")),
      box1),
    panel(h("h2", {}, "Analyse a whole subject"),
      h("p", { class: "note" }, "Gets a topic map with importance and study order. If you saved past papers for this subject, their real hot topics are included."),
      field("Subject", sName, "an-subj"), sList, field("Syllabus", syl, "an-syl"), box2));
}
