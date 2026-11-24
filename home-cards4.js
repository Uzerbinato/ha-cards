/* home-cards4.js - card su misura, quarta serie (stile Casa)
   custom:lights-zone-card  luci di una zona: lampadine che si illuminano, luminosità trascinando, potenza, scene, «spegni tutto»
     config: title, icon, lights: [{ entity, name, power? }], scenes: [{ entity, name, icon }]
   custom:security-card     telecamere con rilevamenti (persona / veicolo / movimento), stato generale, cancello
     config: cameras: [{ entity, name, prefix }], gate (switch), refresh (s, default 10) */
(() => {
const BG = 'radial-gradient(120% 90% at 50% 0%,#18242b 0%,#0d1317 62%,#0a0f12 100%)';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hhmm = (d) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
const ago = (d) => { const m = Math.round((Date.now() - d) / 60000); if (m < 1) return 'adesso'; if (m < 60) return m + ' min fa'; const h = Math.floor(m / 60); if (h < 24) return h + ' h fa'; return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ' ' + hhmm(d); };
const moreInfo = (el, id) => { const e = new Event('hass-more-info', { bubbles: true, composed: true }); e.detail = { entityId: id }; el.dispatchEvent(e); };

/* ---------- luci ---------- */
const CSS_L = `
ha-card{background:${BG};border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit);padding:16px;position:relative;overflow:hidden;transition:border-color .4s,box-shadow .4s}
ha-card.lit{border-color:rgba(251,191,36,.30);box-shadow:0 12px 34px rgba(245,158,11,.10)}
ha-card.lit::before{content:'';position:absolute;inset:-30% -10% auto -10%;height:70%;background:radial-gradient(closest-side,rgba(251,191,36,.10),transparent);pointer-events:none}
.hd{display:flex;align-items:center;gap:12px;position:relative}
.hi{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(148,163,184,.12);color:#cbd5e1;flex:none}
.lit .hi{background:linear-gradient(180deg,#f59e0b,#b45309);color:#fff;box-shadow:0 4px 14px rgba(245,158,11,.35)}
.hi ha-icon{--mdc-icon-size:22px}
.ht{flex:1;min-width:0}
.ht b{display:block;font-size:17px;font-weight:700;letter-spacing:-.2px}
.ht span{font-size:12px;color:#9fb3bd}
.off{all:unset;cursor:pointer;font-size:12px;padding:6px 11px;border-radius:99px;background:rgba(148,163,184,.12);color:#cbd5e1;display:flex;align-items:center;gap:5px;white-space:nowrap}
.off:hover{background:rgba(148,163,184,.22)}.off ha-icon{--mdc-icon-size:15px}
.off[hidden]{display:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:9px;margin-top:14px;position:relative}
.lt{position:relative;border-radius:16px;padding:10px 10px 12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:pan-y;overflow:hidden;transition:background .3s,border-color .3s,transform .12s}
.lt:active{transform:scale(.97)}
.lt.on{background:linear-gradient(180deg,rgba(251,191,36,.16),rgba(251,191,36,.05));border-color:rgba(251,191,36,.35)}
.lt.na{opacity:.4}
.lt svg{width:34px;height:40px;display:block}
.lt .n{font-size:12.5px;font-weight:600;margin-top:6px;line-height:1.2;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt .s{font-size:11px;color:#8fa3ad;margin-top:1px;font-variant-numeric:tabular-nums}
.lt.on .s{color:#fcd34d}
.lt .br{position:absolute;left:0;bottom:0;height:3px;background:linear-gradient(90deg,#f59e0b,#fde68a);box-shadow:0 0 8px rgba(251,191,36,.7);transition:width .2s}
.lt .w{position:absolute;top:9px;right:9px;font-size:10px;color:#fcd34d;background:rgba(0,0,0,.25);border-radius:99px;padding:1px 6px}
.lt.drag{border-color:#fde68a}
.lt .pct{position:absolute;inset:0;display:none;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;background:rgba(10,15,18,.55);backdrop-filter:blur(2px)}
.lt.drag .pct{display:flex}
.sc{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.sc button{all:unset;cursor:pointer;font-size:12px;padding:6px 11px;border-radius:99px;background:rgba(148,163,184,.10);color:#cbd5e1;display:flex;align-items:center;gap:5px}
.sc button:hover{background:rgba(251,191,36,.18);color:#fde68a}.sc ha-icon{--mdc-icon-size:15px}
.sc button.go{background:rgba(251,191,36,.28);color:#fff}
.hint{font-size:10.5px;color:#64748b;margin-top:10px}
`;
function bulb(on, pct, uid) {
  const a = on ? 0.35 + 0.65 * (pct == null ? 1 : pct / 100) : 0;
  return `<svg viewBox="0 0 34 40"><defs><radialGradient id="g${uid}" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fff7d6"/><stop offset=".55" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/></radialGradient></defs>
  ${on ? `<circle cx="17" cy="15" r="16" fill="#fbbf24" opacity="${(a * 0.28).toFixed(2)}" style="filter:blur(4px)"/>` : ''}
  <path d="M17 3a11 11 0 0 0-6.6 19.8c1.3 1 2 2.3 2.1 3.7h9c.1-1.4.8-2.7 2.1-3.7A11 11 0 0 0 17 3z" fill="${on ? `url(#g${uid})` : '#26323b'}" stroke="${on ? '#fde68a' : 'rgba(255,255,255,.18)'}" stroke-width="1.2" opacity="${on ? (0.55 + 0.45 * a).toFixed(2) : 1}"/>
  <path d="M13.5 22c0-3 1.5-5 3.5-8 2 3 3.5 5 3.5 8" fill="none" stroke="${on ? '#fff' : 'rgba(255,255,255,.22)'}" stroke-width="1.1" opacity=".8"/>
  <rect x="12.4" y="27.5" width="9.2" height="2.6" rx="1.2" fill="#64748b"/><rect x="12.9" y="31" width="8.2" height="2.4" rx="1.2" fill="#556270"/><path d="M14.5 34.4h5l-1 2.4h-3z" fill="#475569"/></svg>`;
}
class LightsZoneCard extends HTMLElement {
  setConfig(c) { if (!c.lights) throw new Error('lights obbligatorio'); this._c = Object.assign({ title: 'Luci', icon: 'mdi:lightbulb-group-outline', scenes: [] }, c); }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, rows: 'auto' }; }
  set hass(h) {
    this._h = h; if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (this._dragging) return;
    const k = this._c.lights.map((l) => { const s = h.states[l.entity]; return s ? s.state + (s.attributes.brightness || '') + (l.power && h.states[l.power] ? h.states[l.power].state : '') : 'x'; }).join('|');
    if (k !== this._k) { this._k = k; this._render(); }
  }
  _render() {
    const h = this._h, c = this._c;
    const L = c.lights.map((l, i) => {
      const s = h.states[l.entity], on = s && s.state === 'on', dim = !!(s && s.entity_id.startsWith('light.') && (s.attributes.supported_color_modes || []).some((m) => m !== 'onoff'));
      const pct = on && s.attributes.brightness != null ? Math.round(s.attributes.brightness / 2.55) : null;
      const w = l.power && h.states[l.power] ? parseFloat(h.states[l.power].state) : NaN;
      return { l, i, s, on, dim, pct, w };
    });
    const nOn = L.filter((x) => x.on).length, W = L.reduce((a, x) => a + (x.on && !isNaN(x.w) ? x.w : 0), 0);
    const tiles = L.map((x) => `<div class="lt${x.on ? ' on' : ''}${!x.s || x.s.state === 'unavailable' ? ' na' : ''}" data-i="${x.i}">${bulb(x.on, x.pct, this._uid(x.i))}
      ${x.on && !isNaN(x.w) && x.w > 0 ? `<span class="w">${Math.round(x.w)} W</span>` : ''}
      <div class="n">${esc(x.l.name || (x.s && x.s.attributes.friendly_name) || x.l.entity)}</div>
      <div class="s">${!x.s || x.s.state === 'unavailable' ? 'non raggiungibile' : x.on ? (x.pct != null ? x.pct + '%' : 'accesa') : 'spenta'}</div>
      ${x.dim ? `<div class="br" style="width:${x.on ? x.pct || 100 : 0}%"></div><div class="pct">${x.pct || 0}%</div>` : ''}</div>`).join('');
    const sc = (c.scenes || []).map((s, i) => `<button data-s="${i}"><ha-icon icon="${s.icon || 'mdi:palette-outline'}"></ha-icon>${esc(s.name)}</button>`).join('');
    const anyDim = L.some((x) => x.dim);
    this.shadowRoot.innerHTML = `<style>${CSS_L}</style><ha-card class="${nOn ? 'lit' : ''}">
      <div class="hd"><div class="hi"><ha-icon icon="${c.icon}"></ha-icon></div><div class="ht"><b>${esc(c.title)}</b><span>${nOn ? nOn + (nOn === 1 ? ' luce accesa' : ' luci accese') + ' su ' + L.length + (W > 0 ? ' · ' + Math.round(W) + ' W' : '') : 'Tutto spento'}</span></div>
      <button class="off" ${nOn ? '' : 'hidden'}><ha-icon icon="mdi:power"></ha-icon>Spegni tutto</button></div>
      <div class="grid">${tiles}</div>${sc ? `<div class="sc">${sc}</div>` : ''}
      ${anyDim ? '<div class="hint">Tocca per accendere o spegnere · trascina a destra o sinistra per la luminosità</div>' : ''}</ha-card>`;
    const R = this.shadowRoot;
    R.querySelector('.off').onclick = () => { const ids = L.filter((x) => x.on).map((x) => x.l.entity); ids.forEach((e) => h.callService(e.split('.')[0], 'turn_off', { entity_id: e })); };
    R.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { const s = c.scenes[+b.dataset.s]; b.classList.add('go'); setTimeout(() => b.classList.remove('go'), 700); h.callService(s.entity.split('.')[0] === 'script' ? 'script' : 'scene', 'turn_on', { entity_id: s.entity }); });
    R.querySelectorAll('.lt').forEach((el) => this._bind(el, L[+el.dataset.i]));
  }
  _uid(i) { if (!this._id) this._id = Math.random().toString(36).slice(2, 7); return this._id + i; }
  _bind(el, x) {
    const h = this._h, ent = x.l.entity, dom = ent.split('.')[0];
    let sx = 0, sy = 0, moved = false, start = 0, down = false, timer = null;
    const pctEl = el.querySelector('.pct'), br = el.querySelector('.br');
    el.addEventListener('pointerdown', (e) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; start = x.on ? (x.pct || 100) : 0; timer = setTimeout(() => { if (down && !moved) { down = false; moreInfo(this, ent); } }, 600); });
    el.addEventListener('pointermove', (e) => {
      if (!down || !x.dim) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - sy)) { moved = true; clearTimeout(timer); el.setPointerCapture(e.pointerId); el.classList.add('drag'); this._dragging = true; }
      if (moved) { const v = Math.max(1, Math.min(100, Math.round(start + dx / el.offsetWidth * 100))); this._v = v; pctEl.textContent = v + '%'; br.style.width = v + '%'; }
    });
    const end = () => {
      if (!down) return; down = false; clearTimeout(timer);
      if (moved) { el.classList.remove('drag'); this._dragging = false; h.callService('light', 'turn_on', { entity_id: ent, brightness_pct: this._v }); this._k = null; }
      else if (x.s && x.s.state !== 'unavailable') h.callService(dom, 'toggle', { entity_id: ent });
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { down = false; clearTimeout(timer); el.classList.remove('drag'); this._dragging = false; });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

/* ---------- sicurezza ---------- */
const CSS_S = `
ha-card{background:${BG};border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit);padding:16px;position:relative;overflow:hidden}
ha-card.alert{border-color:rgba(239,68,68,.55);box-shadow:0 0 0 1px rgba(239,68,68,.15),0 12px 34px rgba(220,38,38,.20)}
ha-card.warn{border-color:rgba(245,158,11,.40)}
.top{display:flex;align-items:center;gap:13px}
.sh{width:52px;height:52px;flex:none;position:relative}
.sh svg{width:100%;height:100%}
.alert .sh{animation:pulse 1.2s ease-in-out infinite}
.tt{flex:1;min-width:0}
.tt .k{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad}
.tt b{display:block;font-size:20px;font-weight:700;letter-spacing:-.3px;margin-top:1px}
.tt span{font-size:12.5px;color:#9fb3bd}
.ok .tt b{color:#6ee7b7}.warn .tt b{color:#fcd34d}.alert .tt b{color:#fca5a5}
.gate{all:unset;cursor:pointer;flex:none;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 12px;border-radius:14px;background:rgba(148,163,184,.12);color:#e2e8f0;font-size:11.5px;font-weight:600;min-width:64px;text-align:center;transition:background .2s}
.gate ha-icon{--mdc-icon-size:22px}
.gate:hover{background:rgba(148,163,184,.22)}
.gate.arm{background:linear-gradient(180deg,#f59e0b,#b45309);color:#fff;box-shadow:0 4px 14px rgba(245,158,11,.4)}
.gate.busy{background:linear-gradient(180deg,#10b981,#047857);color:#fff}
.cams{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:9px;margin-top:14px}
.cam{position:relative;border-radius:14px;overflow:hidden;aspect-ratio:16/9;background:#0b1115;cursor:pointer;border:1px solid rgba(255,255,255,.07);transition:border-color .3s,box-shadow .3s}
.cam img{width:100%;height:100%;object-fit:cover;display:block;transition:opacity .4s}
.cam .sh2{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,transparent 35%,transparent 60%,rgba(0,0,0,.65) 100%)}
.cam .nm{position:absolute;left:9px;bottom:7px;font-size:12px;font-weight:600;text-shadow:0 1px 3px #000}
.cam .tm{position:absolute;right:8px;bottom:7px;font-size:10px;color:#cbd5e1;text-shadow:0 1px 3px #000}
.cam .bd{position:absolute;top:7px;right:7px;display:flex;gap:4px}
.cam .bd span{display:flex;align-items:center;gap:3px;font-size:10.5px;font-weight:600;padding:2px 7px 2px 5px;border-radius:99px;color:#fff}
.cam .bd ha-icon{--mdc-icon-size:13px}
.cam .bd .p{background:#dc2626;box-shadow:0 0 10px rgba(239,68,68,.8)}
.cam .bd .v{background:#d97706;box-shadow:0 0 10px rgba(245,158,11,.7)}
.cam .bd .m{background:rgba(245,158,11,.75)}
.cam.p{border-color:#ef4444;box-shadow:0 0 0 1px rgba(239,68,68,.4),0 0 18px rgba(239,68,68,.35)}
.cam.v,.cam.m{border-color:rgba(245,158,11,.7)}
.cam.na img{opacity:.15}.cam.na::after{content:'non raggiungibile';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b}
.cam .live{position:absolute;top:8px;left:8px;width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e}
.ev{margin-top:12px;display:flex;flex-direction:column;gap:5px}
.ev .k{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7f939d;margin-bottom:2px}
.ev div.r{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#cbd5e1}
.ev div.r ha-icon{--mdc-icon-size:16px;flex:none}
.ev div.r i{font-style:normal;color:#7f939d;margin-left:auto;font-size:11.5px;white-space:nowrap}
@keyframes pulse{50%{transform:scale(1.08)}}
`;
const KIND = { persona: { t: 'Persona', i: 'mdi:account', c: 'p', col: '#f87171' }, veicolo: { t: 'Veicolo', i: 'mdi:car-side', c: 'v', col: '#fbbf24' }, movimento: { t: 'Movimento', i: 'mdi:motion-sensor', c: 'm', col: '#fcd34d' } };
function shield(lvl) {
  const col = lvl === 'alert' ? ['#ef4444', '#7f1d1d'] : lvl === 'warn' ? ['#f59e0b', '#78350f'] : ['#10b981', '#064e3b'];
  const ic = lvl === 'alert' ? '<path d="M26 16v12M26 33v.5" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>' : lvl === 'warn' ? '<circle cx="26" cy="25" r="4" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M16 25a10 10 0 0 1 20 0M12 25a14 14 0 0 1 28 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>' : '<path d="M18.5 26l5 5 10-11" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<svg viewBox="0 0 52 52"><defs><linearGradient id="shg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient></defs><path d="M26 3l19 7v13c0 12-8 21-19 26C15 44 7 35 7 23V10z" fill="url(#shg)" style="filter:drop-shadow(0 4px 10px ${col[0]}66)"/><path d="M26 3l19 7v13c0 12-8 21-19 26" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>${ic}</svg>`;
}
class SecurityCard extends HTMLElement {
  setConfig(c) { if (!c.cameras) throw new Error('cameras obbligatorio'); this._c = Object.assign({ refresh: 10, gate: null, events: 4 }, c); }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, rows: 'auto' }; }
  connectedCallback() { this._iv = setInterval(() => this._snap(), this._c.refresh * 1000); this._tv = setInterval(() => { this._k = null; this._render(); }, 60000); this._hv = setInterval(() => this._loadHist(), 300000); if (this._h) this._loadHist(); }
  disconnectedCallback() { clearInterval(this._iv); clearInterval(this._tv); clearInterval(this._hv); }
  async _loadHist() {
    if (!this._h || this._hl) return; this._hl = true;
    try {
      const ids = []; this._c.cameras.forEach((cam) => ['persona', 'veicolo'].forEach((k) => { const e = 'binary_sensor.' + cam.prefix + '_' + k; if (this._h.states[e]) ids.push(e); }));
      const r = await this._h.callWS({ type: 'history/history_during_period', start_time: new Date(Date.now() - 48 * 3600e3).toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true });
      const out = {}; Object.keys(r).forEach((e) => { out[e] = r[e].filter((x) => x.s === 'on').map((x) => (x.lu || x.lc) * 1000); });
      this._hist = out; this._k = null; this._render();
    } catch (e) { /* storico non disponibile */ } finally { this._hl = false; }
  }
  set hass(h) {
    this._h = h; if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const c = this._c, ids = [];
    c.cameras.forEach((cam) => { ids.push(cam.entity); Object.keys(KIND).forEach((k) => ids.push('binary_sensor.' + cam.prefix + '_' + k)); });
    if (c.gate) ids.push(c.gate);
    const k = ids.map((e) => h.states[e] ? h.states[e].state + h.states[e].last_changed : '').join('|');
    if (k !== this._k) { this._k = k; this._render(); }
    if (!this._hist && !this._hl) this._loadHist();
  }
  _det(cam) {
    const h = this._h, out = {};
    Object.keys(KIND).forEach((k) => { const s = h.states['binary_sensor.' + cam.prefix + '_' + k]; if (s) out[k] = s; });
    return out;
  }
  _render() {
    const h = this._h, c = this._c;
    let lvl = 'ok', active = [];
    const events = [];
    const cams = c.cameras.map((cam) => {
      const s = h.states[cam.entity], d = this._det(cam), on = Object.keys(KIND).filter((k) => d[k] && d[k].state === 'on');
      Object.keys(KIND).forEach((k) => { if (!d[k] || k === 'movimento') return; if (d[k].state === 'on') events.push({ k, cam, t: new Date(d[k].last_changed), on: true }); const hs = (this._hist || {})[d[k].entity_id]; if (hs) hs.forEach((t) => events.push({ k, cam, t: new Date(t), on: false })); });
      if (on.includes('persona')) { lvl = 'alert'; active.push('persona · ' + cam.name); } else if (on.length && lvl !== 'alert') { lvl = 'warn'; active.push(KIND[on[0]].t.toLowerCase() + ' · ' + cam.name); }
      const cls = on.includes('persona') ? 'p' : on.includes('veicolo') ? 'v' : on.length ? 'm' : '';
      const na = !s || s.state === 'unavailable';
      const pic = !na && s.attributes.entity_picture ? s.attributes.entity_picture + (s.attributes.entity_picture.includes('?') ? '&' : '?') + 'width=640&_t=' + (this._tick || 0) : '';
      return `<div class="cam ${cls}${na ? ' na' : ''}" data-e="${cam.entity}">${pic ? `<img src="${esc(pic)}" alt="">` : ''}<div class="sh2"></div>${!na ? '<span class="live"></span>' : ''}
        <div class="bd">${on.map((k) => `<span class="${KIND[k].c}"><ha-icon icon="${KIND[k].i}"></ha-icon>${KIND[k].t}</span>`).join('')}</div>
        <div class="nm">${esc(cam.name)}</div></div>`;
    }).join('');
    // ultimi eventi: transizioni a "on" più recenti (persona/veicolo)
    const ev = events.filter((e) => !isNaN(e.t)).sort((a, b) => b.t - a.t);
    const last = ev.slice(0, c.events);
    const title = lvl === 'alert' ? 'Persona rilevata' : lvl === 'warn' ? 'Movimento in corso' : 'Tutto tranquillo';
    const sub = active.length ? active.join(' · ') : (last.length ? 'Ultimo rilevamento: ' + KIND[last[0].k].t.toLowerCase() + ' · ' + last[0].cam.name + ', ' + ago(last[0].t) : c.cameras.length + ' telecamere attive');
    const g = c.gate ? h.states[c.gate] : null;
    this.shadowRoot.innerHTML = `<style>${CSS_S}</style><ha-card class="${lvl}">
      <div class="top"><div class="sh">${shield(lvl)}</div><div class="tt"><div class="k">Sicurezza</div><b>${title}</b><span>${esc(sub)}</span></div>
      ${g ? `<button class="gate${g.state === 'on' ? ' busy' : ''}"><ha-icon icon="mdi:gate"></ha-icon><span>${g.state === 'on' ? 'In apertura' : 'Cancello'}</span></button>` : ''}</div>
      <div class="cams">${cams}</div>
      ${last.length ? `<div class="ev"><div class="k">Ultimi rilevamenti</div>${last.map((e) => `<div class="r"><ha-icon icon="${KIND[e.k].i}" style="color:${KIND[e.k].col}"></ha-icon>${KIND[e.k].t} · ${esc(e.cam.name)}${e.on ? ' <b style="color:' + KIND[e.k].col + '">adesso</b>' : ''}<i>${e.t.toDateString() === new Date().toDateString() ? hhmm(e.t) : ago(e.t)}</i></div>`).join('')}</div>` : ''}
    </ha-card>`;
    const R = this.shadowRoot;
    R.querySelectorAll('.cam').forEach((el) => el.onclick = () => moreInfo(this, el.dataset.e));
    const gb = R.querySelector('.gate');
    if (gb) gb.onclick = () => {
      if (!gb.classList.contains('arm')) { gb.classList.add('arm'); gb.querySelector('span').textContent = 'Tocca per aprire'; clearTimeout(this._gt); this._gt = setTimeout(() => { gb.classList.remove('arm'); gb.querySelector('span').textContent = 'Cancello'; }, 3000); return; }
      clearTimeout(this._gt); gb.classList.remove('arm'); gb.classList.add('busy'); gb.querySelector('span').textContent = 'Impulso…';
      h.callService('switch', 'turn_on', { entity_id: c.gate });
      setTimeout(() => { const st = this._h.states[c.gate]; if (st && st.state === 'on') this._h.callService('switch', 'turn_off', { entity_id: c.gate }); }, 1500);
    };
  }
  _snap() {
    this._tick = Date.now();
    if (document.hidden || !this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('.cam img').forEach((img) => {
      const u = img.getAttribute('src').replace(/([?&])_t=\d+/, '$1_t=' + this._tick);
      const n = new Image(); n.onload = () => { img.src = u; }; n.src = u;
    });
  }
}
if (!customElements.get('lights-zone-card')) customElements.define('lights-zone-card', LightsZoneCard);
if (!customElements.get('security-card')) customElements.define('security-card', SecurityCard);
})();
