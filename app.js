/* =================================================================
   EQUITY — app.js  (fictional banking & investing demo)
   No backend, no real auth, no real data leaves the device.

   A client-side "backend": a normalized Store, a simulated async API
   with latency + validation, money kept in INTEGER CENTS (no float
   drift), debounced persistence with schema migration, and views that
   re-render from a single source of truth. Transfers, trades, payments
   and deposits truly mutate state and conserve net worth.
   ================================================================= */
(() => {
  'use strict';

  /* ============ 0. CONFIG ============ */
  const CFG = Object.assign({
    idleMs: 5 * 60 * 1000,
    tickMs: 6000,
    apiMin: 120, apiMax: 360,
    locale: 'en-CA', currency: 'CAD',
  }, window.EQ_CONFIG || {});

  const KEY = 'eq.state.v2';
  const PREFS_KEY = 'eq.prefs.v2';
  const SESSION = 'eq.session';
  const SCHEMA = 2;

  /* ============ 1. UTILS + MONEY (integer cents) ============ */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const apiDelay = () => delay(CFG.apiMin + Math.random() * (CFG.apiMax - CFG.apiMin));

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toCents(v) {
    const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-]/g, '')) : Number(v);
    return isFinite(n) ? Math.round(n * 100) : 0;
  }
  const dollars = (cents) => (cents || 0) / 100;

  /* ============ 2. FORMATTERS ============ */
  const _cur = new Intl.NumberFormat(CFG.locale, { style: 'currency', currency: CFG.currency });
  const _curR = new Intl.NumberFormat(CFG.locale, { style: 'currency', currency: CFG.currency, maximumFractionDigits: 0 });
  let HIDE = false;

  function money(cents, opts = {}) {
    if (HIDE && !opts.force) return '••••••';
    const n = dollars(cents);
    return (opts.round ? _curR : _cur).format(isFinite(n) ? n : 0);
  }
  function moneySigned(cents, opts = {}) {
    if (HIDE && !opts.force) return '••••';
    const s = cents > 0 ? '+' : cents < 0 ? '−' : '';
    return s + money(Math.abs(cents), Object.assign({ force: true }, opts));
  }
  function pct(n, dp = 2) {
    if (!isFinite(n)) n = 0;
    return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(dp) + '%';
  }
  const qtyFmt = (n) => Number(n).toLocaleString(CFG.locale, { maximumFractionDigits: 6 });
  const plain = (cents) => _cur.format(dollars(cents));
  function moneyK(cents) {
    if (HIDE) return '••••';
    const n = dollars(cents), a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e3) return s + '$' + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'K';
    return _cur.format(n);
  }

  const DAY = 86400000;
  const now = () => Date.now();
  const isoDaysAgo = (d) => new Date(now() - d * DAY).toISOString();
  const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function relDay(iso) {
    const d = new Date(iso); const diff = Math.floor((startOfDay(now()) - startOfDay(d.getTime())) / DAY);
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString(CFG.locale, { weekday: 'long' });
    return d.toLocaleDateString(CFG.locale, { month: 'short', day: 'numeric' });
  }
  function dayKey(iso) {
    const d = new Date(iso); const diff = Math.floor((startOfDay(now()) - startOfDay(d.getTime())) / DAY);
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    const sameYr = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString(CFG.locale, { month: 'long', day: 'numeric', year: sameYr ? undefined : 'numeric' });
  }
  const clockStamp = () => new Date().toLocaleTimeString(CFG.locale, { hour: 'numeric', minute: '2-digit' });
  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'there';
  const initials = (n) => (String(n || '').trim().split(/\s+/).map(w => w[0] || '').slice(0, 2).join('') || 'EQ').toUpperCase();

  /* ============ 3. SEED DATA (cents) ============ */
  function seed() {
    const tx = (accountId, title, sub, amt, d, type = 'purchase') =>
      ({ id: uid('tx'), accountId, title, sub, amountCents: amt, ts: isoDaysAgo(d), type });
    const transactions = [
      tx('chq', 'Direct deposit — Northwind Labs', 'Payroll', 425000, 1, 'income'),
      tx('chq', 'Loblaws', 'Groceries', -18432, 0),
      tx('chq', 'Tim Hortons', 'Dining', -685, 0),
      tx('chq', 'Hydro One', 'Utilities', -14210, 2, 'bill'),
      tx('chq', 'Transfer to Savings', 'Internal transfer', -150000, 4, 'transfer'),
      tx('chq', 'Petro-Canada', 'Fuel', -7210, 3),
      tx('chq', 'Spotify', 'Subscriptions', -1199, 5, 'bill'),
      tx('sav', 'Interest earned', 'Monthly accrual', 20144, 1, 'income'),
      tx('sav', 'Transfer from Chequing', 'Internal transfer', 150000, 4, 'transfer'),
      tx('usd', 'Stripe payout', 'USD inbound', 274000, 6, 'income'),
      tx('usd', 'FX conversion', 'USD → CAD', -98000, 9, 'transfer'),
      tx('cc', 'Amazon.ca', 'Shopping', -11840, 0),
      tx('cc', 'Amazon Web Services', 'Cloud', -34218, 5, 'bill'),
      tx('cc', 'Steam', 'Entertainment', -5999, 7),
      tx('cc', 'Uber', 'Transport', -2640, 8),
      tx('cc', 'Payment received — thank you', 'From Chequing', 60000, 10, 'transfer'),
    ];
    return {
      schema: SCHEMA,
      transactions,
      profile: { name: 'Zachary Nichols', tier: 'Equity Private', since: 2019 },
      prefs: { theme: 'system', hideBalances: false, currency: 'CAD', alertTxn: true, alertLarge: true, alertMarket: false, biometric: true },
      accounts: [
        { id: 'chq', name: 'Everyday Chequing', kind: 'Chequing', last4: '4821', balanceCents: 1423855, status: 'open', settlement: true },
        { id: 'sav', name: 'High-Interest Savings', kind: 'Savings', last4: '9043', balanceCents: 6295010, status: 'open', apy: 4.10 },
        { id: 'usd', name: 'U.S. Dollar Account', kind: 'USD', last4: '1177', balanceCents: 1184230, status: 'open', usdCents: 864000, fx: 1.3707 },
        { id: 'cc',  name: 'World Elite Credit', kind: 'Credit', last4: '6620', balanceCents: -128466, status: 'open', limitCents: 1500000, apr: 20.99 },
      ],
      cards: [
        { id: 'debit',   accountId: 'chq', type: 'Debit',        variant: 'debit',   last4: '4821', holder: 'ZACHARY NICHOLS', exp: '09/28', frozen: false, limitCents: 500000,  spentCents: 184000 },
        { id: 'credit',  accountId: 'cc',  type: 'Credit',       variant: 'credit',  last4: '6620', holder: 'ZACHARY NICHOLS', exp: '11/27', frozen: false, limitCents: 1500000, spentCents: 128466 },
        { id: 'virtual', accountId: 'chq', type: 'Virtual card', variant: 'virtual', last4: '0093', holder: 'ZACHARY NICHOLS', exp: '04/27', frozen: true,  limitCents: 200000,  spentCents: 31000 },
      ],
      holdings: [
        { sym: 'SHOP', name: 'Shopify',             cls: 'Canadian equity', qty: 48,    avgCents: 9240,    priceCents: 11862,   color: '#5A8F3C' },
        { sym: 'RY',   name: 'Royal Bank',          cls: 'Canadian equity', qty: 60,    avgCents: 12110,   priceCents: 13845,   color: '#1E4F8F' },
        { sym: 'TD',   name: 'TD Bank',             cls: 'Canadian equity', qty: 75,    avgCents: 7820,    priceCents: 8110,    color: '#1E8E4A' },
        { sym: 'ENB',  name: 'Enbridge',            cls: 'Canadian equity', qty: 140,   avgCents: 4855,    priceCents: 5392,    color: '#C9A227' },
        { sym: 'XEQT', name: 'XEQT All-Equity ETF', cls: 'ETF',             qty: 220,   avgCents: 2710,    priceCents: 3184,    color: '#3F6FD7' },
        { sym: 'VFV',  name: 'Vanguard S&P 500',    cls: 'ETF',             qty: 95,    avgCents: 10830,   priceCents: 13905,   color: '#7A3FD7' },
        { sym: 'AAPL', name: 'Apple',               cls: 'US equity',       qty: 40,    avgCents: 17100,   priceCents: 21240,   color: '#8A8F94' },
        { sym: 'NVDA', name: 'Nvidia',              cls: 'US equity',       qty: 30,    avgCents: 6240,    priceCents: 13118,   color: '#5FA800' },
        { sym: 'BTC',  name: 'Bitcoin',             cls: 'Crypto',          qty: 0.412, avgCents: 4820000, priceCents: 9214000, color: '#D9882F' },
        { sym: 'ETH',  name: 'Ethereum',            cls: 'Crypto',          qty: 5.8,   avgCents: 241000,  priceCents: 498500,  color: '#5A6BD0' },
        { sym: 'SOL',  name: 'Solana',              cls: 'Crypto',          qty: 64,    avgCents: 11800,   priceCents: 26800,   color: '#16B894' },
        { sym: 'GOC5', name: 'Gov. of Canada 5Y',   cls: 'Bonds',           qty: 25,    avgCents: 9840,    priceCents: 9985,    color: '#A23A48' },
        { sym: 'CBL',  name: 'Corporate bond ladder', cls: 'Bonds',         qty: 40,    avgCents: 10000,   priceCents: 10120,   color: '#B86B2E' },
      ],
      watchlist: [
        { sym: 'CNQ',  name: 'Canadian Natural', priceCents: 4720,  chg: 0.9 },
        { sym: 'BNS',  name: 'Scotiabank',       priceCents: 6985,  chg: -0.4 },
        { sym: 'MSFT', name: 'Microsoft',        priceCents: 44130, chg: 0.6 },
        { sym: 'COST', name: 'Costco',           priceCents: 90210, chg: 1.1 },
      ],
      trades: [
        { id: uid('tr'), kind: 'Buy',        sym: 'NVDA', detail: '30 @ ' + plain(6240),  amountCents: -187200, ts: isoDaysAgo(40) },
        { id: uid('tr'), kind: 'Dividend',   sym: 'RY',   detail: 'Q1 distribution',      amountCents: 8400,    ts: isoDaysAgo(28) },
        { id: uid('tr'), kind: 'Sell',       sym: 'AAPL', detail: '10 @ ' + plain(19810), amountCents: 198100,  ts: isoDaysAgo(19) },
        { id: uid('tr'), kind: 'Coupon',     sym: 'GOC5', detail: 'Semi-annual',          amountCents: 4375,    ts: isoDaysAgo(17) },
        { id: uid('tr'), kind: 'Conversion', sym: 'BTC',  detail: '0.05 BTC → CAD',       amountCents: 460700,  ts: isoDaysAgo(7) },
        { id: uid('tr'), kind: 'Buy',        sym: 'XEQT', detail: '40 @ ' + plain(3110),  amountCents: -124400, ts: isoDaysAgo(3) },
      ],
      subs: [
        { id: 's1',  name: 'Amazon Web Services — EC2', cat: 'Cloud compute', amountCents: 34218, day: 1,  status: 'active' },
        { id: 's2',  name: 'Amazon Web Services — S3',  cat: 'Cloud storage', amountCents: 4860,  day: 1,  status: 'active' },
        { id: 's3',  name: 'Cloudflare',                cat: 'Network / CDN', amountCents: 2500,  day: 4,  status: 'active' },
        { id: 's4',  name: 'DigitalOcean',              cat: 'Droplets',      amountCents: 3600,  day: 5,  status: 'active' },
        { id: 's5',  name: 'Vercel Pro',                cat: 'Hosting',       amountCents: 2740,  day: 6,  status: 'active' },
        { id: 's6',  name: 'GitHub Pro',                cat: 'Dev tools',     amountCents: 560,   day: 8,  status: 'active' },
        { id: 's7',  name: 'Proton VPN',                cat: 'Security',      amountCents: 1350,  day: 9,  status: 'active' },
        { id: 's8',  name: '1Password',                 cat: 'Password manager', amountCents: 799, day: 11, status: 'active' },
        { id: 's9',  name: 'Namecheap',                 cat: 'Domain renewal', amountCents: 1820, day: 14, status: 'active' },
        { id: 's10', name: 'PlanetScale',               cat: 'Database hosting', amountCents: 3900, day: 16, status: 'paused' },
        { id: 's11', name: 'Datadog',                   cat: 'Monitoring',    amountCents: 3100,  day: 18, status: 'active' },
        { id: 's12', name: 'Snyk',                      cat: 'Security tools', amountCents: 0,    day: 20, status: 'trial' },
      ],
      insights: {
        categories: [
          { k: 'Cloud & hosting', cents: 184000, color: 'var(--brand)' },
          { k: 'Groceries',       cents: 88000,  color: '#5A6BD0' },
          { k: 'Shopping',        cents: 71200,  color: '#C9881F' },
          { k: 'Dining',          cents: 64200,  color: '#3FA39A' },
          { k: 'Transport',       cents: 29800,  color: '#B25E55' },
        ],
        cashflow: [
          { m: 'Jan', inC: 625000, outC: 411000 }, { m: 'Feb', inC: 650000, outC: 436000 },
          { m: 'Mar', inC: 699000, outC: 448000 }, { m: 'Apr', inC: 642000, outC: 420000 },
          { m: 'May', inC: 671000, outC: 452000 }, { m: 'Jun', inC: 705000, outC: 438000 },
        ],
      },
      notifications: [
        { id: uid('n'), title: 'Payroll deposited', body: '$4,250.00 from Northwind Labs landed in Chequing.', ts: isoDaysAgo(1), read: false, kind: 'ok' },
        { id: uid('n'), title: 'Card charge', body: 'Amazon.ca — $118.40 on World Elite ··6620.', ts: isoDaysAgo(0), read: false, kind: 'info' },
        { id: uid('n'), title: 'Large payment alert', body: 'AWS EC2 charged $342.18 to your credit card.', ts: isoDaysAgo(5), read: true, kind: 'warn' },
      ],
      meta: { lastSyncTs: now() },
    };
  }

  /* ============ 4. STORE ============ */
  const Store = (() => {
    let state = load();
    const subs = new Set();
    const persist = debounce(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: state.prefs.theme }));
      } catch (e) {}
    }, 220);

    function load() {
      let s; try { s = JSON.parse(localStorage.getItem(KEY)); } catch { s = null; }
      if (!s || typeof s !== 'object') return seed();
      return sanitize(migrate(s));
    }
    function migrate(s) {
      if ((s.schema || 0) < SCHEMA) {
        const fresh = seed();
        fresh.prefs = Object.assign(fresh.prefs, (s.prefs && typeof s.prefs === 'object') ? s.prefs : {});
        if (s.profile && typeof s.profile.name === 'string') fresh.profile.name = s.profile.name;
        return fresh;
      }
      const base = seed();
      for (const k of Object.keys(base)) if (!(k in s)) s[k] = base[k];
      return s;
    }
    // guard against valid-JSON-but-wrong-shape (e.g. hand-edited storage): rebuild if essential
    // collections are corrupt, while preserving the user's prefs and display name.
    function sanitize(s) {
      const arrays = ['accounts', 'cards', 'holdings', 'transactions', 'watchlist', 'trades', 'subs', 'notifications'];
      const coreAccts = ['chq', 'sav', 'usd', 'cc'];
      const hasCore = Array.isArray(s.accounts) && coreAccts.every(id => {
        const a = s.accounts.find(x => x && x.id === id);
        return a && typeof a.balanceCents === 'number' && isFinite(a.balanceCents);
      });
      const bad = arrays.some(k => !Array.isArray(s[k])) || !hasCore ||
        !s.prefs || typeof s.prefs !== 'object' ||
        !s.insights || !Array.isArray(s.insights.categories) || !Array.isArray(s.insights.cashflow) ||
        !s.profile || typeof s.profile !== 'object';
      if (!bad) return s;
      const fresh = seed();
      if (s.prefs && typeof s.prefs === 'object') fresh.prefs = Object.assign(fresh.prefs, s.prefs);
      if (s.profile && typeof s.profile.name === 'string') fresh.profile.name = s.profile.name;
      return fresh;
    }
    function emit() { subs.forEach(fn => { try { fn(state); } catch {} }); }
    function flush() { try { localStorage.setItem(KEY, JSON.stringify(state)); localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: state.prefs.theme })); } catch {} }
    return {
      get: () => state,
      update(fn) { fn(state); state.meta = state.meta || {}; persist(); emit(); },
      subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
      flush,
      reset() { try { localStorage.removeItem(KEY); } catch {} state = seed(); persist(); emit(); },
    };
  })();

  /* ============ 5. SELECTORS ============ */
  const S = () => Store.get();
  const acct = (id) => S().accounts.find(a => a.id === id);
  const settlement = () => S().accounts.find(a => a.settlement) || S().accounts[0];
  const holdingValue = (h) => Math.round(h.qty * h.priceCents);
  const holdingCost = (h) => Math.round(h.qty * h.avgCents);
  function portfolioTotals() {
    let mv = 0, cost = 0;
    S().holdings.forEach(h => { mv += holdingValue(h); cost += holdingCost(h); });
    const gl = mv - cost; return { mv, cost, gl, glPct: cost ? (gl / cost) * 100 : 0 };
  }
  function classTotals() { const m = {}; S().holdings.forEach(h => { m[h.cls] = (m[h.cls] || 0) + holdingValue(h); }); return m; }
  const depositsTotal = () => S().accounts.filter(a => a.balanceCents > 0).reduce((s, a) => s + a.balanceCents, 0);
  const cryptoValue = () => S().holdings.filter(h => h.cls === 'Crypto').reduce((s, h) => s + holdingValue(h), 0);
  const netWorth = () => S().accounts.reduce((s, a) => s + a.balanceCents, 0) + portfolioTotals().mv;
  const txnsFor = (id) => S().transactions.filter(t => t.accountId === id).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const allTxns = () => S().transactions.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const unreadCount = () => S().notifications.filter(n => !n.read).length;
  const dayMovePct = (h) => ((h.priceCents % 700) / 100) - 3.2;

  /* ============ 6. SIMULATED API ============ */
  function apiErr(msg) { const e = new Error(msg); e.user = true; return e; }
  function humanize(h) {
    const titleCase = (str) => str.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    if (/[.\-_]/.test(h) && !/\s/.test(h)) return titleCase(h.split(/[.\-_]+/).filter(Boolean).join(' '));
    return titleCase(h);
  }
  const availableToSpend = (a) => a.kind === 'Credit' ? (a.limitCents + a.balanceCents) : a.balanceCents;
  function moveMoney(s, id, d) { const a = s.accounts.find(x => x.id === id); if (a) a.balanceCents += d; }
  function ledger(s, accountId, title, sub, amountCents, type) {
    s.transactions.unshift({ id: uid('tx'), accountId, title, sub, amountCents, ts: new Date().toISOString(), type });
  }
  function pushNote(s, title, body, kind) {
    s.notifications.unshift({ id: uid('n'), title, body, ts: new Date().toISOString(), read: false, kind: kind || 'info' });
  }

  const API = {
    async signIn(username) {
      await apiDelay();
      const typed = username && username.trim();
      const name = typed ? humanize(username.trim()) : (S().profile.name || 'Zachary Nichols');
      if (typed) Store.update(s => { s.profile.name = name; });
      return { name };
    },
    async refreshMarkets() {
      await apiDelay();
      Store.update(s => {
        const drift = () => 1 + (Math.random() - 0.5) * 0.012;
        s.holdings.forEach(h => { h.priceCents = Math.max(1, Math.round(h.priceCents * drift())); });
        s.watchlist.forEach(w => { const d = (Math.random() - 0.5) * 0.9; w.priceCents = Math.max(1, Math.round(w.priceCents * (1 + d / 100))); w.chg = +(w.chg + d).toFixed(2); });
        s.meta.lastSyncTs = now();
      });
      return S().meta.lastSyncTs;
    },
    async transfer({ fromId, toId, cents }) {
      await apiDelay();
      if (!cents || cents <= 0) throw apiErr('Enter an amount greater than zero.');
      if (fromId === toId) throw apiErr('Choose two different accounts.');
      const from = acct(fromId), to = acct(toId);
      if (!from || !to) throw apiErr('Account not found.');
      if (cents > availableToSpend(from)) throw apiErr(`That exceeds the available ${money(availableToSpend(from), { force: true })} in ${from.name}.`);
      Store.update(s => {
        moveMoney(s, fromId, -cents); moveMoney(s, toId, +cents);
        ledger(s, fromId, `Transfer to ${to.name}`, 'Internal transfer', -cents, 'transfer');
        ledger(s, toId, `Transfer from ${from.name}`, 'Internal transfer', +cents, 'transfer');
        pushNote(s, 'Transfer complete', `${money(cents, { force: true })} moved to ${to.name}.`, 'ok');
      });
      return true;
    },
    async deposit({ toId, cents }) {
      await apiDelay();
      if (!cents || cents <= 0) throw apiErr('Enter an amount greater than zero.');
      const to = acct(toId); if (!to) throw apiErr('Account not found.');
      Store.update(s => {
        moveMoney(s, toId, +cents);
        ledger(s, toId, 'Mobile cheque deposit', 'Deposit', +cents, 'income');
        pushNote(s, 'Deposit received', `${money(cents, { force: true })} added to ${to.name}.`, 'ok');
      });
      return true;
    },
    async payBill({ fromId, cents, payee, subId }) {
      await apiDelay();
      if (!cents || cents <= 0) throw apiErr('Enter an amount greater than zero.');
      const from = acct(fromId); if (!from) throw apiErr('Account not found.');
      if (from.kind !== 'Credit' && cents > availableToSpend(from)) throw apiErr(`That exceeds the available ${money(availableToSpend(from), { force: true })}.`);
      Store.update(s => {
        moveMoney(s, fromId, -cents);
        ledger(s, fromId, payee || 'Bill payment', 'Bill payment', -cents, 'bill');
        if (subId) { const sub = s.subs.find(x => x.id === subId); if (sub) sub.lastPaidTs = now(); }
        pushNote(s, 'Payment sent', `${money(cents, { force: true })} to ${payee || 'payee'}.`, 'ok');
      });
      return true;
    },
    async placeTrade({ side, sym, qty }) {
      await apiDelay();
      qty = Number(qty);
      if (!qty || qty <= 0) throw apiErr('Enter a quantity greater than zero.');
      const h = S().holdings.find(x => x.sym === sym); if (!h) throw apiErr('Asset not found.');
      const settle = settlement();
      const total = Math.round(qty * h.priceCents);
      if (side === 'Buy') { if (total > availableToSpend(settle)) throw apiErr(`Not enough buying power in ${settle.name}.`); }
      else { if (qty > h.qty + 1e-9) throw apiErr(`You only hold ${qtyFmt(h.qty)} ${sym}.`); }
      Store.update(s => {
        const hh = s.holdings.find(x => x.sym === sym);
        const set = s.accounts.find(a => a.id === settle.id);
        if (side === 'Buy') { const nq = hh.qty + qty; hh.avgCents = Math.round((holdingCost(hh) + total) / nq); hh.qty = nq; set.balanceCents -= total; }
        else { hh.qty = Math.max(0, hh.qty - qty); set.balanceCents += total; }
        s.trades.unshift({ id: uid('tr'), kind: side, sym, detail: `${qtyFmt(qty)} @ ${plain(hh.priceCents)}`, amountCents: side === 'Buy' ? -total : total, ts: new Date().toISOString() });
        ledger(s, set.id, `${side} ${sym}`, 'Investing', side === 'Buy' ? -total : total, 'trade');
        pushNote(s, `${side} order filled`, `${qtyFmt(qty)} ${sym} at ${plain(hh.priceCents)}.`, 'ok');
      });
      return true;
    },
    async setCardFrozen(cardId, frozen) {
      await apiDelay();
      Store.update(s => {
        const c = s.cards.find(x => x.id === cardId); if (c) c.frozen = frozen;
        pushNote(s, frozen ? 'Card frozen' : 'Card unfrozen', `${c ? c.type : 'Card'} ··${c ? c.last4 : ''} is now ${frozen ? 'frozen' : 'active'}.`, frozen ? 'warn' : 'ok');
      });
      return true;
    },
    async toggleSubscription(subId) {
      await apiDelay(); let st = '';
      Store.update(s => { const sub = s.subs.find(x => x.id === subId); if (sub) { sub.status = sub.status === 'paused' ? 'active' : 'paused'; st = sub.status; } });
      return st;
    },
    async updatePrefs(patch) { Store.update(s => Object.assign(s.prefs, patch)); return S().prefs; },
    async markNotificationsRead() { Store.update(s => s.notifications.forEach(n => n.read = true)); return true; },
    async renameProfile(name) { const c = (name || '').trim() || 'Zachary Nichols'; Store.update(s => { s.profile.name = c; }); return c; },
  };

  /* ============ 7. ICONS ============ */
  const PATHS = {
    send: '<path d="M3 11 21 3l-8 18-2.5-7.5L3 11Z"/>',
    deposit: '<path d="M12 3v13"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
    bill: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    trade: '<path d="m4 16 5-5 3 3 7-8"/><path d="M16 6h4v4"/>',
    snow: '<path d="M12 3v18M5 7l14 10M19 7 5 17"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 12h3"/>',
    bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    coin: '<ellipse cx="12" cy="7" rx="8" ry="3.4"/><path d="M4 7v6c0 1.9 3.6 3.4 8 3.4s8-1.5 8-3.4V7"/>',
    pie: '<path d="M12 3v9l8 4"/><circle cx="12" cy="12" r="9"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="13" y="7" width="3" height="10"/>',
    cloud: '<path d="M6 18a4 4 0 0 1 .5-8 6 6 0 0 1 11.5 1.6A3.5 3.5 0 0 1 18 18H6Z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 7.6-8 9-4.5-1.4-8-4-8-9V6z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    check: '<path d="m5 12 5 5L20 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    warn: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', chevron: '<path d="m9 6 6 6-6 6"/>',
    flame: '<path d="M12 22c4 0 7-2.6 7-6 0-3-2-5-3-7-1 2-2 2.6-3 2 0-3-1-5-3-7 0 4-5 5-5 11 0 3.4 3 7 7 7Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>', arrowDown: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    swap: '<path d="M7 7h11M7 7l3-3M7 7l3 3"/><path d="M17 17H6M17 17l-3 3M17 17l-3-3"/>',
    star: '<path d="M12 3l2.5 6L21 9.5l-5 4.2L17.5 21 12 17.3 6.5 21 8 13.7l-5-4.2L9.5 9 12 3Z"/>',
  };
  const ic = (name, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`;
  const chev = `<span class="chevron">${ic('chevron', 18)}</span>`;

  /* ============ 8. UI: toast / sheet / skeleton ============ */
  const toastHost = $('#toastHost');
  function toast(msg, kind = 'ok', action) {
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    const icon = kind === 'err' ? 'warn' : kind === 'warn' ? 'warn' : kind === 'info' ? 'info' : 'check';
    el.innerHTML = `<span class="toast-ic">${ic(icon, 16)}</span><span class="toast-main">${esc(msg)}</span>`;
    if (action) {
      const b = document.createElement('button'); b.className = 'toast-act'; b.textContent = action.label;
      b.addEventListener('click', () => { action.onClick(); dismiss(); }); el.appendChild(b);
    }
    toastHost.appendChild(el);
    const t = setTimeout(dismiss, action ? 5200 : 3000);
    function dismiss() { clearTimeout(t); el.classList.add('out'); setTimeout(() => el.remove(), 240); }
    return dismiss;
  }

  const sheetHost = $('#sheetHost'), sheetTitle = $('#sheetTitle'), sheetBody = $('#sheetBody');
  let lastFocus = null, trapHandler = null, scrollLockY = 0;
  function openSheet(title, html, onMount) {
    if (sheetHost.hidden) { lastFocus = document.activeElement; scrollLockY = window.scrollY || window.pageYOffset || 0; }
    if (trapHandler) { document.removeEventListener('keydown', trapHandler); trapHandler = null; }
    sheetTitle.textContent = title;
    sheetBody.innerHTML = html;
    sheetHost.hidden = false;
    document.body.style.overflow = 'hidden';
    const sheetEl = sheetHost.querySelector('.sheet'); if (sheetEl) sheetEl.scrollTop = 0;
    if (onMount) { try { onMount(sheetBody); } catch (e) { console.error('Sheet mount failed:', e); } }
    const focusables = () => $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])', sheetHost);
    const f = focusables(); if (f[0]) setTimeout(() => f[0].focus(), 50);
    trapHandler = (e) => {
      if (e.key === 'Escape') { closeSheet(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables(); if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapHandler);
  }
  function closeSheet() {
    if (sheetHost.hidden) return;
    sheetHost.hidden = true; document.body.style.overflow = ''; sheetBody.innerHTML = '';
    if (trapHandler) { document.removeEventListener('keydown', trapHandler); trapHandler = null; }
    try { window.scrollTo(0, scrollLockY); } catch {}
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch { try { lastFocus.focus(); } catch {} }
  }
  sheetHost.addEventListener('click', e => { if (e.target.matches('[data-close],.sheet-scrim')) closeSheet(); });

  function skeletonList(n = 5) {
    let r = '';
    for (let i = 0; i < n; i++) r += `<div class="skel-row"><div class="skel skel-circle"></div><div class="skel-lines"><div class="skel" style="height:13px;width:${50 + (i * 11) % 40}%"></div><div class="skel" style="height:11px;width:${30 + (i * 7) % 30}%"></div></div></div>`;
    return `<div class="card card--flush">${r}</div>`;
  }

  /* ============ 9. COMPONENTS ============ */
  const kv = (k, v) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`;
  const pill = (t, kind) => `<span class="pill pill--${kind}"><span class="dot"></span>${esc(t)}</span>`;
  function txnRow(t, tappable) {
    const pos = t.amountCents >= 0;
    const icon = t.type === 'income' ? 'arrowDown' : t.type === 'transfer' ? 'swap' : t.type === 'bill' ? 'bill' : t.type === 'trade' ? 'trade' : 'arrowUp';
    return `<div class="row${tappable ? ' tap' : ''}"${tappable ? ` data-tap="txn:${t.id}"` : ''}>
      <span class="row-ic">${ic(icon, 19)}</span>
      <div class="row-main"><div class="row-t">${esc(t.title)}</div><div class="row-s">${esc(t.sub || '')} · ${relDay(t.ts)}</div></div>
      <div class="row-end"><div class="row-v ${pos ? 'pos' : ''}">${moneySigned(t.amountCents)}</div></div></div>`;
  }
  const statCard = (icon, k, v, sub, route) => `<button class="stat" data-tap="route:${route}">
    <div class="stat-k"><span class="stat-ic">${ic(icon, 15)}</span>${esc(k)}</div>
    <div class="stat-v num">${v}</div>${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}</button>`;
  const quick = (label, action, icon) => `<button class="quick-btn" data-tap="action:${action}"><span class="quick-ic">${ic(icon, 22)}</span>${esc(label)}</button>`;
  const emptyState = (icon, title, body) => `<div class="empty"><div class="empty-ic">${ic(icon, 24)}</div><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`;
  const legalNote = () => `<p class="note" style="margin:24px 6px 4px">Equity is a fictional demo. Not a real bank. No money is held, no transactions occur, and it is not insured or regulated.</p>`;
  function sparkSVG(seedN, up) {
    let x = seedN || 1; const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
    const w = 300, h = 40, n = 24; let v = 0.5; const pts = [];
    for (let i = 0; i < n; i++) { v += (rnd() - 0.46) * 0.12 + (up ? 0.012 : -0.012); v = clamp(v, 0.08, 0.92); pts.push([(i / (n - 1)) * w, h - v * h]); }
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${up ? 'var(--gain)' : 'var(--loss)'}" stroke-width="2"/></svg>`;
  }
  const acctIcon = (kind) => kind === 'Credit' ? 'card' : kind === 'Savings' ? 'bank' : kind === 'USD' ? 'coin' : 'wallet';
  function subIcon(cat) {
    if (/cloud|host|droplet|storage|compute/i.test(cat)) return 'cloud';
    if (/security|vpn|password/i.test(cat)) return 'shield';
    if (/monitor/i.test(cat)) return 'chart';
    if (/database|dev|domain/i.test(cat)) return 'bank';
    return 'bill';
  }
  const tradeIcon = (k) => k === 'Buy' ? 'arrowDown' : k === 'Sell' ? 'arrowUp' : k === 'Dividend' ? 'coin' : k === 'Coupon' ? 'bank' : 'swap';
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
  const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return 'Renews ' + n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const jitter = () => Math.round((Math.random() - 0.5) * 30);
  function relSync() { const m = Math.floor((now() - (S().meta.lastSyncTs || now())) / 60000); return m < 1 ? 'Just now' : m === 1 ? '1 min ago' : m + ' min ago'; }

  /* ============ 10. VIEWS ============ */
  const views = {};
  let investFilter = 'All', activityFilter = 'all', activityQuery = '';

  views.home = () => {
    const nw = netWorth(), pt = portfolioTotals();
    const chq = acct('chq'), sav = acct('sav'), cc = acct('cc');
    const dayChg = Math.round(nw * 0.0067);
    const util = cc ? Math.round(Math.abs(Math.min(0, cc.balanceCents)) / cc.limitCents * 100) : 0;
    const recent = allTxns().slice(0, 4).map(t => txnRow(t, true)).join('');
    return `<section class="screen">
      <div class="balance">
        <div class="balance-top"><span class="balance-label">Total balance</span><span class="balance-meta">As of ${clockStamp()}</span></div>
        <div class="balance-total num">${money(nw)}</div>
        <div class="balance-delta"><span class="delta-chip ${dayChg < 0 ? 'neg' : ''}">${ic(dayChg < 0 ? 'arrowDown' : 'arrowUp', 13)} ${moneySigned(dayChg)}</span><span class="${dayChg < 0 ? 'neg' : 'pos'}">${pct(0.67)} today</span></div>
      </div>
      <div class="quick">${quick('Send', 'transfer', 'send')}${quick('Deposit', 'deposit', 'deposit')}${quick('Pay', 'paybill', 'bill')}${quick('Invest', 'trade', 'trade')}</div>
      <div class="stat-grid">
        ${statCard('wallet', 'Chequing', money(chq.balanceCents), chq.name, 'accounts')}
        ${statCard('bank', 'Savings', money(sav.balanceCents), sav.apy.toFixed(2) + '% interest', 'accounts')}
        ${statCard('pie', 'Investments', money(pt.mv), pct(pt.glPct, 1) + ' all time', 'invest')}
        ${statCard('coin', 'Crypto', money(cryptoValue()), '3 assets', 'invest')}
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">Credit card</h2><button class="section-link" data-tap="route:cards">Manage ${ic('chevron', 14)}</button></div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div><div class="row-s">World Elite ··${cc.last4}</div><div class="num" style="font-size:21px;font-weight:740;margin-top:5px">${money(Math.abs(cc.balanceCents))}</div><div class="row-s" style="margin-top:2px">Balance owing</div></div>
            <div style="text-align:right"><div class="row-s">Available</div><div class="num" style="font-weight:700;margin-top:5px">${money(cc.limitCents + cc.balanceCents)}</div></div>
          </div>
          <div class="meter ${util > 60 ? 'danger' : util > 30 ? 'warn' : ''}"><i style="width:${util}%"></i></div>
        </div>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">Recent activity</h2><button class="section-link" data-tap="route:activity">See all ${ic('chevron', 14)}</button></div>
        <div class="card card--flush"><div class="list">${recent}</div></div>
      </div>${legalNote()}</section>`;
  };

  views.accounts = () => {
    const rows = S().accounts.map(a => {
      const neg = a.balanceCents < 0;
      const meta = a.kind === 'Credit' ? `Balance owing · limit ${money(a.limitCents, { round: true })}`
        : a.kind === 'Savings' ? `Savings · ${a.apy.toFixed(2)}% APY`
        : a.kind === 'USD' ? `USD account · ${a.fx} FX` : `Chequing account`;
      return `<button class="acct" data-tap="acct:${a.id}"><span class="acct-ic">${ic(acctIcon(a.kind), 21)}</span>
        <div class="acct-main"><div class="acct-name">${esc(a.name)}</div><div class="acct-meta">${esc(meta)}</div></div>
        <div class="acct-bal num">${money(neg ? -a.balanceCents : a.balanceCents)}<small>··${a.last4}</small></div></button>`;
    }).join('');
    return `<section class="screen">
      <div class="section-head" style="margin-top:6px">
        <div><div class="eyebrow">Total deposits</div><div class="num" style="font-size:26px;font-weight:760;letter-spacing:-.03em;margin-top:5px">${money(depositsTotal())}</div></div>
        <button class="btn btn--sm btn--quiet" data-tap="action:newaccount">${ic('plus', 16)} New</button>
      </div>
      <div class="card card--flush">${rows}</div>
      <div class="section"><button class="btn btn--block btn--quiet" data-tap="route:activity">${ic('search', 18)} Search all transactions</button></div>
      ${legalNote()}</section>`;
  };

  views.activity = () => {
    const filters = [['all', 'All'], ['income', 'Income'], ['purchase', 'Spending'], ['transfer', 'Transfers'], ['bill', 'Bills'], ['trade', 'Investing']];
    let list = allTxns();
    if (activityFilter !== 'all') list = list.filter(t => t.type === activityFilter);
    const q = activityQuery.trim().toLowerCase();
    if (q) list = list.filter(t => (t.title + ' ' + (t.sub || '')).toLowerCase().includes(q));
    let body = '';
    if (!list.length) body = emptyState('search', 'No transactions found', 'Try a different search or filter.');
    else {
      let curKey = null, open = false;
      list.forEach(t => {
        const k = dayKey(t.ts);
        if (k !== curKey) { if (open) body += '</div></div>'; curKey = k; body += `<div class="day-head">${esc(k)}</div><div class="card card--flush"><div class="list">`; open = true; }
        body += txnRow(t, true);
      });
      if (open) body += '</div></div>';
    }
    return `<section class="screen">
      <div class="search">${ic('search', 18)}<input id="actSearch" type="text" placeholder="Search transactions" value="${esc(activityQuery)}" autocomplete="off"></div>
      <div class="filter-row">${filters.map(([v, l]) => `<button class="chip-btn" data-actfilter="${v}" aria-pressed="${v === activityFilter}">${l}</button>`).join('')}</div>
      ${body}</section>`;
  };

  views.cards = () => {
    const blocks = S().cards.map(c => {
      const link = acct(c.accountId);
      const used = c.limitCents ? Math.round(c.spentCents / c.limitCents * 100) : 0;
      const txns = txnsFor(c.accountId).slice(0, 3).map(t => txnRow(t, false)).join('') || emptyState('card', 'No transactions yet', 'New purchases will appear here.');
      return `<div>
        <div class="bankcard bankcard--${c.variant}${c.frozen ? ' frozen' : ''}" data-tap="card:${c.id}">
          <div class="bc-top"><span class="bc-kind">${esc(c.type)}</span><span class="bc-brand"><span class="logo"><i></i><i></i><i></i><i></i></span>Equity</span></div>
          <div class="bc-chip"></div><div class="bc-num">···· ···· ···· ${c.last4}</div>
          <div class="bc-bottom"><div><div class="bc-holder">${esc(c.holder)}</div><div class="bc-exp">EXP ${esc(c.exp)}</div></div></div>
        </div>
        <div class="card card--flush" style="margin-top:12px">
          <div class="setting"><div class="setting-main"><div class="setting-t">Freeze card</div><div class="setting-d">Instantly block new purchases</div></div>
            <label class="switch"><input type="checkbox" data-freeze="${c.id}"${c.frozen ? ' checked' : ''} aria-label="Freeze ${esc(c.type)}"><span class="track"></span><span class="thumb"></span></label></div>
          <div class="setting"><div class="setting-main"><div class="setting-t">Spend limit</div><div class="setting-d">Linked to ${esc(link ? link.name : '')}</div></div>
            <span class="num" style="font-weight:700">${money(c.limitCents, { round: true })}</span></div>
          <div class="setting"><div class="setting-main" style="flex:1"><div class="setting-t">Spent this cycle</div><div class="meter ${used > 70 ? 'warn' : ''}"><i style="width:${used}%"></i></div></div>
            <span class="num" style="font-weight:700;white-space:nowrap">${money(c.spentCents, { round: true })}</span></div>
        </div>
        <div class="section-head" style="margin:16px 2px 9px"><h3 class="section-title" style="font-size:15px">Recent on ··${c.last4}</h3></div>
        <div class="card card--flush"><div class="list">${txns}</div></div></div>`;
    }).join('<div style="height:26px"></div>');
    return `<section class="screen"><div style="height:4px"></div>${blocks}${legalNote()}</section>`;
  };

  views.invest = () => {
    const pt = portfolioTotals();
    const classes = ['All', 'Canadian equity', 'US equity', 'ETF', 'Crypto', 'Bonds'];
    const list = S().holdings.filter(h => h.qty > 1e-9 && (investFilter === 'All' || h.cls === investFilter));
    const btc = S().holdings.find(h => h.sym === 'BTC'), eth = S().holdings.find(h => h.sym === 'ETH');
    const markets = [
      ['S&P/TSX', 24812 + jitter(), 0.62], ['S&P 500', 5908 + jitter() / 10, 0.41], ['Nasdaq', 19124 + jitter(), 0.88],
      ['CAD/USD', 0.7296, -0.18, 4], ['BTC/CAD', dollars(btc.priceCents), 2.34], ['ETH/CAD', dollars(eth.priceCents), 1.12],
    ].map(([name, val, chg, dp]) => `<div class="mkt"><div class="mkt-name">${esc(name)}</div>
      <div class="mkt-val num">${dp ? Number(val).toFixed(dp) : Number(val).toLocaleString(CFG.locale, { maximumFractionDigits: 0 })}</div>
      <div class="mkt-chg num ${chg < 0 ? 'neg' : 'pos'}">${pct(chg)}</div>${sparkSVG(name.length * 7, chg >= 0)}</div>`).join('');
    const holdings = list.map(h => {
      const mv = holdingValue(h), day = dayMovePct(h);
      const sub = h.cls === 'Crypto' ? `${qtyFmt(h.qty)} ${h.sym} · avg ${money(h.avgCents, { round: false })}` : `${qtyFmt(h.qty)} sh · avg ${money(h.avgCents)}`;
      return `<div class="row tap" data-tap="hold:${h.sym}"><span class="holding-tag" style="background:linear-gradient(150deg,${h.color},${h.color}cc)">${esc(h.sym.slice(0, 4))}</span>
        <div class="row-main"><div class="row-t">${esc(h.name)}</div><div class="row-s">${esc(sub)}</div></div>
        <div class="row-end"><div class="row-v num">${money(mv)}</div><div class="row-d num ${day < 0 ? 'neg' : 'pos'}">${pct(day)}</div></div></div>`;
    }).join('') || emptyState('pie', 'Nothing in this category', 'Pick another filter to see positions.');
    const watch = S().watchlist.map(w => `<div class="row"><span class="row-ic">${esc(w.sym.slice(0, 4))}</span>
      <div class="row-main"><div class="row-t">${esc(w.name)}</div><div class="row-s">${esc(w.sym)}</div></div>
      <div class="row-end"><div class="row-v num">${money(w.priceCents, { round: false })}</div><div class="row-d num ${w.chg < 0 ? 'neg' : 'pos'}">${pct(w.chg)}</div></div></div>`).join('');
    const trades = S().trades.slice(0, 6).map(t => {
      const pos = t.amountCents >= 0;
      return `<div class="row"><span class="row-ic brandish">${ic(tradeIcon(t.kind), 19)}</span>
        <div class="row-main"><div class="row-t">${esc(t.kind)} · ${esc(t.sym)}</div><div class="row-s">${esc(t.detail)} · ${relDay(t.ts)}</div></div>
        <div class="row-end"><div class="row-v ${pos ? 'pos' : ''}">${moneySigned(t.amountCents)}</div></div></div>`;
    }).join('');
    return `<section class="screen">
      <div class="balance">
        <div class="balance-top"><span class="balance-label">Portfolio value</span><button class="section-link" data-tap="action:refresh" id="refreshBtn">${ic('repeat', 14)} ${relSync()}</button></div>
        <div class="balance-total num" style="font-size:34px">${money(pt.mv)}</div>
        <div class="balance-delta"><span class="delta-chip ${pt.gl < 0 ? 'neg' : ''}">${ic(pt.gl < 0 ? 'arrowDown' : 'arrowUp', 13)} ${moneySigned(pt.gl)}</span><span class="${pt.gl < 0 ? 'neg' : 'pos'}">${pct(pt.glPct)} total return</span></div>
      </div>
      <button class="btn btn--primary btn--lg btn--block" data-tap="action:trade" style="margin-top:14px">${ic('trade', 18)} New trade</button>
      <div class="section"><div class="section-head"><h2 class="section-title">Markets</h2></div><div class="mkt-strip">${markets}</div></div>
      <div class="section"><div class="section-head"><h2 class="section-title">Holdings</h2></div>
        <div class="filter-row" style="margin-bottom:12px">${classes.map(c => `<button class="chip-btn" data-investfilter="${esc(c)}" aria-pressed="${c === investFilter}">${esc(c)}</button>`).join('')}</div>
        <div class="card card--flush"><div class="list">${holdings}</div></div></div>
      <div class="section"><div class="section-head"><h2 class="section-title">Watchlist</h2><button class="section-link" data-tap="action:watch">${ic('plus', 14)} Add</button></div>
        <div class="card card--flush"><div class="list">${watch}</div></div></div>
      <div class="section"><div class="section-head"><h2 class="section-title">Activity</h2></div><div class="card card--flush"><div class="list">${trades}</div></div></div>
      ${legalNote()}</section>`;
  };

  views.insights = () => {
    const ins = S().insights;
    const cats = ins.categories.slice().sort((a, b) => b.cents - a.cents);
    const maxCat = cats[0].cents;
    const catBars = cats.map(c => `<div class="crow"><div class="ctop"><span>${esc(c.k)}</span><span class="num">${money(c.cents)}</span></div><div class="ctrack"><div class="cfill" style="width:${(c.cents / maxCat * 100).toFixed(0)}%;background:${c.color}"></div></div></div>`).join('');
    const cf = ins.cashflow, maxCf = Math.max(...cf.map(x => Math.max(x.inC, x.outC)));
    const cfBars = cf.map(x => `<div class="col"><div class="pair"><div class="bar in" style="height:${(x.inC / maxCf * 100).toFixed(0)}%"></div><div class="bar out" style="height:${(x.outC / maxCf * 100).toFixed(0)}%"></div></div><div class="lbl">${esc(x.m)}</div></div>`).join('');
    const ct = classTotals(); const ctPairs = Object.entries(ct).filter(([, v]) => v > 0);
    const total = ctPairs.reduce((a, [, v]) => a + v, 0) || 1;
    const palette = { 'Canadian equity': 'var(--brand)', 'US equity': '#5A6BD0', 'ETF': '#7A3FD7', 'Crypto': '#D9882F', 'Bonds': '#A23A48' };
    let acc = 0; const stops = (ctPairs.length ? ctPairs : [['ETF', 1]]).map(([k, v]) => { const s = acc / total * 360; acc += v; return `${palette[k] || 'var(--hair-strong)'} ${s.toFixed(1)}deg ${(acc / total * 360).toFixed(1)}deg`; }).join(',');
    const legend = ctPairs.slice().sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span class="sw" style="background:${palette[k] || 'var(--hair-strong)'}"></span>${esc(k)}<span class="lv">${Math.round(v / total * 100)}%</span></li>`).join('');
    const pctOf = k => Math.round((ct[k] || 0) / total * 100);
    const eq = pctOf('Canadian equity') + pctOf('US equity');
    return `<section class="screen">
      <div class="section"><div class="section-head"><h2 class="section-title">This month</h2></div>
        ${insightCard('flame', `Cloud spend is <b>${money(cats[0].cents)}</b> this month — up <b>12%</b>, led by AWS EC2.`)}
        ${insightCard('pie', `Allocation is <b>${eq}% equities</b>, ${pctOf('ETF')}% ETFs, ${pctOf('Crypto')}% crypto, ${pctOf('Bonds')}% bonds.`)}
        ${insightCard('shield', `Cash reserve covers <b>4.8 months</b> of projected expenses.`)}</div>
      <div class="section"><div class="section-head"><h2 class="section-title">Income vs expenses</h2></div>
        <div class="card"><div style="display:flex;gap:16px;font-size:12.5px;color:var(--text-2);margin-bottom:4px">
          <span style="display:flex;align-items:center;gap:6px"><span class="sw" style="width:11px;height:11px;border-radius:3px;background:var(--brand)"></span>Income</span>
          <span style="display:flex;align-items:center;gap:6px"><span class="sw" style="width:11px;height:11px;border-radius:3px;background:var(--hair-strong)"></span>Expenses</span></div>
          <div class="chart-bars">${cfBars}</div></div></div>
      <div class="section"><div class="section-head"><h2 class="section-title">Spending by category</h2></div><div class="card"><div class="cat">${catBars}</div></div></div>
      <div class="section"><div class="section-head"><h2 class="section-title">Portfolio allocation</h2></div>
        <div class="card"><div class="donut-wrap"><div class="donut" style="background:conic-gradient(${stops})"><div class="donut-center"><div class="v num">${moneyK(total)}</div><small>invested</small></div></div><ul class="legend">${legend}</ul></div></div></div>
      <div class="section"><div class="section-head"><h2 class="section-title">Risk profile</h2></div>
        <div class="card"><div class="gauge-track"></div><div class="gauge-row"><span>Conservative</span><span>Balanced</span><span>Aggressive</span></div><span class="gauge-pill">Growth-oriented · 7.2 / 10</span></div></div>
      ${legalNote()}</section>`;
  };

  views.payments = () => {
    const subs = S().subs;
    const active = subs.filter(s => s.status === 'active');
    const paid = active.reduce((a, s) => a + s.amountCents, 0);
    const next = subs.slice().sort((a, b) => a.day - b.day);
    const monthName = new Date().toLocaleDateString(CFG.locale, { month: 'long' });
    const rows = next.map(s => {
      const k = s.status === 'active' ? 'ok' : s.status === 'paused' ? 'mute' : 'info';
      return `<div class="row tap" data-tap="sub:${s.id}"><span class="row-ic">${ic(subIcon(s.cat), 19)}</span>
        <div class="row-main"><div class="row-t">${esc(s.name)}</div><div class="row-s">${esc(s.cat)} · ${ordinal(s.day)}</div></div>
        <div class="row-end"><div class="row-v num">${money(s.amountCents)}</div><div class="row-d">${pill(cap(s.status), k)}</div></div></div>`;
    }).join('');
    return `<section class="screen">
      <div class="stat-grid" style="margin-top:6px">
        ${statBlock('cloud', `Paid in ${monthName}`, money(paid), active.length + ' active services')}
        ${statBlock('bill', 'Upcoming', money(next.slice(0, 4).reduce((a, s) => a + (s.status !== 'paused' ? s.amountCents : 0), 0)), 'next 4 charges')}
      </div>
      <div class="section"><div class="section-head"><h2 class="section-title">Subscriptions</h2><button class="section-link" data-tap="action:addsub">${ic('plus', 14)} Add</button></div>
        <div class="card card--flush"><div class="list">${rows}</div></div></div>
      ${legalNote()}</section>`;
  };

  views.more = () => {
    const p = S().profile;
    const menu = [
      ['insights', 'Insights', 'Spending, allocation & risk', 'chart'],
      ['payments', 'Payments & subscriptions', S().subs.filter(s => s.status === 'active').length + ' active', 'repeat'],
      ['profile', 'Profile & settings', 'Name, theme, alerts', 'shield'],
    ].map(([r, t, s, i]) => `<button class="menu-item" data-tap="route:${r}"><span class="menu-ic">${ic(i, 20)}</span><div class="menu-main"><div class="menu-t">${esc(t)}</div><div class="menu-s">${esc(s)}</div></div>${chev}</button>`).join('');
    const utility = [['help', 'Help & support'], ['lock', 'Security centre']].map(([i, t]) => `<button class="menu-item" data-tap="action:soon"><span class="menu-ic">${ic(i, 20)}</span><div class="menu-main"><div class="menu-t">${esc(t)}</div></div>${chev}</button>`).join('');
    return `<section class="screen">
      <div class="profile-hero"><span class="avatar">${esc(initials(p.name))}</span><div><div class="profile-name">${esc(p.name)}</div><div class="profile-sub">${esc(p.tier)} · since ${p.since}</div></div></div>
      <div class="card card--flush">${menu}</div>
      <div class="section"><div class="card card--flush">${utility}</div></div>
      <div class="section"><button class="btn btn--block btn--danger" data-tap="action:logout">${ic('logout', 18)} Sign out</button></div>
      ${legalNote()}</section>`;
  };

  views.profile = () => {
    const p = S().profile, pr = S().prefs;
    return `<section class="screen">
      <div class="profile-hero"><span class="avatar">${esc(initials(p.name))}</span><div><div class="profile-name">${esc(p.name)}</div><div class="profile-sub">${esc(p.tier)}</div></div></div>
      <div class="eyebrow" style="margin:6px 2px 9px">Appearance</div>
      <div class="card"><div class="seg" id="themeSeg" role="group" aria-label="Theme">${['system', 'light', 'dark'].map(t => `<button data-theme-opt="${t}" aria-pressed="${pr.theme === t}">${cap(t)}</button>`).join('')}</div></div>
      <div class="eyebrow" style="margin:20px 2px 9px">Privacy & account</div>
      <div class="card card--flush">
        ${settingRow('Display name', 'Shown across the app', `<button class="btn btn--sm btn--quiet" data-tap="action:rename">Edit</button>`)}
        ${settingRow('Hide balances', 'Blur amounts for privacy', toggle('hideBalances', pr.hideBalances))}
        ${settingRow('Biometric unlock', 'Face ID for sign-in (simulated)', toggle('biometric', pr.biometric))}
        ${settingRow('Primary currency', 'Used for all balances', `<span class="pill pill--mute">${esc(pr.currency)}</span>`)}
      </div>
      <div class="eyebrow" style="margin:20px 2px 9px">Alerts</div>
      <div class="card card--flush">
        ${settingRow('Transaction alerts', 'Notify on every purchase', toggle('alertTxn', pr.alertTxn))}
        ${settingRow('Large payment alerts', 'Over ' + money(100000, { round: true, force: true }), toggle('alertLarge', pr.alertLarge))}
        ${settingRow('Market movement alerts', '±3% on watchlist', toggle('alertMarket', pr.alertMarket))}
      </div>
      <div class="section"><button class="btn btn--block btn--danger" data-tap="action:reset">Reset demo data</button></div>
      ${legalNote()}</section>`;
  };

  const insightCard = (icon, html) => `<div class="card" style="display:flex;gap:12px;align-items:flex-start;margin-bottom:11px"><span class="stat-ic" style="width:34px;height:34px">${ic(icon, 18)}</span><div style="font-size:13.5px;line-height:1.5;color:var(--text-2)">${html}</div></div>`;
  const statBlock = (icon, k, v, sub) => `<div class="stat" style="cursor:default"><div class="stat-k"><span class="stat-ic">${ic(icon, 15)}</span>${esc(k)}</div><div class="stat-v num">${v}</div><div class="stat-sub">${esc(sub)}</div></div>`;
  const settingRow = (t, d, control) => `<div class="setting"><div class="setting-main"><div class="setting-t">${esc(t)}</div><div class="setting-d">${esc(d)}</div></div>${control}</div>`;
  const toggle = (key, on) => `<label class="switch"><input type="checkbox" data-pref="${key}"${on ? ' checked' : ''} aria-label="${esc(key)}"><span class="track"></span><span class="thumb"></span></label>`;

  /* ============ 11. ROUTER ============ */
  const ROUTES = ['home', 'accounts', 'cards', 'invest', 'more', 'insights', 'payments', 'profile', 'activity'];
  const TAB_OF = { home: 'home', accounts: 'accounts', activity: 'accounts', cards: 'cards', invest: 'invest', more: 'more', insights: 'more', payments: 'more', profile: 'more' };
  const viewEl = $('#view'), tabs = $$('.tab');
  let currentRoute = 'home';

  function navigate(route) {
    if (!ROUTES.includes(route)) route = 'home';
    if (('#' + route) !== location.hash) location.hash = route;
    else { render(route); scrollTop(); }
  }
  function scrollTop() { try { window.scrollTo(0, 0); } catch {} }
  function render(route) {
    currentRoute = route;
    let html;
    try { html = (views[route] || views.home)(); }
    catch (e) {
      console.error('Render failed for "' + route + '":', e);
      html = `<section class="screen"><div class="empty" style="padding:60px 20px">
        <div class="empty-ic">${ic('warn', 24)}</div>
        <h3>Something went wrong</h3><p>This screen couldn't load. Your data is safe.</p>
        <button class="btn btn--sm btn--quiet" style="margin-top:14px" onclick="location.reload()">Reload app</button></div></section>`;
    }
    viewEl.innerHTML = html;
    const tabRoute = TAB_OF[route] || '';
    tabs.forEach(t => { if (t.dataset.route === tabRoute) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    try {
      if (route === 'invest') mountInvest();
      if (route === 'profile') mountProfile();
      if (route === 'activity') mountActivity();
    } catch (e) { console.error('Mount hook failed:', e); }
  }
  function rerenderIfVisible(route) { if (appVisible() && currentRoute === route) render(route); }
  function mountInvest() { $$('[data-investfilter]').forEach(b => b.onclick = () => { investFilter = b.dataset.investfilter; render('invest'); }); }
  function mountProfile() { $$('[data-theme-opt]').forEach(b => b.onclick = () => { applyTheme(b.dataset.themeOpt); API.updatePrefs({ theme: b.dataset.themeOpt }); render('profile'); }); }
  function mountActivity() {
    const inp = $('#actSearch');
    if (inp) {
      const onIn = debounce(() => { activityQuery = inp.value; const pos = inp.selectionStart; render('activity'); const n = $('#actSearch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } }, 180);
      inp.addEventListener('input', onIn);
    }
    $$('[data-actfilter]').forEach(b => b.onclick = () => { activityFilter = b.dataset.actfilter; render('activity'); });
  }

  /* ============ 12. EVENTS ============ */
  document.addEventListener('click', (e) => {
    const tapEl = e.target.closest('[data-tap]');
    if (tapEl && !tapEl.classList.contains('bankcard')) handleTap(tapEl.dataset.tap);
  });
  viewEl.addEventListener('click', (e) => { const c = e.target.closest('.bankcard[data-tap^="card:"]'); if (c) cardSheet(c.dataset.tap.split(':')[1]); });
  viewEl.addEventListener('change', (e) => {
    const f = e.target.closest('[data-freeze]'); if (f) { setFrozen(f.dataset.freeze, f.checked); return; }
    const p = e.target.closest('[data-pref]'); if (p) onPrefToggle(p.dataset.pref, p.checked);
  });
  // numeric sanitiser for tagged inputs (handles paste / desktop typing)
  sheetBody.addEventListener('input', (e) => {
    const el = e.target.closest('[data-numeric]'); if (!el) return;
    let v = el.value.replace(/[^0-9.]/g, '');
    const i = v.indexOf('.'); if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '');
    if (v !== el.value) { el.value = v; try { el.setSelectionRange(v.length, v.length); } catch {} }
  });
  // sheet-body delegated actions (buttons created dynamically)
  sheetBody.addEventListener('click', (e) => {
    const t = e.target.closest('[data-trade],[data-toast],[data-freeze-btn],[data-sub-pay],[data-sub-toggle]');
    if (!t) return;
    if (t.dataset.trade) { const [side, sym] = t.dataset.trade.split(':'); tradeSheet(sym, side); }
    else if (t.dataset.toast != null) toast(t.dataset.toast, 'info');
    else if (t.dataset.freezeBtn) { setFrozen(t.dataset.freezeBtn, !(S().cards.find(c => c.id === t.dataset.freezeBtn) || {}).frozen); closeSheet(); }
    else if (t.dataset.subPay) subPay(t.dataset.subPay);
    else if (t.dataset.subToggle) subToggle(t.dataset.subToggle);
  });
  tabs.forEach(t => t.addEventListener('click', () => navigate(t.dataset.route)));
  $('#avatarBtn').addEventListener('click', () => navigate('profile'));
  $('#bellBtn').addEventListener('click', notificationsSheet);
  $('#privacyBtn').addEventListener('click', togglePrivacy);
  const appbar = $('.appbar');
  window.addEventListener('scroll', () => { if (appbar) appbar.classList.toggle('is-stuck', window.scrollY > 4); }, { passive: true });
  window.addEventListener('hashchange', () => { if (!appVisible()) return; const r = (location.hash || '#home').slice(1); render(ROUTES.includes(r) ? r : 'home'); scrollTop(); });

  function handleTap(token) {
    const i = token.indexOf(':'); const type = token.slice(0, i); const arg = token.slice(i + 1);
    switch (type) {
      case 'route': navigate(arg); break;
      case 'action': appAction(arg); break;
      case 'acct': accountSheet(arg); break;
      case 'hold': holdingSheet(arg); break;
      case 'sub': subSheet(arg); break;
      case 'txn': txnSheet(arg); break;
      case 'card': cardSheet(arg); break;
    }
  }
  function appAction(a) {
    switch (a) {
      case 'transfer': transferSheet(); break;
      case 'deposit': depositSheet(); break;
      case 'paybill': payBillSheet(); break;
      case 'trade': tradeSheet(); break;
      case 'refresh': doRefresh(); break;
      case 'rename': renameSheet(); break;
      case 'reset': resetSheet(); break;
      case 'logout': logout(); break;
      case 'newaccount': toast('Opening new accounts is disabled in this demo.', 'info'); break;
      case 'addsub': toast('Adding subscriptions is disabled in this demo.', 'info'); break;
      case 'watch': toast('Editing the watchlist is disabled in this demo.', 'info'); break;
      case 'soon': toast('Not available in this demo.', 'info'); break;
    }
  }

  /* ============ DETAIL SHEETS ============ */
  function accountSheet(id) {
    const a = acct(id); if (!a) return;
    const neg = a.balanceCents < 0;
    const rows = txnsFor(id).slice(0, 6).map(t => txnRow(t, false)).join('') || emptyState('wallet', 'No activity yet', 'Transactions will appear here.');
    openSheet(a.name, `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0 10px">
        <div><div class="row-s">${neg ? 'Balance owing' : 'Available balance'}</div><div class="num" style="font-size:30px;font-weight:760;letter-spacing:-.03em;margin-top:4px">${money(neg ? -a.balanceCents : a.balanceCents)}</div></div>${pill('Open', 'ok')}</div>
      ${kv('Account type', esc(a.kind))}${kv('Account number', '···· ' + a.last4)}
      ${a.apy != null ? kv('Interest rate', a.apy.toFixed(2) + '% APY') : ''}
      ${a.apr != null ? kv('Purchase APR', a.apr.toFixed(2) + '%') : ''}
      ${a.limitCents != null ? kv('Credit limit', money(a.limitCents, { round: true })) : ''}
      ${a.usdCents != null ? kv('USD balance', (HIDE ? '\u2022\u2022\u2022\u2022' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dollars(a.usdCents))) + ' \u00b7 ' + a.fx + ' FX') : ''}
      <div class="section-head" style="margin:16px 2px 8px"><h3 class="section-title" style="font-size:15px">Recent activity</h3></div>
      <div class="card card--flush"><div class="list">${rows}</div></div>
      <div class="btn-row" style="margin-top:14px"><button class="btn btn--sm btn--quiet" data-tap="action:transfer">Transfer</button><button class="btn btn--sm btn--quiet" data-tap="action:deposit">Deposit</button></div>`);
  }
  function holdingSheet(sym) {
    const h = S().holdings.find(x => x.sym === sym); if (!h) return;
    const mv = holdingValue(h), cost = holdingCost(h), gl = mv - cost, glPct = cost ? gl / cost * 100 : 0, day = dayMovePct(h);
    openSheet(h.name, `
      <div style="display:flex;align-items:center;gap:13px;padding:6px 0 12px">
        <span class="holding-tag" style="width:48px;height:48px;background:linear-gradient(150deg,${h.color},${h.color}cc)">${esc(h.sym.slice(0, 4))}</span>
        <div><div class="row-t" style="font-size:16px">${esc(h.sym)} · ${esc(h.cls)}</div><div class="row-s num ${day < 0 ? 'neg' : 'pos'}">${money(h.priceCents, { round: false })} · ${pct(day)} today</div></div></div>
      ${kv('Market value', money(mv))}${kv('Quantity', h.cls === 'Crypto' ? qtyFmt(h.qty) + ' ' + h.sym : qtyFmt(h.qty) + ' shares')}
      ${kv('Average cost', money(h.avgCents, { round: false }))}${kv('Book cost', money(cost))}
      ${kv('Total gain / loss', `<span class="${gl < 0 ? 'neg' : 'pos'}">${moneySigned(gl)} (${pct(glPct)})</span>`)}
      <div class="btn-row" style="margin-top:14px"><button class="btn btn--sm btn--primary" data-trade="Buy:${esc(h.sym)}">Buy</button><button class="btn btn--sm btn--quiet" data-trade="Sell:${esc(h.sym)}">Sell</button></div>
      <p class="note">Demo position · not investment advice.</p>`);
  }
  function subSheet(id) {
    const s = S().subs.find(x => x.id === id); if (!s) return;
    const k = s.status === 'active' ? 'ok' : s.status === 'paused' ? 'mute' : 'info';
    openSheet(s.name, `
      ${kv('Category', esc(s.cat))}${kv('Amount', money(s.amountCents) + ' / month')}${kv('Renews on', ordinal(s.day).replace('Renews ', 'the '))}${kv('Status', pill(cap(s.status), k))}
      <div class="btn-row" style="margin-top:14px"><button class="btn btn--sm btn--primary" data-sub-pay="${s.id}">Pay now</button><button class="btn btn--sm btn--quiet" data-sub-toggle="${s.id}">${s.status === 'paused' ? 'Resume' : 'Pause'}</button></div>
      <p class="note">No real charge occurs. Demo only.</p>`);
  }
  function txnSheet(id) {
    const t = S().transactions.find(x => x.id === id); if (!t) return;
    const a = acct(t.accountId);
    openSheet(t.title, `
      <div style="text-align:center;padding:10px 0 14px"><div class="num" style="font-size:34px;font-weight:760;letter-spacing:-.03em" class="${t.amountCents >= 0 ? 'pos' : ''}">${moneySigned(t.amountCents)}</div></div>
      ${kv('Category', esc(t.sub || '—'))}${kv('Account', esc(a ? a.name : '—'))}${kv('Date', new Date(t.ts).toLocaleString(CFG.locale, { dateStyle: 'medium', timeStyle: 'short' }))}${kv('Status', pill('Completed', 'ok'))}${kv('Reference', t.id.toUpperCase())}
      <p class="note">Demo transaction.</p>`);
  }
  function cardSheet(id) {
    const c = S().cards.find(x => x.id === id); if (!c) return;
    openSheet(c.type, `
      ${kv('Card number', '···· ···· ···· ' + c.last4)}${kv('Cardholder', esc(c.holder))}${kv('Expiry', esc(c.exp))}
      ${kv('Status', c.frozen ? pill('Frozen', 'warn') : pill('Active', 'ok'))}${kv('Spend limit', money(c.limitCents, { round: true }))}
      <div class="btn-row" style="margin-top:14px"><button class="btn btn--sm btn--quiet" data-freeze-btn="${c.id}">${c.frozen ? 'Unfreeze' : 'Freeze'} card</button><button class="btn btn--sm btn--quiet" data-toast="Card numbers are masked in this demo.">Reveal details</button></div>
      <p class="note">Full numbers are never shown. No real card.</p>`);
  }

  /* ----- money-move sheets (real mutations via API) ----- */
  function accountOptions(selId) {
    return S().accounts.map(a => `<option value="${a.id}"${a.id === selId ? ' selected' : ''}>${esc(a.name)} ··${a.last4} — ${plain(a.balanceCents)}</option>`).join('');
  }
  function amountField() {
    return `<div class="amount-field"><span class="cur">$</span><input id="amtInput" class="field-amt" type="text" inputmode="decimal" data-numeric placeholder="0" autocomplete="off"></div>`;
  }
  function readAmount() { const v = $('#amtInput'); return toCents(v ? v.value : 0); }

  function transferSheet() {
    const a = S().accounts;
    openSheet('Transfer money', `
      ${amountField()}
      <div class="input" style="margin-top:8px"><label>From</label><select id="trFrom">${accountOptions(a[0].id)}</select></div>
      <div class="input" style="margin-top:14px"><label>To</label><select id="trTo">${accountOptions(a[1].id)}</select></div>
      <button class="btn btn--primary btn--lg btn--block" id="trGo" style="margin-top:18px">Review transfer</button>
      <p class="note">No money actually moves. Demo only.</p>`, () => {
      $('#trGo').onclick = async () => {
        const cents = readAmount(), fromId = $('#trFrom').value, toId = $('#trTo').value;
        await runAction($('#trGo'), () => API.transfer({ fromId, toId, cents }), `Transferred ${plain(cents)} to ${acct(toId).name}.`);
      };
    });
  }
  function depositSheet() {
    openSheet('Mobile deposit', `
      ${amountField()}
      <div class="input" style="margin-top:8px"><label>Deposit to</label><select id="dpTo">${accountOptions('chq')}</select></div>
      <div class="card" style="margin-top:14px;display:flex;gap:11px;align-items:center"><span class="stat-ic" style="width:34px;height:34px">${ic('deposit', 18)}</span><div style="font-size:13px;color:var(--text-2);line-height:1.45">Endorse your cheque and capture the front and back. Funds are simulated.</div></div>
      <button class="btn btn--primary btn--lg btn--block" id="dpGo" style="margin-top:16px">Deposit cheque</button>
      <p class="note">No image is uploaded or stored. Demo only.</p>`, () => {
      $('#dpGo').onclick = async () => {
        const cents = readAmount(), toId = $('#dpTo').value;
        await runAction($('#dpGo'), () => API.deposit({ toId, cents }), `Deposited ${plain(cents)} to ${acct(toId).name}.`);
      };
    });
  }
  function payBillSheet(subId) {
    const sub = subId ? S().subs.find(s => s.id === subId) : null;
    openSheet('Pay a bill', `
      ${amountField()}
      <div class="input" style="margin-top:8px"><label>Pay from</label><select id="pbFrom">${accountOptions('chq')}</select></div>
      <div class="input" style="margin-top:14px"><label>Payee</label><input id="pbPayee" type="text" value="${sub ? esc(sub.name) : ''}" placeholder="Who are you paying?" autocomplete="off"></div>
      <button class="btn btn--primary btn--lg btn--block" id="pbGo" style="margin-top:18px">Review payment</button>
      <p class="note">No real payment is sent. Demo only.</p>`, () => {
      if (sub) { const ai = $('#amtInput'); if (ai) ai.value = (sub.amountCents / 100).toFixed(2); }
      $('#pbGo').onclick = async () => {
        const cents = readAmount(), fromId = $('#pbFrom').value, payee = ($('#pbPayee').value || '').trim() || 'Bill payment';
        await runAction($('#pbGo'), () => API.payBill({ fromId, cents, payee, subId }), `Paid ${plain(cents)} to ${payee}.`);
      };
    });
  }
  function tradeSheet(presym, side) {
    const opts = S().holdings.map(h => `<option value="${h.sym}">${esc(h.name)} (${esc(h.sym)})</option>`).join('');
    const sym0 = presym || S().holdings[0].sym;
    let curSide = side === 'Sell' ? 'Sell' : 'Buy';
    openSheet('Trade', `
      <div class="seg" style="margin:6px 0 14px"><button id="sBuy" aria-pressed="${curSide === 'Buy'}">Buy</button><button id="sSell" aria-pressed="${curSide === 'Sell'}">Sell</button></div>
      <div class="input"><label>Asset</label><select id="tkSym">${opts}</select></div>
      <div class="input" style="margin-top:14px"><label>Quantity</label><div class="stepper"><button id="tkMinus" type="button">${ic('minus', 18)}</button><input id="tkQty" type="text" inputmode="decimal" data-numeric value="1"><button id="tkPlus" type="button">${ic('plus', 18)}</button></div></div>
      <div class="card" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center"><div><div class="row-s">Estimated value</div><div class="num" id="tkEst" style="font-size:24px;font-weight:760;margin-top:3px">—</div></div><div style="text-align:right"><div class="row-s">Price</div><div class="num" id="tkPrice" style="font-weight:700;margin-top:3px">—</div></div></div>
      <button class="btn btn--primary btn--lg btn--block" id="tkPreview" style="margin-top:16px">Preview order</button>
      <p class="note">No order is sent. Demo only.</p>`, () => {
      const symEl = $('#tkSym'); symEl.value = sym0;
      const qtyEl = $('#tkQty');
      const setSide = (s) => { curSide = s; $('#sBuy').setAttribute('aria-pressed', s === 'Buy'); $('#sSell').setAttribute('aria-pressed', s === 'Sell'); };
      $('#sBuy').onclick = () => setSide('Buy'); $('#sSell').onclick = () => setSide('Sell');
      function refresh() { const h = S().holdings.find(x => x.sym === symEl.value); const q = parseFloat(qtyEl.value) || 0; $('#tkPrice').textContent = money(h.priceCents, { force: true, round: false }); $('#tkEst').textContent = plain(Math.round(q * h.priceCents)); }
      $('#tkPlus').onclick = () => { qtyEl.value = ((parseFloat(qtyEl.value) || 0) + 1); refresh(); };
      $('#tkMinus').onclick = () => { qtyEl.value = Math.max(0, (parseFloat(qtyEl.value) || 0) - 1); refresh(); };
      symEl.onchange = refresh; qtyEl.oninput = refresh; refresh();
      $('#tkPreview').onclick = () => {
        const h = S().holdings.find(x => x.sym === symEl.value); const q = parseFloat(qtyEl.value) || 0;
        if (q <= 0) { toast('Enter a quantity to preview.', 'warn'); return; }
        openSheet('Confirm order', `
          ${kv('Action', curSide)}${kv('Asset', esc(h.name) + ' (' + esc(h.sym) + ')')}${kv('Quantity', qtyFmt(q))}${kv('Price', plain(h.priceCents))}${kv('Estimated total', plain(Math.round(q * h.priceCents)))}${kv('Commission', plain(0))}
          <button class="btn btn--primary btn--lg btn--block" id="tkConfirm" style="margin-top:16px">Place ${curSide.toLowerCase()} order</button>
          <button class="btn btn--block btn--ghost btn--sm" data-close style="margin-top:8px">Cancel</button>
          <p class="note">Orders are simulated — nothing is executed.</p>`, () => {
          $('#tkConfirm').onclick = async () => {
            await runAction($('#tkConfirm'), () => API.placeTrade({ side: curSide, sym: h.sym, qty: q }), `${curSide} ${qtyFmt(q)} ${h.sym} — filled.`);
          };
        });
      };
    });
  }
  function renameSheet() {
    openSheet('Display name', `
      <div class="input" style="margin-top:6px"><label>Name shown in the app</label><input id="rnInput" type="text" value="${esc(S().profile.name)}" placeholder="Your name" autocomplete="off"></div>
      <button class="btn btn--primary btn--lg btn--block" id="rnGo" style="margin-top:16px">Save</button>
      <p class="note">Stored only on this device.</p>`, () => {
      $('#rnGo').onclick = async () => { const v = $('#rnInput').value; await API.renameProfile(v); closeSheet(); refreshChrome(); render(currentRoute); toast('Name updated.', 'ok'); };
    });
  }
  function resetSheet() {
    openSheet('Reset demo data', `
      <p style="padding:6px 2px;color:var(--text-2);font-size:14px;line-height:1.5">This restores all demo balances, holdings, cards, and settings to their starting values, then signs you out.</p>
      <button class="btn btn--block btn--danger" id="rsGo" style="margin-top:12px">Reset and sign out</button>
      <button class="btn btn--block btn--ghost btn--sm" data-close style="margin-top:8px">Keep my data</button>`, () => {
      $('#rsGo').onclick = () => { Store.reset(); closeSheet(); logout(); toast('Demo data reset.', 'ok'); };
    });
  }
  function notificationsSheet() {
    const ns = S().notifications;
    const body = ns.length ? ns.map(n => `<div class="row"><span class="row-ic ${n.kind === 'warn' ? '' : 'brandish'}">${ic(n.kind === 'warn' ? 'warn' : n.kind === 'ok' ? 'check' : 'info', 19)}</span>
      <div class="row-main" style="white-space:normal"><div class="row-t" style="white-space:normal">${esc(n.title)}</div><div class="row-s" style="white-space:normal">${esc(n.body)} · ${relDay(n.ts)}</div></div>${n.read ? '' : '<span class="badge-dot" style="position:static;border:none"></span>'}</div>`).join('')
      : emptyState('bell', 'No notifications', 'You are all caught up.');
    openSheet('Notifications', `<div class="card card--flush"><div class="list">${body}</div></div>`);
    API.markNotificationsRead().then(refreshChrome);
  }

  /* ----- action runner: handles spinner + errors uniformly ----- */
  async function runAction(btn, fn, successMsg) {
    if (btn.dataset.busy) return; btn.dataset.busy = '1';
    const label = btn.textContent; btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>`;
    try { await fn(); closeSheet(); if (appVisible()) render(currentRoute); if (successMsg) toast(successMsg, 'ok'); }
    catch (e) { btn.disabled = false; btn.textContent = label; delete btn.dataset.busy; toast(e && e.user ? e.message : 'Something went wrong. Try again.', 'err'); }
  }

  function setFrozen(cardId, frozen) {
    API.setCardFrozen(cardId, frozen).then(() => { if (currentRoute === 'cards') render('cards'); });
  }
  function subPay(id) { const s = S().subs.find(x => x.id === id); if (!s) return; closeSheet(); payBillSheet(id); }
  function subToggle(id) { API.toggleSubscription(id).then(st => { closeSheet(); toast(st === 'paused' ? 'Subscription paused.' : 'Subscription resumed.', st === 'paused' ? 'warn' : 'ok'); if (currentRoute === 'payments') render('payments'); }); }
  function onPrefToggle(key, val) {
    API.updatePrefs({ [key]: val });
    if (key === 'hideBalances') { HIDE = val; syncPrivacyBtn(); render(currentRoute); }
    else toast(prefLabel(key) + (val ? ' on' : ' off'), val ? 'ok' : 'info');
  }
  const prefLabel = (k) => ({ alertTxn: 'Transaction alerts', alertLarge: 'Large payment alerts', alertMarket: 'Market alerts', biometric: 'Biometric unlock', hideBalances: 'Hide balances' }[k] || 'Setting');

  /* ============ 13. MARKET TICK ============ */
  let tickTimer = null;
  function startTick() {
    stopTick();
    if (CFG.tickMs <= 0) return;
    tickTimer = setInterval(async () => {
      if (document.hidden || !appVisible()) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      await API.refreshMarkets();
      rerenderIfVisible('invest');
    }, CFG.tickMs);
  }
  function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshChrome(); });

  async function doRefresh() {
    const btn = $('#refreshBtn');
    if (btn) btn.innerHTML = `<span class="spinner" style="width:14px;height:14px"></span> Refreshing`;
    await API.refreshMarkets();
    if (currentRoute === 'invest') render('invest');
    toast('Market data refreshed.', 'ok');
  }

  /* ============ 14. IDLE TIMEOUT ============ */
  let idleTimer = null;
  function armIdle() {
    if (CFG.idleMs <= 0) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (appVisible()) { logout(); toast('Signed out for your security.', 'info'); } }, CFG.idleMs);
  }
  function disarmIdle() { clearTimeout(idleTimer); idleTimer = null; }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { if (appVisible()) armIdle(); }, { passive: true }));

  /* ============ 15. THEME / PRIVACY ============ */
  const metaTheme = $('#metaTheme');
  function applyTheme(pref) {
    const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#0A0E13' : '#F4F6F8');
  }
  // react to OS theme changes while on "system"
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (S().prefs.theme === 'system') applyTheme('system');
    });
  } catch {}

  function togglePrivacy() {
    const val = !S().prefs.hideBalances;
    API.updatePrefs({ hideBalances: val }); HIDE = val; syncPrivacyBtn();
    if (appVisible()) render(currentRoute);
    toast(val ? 'Balances hidden.' : 'Balances shown.', 'info');
  }
  function syncPrivacyBtn() {
    const btn = $('#privacyBtn'); if (!btn) return;
    btn.setAttribute('aria-pressed', String(HIDE));
    const on = btn.querySelector('.i-eye-on'), off = btn.querySelector('.i-eye-off');
    if (on && off) { on.hidden = HIDE; off.hidden = !HIDE; }
    btn.setAttribute('aria-label', HIDE ? 'Show balances' : 'Hide balances');
  }
  function syncPrivacyBtn0() { syncPrivacyBtn(); }

  /* ============ 16. AUTH ============ */
  const authEl = $('#auth'), appEl = $('#app');
  const appVisible = () => !appEl.hidden;

  function refreshChrome() {
    const p = S().profile;
    $('#greetLine').textContent = greeting();
    $('#greetName').textContent = firstName(p.name);
    $('#avatarInitials').textContent = initials(p.name);
    const dot = $('#bellDot'); if (dot) dot.hidden = unreadCount() === 0;
    syncPrivacyBtn();
  }

  function enterApp() {
    try { sessionStorage.setItem(SESSION, '1'); } catch {}
    HIDE = !!S().prefs.hideBalances;
    authEl.hidden = true; appEl.hidden = false;
    refreshChrome();
    const r = (location.hash || '#home').slice(1);
    render(ROUTES.includes(r) ? r : 'home'); scrollTop();
    armIdle(); startTick();
  }
  function logout() {
    try { sessionStorage.removeItem(SESSION); } catch {}
    disarmIdle(); stopTick(); closeSheet();
    appEl.hidden = true; authEl.hidden = false;
    const pw = $('#password'); if (pw) pw.value = '';
    location.hash = '';
  }

  // login form
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn'), pw = $('#password');
    const username = $('#username').value;
    if (pw) pw.value = ''; // never persist password
    btn.disabled = true; btn.querySelector('.btn-label').textContent = 'Signing in';
    btn.querySelector('.spinner').hidden = false;
    try { await API.signIn(username); enterApp(); }
    catch (err) { toast('Could not sign in. Please try again.', 'err'); console.error(err); }
    finally {
      btn.disabled = false;
      const lbl = btn.querySelector('.btn-label'); if (lbl) lbl.textContent = 'Sign in';
      const sp = btn.querySelector('.spinner'); if (sp) sp.hidden = true;
    }
  });
  $('#bioBtn').addEventListener('click', async () => { try { await API.signIn(''); enterApp(); } catch (e) { toast('Could not sign in. Please try again.', 'err'); console.error(e); } });
  $('#pwToggle').addEventListener('click', () => {
    const pw = $('#password'), b = $('#pwToggle');
    const show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  /* ============ 17. BOOT ============ */
  function boot() {
    applyTheme(S().prefs.theme || 'system');
    HIDE = !!S().prefs.hideBalances;
    // keep app-bar chrome (greeting, initials, unread dot) in sync with state changes
    Store.subscribe(() => { if (appVisible()) refreshChrome(); });
    let resumed = false; try { resumed = sessionStorage.getItem(SESSION) === '1'; } catch {}
    if (resumed) enterApp();
    // keep chrome fresh (greeting can change across midnight; unread dot)
    setInterval(() => { if (appVisible()) refreshChrome(); }, 60000);
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
    }
    // failsafe: flush any debounced write before the page is hidden or unloaded
    window.addEventListener('pagehide', () => Store.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) Store.flush(); });
  }
  boot();
})();
