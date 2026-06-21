# Equity Banking

A fictional, premium banking & trading **demo** built as a static Progressive Web App (PWA) for GitHub Pages. It looks and feels like a real fintech product, but collects nothing, has no backend, and performs no real transactions.

> **Equity Banking is a fictional demo environment.** Not a real bank. No deposits are held, no transactions occur, and it is not CDIC‑insured or regulated. For demonstration only.

---

## What it does

- Premium login/welcome screen — accepts any input, stores no password.
- Home dashboard — net worth, account balances, crypto, credit utilization, quick actions.
- Accounts — chequing, high‑interest savings, USD cash (CAD view), credit card, each with detail modals.
- Markets / Portfolio — Canadian + US stocks, ETFs, bonds, crypto, live‑feeling market cards, watchlist, full trade ticket with preview & confirmation.
- Payments — developer/IT subscription tracker (AWS, Cloudflare, Vercel, GitHub Pro, Proton VPN, etc.).
- Cards — debit, credit, and virtual card visuals with freeze toggles and spend limits.
- Insights — CSS/SVG charts for income vs expenses, spending categories, portfolio allocation, and risk profile (no chart libraries).
- Settings — display name, currency, and alert toggles, plus a one‑tap demo reset.

All demo state lives in `localStorage` / `sessionStorage` on your device only.

---

## File structure

```
index.html              App shell: login, app sections, modal + toast hosts, PWA meta
styles.css              Design tokens + all component, chart, and motion styles
app.js                  Single-file app: data store, helpers, router, screens, modals, toasts
manifest.webmanifest    PWA manifest (name, icons, standalone, theme color)
service-worker.js       Offline caching + clean update handling
icon.svg                App icon (geometric "equity" mark)
maskable-icon.svg       Maskable icon with safe-area padding
.nojekyll               Tells GitHub Pages to serve files as-is (no Jekyll processing)
README.md               This file
```

Everything uses **relative paths** (`./styles.css`, `./app.js`, …) so it works from any repository subpath on GitHub Pages.

---

## GitHub Pages setup

1. Create a new GitHub repository (public).
2. Upload **all files in this folder to the repository root** — including the hidden `.nojekyll` file. (In the GitHub web uploader, drag every file in at once.)
3. Go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Set **Branch** to `main` (or `master`) and folder to `/ (root)`, then **Save**.
6. Wait ~1 minute. GitHub will show your live URL, e.g.
   `https://your-username.github.io/your-repo/`
7. Open that URL. You should see the Equity Banking welcome screen.

> No build step. No dependencies. No environment variables.

---

## iPhone install checklist

1. Open your GitHub Pages URL in **Safari** (not Chrome — only Safari can install PWAs on iOS).
2. Tap the **Share** button (the square with an upward arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name (**Equity**) and tap **Add**.
5. Launch it from your Home Screen. It should open **full‑screen, standalone** — no Safari address bar or toolbar.
6. The status bar blends into the dark theme, and the layout respects the notch and home‑indicator safe areas.

---

## Troubleshooting

**Styling does not load (page looks like plain text)**
The browser cannot find `styles.css`. Confirm `styles.css` is in the **same folder** as `index.html` at the repo root, and that paths in `index.html` start with `./`. Hard‑refresh: on desktop, `Cmd/Ctrl + Shift + R`.

**Service worker is serving an old version**
The app uses a versioned cache, but a stubborn cache can persist. Fix: open the site, then in desktop DevTools → **Application → Service Workers → Unregister**, and **Application → Storage → Clear site data**, then reload. On iPhone: remove the Home Screen app, then in **Settings → Safari → Advanced → Website Data**, remove the site, and re‑add it. (Bumping `VERSION` in `service-worker.js` also forces an update for everyone.)

**GitHub Pages shows a 404**
Three common causes: (1) Pages isn't enabled yet — check **Settings → Pages**. (2) You're missing `index.html` at the root. (3) Pages can take a minute on first publish — wait and refresh. Make sure you uploaded files to the **root**, not inside a subfolder.

**Home Screen app still opens like Safari (with the address bar)**
It was added before the manifest/meta tags loaded, or added from a non‑Safari browser. Remove the Home Screen icon and re‑add it from **Safari** after the page has fully loaded once. Confirm `manifest.webmanifest` and the `apple-mobile-web-app-capable` meta tag are present (they are, in `index.html`).

**Icons do not show**
Confirm `icon.svg` and `maskable-icon.svg` are at the repo root next to `index.html`. Some older devices prefer PNG app icons; the SVG icons here work on modern iOS/Android. If an icon looks blank, clear website data and re‑add to Home Screen.

**Login does nothing**
Make sure JavaScript is enabled. Any username/password works — leave them blank to sign in as “Zachary Nichols,” or type a username to personalize the greeting.

---

## Privacy & safety

- No backend, no network requests for your data, no analytics.
- Passwords are never stored or transmitted — the field is cleared on submit.
- The app never asks for real card numbers, banking credentials, SIN/SSN, API keys, or seed phrases.
- All names, balances, holdings, and transactions are fictional.

---

## Resetting

Open **Settings** (tap the Equity wordmark in the top bar) → **Reset demo** to clear your saved display name, preferences, and card states and return to the welcome screen.
