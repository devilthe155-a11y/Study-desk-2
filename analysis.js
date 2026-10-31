"use strict";
/* Pure functions that analyse saved past questions. No network, no DOM, so they are easy to test. */

const STOP = new Set(("a an the of and or to in on for with by from is are was were be been being as at that this these those it its which what when where who whom whose why how " +
  "define explain describe discuss state write short note notes brief briefly give differentiate distinguish between among example examples using derive prove show find obtain " +
  "calculate determine mention list any following answer question marks mark each all both either neither than then there their his her they them can could should would will " +
  "shall may might must also not no yes if else do does did done has have had having into over under about above below up down out off per via etc ie eg write down one two three four five six neat diagram diagrams sketch draw label labelled illustrate suitable appropriate properly clearly necessary relevant").split(/\s+/));

function stem(w) {
  if (w.length > 5 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 3 && w.endsWith("s") && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

function tokens(text) {
  return String(text).toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)).map(stem);
}

function similar(a, b) {
  if (!a.size || !b.size) return false;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter, min = Math.min(a.size, b.size);
  return inter / union >= 0.6 || (min >= 3 && inter / min >= 0.75);
}

/* Turns pasted text into questions. byNumber joins wrapped lines and starts a new question at 1. 2. Q3 a) etc. */
function parseQuestions(text, byNumber) {
  const lines = String(text).replace(/\r/g, "").split("\n").map(s => s.trim()).filter(Boolean);
  const start = /^(?:q(?:uestion)?\.?\s*)?(?:\d{1,2}|[ivx]{1,4}|[a-e])\s*[.)]\s+/i;
  let qs = [];
  if (byNumber) {
    for (const l of lines) { if (start.test(l) || !qs.length) qs.push(l); else qs[qs.length - 1] += " " + l; }
  } else qs = lines;
  return qs.map(s => {
    let m = null;
    s = s.replace(/\[(\d{1,3})\s*(?:marks?)?\]|\((\d{1,3})\s*marks?\)/i, (x, a, b) => { m = Number(a || b); return ""; });
    s = s.replace(start, "").replace(/\s+/g, " ").trim();
    return { t: s.slice(0, 500), m };
  }).filter(q => q.t.length >= 8).slice(0, 300);
}

/* Groups questions that are the same or nearly the same across papers. */
function groupQuestions(papers) {
  const items = [];
  for (const p of papers) for (const q of p.questions) items.push({ t: q.t, m: q.m, year: p.year, pid: p.id });
  items.sort((a, b) => b.year - a.year);
  const groups = [];
  for (const it of items) {
    const set = new Set(tokens(it.t));
    let g = groups.find(x => similar(x.set, set));
    if (!g) { g = { text: it.t, set, years: [], pids: new Set(), marks: [] }; groups.push(g); }
    if (!g.years.includes(it.year)) g.years.push(it.year);
    g.pids.add(it.pid);
    if (it.m) g.marks.push(it.m);
  }
  return groups.map(g => ({ text: g.text, years: g.years.sort((a, b) => b - a), count: g.pids.size, marks: g.marks, set: g.set }));
}

/* Words and word pairs that show up in many different questions. */
function hotTerms(groups, limit) {
  const map = new Map();
  for (const g of groups) {
    const toks = [...tokens(g.text)];
    const terms = new Set(toks);
    for (let i = 0; i < toks.length - 1; i++) if (toks[i] !== toks[i + 1]) terms.add(toks[i] + " " + toks[i + 1]);
    for (const t of terms) {
      const e = map.get(t) || { term: t, n: 0, years: new Set() };
      e.n += g.count; g.years.forEach(y => e.years.add(y)); map.set(t, e);
    }
  }
  const all = [...map.values()].filter(e => e.n >= 2);
  const covered = new Set();
  for (const e of all) if (e.term.includes(" ")) for (const part of e.term.split(" ")) { const u = map.get(part); if (u && u.n === e.n) covered.add(part); }
  return all.filter(e => !covered.has(e.term))
    .sort((a, b) => (b.n + (b.term.includes(" ") ? 0.5 : 0)) - (a.n + (a.term.includes(" ") ? 0.5 : 0)))
    .slice(0, limit || 15)
    .map(e => ({ term: e.term, n: e.n, years: [...e.years].sort((a, b) => b - a) }));
}

function analyse(papers) {
  const groups = groupQuestions(papers);
  const years = papers.map(p => p.year);
  const latest = years.length ? Math.max(...years) : 0;
  const repeated = groups.filter(g => g.count >= 2).sort((a, b) => b.count - a.count || b.years[0] - a.years[0]);
  const due = repeated.filter(g => g.years[0] <= latest - 2);
  const marks = groups.flatMap(g => g.marks);
  return {
    papers: papers.length, questions: papers.reduce((n, p) => n + p.questions.length, 0), latest, groups, repeated, due,
    hot: hotTerms(groups, 15),
    avgMarks: marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length * 10) / 10 : null
  };
}

/* Checks an imported bank and keeps only safe, bounded data. */
function sanitizeBank(obj) {
  const list = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.papers) ? obj.papers : []);
  const out = [];
  for (const p of list.slice(0, 200)) {
    if (!p || typeof p !== "object" || !Array.isArray(p.questions)) continue;
    const year = Math.round(Number(p.year));
    if (!(year >= 1990 && year <= 2100)) continue;
    const qs = p.questions.slice(0, 300).map(q => ({
      t: String(q && q.t != null ? q.t : "").replace(/\s+/g, " ").trim().slice(0, 500),
      m: q && Number(q.m) > 0 && Number(q.m) <= 100 ? Math.round(Number(q.m)) : null
    })).filter(q => q.t.length >= 8);
    if (!qs.length) continue;
    out.push({ id: "p" + Math.random().toString(36).slice(2, 10), subject: String(p.subject || "").trim().slice(0, 80) || "Unnamed",
      year, exam: String(p.exam || "").trim().slice(0, 80), questions: qs });
  }
  return out;
}

if (typeof module !== "undefined") module.exports = { tokens, similar, parseQuestions, groupQuestions, hotTerms, analyse, sanitizeBank };
