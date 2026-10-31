"use strict";
/* Shared helpers: safe DOM building, storage, the network allowlist, AI calls and the AI box. */

const $ = id => document.getElementById(id);
const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

/* Builds elements with text nodes only. There is no innerHTML anywhere in this app. */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === "class") el.className = v;
    else if (k === "value" || k === "checked" || k === "disabled" || k === "hidden" || k === "selected") el[k] = v;
    else if (k.startsWith("on")) el[k] = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
const col = (...k) => h("div", { class: "col" }, ...k);
const row = (...k) => h("div", { class: "row" }, ...k);
const field = (label, el, id) => h("div", {}, h("label", { for: id }, label), el);
const panel = (...k) => h("section", { class: "panel" }, ...k);

/* ---------- storage ---------- */
const PREFIX = "sd:";
function load(k, fb) { try { const v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
function save(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch (e) { toast("Phone storage is full or blocked"); return false; } }
function wipe() { try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ } }

const cfg = Object.assign({ course: "", uni: "Calcutta University", sem: "", lang: "English", model: "gemini-2.5-flash", lastViewed: 0, custom: [] }, load("cfg", {}));
const saveCfg = () => save("cfg", cfg);
const getKey = () => load("key", "");

/* ---------- dates, toast, clipboard, share ---------- */
const pad = n => String(n).padStart(2, "0");
const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const daysUntil = s => Math.ceil((new Date(s + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = h("textarea", { value: text }); document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (_) { /* ignore */ }
    ta.remove(); return ok;
  }
}
async function shareText(text, title) {
  const native = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
  try {
    if (native) { await native.share({ title, text, dialogTitle: "Send to an app" }); return "shared"; }
    if (navigator.share) { await navigator.share({ title, text }); return "shared"; }
  } catch (e) { if (e && (e.name === "AbortError" || /cancel/i.test(e.message || ""))) return "cancelled"; }
  return (await copyText(text)) ? "copied" : "failed";
}

/* ---------- network allowlist ---------- */
const hostOf = u => { try { return new URL(u).hostname.toLowerCase(); } catch (e) { return ""; } };
const sourceList = () => SOURCES.concat(cfg.custom.map(c => ({ id: "c:" + c.url, name: c.name, group: "Mine", url: c.url })));
function allowedHosts() {
  const s = new Set(API_HOSTS);
  sourceList().forEach(x => s.add(hostOf(x.url)));
  return s;
}
function urlAllowed(url) {
  let u; try { u = new URL(url); } catch (e) { return false; }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  return allowedHosts().has(u.hostname.toLowerCase()) || EXTRA_PREFIXES.some(p => url.startsWith(p));
}
/* A custom source must be a normal public https address, not an IP, localhost or a local name. */
function validCustomUrl(url) {
  let u; try { u = new URL(url); } catch (e) { return false; }
  const host = u.hostname.toLowerCase();
  return u.protocol === "https:" && !u.username && !u.password && host.includes(".") && !/^[\d.]+$/.test(host)
    && !host.includes(":") && !/(^|\.)(localhost|local|internal|lan)$/.test(host);
}
async function safeFetch(url, init, ms) {
  if (!urlAllowed(url)) throw new Error("blocked");
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => { if (ctl) ctl.abort(); rej(new Error("The site took too long to answer.")); }, ms || 20000); });
  try {
    const res = await Promise.race([fetch(url, Object.assign({ redirect: "follow", credentials: "omit", signal: ctl && ctl.signal }, init || {})), timeout]);
    if (res.url && !urlAllowed(res.url)) throw new Error("blocked");
    return res;
  } finally { clearTimeout(timer); }
}
async function fetchText(url) {
  const res = await safeFetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  let t = await res.text();
  if (t.length > 3000000) t = t.slice(0, 3000000);
  return t;
}

