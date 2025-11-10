# MBA Practice – Data Analysis for Managers (Web App)

A tiny, single-page web app that turns two core practice-exam questions into interactive exercises:
- **Q1:** Sampling vs. population; parameter vs. statistic (numbers regenerate).
- **Q2:** Normal distribution interpretation with the **68–95–99.7** rule (μ, σ, and the threshold regenerate). Includes an inline normal curve with the upper tail shaded.

No frameworks. Pure **HTML/CSS/JS**.

---

## Quick Start (Local)

```bash
# 1) Clone or create the repo
git clone <your-repo-url>.git
cd <your-repo-name>

# 2) Copy the files from this folder into the repo root
# (or unzip and move them)
ls
# -> index.html style.css app.js README.md

# 3) Serve locally (choose ONE)
# Option A: Python 3 built-in server
python3 -m http.server 8000

# Option B: Node (if installed)
npx http-server -p 8000

# 4) Open your browser
open http://localhost:8000
```

---

## Deploy with GitHub Pages

1. Create a new repo on GitHub (e.g., `mba-practice-exam-app`).
2. Push these files to the repo's **main** branch.

```bash
git init
git add .
git commit -m "Initial commit: MBA practice app"
git branch -M main
git remote add origin https://github.com/<YOUR_GH_USERNAME>/mba-practice-exam-app.git
git push -u origin main
```

3. In GitHub, go to **Settings → Pages**  
   - **Source:** `Deploy from a branch`  
   - **Branch:** `main` (root)  
   - Save. You’ll get a public URL shortly.

---

## What’s Inside

- `index.html` — Structure and UI for the two questions.
- `style.css` — Minimal, clean styling.
- `app.js` — Randomizes numbers, checks Q2 using the empirical rule, draws a normal curve with the upper-tail shaded, and shows model answers.

---

## Notes / Extensibility

- The Q2 threshold is constructed as \( x = \mu + k\sigma \) with \( k \in \{1,2,3\} \), so the expected upper-tail by the empirical rule is about **16%**, **2.5%**, or **0.15%** respectively.
- You can add more questions by copying the `section` block and adding logic to `app.js`.
- If you want to swap the empirical-rule check for a more precise Normal tail using z-tables, you can add a small `erf` approximation and compute \(1-\Phi(z)\).

---

## License

MIT — do whatever you want; attribution appreciated.
