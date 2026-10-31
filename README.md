# Study Desk

A study app for college students. Built for Calcutta University and national exams, but it works for any university.

| Tab | What it does |
| --- | --- |
| **Updates** | Reads the official notice pages of Calcutta University, GATE, UGC NET, CSIR NET, CUET UG and CUET PG. Shows what is NEW since you last looked. You can add more sites. |
| **Explain** | Breaks down any hard topic in simple words (English, Bengali, Hindi or Hinglish). Also analyses a whole subject into topics, importance and study order. |
| **Notes** | Write, search and store notes by subject. AI can make notes, summaries, exam questions or flashcards from a note. |
| **Papers** | A bank of REAL past questions. The app finds repeated questions, hot topics, and questions that were asked before but are missing recently. It builds practice sets, and gives model answers on tap. |
| **Cards** | Flashcards with spaced repetition. Lines like `question :: answer` in a note become cards. |
| **Tools** | Exam countdown, study plan, SGPA and CGPA, attendance calculator, focus timer. |
| **Me** | Your course, answer language, optional AI key, safety list, backup. |

## The honest limits

* **Past papers.** I could not find Calcutta University past question papers published on its site, and the app does not invent questions. You and your friends add the real papers you have (from your department, library or seniors). Paste the text from a PDF, or type it. One friend can copy the bank and send it on WhatsApp, and everyone imports it. The more papers added, the better the analysis. Use the demo data first to see how it works.
* **Updates.** The app reads the pages on the phone, so it works in the Android app only. In a browser it shows official links. Websites change their layout, so a source can fail one day. It then says so and shows an Open button. I could not test the live sites from where I built this, so check the Updates tab on your phone first.
* **AI.** There is no AI inside. Two ways to use one:
  1. **No setup:** every AI button can hand the question to ChatGPT, Claude, Perplexity, Copilot, Gemini or any app in your share menu.
  2. **Inside the app (optional):** each person adds their own free Google AI key in the Me tab (get it at aistudio.google.com). Then the Ask AI here button answers inside the app. Google's free tier may use what you send to improve its products, so do not send private details.

## Get the Android app

GitHub builds it for free.

1. Make a **new** repository on github.com, name it `study-desk`.
2. Upload these files (select all together): every file ending in `.js`, plus `index.html`, `styles.css`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `package.json`, `capacitor.config.json`, `.gitignore`.
3. **Create your signing passphrase (once).** Think of 5 random words, for example `river lamp orange seven chalk`. Write it on paper. In your repository open **Settings > Secrets and variables > Actions > New repository secret**. Name it exactly `SIGNING_PASSPHRASE` and paste your words as the value. Never put this passphrase in a chat, a note app or a file in the repository.
4. Add the robot files. **Add file > Create new file**. In the name box type `.github/workflows/build-apk.yml`. Paste in the contents of that file. Commit. Repeat for `.github/workflows/web.yml` if you want the web version.
5. Open the **Actions** tab. Wait about 6 minutes for **Build signed Android APK** to turn green. The first run also creates your private signing key and saves it in the `signing` folder, encrypted with your passphrase.
6. Open the run, scroll to **Artifacts**, download **StudyDesk-apk**, unzip it. It holds `StudyDesk.apk` and `SHA256.txt`.
7. Install `StudyDesk.apk` on the phone (Android asks to allow installing from your browser or file app). If an older Study Desk from a test build is installed, uninstall it first, because the signature is different.

If the build turns red, open the failed step and send me the error text.

### Your signing key

Android only accepts an update if it is signed by the same key as the installed app. That key is what stops a fake copy from replacing your app.

* The key is made once inside GitHub's build, saved encrypted (AES-256 with a slow key derivation) in `signing/release.keystore.enc`, and unlocked only by your `SIGNING_PASSPHRASE` secret. A long random passphrase makes it practically impossible to crack.
* **Do not lose the passphrase.** Without it, no one can sign updates, and friends would have to uninstall and reinstall.
* If you ever think the passphrase leaked, delete `signing/release.keystore.enc`, change the secret, and run the build again. Friends reinstall once.
* Do not change the passphrase secret after the first build, or the saved key cannot be opened.

### Check that an app is genuine

After the build, `SHA256.txt` shows the **signing certificate SHA-256**. On any phone, open the app's info in an APK inspector or App info, find **Certificate signature, SHA-256 fingerprint**, and check it matches. If it says "Debug certificate" or shows a different fingerprint, do not use that copy.

## Sharing with friends safely

* Send friends the **link to your GitHub repository** and tell them to download the APK from the Actions tab, or send them the APK file together with the line from `SHA256.txt`. They can check the file has not been changed.
* Never forward a copy that came through another person. Always take it from your own repository.
* The app has no accounts and no server. Nothing about your friends reaches you or anyone else.

## How the app is protected

* **No third-party code.** No ads, analytics, CDN scripts or fonts. Everything is in these files, which you can read.
* **Allowlist.** The app can only contact the sites in `data.js` (plus sites you add, https only, no IP addresses) and Google's AI service when you add a key. Every request is checked in `core.js` before it leaves, and redirects are checked too.
* **No code from the internet runs.** Website text and AI text are drawn as plain text only. There is no `innerHTML`, `eval` or `document.write` anywhere. Fetched web pages are read with an inert parser, so scripts in them never run.
* **Strict content policy** in `index.html` blocks outside scripts, frames, plugins and forms. The web build is stricter still.
* **Android hardening.** The build turns off phone backup and plain http, disables web debugging and asks for the Internet permission only. Packages are installed with install scripts disabled.
* **Release build, not debuggable.** The build checks the finished APK and fails if it is debuggable.
* **Your own signing key.** The APK is signed with a private key that only you can unlock, not the shared Android test key. The build prints the signing fingerprint and the app permissions so you can read them.
* **Your data stays on the phone.** The AI key is stored only in the app's private storage and is never included in backups.
* **Imports are checked.** A friend's question bank or backup is validated and size limited before saving.

What it cannot do: it cannot protect a phone that is already infected, or a person who installs a fake copy, or a person who types passwords into a note. Keep Play Protect on and install only from your own repository.

## Make it yours

* `data.js`: official sites, languages, AI prompts, safety text.
* `styles.css`: colours and spacing.
* `capacitor.config.json`: app name and ID.
* To add a source permanently, add a line to `SOURCES` in `data.js`.
