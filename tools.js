"use strict";
/* Tools: exam countdown and plan, grade calculator, attendance, focus timer. All work offline. */

const num = (id, label, val, hint) => { const i = h("input", { id, type: "number", inputmode: "decimal", value: val, placeholder: hint || "", step: "any" }); return { i, el: field(label, i, id) }; };

function viewTools() {
  /* ----- exams and plan ----- */
  let exams = load("exams", []);
  const en = h("input", { id: "ex-n", placeholder: "Exam name" });
  const ed = h("input", { id: "ex-d", type: "date" });
  const list = col();
  function drawExams() {
    exams.sort((a, b) => a.date.localeCompare(b.date));
    list.replaceChildren();
    if (!exams.length) list.append(h("p", { class: "note" }, "No exams added. Add one to see the countdown."));
    exams.forEach((e, i) => {
      const d = daysUntil(e.date);
      list.append(h("div", { class: "row split" }, h("span", {}, h("b", {}, e.name), h("span", { class: "note" }, "  " + e.date)),
        h("span", { class: "tag" + (d >= 0 && d <= 14 ? " due" : "") }, d < 0 ? "Over" : d === 0 ? "Today" : d + " days"),
        h("button", { class: "ghost danger", type: "button", onclick: () => { exams.splice(i, 1); save("exams", exams); drawExams(); } }, "Remove")));
    });
  }
  drawExams();
  const subs = h("textarea", { id: "pl-subs", class: "short", placeholder: "One per line: subject, difficulty 1 to 5\nPhysics, 4\nEnglish, 2" });
  const days = num("pl-days", "Days left", "", "e.g. 30"), hrs = num("pl-hrs", "Study hours per day", 5);
  const planOut = h("div", { class: "say", hidden: true });
  const planner = panel(h("h2", {}, "Study plan"),
    h("p", { class: "note" }, "Splits your time by difficulty. The last 2 days are kept for revision."),
    field("Subjects", subs, "pl-subs"), h("div", { class: "grid" }, days.el, hrs.el),
    h("button", { class: "btn", type: "button", onclick: () => {
      const rows = subs.value.split("\n").map(l => l.split(",")).map(p => ({ n: (p[0] || "").trim(), w: Math.min(5, Math.max(1, Number(p[1]) || 3)) })).filter(r => r.n);
      const D = Number(days.i.value), H = Number(hrs.i.value);
      if (!rows.length || !(D >= 1) || !(H > 0)) { toast("Add subjects, days left and hours"); return; }
      const study = Math.max(D - 2, 1), total = study * H, sw = rows.reduce((a, r) => a + r.w, 0);
      planOut.hidden = false;
      planOut.textContent = "Study days: " + study + ", then " + Math.min(2, D) + " day(s) revision.\nTotal study time: " + Math.round(total) + " hours.\n\n" +
        rows.map(r => r.n + ": " + (total * r.w / sw).toFixed(1) + " hours in total, about " + (H * r.w / sw).toFixed(1) + " hours a day").join("\n") +
        "\n\nTip: study the hardest subject first in the day, when your mind is fresh.";
    } }, "Make plan"), planOut);

  /* ----- SGPA ----- */
  let grades = load("grades", [["", 4, 8], ["", 4, 9], ["", 2, 7]]);
  const gt = h("table");
  const gres = h("div", { class: "win" });
  function drawGrades() {
    gt.replaceChildren(h("tr", {}, ["Subject", "Credits", "Grade point", ""].map(t => h("th", {}, t))),
      ...grades.map((r, i) => h("tr", {}, [0, 1, 2].map(j => h("td", {}, h("input", { value: r[j], type: j ? "number" : "text", step: "any", "aria-label": ["Subject", "Credits", "Grade point"][j], oninput: e => { r[j] = j ? Number(e.target.value) : e.target.value; save("grades", grades); calcGrades(); } }))),
        h("td", {}, h("button", { class: "ghost", type: "button", onclick: () => { grades.splice(i, 1); save("grades", grades); drawGrades(); } }, "x")))));
    calcGrades();
  }
  function calcGrades() {
    const c = grades.reduce((a, r) => a + (r[1] || 0), 0), p = grades.reduce((a, r) => a + (r[1] || 0) * (r[2] || 0), 0);
    gres.textContent = c ? "SGPA = " + (p / c).toFixed(2) + " (" + c + " credits)" : "Enter credits and grade points";
  }
  drawGrades();

  /* ----- CGPA ----- */
  let sems = load("sems", [[8.2, 22], [8.6, 24]]);
  const st = h("table"), cres = h("div", { class: "win" });
  function drawSems() {
    st.replaceChildren(h("tr", {}, ["Semester SGPA", "Credits", ""].map(t => h("th", {}, t))),
      ...sems.map((r, i) => h("tr", {}, [0, 1].map(j => h("td", {}, h("input", { value: r[j], type: "number", step: "any", "aria-label": ["SGPA", "Credits"][j], oninput: e => { r[j] = Number(e.target.value); save("sems", sems); calcSems(); } }))),
        h("td", {}, h("button", { class: "ghost", type: "button", onclick: () => { sems.splice(i, 1); save("sems", sems); drawSems(); } }, "x")))));
    calcSems();
  }
  function calcSems() {
    const c = sems.reduce((a, r) => a + (r[1] || 0), 0), p = sems.reduce((a, r) => a + (r[0] || 0) * (r[1] || 0), 0);
    cres.textContent = c ? "CGPA = " + (p / c).toFixed(2) : "Enter semester results";
  }
  drawSems();
  const grade = panel(h("h2", {}, "Grade calculator"),
    h("p", { class: "note" }, "Uses credit-weighted averages. Check your university's rules for its exact scale and for converting to percentage."),
    h("div", { class: "tablewrap" }, gt), row(h("button", { class: "ghost", type: "button", onclick: () => { grades.push(["", 4, 8]); save("grades", grades); drawGrades(); } }, "Add subject")), gres,
    h("h3", {}, "CGPA from semesters"), h("div", { class: "tablewrap" }, st),
    row(h("button", { class: "ghost", type: "button", onclick: () => { sems.push([8, 24]); save("sems", sems); drawSems(); } }, "Add semester")), cres);

  /* ----- attendance ----- */
  const at = num("at-a", "Classes attended", ""), tt = num("at-t", "Total classes so far", ""), rq = num("at-r", "Required %", 75);
  const atOut = h("div", { class: "win" });
  const calcAt = () => {
    const a = Number(at.i.value), t = Number(tt.i.value), r = Number(rq.i.value);
    if (!(t > 0) || a < 0 || a > t || !(r > 0 && r < 100)) { atOut.textContent = "Enter attended, total and the required percentage."; return; }
    const p = a / t * 100;
    atOut.textContent = "Attendance " + p.toFixed(1) + "%. " + (p >= r ? "You can miss " + Math.floor(100 * a / r - t) + " more class(es) and stay at " + r + "%." : "Attend the next " + Math.ceil((r * t - 100 * a) / (100 - r)) + " class(es) in a row to reach " + r + "%.");
  };
  [at, tt, rq].forEach(x => { x.i.oninput = calcAt; }); calcAt();

  /* ----- focus timer ----- */
  let end = 0, left = 25 * 60, tick = null;
  const mins = num("ft-m", "Minutes", 25), clock = h("div", { class: "big" }, "25:00");
  const fmt = s => pad(Math.floor(s / 60)) + ":" + pad(s % 60);
  const stop = () => { clearInterval(tick); tick = null; };
  const start = h("button", { class: "btn", type: "button", onclick: () => {
    if (tick) { left = Math.max(0, Math.round((end - Date.now()) / 1000)); stop(); start.textContent = "Resume"; return; }
    if (left <= 0 || start.textContent === "Start") left = Math.max(1, Number(mins.i.value) || 25) * 60;
    end = Date.now() + left * 1000; start.textContent = "Pause";
    tick = setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000)); clock.textContent = fmt(s);
      if (!s) { stop(); start.textContent = "Start"; left = 0; toast("Time is up. Take a 5 minute break."); try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) { /* ignore */ } }
    }, 500);
  } }, "Start");
  const reset = h("button", { class: "ghost", type: "button", onclick: () => { stop(); left = Math.max(1, Number(mins.i.value) || 25) * 60; clock.textContent = fmt(left); start.textContent = "Start"; } }, "Reset");
  mins.i.oninput = () => { if (!tick) { left = Math.max(1, Number(mins.i.value) || 25) * 60; clock.textContent = fmt(left); } };
  const timer = panel(h("h2", {}, "Focus timer"), h("p", { class: "note" }, "Keep this screen open while it runs. Study for 25 minutes, rest for 5."), mins.el, clock, row(start, reset));

  return col(
    panel(h("h2", {}, "Exam countdown"), list, h("div", { class: "grid" }, field("Exam", en, "ex-n"), field("Date", ed, "ex-d")),
      row(h("button", { class: "btn", type: "button", onclick: () => {
        if (!en.value.trim() || !ed.value) { toast("Add a name and a date"); return; }
        exams.push({ name: en.value.trim().slice(0, 60), date: ed.value }); save("exams", exams); en.value = ""; drawExams();
      } }, "Add exam"))),
    planner, grade,
    panel(h("h2", {}, "Attendance"), h("div", { class: "grid" }, at.el, tt.el, rq.el), atOut), timer);
}
