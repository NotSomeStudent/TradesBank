/* =================================================================
   EQUITY BANKING — app.js
   Fictional demo. No backend, no real auth, no real data collected.
   Sections: A. Data store  B. Helpers  C. Components  D. Screens
             E. Modals/toasts  F. Actions  G. Router  H. Boot
   ================================================================= */
(() => {
  'use strict';

  /* ============ A. DATA STORE (single source of truth) ============ */
  const SEED = {
    user: { name: 'Zachary Nichols', initials: 'ZN', tier: 'Equity Private', since: '2019' },
    prefs: { currency: 'CAD', alertsTxn: true, alertsLarge: true, alertsMarket: false, biometric: true },
    accounts: [
      { id:'chq', name:'Everyday Chequing', kind:'Chequing', last4:'4821', balance:14238.55, status:'Active', rate:null,
        activity:[
          { t:'Loblaws #221', s:'Groceries', a:-184.32, d:'Today' },
          { t:'Direct Deposit — Northwind Labs', s:'Payroll', a:4250.00, d:'Yesterday' },
          { t:'Tim Hortons', s:'Dining', a:-6.85, d:'Yesterday' },
          { t:'Transfer to Savings', s:'Internal', a:-1500.00, d:'Mar 12' },
        ]},
      { id:'sav', name:'High-Interest Savings', kind:'Savings', last4:'9043', balance:62950.10, status:'Active', rate:'4.10%',
        activity:[
          { t:'Interest Earned', s:'Monthly accrual', a:201.44, d:'Mar 31' },
          { t:'Transfer from Chequing', s:'Internal', a:1500.00, d:'Mar 12' },
          { t:'Transfer from Chequing', s:'Internal', a:2000.00, d:'Feb 28' },
        ]},
      { id:'usd', name:'USD Cash (CAD view)', kind:'USD Cash', last4:'1177', balance:11842.30, status:'Active', rate:null, fx:'8,640.00 USD @ 1.3707',
        activity:[
          { t:'Stripe Payout', s:'USD inbound', a:2740.00, d:'Mar 18' },
          { t:'FX Conversion', s:'USD → CAD', a:-980.00, d:'Mar 09' },
        ]},
      { id:'cc', name:'Equity World Elite', kind:'Credit Card', last4:'6620', balance:-1284.66, status:'Active', rate:'20.99%', limit:15000,
        activity:[
          { t:'Amazon.ca', s:'Shopping', a:-118.40, d:'Today' },
          { t:'AWS', s:'Cloud', a:-342.18, d:'Mar 14' },
          { t:'Payment — Thank You', s:'Chequing', a:600.00, d:'Mar 10' },
        ]},
    ],
    holdings: [
      { sym:'SHOP', name:'Shopify', cls:'CA Equity', qty:48, avg:92.40, price:118.62, color:'#5A8F3C' },
      { sym:'RY',   name:'Royal Bank', cls:'CA Equity', qty:60, avg:121.10, price:138.45, color:'#1E4F8F' },
      { sym:'TD',   name:'TD Bank', cls:'CA Equity', qty:75, avg:78.20, price:81.10, color:'#1E8E4A' },
      { sym:'ENB',  name:'Enbridge', cls:'CA Equity', qty:140, avg:48.55, price:53.92, color:'#C9A227' },
      { sym:'XEQT', name:'XEQT All-Equity ETF', cls:'ETF', qty:220, avg:27.10, price:31.84, color:'#3F6FD7' },
      { sym:'VFV',  name:'Vanguard S&P 500', cls:'ETF', qty:95, avg:108.30, price:139.05, color:'#9A3FD7' },
      { sym:'AAPL', name:'Apple', cls:'US Equity', qty:40, avg:171.00, price:212.40, color:'#8A8F94' },
      { sym:'NVDA', name:'Nvidia', cls:'US Equity', qty:30, avg:62.40, price:131.18, color:'#76B900' },
      { sym:'BTC',  name:'Bitcoin', cls:'Crypto', qty:0.412, avg:48200, price:92140, color:'#E8923B' },
      { sym:'ETH',  name:'Ethereum', cls:'Crypto', qty:5.8, avg:2410, price:4985, color:'#6B7BE0' },
      { sym:'SOL',  name:'Solana', cls:'Crypto', qty:64, avg:118, price:268, color:'#16C99B' },
      { sym:'GoC5Y',name:'Gov. of Canada 5Y', cls:'Bond', qty:25, avg:98.40, price:99.85, color:'#B23A48' },
      { sym:'CBLAD',name:'Corp Bond Ladder', cls:'Bond', qty:40, avg:100.00, price:101.20, color:'#C76B2E' },
    ],
    markets: [
      { name:'S&P/TSX', value:24812.4, chg:0.62 },
      { name:'S&P 500', value:5908.2, chg:0.41 },
      { name:'Nasdaq', value:19124.7, chg:0.88 },
      { name:'CAD/USD', value:0.7296, chg:-0.18, dp:4 },
      { name:'BTC/CAD', value:92140, chg:2.34 },
      { name:'ETH/CAD', value:4985, chg:1.12 },
    ],
    watchlist: [
      { sym:'CNQ', name:'Canadian Natural', price:47.20, chg:0.9 },
      { sym:'BNS', name:'Scotiabank', price:69.85, chg:-0.4 },
      { sym:'MSFT', name:'Microsoft', price:441.30, chg:0.6 },
      { sym:'COST', name:'Costco', price:902.10, chg:1.1 },
    ],
    trades: [
      { kind:'Buy', sym:'NVDA', detail:'30 @ 62.40', a:-1872.00, d:'Feb 02' },
      { kind:'Dividend', sym:'RY', detail:'Q1 distribution', a:84.00, d:'Feb 24' },
      { kind:'Sell', sym:'AAPL', detail:'10 @ 198.10', a:1981.00, d:'Mar 03' },
      { kind:'Coupon', sym:'GoC5Y', detail:'Semi-annual', a:43.75, d:'Mar 05' },
      { kind:'Conversion', sym:'BTC', detail:'0.05 BTC → CAD', a:4607.00, d:'Mar 15' },
      { kind:'Buy', sym:'XEQT', detail:'40 @ 31.10', a:-1244.00, d:'Mar 19' },
    ],
    subs: [
      { name:'AWS EC2', cat:'Cloud Compute', a:342.18, next:'Apr 01', status:'Active' },
      { name:'AWS S3', cat:'Cloud Storage', a:48.60, next:'Apr 01', status:'Active' },
      { name:'Cloudflare', cat:'Network / CDN', a:25.00, next:'Apr 04', status:'Active' },
      { name:'DigitalOcean', cat:'Droplets', a:36.00, next:'Apr 05', status:'Active' },
      { name:'Vercel Pro', cat:'Hosting', a:27.40, next:'Apr 06', status:'Active' },
      { name:'GitHub Pro', cat:'Dev Tools', a:5.60, next:'Apr 08', status:'Active' },
      { name:'Proton VPN', cat:'Security', a:13.50, next:'Apr 09', status:'Active' },
      { name:'1Password', cat:'Password Manager', a:7.99, next:'Apr 11', status:'Active' },
      { name:'Namecheap', cat:'Domain Renewal', a:18.20, next:'Apr 14', status:'Active' },
      { name:'PlanetScale', cat:'Database Hosting', a:39.00, next:'Apr 16', status:'Paused' },
      { name:'Datadog', cat:'Monitoring', a:31.00, next:'Apr 18', status:'Active' },
      { name:'Snyk', cat:'Security Tools', a:0.00, next:'Apr 20', status:'Trial' },
    ],
    cards: [
      { id:'debit', type:'Debit', variant:'debit', last4:'4821', holder:'ZACHARY NICHOLS', exp:'09/28', frozen:false, limit:5000, spent:1840, network:'Interac' },
      { id:'credit', type:'World Elite Credit', variant:'credit', last4:'6620', holder:'ZACHARY NICHOLS', exp:'11/27', frozen:false, limit:15000, spent:1284, network:'Equity' },
      { id:'virtual', type:'Virtual Card', variant:'virtual', last4:'0093', holder:'ZACHARY NICHOLS', exp:'04/26', frozen:true, limit:2000, spent:310, network:'Equity' },
    ],
    cardTxns: {
      debit:[ {t:'Loblaws #221',a:-184.32,d:'Today'},{t:'Tim Hortons',a:-6.85,d:'Yesterday'},{t:'Petro-Canada',a:-72.10,d:'Mar 17'} ],
      credit:[ {t:'Amazon.ca',a:-118.40,d:'Today'},{t:'AWS',a:-342.18,d:'Mar 14'},{t:'Steam',a:-59.99,d:'Mar 12'} ],
      virtual:[ {t:'OpenAI API',a:-120.00,d:'Mar 10'},{t:'Figma',a:-15.00,d:'Mar 08'} ],
    },
    insights: {
      categories:[
        { k:'Cloud & Hosting', v:1840, color:'#3FD7A0' },
        { k:'Dining', v:642, color:'#E8C77B' },
        { k:'Groceries', v:880, color:'#6B7BE0' },
        { k:'Shopping', v:712, color:'#D9A05B' },
        { k:'Transport', v:298, color:'#F2756A' },
      ],
      cashflow:[
        { m:'Nov', in:6100, out:3980 }, { m:'Dec', in:6300, out:4520 },
        { m:'Jan', in:6250, out:4110 }, { m:'Feb', in:6500, out:4360 },
        { m:'Mar', in:6990, out:4480 },
      ],
    },
  };

  // Persisted state (display name + a few toggles only — nothing sensitive).
  const KEY = 'equity.state.v1';
  function loadState(){
    try{ return Object.assign({}, defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch{ return defaults(); }
  }
  function defaults(){ return { displayName:'Zachary Nichols', prefs:{...SEED.prefs}, frozen:{} }; }
  function saveState(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch{} }
  let state = loadState();
  // apply persisted freeze flags onto card data
  SEED.cards.forEach(c => { if (c.id in state.frozen) c.frozen = state.frozen[c.id]; });
  SEED.prefs = {...SEED.prefs, ...state.prefs};

  /* ============ B. HELPERS ============ */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  function esc(v){
    return String(v).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  const cadFmt = new Intl.NumberFormat('en-CA',{ style:'currency', currency:'CAD' });
  function cad(n){ return cadFmt.format(n || 0); }
  function shortCad(n){
    const a=Math.abs(n);
    if(a>=1e6) return '$'+(n/1e6).toFixed(2)+'M';
    if(a>=1e3) return '$'+(n/1e3).toFixed(1)+'K';
    return '$'+Math.round(n);
  }
  function cadSign(n){ const s = n>0?'+':''; return s + cad(n); }
  function pct(n,dp=2){ const s = n>0?'+':''; return s + (n||0).toFixed(dp) + '%'; }
  function tok(n){ return n >= 1 ? n.toLocaleString('en-CA',{maximumFractionDigits:4}) : n.toString(); }
  function cls(n){ return n>=0?'gain':'loss'; }

  // build a polyline path for a faux sparkline given a seed
  function spark(seed, w=300, h=54, up=true){
    let x = seed; const rnd = () => (x = (x*9301+49297)%233280) / 233280;
    const pts = []; const n = 26;
    let val = 0.5;
    for (let i=0;i<n;i++){ val += (rnd()-0.46)*0.12 + (up?0.012:-0.012); val=Math.max(0.08,Math.min(0.92,val));
      pts.push([ (i/(n-1))*w, h - val*h ]); }
    return pts.map((p,i)=> (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  }

  // portfolio aggregates
  function holdingValue(h){ return h.qty * h.price; }
  function holdingCost(h){ return h.qty * h.avg; }
  function holdingDayChg(h){ // pseudo daily % from sym hash, stable per load
    const base = [...h.sym].reduce((a,c)=>a+c.charCodeAt(0),0);
    return ((base % 700) / 100 - 3.2);
  }
  function portfolioTotals(){
    let mv=0, cost=0;
    SEED.holdings.forEach(h=>{ mv+=holdingValue(h); cost+=holdingCost(h); });
    return { mv, cost, gl: mv-cost, glPct: ((mv-cost)/cost)*100 };
  }
  function classTotals(){
    const map = {};
    SEED.holdings.forEach(h=>{ map[h.cls]=(map[h.cls]||0)+holdingValue(h); });
    return map;
  }
  function netWorth(){
    const cash = SEED.accounts.reduce((a,x)=>a+x.balance,0);
    return cash + portfolioTotals().mv;
  }

  // SVG icon set (stroke style, inherits color)
  const I = {
    transfer:'<path d="M7 7h11M7 7l3-3M7 7l3 3"/><path d="M17 17H6M17 17l-3 3M17 17l-3-3"/>',
    deposit:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    bill:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    trade:'<path d="M3 17 9 11l3 3 6-7"/><path d="M14 7h5v5"/>',
    freeze:'<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>',
    wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h3"/>',
    pie:'<path d="M12 3v9l8 4"/><circle cx="12" cy="12" r="9"/>',
    coin:'<ellipse cx="12" cy="7" rx="8" ry="3.5"/><path d="M4 7v6c0 2 4 3.5 8 3.5s8-1.5 8-3.5V7"/>',
    card:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
    bank:'<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    check:'<path d="m5 12 5 5L20 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    cloud:'<path d="M6 18a4 4 0 0 1 .5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 18z"/>',
    shield:'<path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6z"/>',
    spark:'<path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6L22 11l-6.5 2L13 19l-2.5-6L4 11l6.5-2z"/>',
    flame:'<path d="M12 22c4 0 7-2.5 7-6 0-3-2-5-3-7-1 2-2 2.5-3 2 0-3-1-5-3-7 0 4-5 5-5 11 0 4 3 7 7 7z"/>',
    arrow:'<path d="M9 6l6 6-6 6"/>',
    snow:'<path d="M12 2v20M2 12h20M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
  };
  function ico(name, size=20){ return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[name]||''}</svg>`; }

  /* ============ C. COMPONENTS (markup builders) ============ */
  function row({icon, badgeColor, title, sub, value, delta, deltaCls, tap}){
    const ic = badgeColor
      ? `<span class="row-ic" style="background:${badgeColor}22;color:${badgeColor};border-color:${badgeColor}33">${icon}</span>`
      : `<span class="row-ic">${icon}</span>`;
    return `<div class="row${tap?' tap':''}"${tap?` data-tap="${esc(tap)}"`:''}>
      ${ic}
      <div class="row-main"><div class="row-t">${esc(title)}</div>${sub?`<div class="row-s">${esc(sub)}</div>`:''}</div>
      <div class="row-end">
        ${value!=null?`<div class="row-v">${value}</div>`:''}
        ${delta!=null?`<div class="row-d ${deltaCls||''}">${delta}</div>`:''}
      </div>
    </div>`;
  }
  function txnRow(t){
    const pos = t.a >= 0;
    return row({
      icon: ico(pos?'deposit':'wallet',18),
      title: t.t, sub: (t.s||t.detail||''),
      value: `<span class="${pos?'gain':''}">${cadSign(t.a)}</span>`, delta: t.d,
    });
  }

  /* ============ D. SCREENS ============ */
  const screens = {};

  // ---- HOME ----
  screens.home = () => {
    const pt = portfolioTotals();
    const nw = netWorth();
    const dayChg = nw * 0.0067, dayPct = 0.67;
    const chq = acct('chq'), sav = acct('sav'), cc = acct('cc');
    const cryptoMV = SEED.holdings.filter(h=>h.cls==='Crypto').reduce((a,h)=>a+holdingValue(h),0);
    const util = Math.round((Math.abs(cc.balance)/cc.limit)*100);

    return `<section class="screen">
      <div class="hero">
        <div class="hero-label">${ico('spark',16)} Total net worth · ${esc(state.prefs.currency)}</div>
        <div class="hero-total">${cad(nw)}</div>
        <div class="hero-delta ${cls(dayChg)==='gain'?'':'loss'}">
          <span class="chip">${cadSign(dayChg)}</span>
          <span class="${cls(dayChg)}">${pct(dayPct)} today</span>
        </div>
        <svg class="hero-spark" viewBox="0 0 300 54" preserveAspectRatio="none">
          <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3FD7A0" stop-opacity=".55"/><stop offset="1" stop-color="#3FD7A0" stop-opacity="0"/></linearGradient></defs>
          <path d="${spark(7,300,54,true)} L300 54 L0 54 Z" fill="url(#hg)"/>
          <path d="${spark(7,300,54,true)}" fill="none" stroke="#3FD7A0" stroke-width="2"/>
        </svg>
      </div>

      <div class="qa">
        ${qaBtn('transfer','Transfer')}${qaBtn('deposit','Deposit')}${qaBtn('bill','Pay Bill')}${qaBtn('trade','Trade')}${qaBtn('freeze','Freeze')}
      </div>

      <div class="stat-grid">
        ${stat('wallet','Chequing', cad(chq.balance), chq.name)}
        ${stat('bank','Savings', cad(sav.balance), 'Earning '+sav.rate)}
        ${stat('pie','Investments', cad(pt.mv), pct(pt.glPct,1)+' all-time', cls(pt.gl))}
        ${stat('coin','Crypto', cad(cryptoMV), '3 assets')}
      </div>

      <div class="section-head"><h2 class="section-title">Credit card</h2>
        <button class="section-link" data-tap="route:cards">Manage</button></div>
      <div class="card">
        <div class="control" style="border:none;padding:0">
          <div><div class="control-k">Equity World Elite ·· ${cc.last4}</div>
            <div class="num" style="font-size:20px;font-weight:600;margin-top:6px">${cad(Math.abs(cc.balance))}</div></div>
          <div style="text-align:right"><div class="control-k">Utilization</div>
            <div class="num" style="font-weight:600;margin-top:6px">${util}%</div></div>
        </div>
        <div class="meter${util>50?' warn':''}"><i style="width:${util}%"></i></div>
      </div>

      <div class="section-head"><h2 class="section-title">Recent activity</h2>
        <button class="section-link" data-tap="route:accounts">View all</button></div>
      <div class="card"><div class="rows">
        ${chq.activity.slice(0,4).map(txnRow).join('')}
      </div></div>

      ${legalFoot()}
    </section>`;
  };

  // ---- ACCOUNTS ----
  screens.accounts = () => {
    const cards = SEED.accounts.map(a=>{
      const neg = a.balance < 0;
      const sub = a.kind==='Credit Card'
        ? `Balance owing · limit ${cad(a.limit)}`
        : (a.rate ? `${a.kind} · ${a.rate} APY` : a.kind);
      return `<button class="acct" data-tap="acct:${a.id}">
        <div class="acct-top">
          <div class="acct-name">${ico(acctIcon(a.kind),18)} ${esc(a.name)}</div>
          <span class="badge badge--ok">${esc(a.status)}</span>
        </div>
        <div class="acct-bal">${neg?cad(Math.abs(a.balance)):cad(a.balance)}</div>
        <div class="acct-meta"><span>${esc(sub)}</span><span class="acct-num">···· ${a.last4}</span></div>
      </button>`;
    }).join('');
    const totalCash = SEED.accounts.filter(a=>a.balance>0).reduce((s,a)=>s+a.balance,0);
    return `<section class="screen">
      <div class="section-head" style="margin-top:14px">
        <div><div class="eyebrow">Total deposits</div>
          <div class="num" style="font-size:26px;font-weight:600;margin-top:4px">${cad(totalCash)}</div></div>
        <button class="btn btn--sm" data-tap="action:newaccount">${ico('plus',16)} New</button>
      </div>
      ${cards}
      ${legalFoot()}
    </section>`;
  };

  // ---- PORTFOLIO / MARKETS ----
  let portfolioFilter = 'All';
  screens.portfolio = () => {
    const pt = portfolioTotals();
    const filters = ['All','CA Equity','US Equity','ETF','Crypto','Bond'];
    const list = SEED.holdings.filter(h=> portfolioFilter==='All' || h.cls===portfolioFilter);

    const mkts = SEED.markets.map(m=>`
      <div class="mkt">
        <div class="mkt-name">${esc(m.name)}</div>
        <div class="mkt-val num">${m.dp?m.value.toFixed(m.dp):m.value.toLocaleString('en-CA')}</div>
        <div class="mkt-chg num ${cls(m.chg)}">${pct(m.chg)}</div>
        <svg class="mkt-bar" viewBox="0 0 120 26" preserveAspectRatio="none">
          <path d="${spark(m.name.length*7,120,26,m.chg>=0)}" fill="none" stroke="${m.chg>=0?'#43D9A3':'#F2756A'}" stroke-width="1.6"/></svg>
      </div>`).join('');

    const holdings = list.map(h=>{
      const mv = holdingValue(h), gl = mv - holdingCost(h), glPct=(gl/holdingCost(h))*100;
      const day = holdingDayChg(h);
      const qtyLine = h.cls==='Crypto' ? `${tok(h.qty)} ${h.sym} · avg ${cad(h.avg)}` : `${h.qty} sh · avg ${cad(h.avg)}`;
      return `<div class="row tap" data-tap="hold:${h.sym}">
        <span class="holding-tag" style="background:linear-gradient(165deg,${h.color},${h.color}bb)">${esc(h.sym.slice(0,4))}</span>
        <div class="row-main"><div class="row-t">${esc(h.name)}</div><div class="row-s">${esc(qtyLine)}</div></div>
        <div class="row-end"><div class="row-v num">${cad(mv)}</div>
          <div class="row-d num ${cls(day)}">${pct(day)}</div></div>
      </div>`;
    }).join('');

    const watch = SEED.watchlist.map(w=>row({
      icon:`<span class="num" style="font-size:12px">${esc(w.sym)}</span>`,
      title:w.name, sub:w.sym, value:`<span class="num">${cad(w.price)}</span>`,
      delta:`<span class="num ${cls(w.chg)}">${pct(w.chg)}</span>`,
    })).join('');

    const trades = SEED.trades.slice().reverse().map(t=>{
      const pos=t.a>=0;
      return row({ icon:ico(tradeIcon(t.kind),18), badgeColor:tradeColor(t.kind),
        title:`${t.kind} · ${t.sym}`, sub:t.detail,
        value:`<span class="${pos?'gain':''} num">${cadSign(t.a)}</span>`, delta:t.d });
    }).join('');

    return `<section class="screen">
      <div class="hero" style="margin-top:14px">
        <div class="hero-label">${ico('pie',16)} Portfolio value</div>
        <div class="hero-total" style="font-size:34px">${cad(pt.mv)}</div>
        <div class="hero-delta ${cls(pt.gl)==='gain'?'':'loss'}">
          <span class="chip">${cadSign(pt.gl)}</span>
          <span class="${cls(pt.gl)}">${pct(pt.glPct)} total return</span>
        </div>
      </div>

      <button class="btn btn--primary btn--block" data-tap="action:trade" style="margin-top:14px">${ico('trade',18)} New trade</button>

      <div class="section-head"><h2 class="section-title">Markets</h2><span class="updated" id="mktStamp"></span></div>
      <div class="mkt-strip">${mkts}</div>

      <div class="section-head"><h2 class="section-title">Holdings</h2></div>
      <div class="seg" role="tablist" style="margin:0 4px 12px;flex-wrap:wrap;display:flex">
        ${filters.map(f=>`<button data-filter="${f}" aria-pressed="${f===portfolioFilter}">${f}</button>`).join('')}
      </div>
      <div class="card"><div class="rows">${holdings || emptyState('No holdings in this class','Pick another filter to see positions.')}</div></div>

      <div class="section-head"><h2 class="section-title">Watchlist</h2>
        <button class="section-link" data-tap="action:watch">Add</button></div>
      <div class="card"><div class="rows">${watch}</div></div>

      <div class="section-head"><h2 class="section-title">Trade history</h2></div>
      <div class="card"><div class="rows">${trades}</div></div>
      ${legalFoot()}
    </section>`;
  };

  // ---- PAYMENTS (reachable via quick action / accounts; also a hidden route) ----
  screens.payments = () => {
    const active = SEED.subs.filter(s=>s.status!=='Paused');
    const paidThisMonth = active.reduce((a,s)=>a+s.a,0);
    const upcoming = SEED.subs.slice().sort((a,b)=> a.next.localeCompare(b.next));
    const list = upcoming.map(s=>{
      const badge = s.status==='Active'?'badge--ok':s.status==='Paused'?'badge--mute':'badge--warn';
      return `<div class="row tap" data-tap="sub:${esc(s.name)}">
        <span class="row-ic">${ico(subIcon(s.cat),18)}</span>
        <div class="row-main"><div class="row-t">${esc(s.name)}</div>
          <div class="row-s">${esc(s.cat)} · next ${esc(s.next)}</div></div>
        <div class="row-end"><div class="row-v num">${cad(s.a)}/mo</div>
          <div class="row-d"><span class="badge ${badge}">${esc(s.status)}</span></div></div>
      </div>`;
    }).join('');
    return `<section class="screen">
      <div class="stat-grid" style="margin-top:14px">
        ${stat('cloud','Paid this month', cad(paidThisMonth), `${active.length} active services`)}
        ${stat('bill','Next 7 days', cad(active.slice(0,4).reduce((a,s)=>a+s.a,0)), '4 charges scheduled')}
      </div>
      <div class="section-head"><h2 class="section-title">Subscriptions</h2>
        <button class="section-link" data-tap="action:addsub">Add</button></div>
      <div class="card"><div class="rows">${list}</div></div>
      ${legalFoot()}
    </section>`;
  };

  // ---- CARDS ----
  screens.cards = () => {
    const cards = SEED.cards.map(c=>{
      const used = Math.round((c.spent/c.limit)*100);
      const txns = (SEED.cardTxns[c.id]||[]).map(txnRow).join('');
      return `<div class="card-block">
        <div class="bankcard bankcard--${c.variant}${c.frozen?' frozen':''}" data-tap="card:${c.id}">
          <div class="bankcard-sheen"></div>
          <div class="bankcard-top">
            <div class="bankcard-type">${esc(c.type)}</div>
            <div class="bankcard-brand">Equity</div>
          </div>
          <div class="bankcard-chip"></div>
          <div class="bankcard-num">···· ···· ···· ${c.last4}</div>
          <div class="bankcard-bottom">
            <div><div class="bankcard-holder">${esc(c.holder)}</div>
              <div class="bankcard-exp">EXP ${esc(c.exp)} · ${esc(c.network)}</div></div>
          </div>
        </div>
        <div class="card-controls">
          <div class="control"><span class="control-k">${ico('snow',16)} Freeze card</span>
            <label class="switch"><input type="checkbox" data-freeze="${c.id}"${c.frozen?' checked':''}>
              <span class="track"></span><span class="thumb"></span></label></div>
          <div class="control"><span class="control-k">Spend limit</span>
            <span class="control-v num">${cad(c.limit)}</span></div>
        </div>
        <div class="control" style="margin-top:11px;display:block">
          <div style="display:flex;justify-content:space-between"><span class="control-k">Spent this cycle</span>
            <span class="control-v num">${cad(c.spent)} / ${cad(c.limit)}</span></div>
          <div class="meter${used>70?' warn':''}"><i style="width:${used}%"></i></div>
        </div>
        <div class="section-head" style="margin:18px 4px 10px"><h3 class="section-title" style="font-size:15px">Recent on ·· ${c.last4}</h3></div>
        <div class="card"><div class="rows">${txns||emptyState('No transactions yet','Purchases will appear here.')}</div></div>
      </div>`;
    }).join('<div style="height:24px"></div>');
    return `<section class="screen"><div style="height:8px"></div>${cards}${legalFoot()}</section>`;
  };

  // ---- INSIGHTS ----
  screens.insights = () => {
    const ins = SEED.insights;
    const cats = ins.categories.slice().sort((a,b)=>b.v-a.v);
    const maxCat = cats[0].v;
    const catBars = cats.map(c=>`
      <div class="crow"><div class="ctop"><span>${esc(c.k)}</span><span class="num">${cad(c.v)}</span></div>
        <div class="ctrack"><div class="cfill" style="width:${(c.v/maxCat*100).toFixed(0)}%;background:${c.color}"></div></div></div>`).join('');

    const cf = ins.cashflow, maxCf = Math.max(...cf.map(x=>Math.max(x.in,x.out)));
    // income vs expense paired bars
    const cfPaired = cf.map(x=>`
      <div class="col" style="flex-direction:row;gap:4px;align-items:flex-end">
        <div class="stack" style="height:${(x.in/maxCf*100).toFixed(0)}%;max-width:14px"><div class="seg-in" style="height:100%"></div></div>
        <div class="stack" style="height:${(x.out/maxCf*100).toFixed(0)}%;max-width:14px"><div class="seg-out" style="height:100%"></div></div>
      </div>`).join('');

    // allocation donut — computed once, then reused in the summary line so they always agree
    const ct = classTotals(), totalMV = Object.values(ct).reduce((a,b)=>a+b,0);
    const palette = { 'CA Equity':'#3FD7A0','US Equity':'#6B7BE0','ETF':'#9A3FD7','Crypto':'#E8923B','Bond':'#D9A05B' };
    let acc=0; const stops = Object.entries(ct).map(([k,v])=>{
      const start=acc/totalMV*360; acc+=v; const end=acc/totalMV*360;
      return `${palette[k]} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
    }).join(',');
    const ordered = Object.entries(ct).sort((a,b)=>b[1]-a[1]);
    const legend = ordered.map(([k,v])=>`
      <li><span class="sw" style="background:${palette[k]}"></span>${esc(k)}
        <span class="lv">${Math.round(v/totalMV*100)}%</span></li>`).join('');
    // derived figures for the summary sentence
    const pctOf = k => Math.round(((ct[k]||0)/totalMV)*100);
    const equityPct = pctOf('CA Equity') + pctOf('US Equity');
    const cryptoPct = pctOf('Crypto'), etfPct = pctOf('ETF'), bondPct = pctOf('Bond');
    const cloudSpend = ins.categories.find(c=>/cloud/i.test(c.k));

    const monthLabels = cf.map(x=>`<span>${esc(x.m)}</span>`).join('');

    return `<section class="screen">
      <div class="section-head" style="margin-top:14px"><h2 class="section-title">This month</h2></div>
      ${insight('flame','#D9A05B',`Cloud infrastructure spend is <b>${cad(cloudSpend.v)}</b> this month — up <b>12%</b>, led by AWS EC2 scaling.`)}
      ${insight('pie','#3FD7A0',`Portfolio allocation is <b>${equityPct}% equities</b>, ${etfPct}% ETFs, ${cryptoPct}% crypto, ${bondPct}% bonds.`)}
      ${insight('shield','#6B7BE0','CAD cash reserve covers <b>4.8 months</b> of projected expenses.')}

      <div class="section-head"><h2 class="section-title">Income vs expenses</h2></div>
      <div class="card">
        <div class="toolbar"><div style="display:flex;gap:14px;font-size:12px;color:var(--text-dim)">
          <span style="display:flex;align-items:center;gap:6px"><span class="sw" style="width:11px;height:11px;border-radius:3px;background:#3FD7A0"></span>Income</span>
          <span style="display:flex;align-items:center;gap:6px"><span class="sw" style="width:11px;height:11px;border-radius:3px;background:#3a516a"></span>Expenses</span>
        </div></div>
        <div class="bars">${cfPaired}</div>
        <div class="gauge-row">${monthLabels}</div>
      </div>

      <div class="section-head"><h2 class="section-title">Spending categories</h2></div>
      <div class="card"><div class="catbar">${catBars}</div></div>

      <div class="section-head"><h2 class="section-title">Portfolio allocation</h2></div>
      <div class="card"><div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${stops})">
          <div class="donut-center"><div class="num">${shortCad(totalMV)}</div><small>invested</small></div>
        </div>
        <ul class="legend">${legend}</ul>
      </div></div>

      <div class="section-head"><h2 class="section-title">Risk profile</h2></div>
      <div class="card"><div class="gauge">
        <div class="gauge-track"></div>
        <div class="gauge-row"><span>Conservative</span><span>Balanced</span><span>Aggressive</span></div>
        <div class="gauge-pill">Growth-oriented · 7.2 / 10</div>
      </div></div>

      ${legalFoot()}
    </section>`;
  };

  // ---- PROFILE / SETTINGS ----
  screens.profile = () => {
    const p = state.prefs;
    return `<section class="screen">
      <div class="profile-head">
        <div class="avatar">${esc(initials(state.displayName))}</div>
        <div><div class="profile-name">${esc(state.displayName)}</div>
          <div class="profile-sub">${esc(SEED.user.tier)} · Member since ${esc(SEED.user.since)}</div></div>
      </div>

      <div class="eyebrow" style="margin:8px 4px">Preferences</div>
      <div class="card" style="padding:0">
        <div class="setting-row"><div><div class="setting-k">Display name</div>
          <div class="setting-d">Shown across the app</div></div>
          <button class="btn btn--sm btn--ghost" data-tap="action:rename">Edit</button></div>
        <div class="setting-row"><div><div class="setting-k">Primary currency</div>
          <div class="setting-d">Used for all balances</div></div>
          <span class="badge badge--mute">${esc(p.currency)}</span></div>
        <div class="setting-row"><div><div class="setting-k">Biometric unlock</div>
          <div class="setting-d">Face ID for sign-in (simulated)</div></div>
          ${toggle('biometric', p.biometric)}</div>
      </div>

      <div class="eyebrow" style="margin:20px 4px 8px">Alerts &amp; security</div>
      <div class="card" style="padding:0">
        <div class="setting-row"><div><div class="setting-k">Transaction alerts</div>
          <div class="setting-d">Notify on every purchase</div></div>${toggle('alertsTxn', p.alertsTxn)}</div>
        <div class="setting-row"><div><div class="setting-k">Large payment alerts</div>
          <div class="setting-d">Over $1,000 CAD</div></div>${toggle('alertsLarge', p.alertsLarge)}</div>
        <div class="setting-row"><div><div class="setting-k">Market movement alerts</div>
          <div class="setting-d">±3% on watchlist</div></div>${toggle('alertsMarket', p.alertsMarket)}</div>
      </div>

      <div class="eyebrow" style="margin:20px 4px 8px">Manage</div>
      <div class="btn-row" style="margin:0 0 4px">
        <button class="btn" data-tap="route:payments">${ico('bill',16)} Payments</button>
        <button class="btn btn--danger" data-tap="action:reset">Reset demo</button>
      </div>
      <button class="btn btn--block btn--ghost" data-tap="action:logout" style="margin-top:10px">Sign out</button>
      ${legalFoot()}
    </section>`;
  };

  /* small screen-building helpers */
  function acct(id){ return SEED.accounts.find(a=>a.id===id); }
  function qaBtn(icon,label){ return `<button class="qa-btn" data-tap="qa:${label}"><span class="qa-ic">${ico(icon,19)}</span>${esc(label)}</button>`; }
  function stat(icon,k,v,sub,subCls){ return `<div class="stat">
    <div class="stat-k"><span class="stat-ic">${ico(icon,14)}</span>${esc(k)}</div>
    <div class="stat-v num">${v}</div>${sub?`<div class="stat-sub ${subCls||''}">${esc(sub)}</div>`:''}</div>`; }
  function insight(icon,color,html){ return `<div class="insight-summary">
    <span class="insight-ic" style="background:${color}22;color:${color}">${ico(icon,18)}</span>
    <div class="insight-txt">${html}</div></div>`; }
  function toggle(key,on){ return `<label class="switch"><input type="checkbox" data-pref="${key}"${on?' checked':''}>
    <span class="track"></span><span class="thumb"></span></label>`; }
  function emptyState(title,sub){ return `<div class="empty">${ico('wallet',40)}<h3>${esc(title)}</h3><p>${esc(sub)}</p></div>`; }
  function legalFoot(){ return `<p class="modal-note" style="margin:26px 8px 8px">Equity Banking is a fictional demo environment. Not a real bank. No deposits are held, no transactions occur, and it is not CDIC-insured or regulated. For demonstration only.</p>`; }
  function initials(n){ return (n||'').trim().split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase() || 'EB'; }

  function acctIcon(kind){ return kind==='Credit Card'?'card':kind==='Savings'?'bank':kind==='USD Cash'?'coin':'wallet'; }
  function subIcon(cat){ if(/cloud|host|droplet|compute|storage/i.test(cat))return'cloud';
    if(/security|vpn|password/i.test(cat))return'shield'; if(/monitor/i.test(cat))return'spark';
    if(/domain|dev|database/i.test(cat))return'bank'; return'bill'; }
  function tradeIcon(k){ return k==='Buy'?'deposit':k==='Sell'?'wallet':k==='Dividend'?'coin':k==='Coupon'?'bank':'transfer'; }
  function tradeColor(k){ return {Buy:'#43D9A3',Sell:'#F2756A',Dividend:'#E8C77B',Coupon:'#6B7BE0',Conversion:'#E8923B'}[k]||'#9DB0C0'; }

  /* ============ E. MODALS & TOASTS ============ */
  const modalHost = $('#modalHost'), modalTitle = $('#modalTitle'), modalBody = $('#modalBody');
  let lastFocus = null;

  function openModal(title, bodyHTML){
    lastFocus = document.activeElement;
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    modalHost.hidden = false;
    document.body.style.overflow = 'hidden';
    const f = modalBody.querySelector('input,button,[tabindex]');
    if (f) setTimeout(()=>f.focus(), 60);
  }
  function closeModal(){
    modalHost.hidden = true;
    document.body.style.overflow = '';
    modalBody.innerHTML = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  modalHost.addEventListener('click', e => { if (e.target.matches('[data-close],.modal-backdrop')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape' && !modalHost.hidden) closeModal(); });

  function kv(k,v){ return `<div class="modal-kv"><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`; }

  const toastHost = $('#toastHost');
  function toast(msg, kind='ok'){
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    const icon = kind==='warn'?'info':kind==='info'?'info':'check';
    el.innerHTML = `<span class="toast-ic">${ico(icon,15)}</span><span>${esc(msg)}</span>`;
    toastHost.appendChild(el);
    setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),260); }, 2600);
  }

  /* ============ F. ACTIONS / TAP HANDLERS ============ */
  function handleTap(token){
    const [type, arg] = token.split(':');
    switch(type){
      case 'route': navigate(arg); break;
      case 'qa': quickAction(arg); break;
      case 'acct': accountModal(arg); break;
      case 'hold': holdingModal(arg); break;
      case 'card': /* tapping card toggles via switch instead */ break;
      case 'sub': subModal(arg); break;
      case 'action': appAction(arg); break;
      default: break;
    }
  }

  function quickAction(label){
    switch(label){
      case 'Transfer': transferModal(); break;
      case 'Deposit': depositModal(); break;
      case 'Pay Bill': navigate('payments'); toast('Opened scheduled payments','info'); break;
      case 'Trade': appAction('trade'); break;
      case 'Freeze': freezeModal(); break;
    }
  }

  function appAction(arg){
    switch(arg){
      case 'trade': tradeTicket(); break;
      case 'reset': resetModal(); break;
      case 'logout': logout(); break;
      case 'rename': renameModal(); break;
      case 'newaccount': toast('Account opening is disabled in this demo','info'); break;
      case 'addsub': toast('Adding subscriptions is disabled in this demo','info'); break;
      case 'watch': toast('Watchlist editing is disabled in this demo','info'); break;
      default: break;
    }
  }

  // --- account details
  function accountModal(id){
    const a = acct(id); if(!a) return;
    const neg = a.balance<0;
    const rows = a.activity.map(txnRow).join('');
    openModal(a.name, `
      <div class="tk-est" style="margin-top:6px">
        <div><div class="control-k">${neg?'Balance owing':'Available balance'}</div>
          <div class="num" style="font-size:26px;font-weight:600;margin-top:4px">${cad(Math.abs(a.balance))}</div></div>
        <span class="badge badge--ok" style="align-self:center">${esc(a.status)}</span>
      </div>
      ${kv('Account type', esc(a.kind))}
      ${kv('Account number', '···· ···· '+a.last4)}
      ${a.rate?kv('Interest rate', esc(a.rate)):''}
      ${a.fx?kv('FX position', esc(a.fx)):''}
      ${a.limit?kv('Credit limit', cad(a.limit)):''}
      <div class="section-head" style="margin:18px 4px 8px"><h3 class="section-title" style="font-size:15px">Recent activity</h3></div>
      <div class="rows">${rows}</div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn--sm" data-tap="qa:Transfer">Transfer</button>
        <button class="btn btn--sm" data-tap="qa:Deposit">Deposit</button>
      </div>
      <p class="modal-note">Demo account · figures are fictional.</p>`);
  }

  // --- holding details
  function holdingModal(sym){
    const h = SEED.holdings.find(x=>x.sym===sym); if(!h) return;
    const mv=holdingValue(h), cost=holdingCost(h), gl=mv-cost, glPct=(gl/cost)*100, day=holdingDayChg(h);
    openModal(h.name, `
      <div class="tk-asset" style="margin-top:6px">
        <span class="holding-tag" style="background:linear-gradient(165deg,${h.color},${h.color}bb)">${esc(h.sym.slice(0,4))}</span>
        <div><div class="row-t">${esc(h.sym)} · ${esc(h.cls)}</div>
          <div class="row-s num ${cls(day)}">${cad(h.price)} · ${pct(day)} today</div></div>
      </div>
      ${kv('Market value', cad(mv))}
      ${kv('Quantity', (h.cls==='Crypto'?tok(h.qty)+' '+h.sym:h.qty+' shares'))}
      ${kv('Average cost', cad(h.avg))}
      ${kv('Book cost', cad(cost))}
      ${kv('Total gain/loss', `<span class="${cls(gl)}">${cadSign(gl)} (${pct(glPct)})</span>`)}
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn--primary btn--sm" data-trade-buy="${esc(h.sym)}">Buy</button>
        <button class="btn btn--sm" data-trade-sell="${esc(h.sym)}">Sell</button>
      </div>
      <p class="modal-note">Demo position · not investment advice.</p>`);
  }

  // --- subscription details
  function subModal(name){
    const s = SEED.subs.find(x=>x.name===name); if(!s) return;
    const badge = s.status==='Active'?'badge--ok':s.status==='Paused'?'badge--mute':'badge--warn';
    openModal(s.name, `
      ${kv('Category', esc(s.cat))}
      ${kv('Amount', cad(s.a)+' / month')}
      ${kv('Next payment', esc(s.next))}
      ${kv('Status', `<span class="badge ${badge}">${esc(s.status)}</span>`)}
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn--primary btn--sm" data-act-toast="Payment of ${esc(cad(s.a))} simulated for ${esc(s.name)}">Pay now</button>
        <button class="btn btn--sm" data-act-toast="${esc(s.name)} ${s.status==='Paused'?'resumed':'paused'} (demo)">${s.status==='Paused'?'Resume':'Pause'}</button>
      </div>
      <p class="modal-note">No real charge occurs. Demo only.</p>`);
  }

  // --- card details (tap on card surface)
  function cardModal(id){
    const c = SEED.cards.find(x=>x.id===id); if(!c) return;
    openModal(c.type, `
      ${kv('Card number', '···· ···· ···· '+c.last4)}
      ${kv('Cardholder', esc(c.holder))}
      ${kv('Expiry', esc(c.exp))}
      ${kv('Network', esc(c.network))}
      ${kv('Status', c.frozen?'<span class="badge badge--warn">Frozen</span>':'<span class="badge badge--ok">Active</span>')}
      ${kv('Spend limit', cad(c.limit))}
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn--sm" data-freeze-btn="${c.id}">${c.frozen?'Unfreeze':'Freeze'} card</button>
        <button class="btn btn--sm" data-act-toast="Card details are masked in this demo">Reveal</button>
      </div>
      <p class="modal-note">Full numbers are never shown. No real card.</p>`);
  }

  // --- transfer
  function transferModal(){
    const opts = SEED.accounts.map(a=>`<option value="${a.id}">${esc(a.name)} ·· ${a.last4}</option>`).join('');
    openModal('Transfer money', `
      <label class="field" style="margin-top:6px"><span class="field-label">From</span>
        <select id="trFrom" class="field-sel">${opts}</select></label>
      <label class="field"><span class="field-label">To</span>
        <select id="trTo" class="field-sel">${opts}</select></label>
      <label class="field"><span class="field-label">Amount (CAD)</span>
        <input id="trAmt" type="text" inputmode="decimal" placeholder="0.00" class="field-amt"></label>
      <button class="btn btn--primary btn--block" id="trGo" style="margin-top:6px">Review transfer</button>
      <p class="modal-note">No money actually moves. Demo only.</p>`);
    $('#trGo').addEventListener('click', ()=>{
      const amt = parseFloat($('#trAmt').value); const from=$('#trFrom'); const to=$('#trTo');
      if(!amt || amt<=0){ toast('Enter an amount to continue','warn'); return; }
      if(from.value===to.value){ toast('Choose two different accounts','warn'); return; }
      closeModal();
      toast(`Transfer of ${cad(amt)} scheduled (demo)`,'ok');
    });
  }

  // --- deposit
  function depositModal(){
    openModal('Mobile deposit', `
      <div class="empty" style="padding:24px 16px">${ico('deposit',40)}
        <h3>Cheque deposit</h3><p>Endorse your cheque and capture the front and back.</p></div>
      <button class="btn btn--primary btn--block" data-act-toast="Deposit captured — funds available in 1 business day (demo)">Capture cheque</button>
      <p class="modal-note">No image is uploaded or stored. Demo only.</p>`);
  }

  // --- freeze chooser
  function freezeModal(){
    const list = SEED.cards.map(c=>`<div class="row tap" data-freeze-row="${c.id}">
      <span class="row-ic">${ico('card',18)}</span>
      <div class="row-main"><div class="row-t">${esc(c.type)} ·· ${c.last4}</div>
        <div class="row-s">${c.frozen?'Currently frozen':'Currently active'}</div></div>
      <div class="row-end"><span class="badge ${c.frozen?'badge--warn':'badge--ok'}">${c.frozen?'Frozen':'Active'}</span></div>
    </div>`).join('');
    openModal('Freeze a card', `<div class="rows" style="margin-top:6px">${list}</div>
      <p class="modal-note">Freezing instantly blocks new purchases. Demo only.</p>`);
  }

  // --- trade ticket
  function tradeTicket(presym, side){
    const opts = SEED.holdings.map(h=>`<option value="${h.sym}">${esc(h.name)} (${esc(h.sym)})</option>`).join('');
    const sym = presym || SEED.holdings[0].sym;
    openModal('Trade ticket', `
      <div class="seg" style="width:100%;margin:6px 0 14px">
        <button id="tSideBuy" aria-pressed="${side!=='Sell'}" style="flex:1">Buy</button>
        <button id="tSideSell" aria-pressed="${side==='Sell'}" style="flex:1">Sell</button>
      </div>
      <label class="field"><span class="field-label">Asset</span>
        <select id="tSym" class="field-sel">${opts}</select></label>
      <label class="field"><span class="field-label">Quantity</span>
        <div class="stepper"><button id="tMinus" type="button">${ico('minus',18)}</button>
          <input id="tQty" type="text" inputmode="decimal" value="1">
          <button id="tPlus" type="button">${ico('plus',18)}</button></div></label>
      <div class="tk-est"><div><div class="control-k">Estimated value</div>
        <div class="num" id="tEst" style="font-size:22px;font-weight:600;margin-top:4px">—</div></div>
        <div style="text-align:right"><div class="control-k">Price</div>
          <div class="num" id="tPrice" style="margin-top:4px">—</div></div></div>
      <button class="btn btn--primary btn--block" id="tPreview">Preview order</button>
      <p class="modal-note">No order is sent. Demo only.</p>`);
    const symEl=$('#tSym'), qtyEl=$('#tQty');
    symEl.value = sym;
    let curSide = side==='Sell'?'Sell':'Buy';
    const setSide = s=>{ curSide=s; $('#tSideBuy').setAttribute('aria-pressed', s==='Buy'); $('#tSideSell').setAttribute('aria-pressed', s==='Sell'); };
    $('#tSideBuy').onclick=()=>setSide('Buy'); $('#tSideSell').onclick=()=>setSide('Sell');
    function refresh(){
      const h = SEED.holdings.find(x=>x.sym===symEl.value);
      const q = parseFloat(qtyEl.value)||0;
      $('#tPrice').textContent = cad(h.price);
      $('#tEst').textContent = cad(q*h.price);
    }
    $('#tPlus').onclick=()=>{ qtyEl.value=((parseFloat(qtyEl.value)||0)+1); refresh(); };
    $('#tMinus').onclick=()=>{ qtyEl.value=Math.max(0,(parseFloat(qtyEl.value)||0)-1); refresh(); };
    symEl.onchange=refresh; qtyEl.oninput=refresh; refresh();
    $('#tPreview').onclick=()=>{
      const h=SEED.holdings.find(x=>x.sym===symEl.value); const q=parseFloat(qtyEl.value)||0;
      if(q<=0){ toast('Enter a quantity to preview','warn'); return; }
      openModal('Confirm order', `
        ${kv('Action', curSide)}
        ${kv('Asset', esc(h.name)+' ('+esc(h.sym)+')')}
        ${kv('Quantity', tok(q))}
        ${kv('Price', cad(h.price))}
        ${kv('Estimated total', cad(q*h.price))}
        ${kv('Est. commission', cad(0))}
        <button class="btn btn--primary btn--block" id="tConfirm" style="margin-top:14px">Place ${curSide.toLowerCase()} order</button>
        <button class="btn btn--block btn--ghost btn--sm" data-close style="margin-top:10px">Cancel</button>
        <p class="modal-note">Orders are simulated — nothing is executed.</p>`);
      $('#tConfirm').onclick=()=>{ closeModal(); toast(`${curSide} ${tok(q)} ${h.sym} — order filled (demo)`,'ok'); };
    };
  }

  // --- rename
  function renameModal(){
    openModal('Display name', `
      <label class="field" style="margin-top:6px"><span class="field-label">Name shown in the app</span>
        <input id="rnInput" type="text" value="${esc(state.displayName)}" placeholder="Your name"></label>
      <button class="btn btn--primary btn--block" id="rnSave">Save name</button>
      <p class="modal-note">Stored only on this device.</p>`);
    $('#rnSave').onclick=()=>{
      const v=$('#rnInput').value.trim() || 'Zachary Nichols';
      state.displayName=v; saveState(); closeModal(); render(currentRoute); toast('Name updated','ok');
    };
  }

  // --- reset
  function resetModal(){
    openModal('Reset demo', `
      <p class="insight-txt" style="padding:6px 2px 4px">This clears your saved display name, preferences, and card freeze states on this device, then returns to the welcome screen.</p>
      <button class="btn btn--danger btn--block" id="rsYes" style="margin-top:10px">Reset and sign out</button>
      <button class="btn btn--block btn--ghost btn--sm" data-close style="margin-top:10px">Keep my demo</button>`);
    $('#rsYes').onclick=()=>{ try{ localStorage.removeItem(KEY); localStorage.removeItem('equity.session'); }catch{}
      state=defaults(); SEED.cards.forEach(c=>c.frozen = c.id==='virtual'); closeModal(); logout(); toast('Demo reset','ok'); };
  }

  // delegated clicks inside modal body for buttons created on the fly
  modalBody.addEventListener('click', e=>{
    const t=e.target.closest('[data-act-toast],[data-trade-buy],[data-trade-sell],[data-freeze-btn]');
    if(!t) return;
    if(t.dataset.actToast!=null){ toast(t.dataset.actToast,'info'); }
    else if(t.dataset.tradeBuy){ tradeTicket(t.dataset.tradeBuy,'Buy'); }
    else if(t.dataset.tradeSell){ tradeTicket(t.dataset.tradeSell,'Sell'); }
    else if(t.dataset.freezeBtn){ toggleFreeze(t.dataset.freezeBtn); closeModal(); }
  });
  // freeze rows in chooser
  modalBody.addEventListener('click', e=>{
    const r=e.target.closest('[data-freeze-row]'); if(!r) return;
    toggleFreeze(r.dataset.freezeRow); closeModal();
  });

  function toggleFreeze(id){
    const c=SEED.cards.find(x=>x.id===id); if(!c) return;
    c.frozen=!c.frozen; state.frozen[id]=c.frozen; saveState();
    toast(`${c.type} ·· ${c.last4} ${c.frozen?'frozen':'unfrozen'}`, c.frozen?'warn':'ok');
    if(currentRoute==='cards') render('cards');
  }

  /* ============ G. ROUTER ============ */
  const view = $('#view');
  const tabs = $$('.tab');
  const ROUTES = ['home','accounts','portfolio','cards','insights','payments','profile'];
  let currentRoute = 'home';

  function navigate(route){
    if(!ROUTES.includes(route)) route='home';
    if(location.hash !== '#'+route) location.hash = route; // triggers hashchange → render
    else render(route);
  }
  function render(route){
    currentRoute = route;
    // skeleton flash for perceived speed on heavier screens
    view.scrollTop = 0;
    view.innerHTML = screens[route] ? screens[route]() : screens.home();
    // active tab (payments/profile have no tab → none active, which is intended)
    tabs.forEach(t => {
      if (t.dataset.route === route) t.setAttribute('aria-current','page');
      else t.removeAttribute('aria-current');
    });
    // post-render hooks
    if(route==='portfolio') $('#mktStamp') && ($('#mktStamp').textContent = stamp());
    // animate bars/donut by reflow already handled via CSS transitions on mount
    bindFilters();
  }
  function bindFilters(){
    $$('[data-filter]').forEach(b=> b.onclick=()=>{ portfolioFilter=b.dataset.filter; render('portfolio'); });
  }

  // global delegated tap handling (event delegation = no per-render listeners)
  document.addEventListener('click', e=>{
    const tapEl = e.target.closest('[data-tap]');
    if(tapEl && !tapEl.classList.contains('bankcard')){ handleTap(tapEl.dataset.tap); }
  });
  // card surface tap → details (separate because switch is inside)
  view.addEventListener('click', e=>{
    if(e.target.closest('.switch')) return; // let toggle handle it
    const card=e.target.closest('.bankcard[data-tap^="card:"]');
    if(card){ cardModal(card.dataset.tap.split(':')[1]); }
  });
  // freeze switches + preference toggles
  view.addEventListener('change', e=>{
    const f=e.target.closest('[data-freeze]');
    if(f){ toggleFreeze(f.dataset.freeze); return; }
    const p=e.target.closest('[data-pref]');
    if(p){ state.prefs[p.dataset.pref]=p.checked; saveState();
      toast(`${prefLabel(p.dataset.pref)} ${p.checked?'on':'off'}`, p.checked?'ok':'info'); }
  });
  function prefLabel(k){ return ({alertsTxn:'Transaction alerts',alertsLarge:'Large payment alerts',alertsMarket:'Market alerts',biometric:'Biometric unlock'}[k]||'Setting'); }

  // tab buttons
  tabs.forEach(t=> t.addEventListener('click', ()=> navigate(t.dataset.route)));

  // profile is reachable by tapping the avatar area — add a top-bar long-press alt: use logout button only.
  // Provide a way to reach profile: tap brand in topbar.
  $('.topbar .brand').addEventListener('click', ()=> navigate('profile'));
  $('.topbar .brand').style.cursor='pointer';

  window.addEventListener('hashchange', ()=>{
    const r=(location.hash||'#home').slice(1);
    if(!appVisible()) return;
    render(ROUTES.includes(r)?r:'home');
  });

  /* ============ H. AUTH + BOOT ============ */
  const authEl=$('#auth'), appEl=$('#app');
  const SESSION='equity.session';

  function appVisible(){ return !appEl.hidden; }
  function stamp(){
    const d=new Date();
    const t=d.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit',hour12:true}).replace(/\s/g,'').toLowerCase();
    const md=d.toLocaleDateString('en-CA',{month:'short',day:'numeric'});
    return `${md} · ${t}`;
  }

  function enterApp(name){
    if(name){ state.displayName=name; saveState(); }
    try{ sessionStorage.setItem(SESSION,'1'); }catch{}
    authEl.style.display='none';
    appEl.hidden=false;
    $('#lastUpdated').textContent = 'Updated '+stamp();
    const r=(location.hash||'#home').slice(1);
    render(ROUTES.includes(r)?r:'home');
  }
  function logout(){
    try{ sessionStorage.removeItem(SESSION); }catch{}
    closeModal();
    appEl.hidden=true;
    authEl.style.display='';
    $('#password').value='';
    location.hash='';
  }

  $('#loginForm').addEventListener('submit', e=>{
    e.preventDefault();
    const typed=$('#username').value.trim();
    const name = typed ? prettifyHandle(typed) : 'Zachary Nichols';
    $('#password').value=''; // never persist password
    const btn=$('#loginBtn'); btn.disabled=true; btn.querySelector('span').textContent='Signing in…';
    setTimeout(()=>{ btn.disabled=false; btn.querySelector('span').textContent='Continue'; enterApp(name); }, 480);
  });
  $('#logoutBtn').addEventListener('click', logout);

  function prettifyHandle(h){
    // turn "zachary.nichols" / "zachary_nichols" into "Zachary Nichols"; leave real names as typed
    if(/[.\-_]/.test(h) && !/\s/.test(h)){
      return h.split(/[.\-_]+/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
    }
    return h;
  }

  // resume session if present (refresh keeps you logged in for the session)
  function boot(){
    let resumed=false;
    try{ resumed = sessionStorage.getItem(SESSION)==='1'; }catch{}
    if(resumed){ enterApp(); } // already have displayName in state
    // live timestamp tick
    setInterval(()=>{ if(appVisible()) $('#lastUpdated').textContent='Updated '+stamp(); }, 60000);
  }
  boot();

  // register service worker (relative path; tolerate failure on file://)
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=> navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
  }

  // expose nothing globally — fully encapsulated
})();
