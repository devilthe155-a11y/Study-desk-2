"use strict";
/* Content and settings that are safe to edit. Sources you add here become allowed hosts automatically. */

/* Official pages checked for announcements. Only these hosts (plus ones you add in the app) can be contacted. */
const SOURCES = [
  { id: "cu-news", name: "Calcutta University: News", group: "University", url: "https://www.caluniv.ac.in/news/news.html" },
  { id: "cu-adm", name: "Calcutta University: Admission and Exams", group: "University", url: "https://www.caluniv.ac.in/admission/admission.html" },
  { id: "gate", name: "GATE 2027 (IIT Madras)", group: "Exams", url: "https://gate2027.iitm.ac.in/" },
  { id: "nta", name: "NTA (all national exams)", group: "Exams", url: "https://nta.ac.in/" },
  { id: "ugcnet", name: "UGC NET", group: "Exams", url: "https://ugcnet.nta.nic.in/" },
  { id: "csir", name: "CSIR UGC NET", group: "Exams", url: "https://csirnet.nta.nic.in/" },
  { id: "cuet", name: "CUET UG", group: "Exams", url: "https://cuet.nta.nic.in/" },
  { id: "cuetpg", name: "CUET PG", group: "Exams", url: "https://pgcuet.samarth.ac.in/" }
];

/* Calcutta University stores its notice PDFs here. Links under these prefixes may be opened. */
const EXTRA_PREFIXES = ["https://s3.ap-south-1.amazonaws.com/caluniv/"];

/* The only AI service the app calls by itself, and only when you add your own key. */
const API_HOSTS = ["generativelanguage.googleapis.com"];

const LANGS = ["English", "Bengali", "Hindi", "Hinglish (Hindi in English letters)"];

const EXPLAIN_STYLES = {
  "Very simple (like I am 12)": "Explain it with everyday words and one real-life comparison. No jargon without explaining it. Then give a 3-line summary.",
  "Exam-ready answer": "Write it the way a good student would write it in an exam: a definition, key points, a diagram description if useful, a formula or example, and a short conclusion. Mention how many marks this length suits.",
  "Step by step with an example": "Break it into numbered steps and work through one complete solved example. Point out the common mistakes.",
  "Why it matters + memory trick": "Explain why this topic exists and where it is used. Then give a memory trick or mnemonic and 3 quick self-test questions with answers."
};

const NOTE_TASKS = {
  "Make notes on this topic": "Write clear revision notes on the topic named in the note title (and the text if present). Use headings and short bullet points. End with a 5-line quick revision box.",
  "Summarize my note": "Summarize the note into the most important points an examiner would expect. Keep it under 150 words.",
  "Make 10 exam questions from my note": "Write 10 exam-style questions from this note, a mix of short (2 marks) and long (5 marks). Give a one-line answer hint for each.",
  "Make flashcards from my note": "Make 10 flashcards from this note. Output ONLY lines in the exact form: question :: answer"
};

const AI_APPS = [
  { name: "ChatGPT", url: q => "https://chatgpt.com/?q=" + q },
  { name: "Claude", url: q => "https://claude.ai/new?q=" + q },
  { name: "Perplexity", url: q => "https://www.perplexity.ai/search?q=" + q },
  { name: "Copilot", url: q => "https://copilot.microsoft.com/?q=" + q },
  { name: "Gemini", url: () => "https://gemini.google.com/app", noPrefill: true }
];

const SAFETY_POINTS = [
  "No accounts, no tracking, no ads, and no third-party code. The app has no server of its own.",
  "It can only contact the official sites listed below, and Google's AI service if you add your own key. Anything else is blocked inside the app.",
  "Text from websites and from AI is shown as plain text only. The app never runs it as code.",
  "Your notes, cards, papers and key stay on this phone. They are never uploaded.",
  "Backups are turned off for the Android app, so the key is not copied into phone backups.",
  "The code is small and open. Anyone can read it on GitHub before installing."
];

const USER_TODO = [
  "Install the app only from the link or file of your own GitHub repository, never from a forwarded copy.",
  "Keep Google Play Protect turned on.",
  "Never type passwords, OTPs, Aadhaar or bank details into notes or AI questions.",
  "Use a free AI key made only for this app, and never share a backup that you edited by hand.",
  "If you friend-share the app, send the link to your repository, not a changed file."
];
