# Trevor Micro‑Learning Site (GitHub Pages)

Static website that loads `sessions.json` and unlocks the next session only after passing each 5‑question quiz.

## Host on GitHub Pages
1. Create a new **Public** GitHub repository (e.g., `trevor-learning`).
2. Upload everything in this folder to the repository root:
   - `index.html`, `style.css`, `app.js`, `sessions.json`, `assets/…`
3. Go to **Settings → Pages**.
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** and folder: **/** (root)
5. Save, wait 1–3 minutes, then open the URL GitHub shows.

## Notes
- Progress saves in the browser (localStorage). Click **Export progress** to download a progress JSON.
- Parent Mode shows quiz answers/suggested answers.