# Equity — Banking & Investing (demo)

A polished, mobile‑first **banking & investing progressive web app (PWA)**, built as a single set of static files for **GitHub Pages**. It looks and behaves like a real premium banking app — light **and** dark themes, a client‑side data layer where money actually moves between accounts, real‑feeling trades, cards, payments, insights, and search.

> ⚠️ **Equity is a fictional demo. It is not a real bank.** No money is held, no real transactions occur, and it is not insured or regulated. It never asks for or stores real credentials, card numbers, SINs/SSNs, API keys, or seed phrases. Any username/password is accepted at sign‑in and the password is never saved.

---

## What it does

- **Sign in** — accepts anything; the password is discarded immediately. "Use Face ID" is a one‑tap demo entry.
- **Home** — total balance, day change, quick actions (Send / Deposit / Pay / Invest), account snapshots, credit‑card summary, recent activity.
- **Accounts** — chequing, high‑interest savings, a USD account, and a credit card, each with details and history.
- **Activity** — full transaction list with **live search** and category filters, grouped by day.
- **Cards** — realistic card art, freeze/unfreeze (persists), spend limits, and per‑card activity.
- **Invest** — portfolio value, markets strip with sparklines, holdings by asset class, watchlist, and a **buy/sell ticket** with a preview→confirm step.
- **Insights** — income vs. expenses, spending by category, a portfolio‑allocation donut, and a risk gauge.
- **Payments** — developer/IT subscriptions (AWS EC2/S3, Cloudflare, DigitalOcean, Vercel, GitHub Pro, Proton VPN, Namecheap, Datadog, and more) with pay‑now and pause.
- **More / Profile** — theme (System/Light/Dark), hide‑balances privacy mode, alert toggles, rename, and reset.

Everything is driven by a single source of truth: **transfers, deposits, bill payments, and trades genuinely mutate balances and holdings, conserve net worth, and persist across reloads.**

---

## Files

```
index.html              App shell + sign‑in screen; sets theme before first paint (no flash)
styles.css              Design system with full light + dark token sets
app.js                  Client‑side "backend": Store, simulated API, views, router, all logic
manifest.webmanifest    PWA manifest (name, icons, standalone, theme colour)
service-worker.js       Offline cache: app‑shell precache + cache‑first assets
icon.svg                App icon (the ascending "Equity" bars)
maskable-icon.svg       Maskable icon with safe‑area padding (Android/PWA)
.nojekyll               Tells GitHub Pages to serve files as‑is
README.md               This file
```

All asset paths are **relative** (`./styles.css`, `./app.js`, …), so the app works whether it is served from a repository subpath (`user.github.io/repo/`) or a custom domain.

---

## Architecture (the "backend")

This is a static site, so the backend is **simulated entirely in the browser** — but built like a real one:

- **Normalized Store** — a single state object (accounts, cards, holdings, transactions, subscriptions, notifications, preferences) with subscribe/notify and **debounced persistence** to `localStorage`, including a **schema version + migration** so future changes don't corrupt saved data.
- **Simulated async API** — every action (`signIn`, `transfer`, `deposit`, `payBill`, `placeTrade`, `setCardFrozen`, …) is asynchronous with realistic latency, validates its inputs, and rejects with friendly errors (e.g. insufficient funds). The UI shows spinners and confirmation toasts, and **re‑renders live** from the new state.
- **Money in integer cents** — all amounts are stored and computed as integers (cents), so there is no floating‑point drift; values are formatted for display only.
- **Market simulation** — a gentle, bounded price tick updates holdings and the portfolio while the tab is visible (and pauses when hidden or when the user prefers reduced motion).
- **Security‑style touches** — hash‑based SPA routing, a privacy mode that blurs every balance, and **automatic sign‑out after inactivity**.
- **Self‑healing storage** — saved data is validated on load; corrupt or hand‑edited state is detected and rebuilt from defaults (keeping your theme and name), pending writes are flushed before the tab closes, and any unexpected render error shows a recoverable fallback instead of a blank screen.

No network calls are made and no data ever leaves the device.

---

## Run it on GitHub Pages

1. Create a new repository and upload **all** the files in this folder to the root (keep the filenames, including `.nojekyll`).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source = Deploy from a branch**, choose your branch (e.g. `main`) and **/ (root)**, then **Save**.
4. Wait ~1 minute, then open the URL Pages gives you (e.g. `https://yourname.github.io/your-repo/`).

To preview locally, serve the folder over HTTP (a service worker won't register from `file://`):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Install on iPhone (standalone app)

1. Open the Pages URL in **Safari** on iOS.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch it from the new Home‑Screen icon. It opens **full‑screen** (no Safari chrome), respects the notch/safe areas, and works offline after the first load.

---

## Troubleshooting

- **Page looks unstyled / blank** — make sure `styles.css` and `app.js` sit next to `index.html` and that `.nojekyll` is present (without it, GitHub Pages can hide some files).
- **404 after deploying** — Pages can take a minute on first publish; confirm the branch and **/ (root)** folder in Settings → Pages.
- **It opens like a normal Safari tab from the Home Screen** — re‑add it from **Safari** specifically (other browsers can't install iOS PWAs).
- **Old version keeps showing after an update** — the service worker caches the shell. Bump `VERSION` in `service-worker.js`, or on device pull‑to‑refresh / close and reopen; the worker fetches navigations network‑first and cleans old caches on activate.
- **Icons not showing** — both icons are SVG; ensure `icon.svg` and `maskable-icon.svg` deployed and that the manifest paths still match.
- **Balances all show ••••••** — privacy mode is on. Tap the eye icon in the top bar (or Profile → Hide balances) to reveal.
- **Signed out unexpectedly** — that's the inactivity timeout (5 minutes by default). Sign back in; your demo data is preserved.

---

## Customize

- **Starting data** lives in the `seed()` function in `app.js` (accounts, holdings, cards, subscriptions, transactions) — all amounts are in **cents**.
- **Owner name** — sign in with a blank username to keep the default ("Zachary Nichols"), or type one; you can also change it under Profile.
- **Colours, spacing, themes** — the light and dark token sets at the top of `styles.css`.
- **Timeouts & latency** — the `CFG` object at the top of `app.js` (idle timeout, market tick cadence, simulated API latency).
- **Reset** — Profile → *Reset demo data* restores everything to the seed.

---

*Built as a self‑contained static demo. No frameworks, no build step, no tracking, no ads.*