/* ---------- AI (own key) ---------- */
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/";
async function callGemini(prompt) {
  const key = getKey();
  if (!key) throw new Error("Add your free AI key in the Me tab first.");
  const res = await safeFetch(GEMINI + "models/" + encodeURIComponent(cfg.model) + ":generateContent", {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } })
  }, 60000);
  let data = {}; try { data = await res.json(); } catch (e) { /* not json */ }
  if (!res.ok) {
    throw new Error(res.status === 429 ? "Too many requests. Wait a minute and try again."
      : res.status === 400 || res.status === 403 || res.status === 404 ? "The key or model was not accepted. Check Me, then Test my key."
      : "The AI service had a problem (" + res.status + "). Try again later.");
  }
  const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  const text = parts.map(p => p.text || "").join("").trim();
  if (!text) throw new Error("The AI returned nothing. Try again or rephrase.");
  return text;
}
async function listModels() {
  const res = await safeFetch(GEMINI + "models?pageSize=100", { headers: { "x-goog-api-key": getKey() } });
  if (!res.ok) throw new Error("not accepted");
  const data = await res.json();
  return (data.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent") && /gemini/.test(m.name))
    .map(m => m.name.replace(/^models\//, "")).sort((a, b) => (/flash/.test(b) - /flash/.test(a)) || a.localeCompare(b));
}

/* The standard instructions wrapped around every AI request. */
function wrapPrompt(task, body) {
  const me = [cfg.course && "Course: " + cfg.course, cfg.uni && "University: " + cfg.uni, cfg.sem && "Semester: " + cfg.sem].filter(Boolean).join(". ");
  return "You are a patient tutor for an Indian college student. " + me + "\nReply in " + cfg.lang + ". Use simple words and short sentences. " +
    "Use plain text with simple headings and \"-\" bullets, no tables. Do not invent facts, dates, or past exam questions. If you are unsure, say so.\n\nTask: " + task + "\n\n" + body;
}

/* ---------- safe rendering of AI text (builds DOM, never HTML) ---------- */
function inlineMd(text) {
  const frag = document.createDocumentFragment();
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    const s = m[0]; frag.append(s[0] === "*" ? h("strong", {}, s.slice(2, -2)) : h("code", {}, s.slice(1, -1)));
    last = m.index + s.length;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}
function renderMd(src) {
  const root = document.createDocumentFragment(); let list = null, kind = "";
  for (const raw of String(src).split(/\r?\n/)) {
    const line = raw.trimEnd(); let m;
    if (!line.trim()) { list = null; continue; }
    if ((m = line.match(/^\s*#{1,4}\s+(.*)$/))) { list = null; root.append(h("h4", { class: "mdh" }, inlineMd(m[1]))); continue; }
    if ((m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/))) {
      const t = /^\s*\d/.test(line) ? "ol" : "ul";
      if (!list || kind !== t) { list = h(t, { class: "mdl" }); kind = t; root.append(list); }
      list.append(h("li", {}, inlineMd(m[1]))); continue;
    }
    list = null; root.append(h("p", { class: "mdp" }, inlineMd(line)));
  }
  return root;
}

/* ---------- the AI box: in-app answer if a key exists, hand-off to any other AI app always ---------- */
function aiBox(getPrompt, opts) {
  opts = opts || {};
  const out = h("div", { class: "md", hidden: true });
  let last = "";
  const actions = h("div", { class: "row", hidden: true },
    h("button", { class: "ghost", type: "button", onclick: async () => toast(await copyText(last) ? "Copied" : "Select the text to copy") }, "Copy answer"),
    opts.onSave ? h("button", { class: "ghost", type: "button", onclick: () => opts.onSave(last) }, opts.saveLabel || "Save to notes") : null);
  const askBtn = getKey() ? h("button", { class: "btn", type: "button", onclick: async () => {
    const p = getPrompt(); if (!p) return;
    askBtn.disabled = true; out.hidden = false; actions.hidden = true;
    out.replaceChildren(h("p", { class: "note" }, "Thinking..."));
    try { last = await callGemini(p); out.replaceChildren(renderMd(last)); actions.hidden = false; }
    catch (e) { out.replaceChildren(h("p", { class: "err" }, e.message === "blocked" ? "That address is not on the allowed list." : e.message)); }
    finally { askBtn.disabled = false; }
  } }, "Ask AI here") : null;
  const links = h("div", { class: "row" }, AI_APPS.map(app => {
    const a = h("a", { class: "ghost", href: "#", target: "_blank", rel: "noopener noreferrer" }, app.name);
    const set = () => { const p = getPrompt(); a.href = p ? app.url(encodeURIComponent(p)) : "#"; };
    a.onpointerdown = a.onfocus = set;
    a.onclick = e => { const p = getPrompt(); if (!p) { e.preventDefault(); return; } copyText(p); if (app.noPrefill) toast("Prompt copied. Paste it in Gemini."); };
    return a;
  }));
  return h("div", { class: "aibox" },
    h("div", { class: "row" }, askBtn,
      h("button", { class: askBtn ? "ghost" : "btn", type: "button", onclick: async () => {
        const p = getPrompt(); if (!p) return; const r = await shareText(p, "Question"); if (r === "copied") toast("Copied. Paste it in any AI app.");
      } }, "Send to any AI app")),
    h("p", { class: "note" }, askBtn ? "Or open another AI app with the question ready:" : "No key added, so the question goes to an AI app you already use. Open one:"),
    links, out, actions);
}
