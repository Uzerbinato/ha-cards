/* home-cards2.js - seconda serie di card su misura (stesso stile di appliance/waste)
   custom:kpi-card        titolo + griglia di valori con icona luminosa e mini-grafico 24 h (+ selettore opzionale)
   custom:heatpump-card   pompa di calore: unità esterna animata, circuiti e accumulo acqua calda
   custom:lights-card     pulsanti-lampada che si illuminano (luci, prese, pulsanti/scene)
   custom:camera-strip-card  anteprime telecamere aggiornate + stato persona/movimento + pulsante cancello
   custom:vacuum-card     robot aspirapolvere compatto (apre il pop-up)
   custom:media-card      lettore multimediale con copertina */
(() => {
const BG = 'radial-gradient(120% 90% at 50% 0%,#18242b 0%,#0d1317 62%,#0a0f12 100%)';
const BASE = `ha-card{background:${BG};border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit);padding:14px 16px;position:relative;overflow:hidden}
.hd{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad;margin-bottom:10px}
.hd ha-icon{--mdc-icon-size:16px;color:#8fa3ad}.hd .r{margin-left:auto;letter-spacing:.5px;text-transform:none;color:#b6c4cc;font-size:12px}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes blink{50%{opacity:.3}}@keyframes pulse{50%{opacity:.55}}`;
const COL = { amber: '#fbbf24', orange: '#fb923c', red: '#f87171', green: '#4ade80', cyan: '#22d3ee', blue: '#38bdf8', purple: '#a78bfa', pink: '#f472b6', grey: '#94a3b8', teal: '#2dd4bf' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v, d = 1) => { const n = parseFloat(v); if (isNaN(n)) return '—'; const s = n.toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'"); return s.join(','); };
const moreInfo = (el, id) => { const e = new Event('hass-more-info', { bubbles: true, composed: true }); e.detail = { entityId: id }; el.dispatchEvent(e); };
const nav = (path) => { history.pushState(null, '', path); window.dispatchEvent(new CustomEvent('location-changed')); };
// cache storico 24 h condivisa tra le card
const HIST = {};
async function hist24(hass, ids) {
  const now = Date.now(), need = ids.filter((i) => !HIST[i] || now - HIST[i].t > 600000);
  if (need.length) {
    try {
      const r = await hass.callWS({ type: 'history/history_during_period', start_time: new Date(now - 86400000).toISOString(), entity_ids: need, minimal_response: true, no_attributes: true, significant_changes_only: false });
      need.forEach((i) => { HIST[i] = { t: now, d: (r[i] || []).map((x) => [ (x.lu || x.lc) * 1000, parseFloat(x.s) ]).filter((p) => !isNaN(p[1])) }; });
    } catch (e) { need.forEach((i) => { HIST[i] = { t: now, d: [] }; }); }
  }
  const o = {}; ids.forEach((i) => o[i] = HIST[i] ? HIST[i].d : []); return o;
}
function spark(pts, col, w = 120, h = 28) {
  if (!pts || pts.length < 2) return '';
  const t0 = Date.now() - 86400000, t1 = Date.now();
  let mn = Math.min(...pts.map((p) => p[1])), mx = Math.max(...pts.map((p) => p[1])); if (mx - mn < 1e-6) { mx += 1; mn -= 1; }
  const X = (t) => ((Math.max(t0, t) - t0) / (t1 - t0)) * w, Y = (v) => h - 2 - ((v - mn) / (mx - mn)) * (h - 4);
  let d = 'M' + X(pts[0][0]).toFixed(1) + ' ' + Y(pts[0][1]).toFixed(1);
  for (let i = 1; i < pts.length; i++) d += ' L' + X(pts[i][0]).toFixed(1) + ' ' + Y(pts[i - 1][1]).toFixed(1) + ' L' + X(pts[i][0]).toFixed(1) + ' ' + Y(pts[i][1]).toFixed(1);
  d += ' L' + w + ' ' + Y(pts[pts.length - 1][1]).toFixed(1);
  const id = 'sp' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="sp"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><path d="${d} L${w} ${h} L0 ${h}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

class Base extends HTMLElement {
  setConfig(c) { this._c = Object.assign({}, this.constructor.defaults || {}, c || {}); }
  getGridOptions() { return { columns: 12, rows: 'auto' }; }
  getCardSize() { return 3; }
  set hass(h) { this._h = h; if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); const k = this._key(); if (k !== this._k) { this._k = k; this._render(); } }
  _st(id) { const s = this._h && this._h.states[id]; return s ? s.state : undefined; }
  _key() { return (this._ents() || []).map((e) => { const s = this._h.states[e]; return s ? s.state + (s.attributes.brightness || '') : ''; }).join('|'); }
  _ents() { return []; }
}

/* ---------------- KPI ---------------- */
class KpiCard extends Base {
  _ents() { return (this._c.items || []).map((i) => i.entity).concat(this._c.select ? [this._c.select] : []); }
  async _render() {
    const c = this._c, h = this._h;
    const sp = (c.items || []).filter((i) => i.spark).map((i) => i.entity);
    const hd = sp.length ? await hist24(h, sp) : {};
    const cols = c.columns || 2;
    let html = `<style>${BASE}
.g{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:10px}
.k{background:rgba(148,163,184,.05);border-radius:16px;padding:10px 12px;position:relative;overflow:hidden;cursor:pointer;min-height:64px}
.k:hover{background:rgba(148,163,184,.09)}
.ic{width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--c) 18%,transparent);box-shadow:0 0 14px color-mix(in srgb,var(--c) 35%,transparent)}
.ic ha-icon{--mdc-icon-size:17px;color:var(--c)}
.top{display:flex;align-items:center;gap:8px}.n{font-size:12px;color:#9fb3bd;line-height:1.2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v{font-size:22px;font-weight:700;margin-top:6px;font-variant-numeric:tabular-nums;position:relative;z-index:1}.v small{font-size:12px;font-weight:500;color:#9fb3bd;margin-left:3px}
.sp{position:absolute;left:0;right:0;bottom:0;width:100%;height:24px;opacity:.55}
.seg{display:flex;gap:4px;background:rgba(148,163,184,.08);border-radius:12px;padding:3px;margin-top:10px}
.seg button{all:unset;flex:1;text-align:center;font-size:12.5px;padding:7px 4px;border-radius:9px;color:#9fb3bd;cursor:pointer}
.seg button.on{background:rgba(34,211,238,.16);color:#e6edf7;box-shadow:inset 0 0 0 1px rgba(34,211,238,.45)}
</style><ha-card>`;
    if (c.title) html += `<div class="hd"><ha-icon icon="${c.icon || 'mdi:chart-box-outline'}"></ha-icon>${esc(c.title)}</div>`;
    html += '<div class="g">';
    (c.items || []).forEach((it) => {
      const s = h.states[it.entity]; const col = COL[it.color] || it.color || COL.cyan;
      const unit = it.unit != null ? it.unit : (s && s.attributes.unit_of_measurement) || '';
      const val = s ? (isNaN(parseFloat(s.state)) ? esc(s.state) : num(s.state, it.decimals != null ? it.decimals : 1)) : '—';
      html += `<div class="k" data-e="${it.entity}" style="--c:${col}">${it.spark ? spark(hd[it.entity], col) : ''}<div class="top"><div class="ic"><ha-icon icon="${it.icon || (s && s.attributes.icon) || 'mdi:gauge'}"></ha-icon></div><div class="n">${esc(it.name || (s && s.attributes.friendly_name) || it.entity)}</div></div><div class="v">${val}<small>${esc(unit)}</small></div></div>`;
    });
    html += '</div>';
    if (c.select && h.states[c.select]) {
      const s = h.states[c.select];
      html += '<div class="seg">' + s.attributes.options.map((o) => `<button data-o="${esc(o)}" class="${o === s.state ? 'on' : ''}">${esc(o)}</button>`).join('') + '</div>';
    }
    html += '</ha-card>';
    this.shadowRoot.innerHTML = html;
    this.shadowRoot.querySelectorAll('.k').forEach((k) => k.onclick = () => moreInfo(this, k.dataset.e));
    this.shadowRoot.querySelectorAll('.seg button').forEach((b) => b.onclick = () => h.callService(c.select.split('.')[0], 'select_option', { entity_id: c.select, option: b.dataset.o }));
  }
}

/* ---------------- POMPA DI CALORE ---------------- */
class HeatpumpCard extends Base {
  _ents() { const c = this._c; return [c.frequency, c.power, c.outside, c.flow, c.return, c.tank, c.water_heater, c.dhw_valve, c.defrost].concat((c.circuits || []).flatMap((x) => [x.flow, x.ret, x.setpoint, x.climate])).filter(Boolean); }
  async _render() {
    const c = this._c, h = this._h, st = (e) => this._st(e);
    const hz = parseFloat(st(c.frequency)) || 0, run = c.frequency ? hz > 0 : (parseFloat(st(c.power)) || 0) > (c.run_watts || 40);
    const pw = parseFloat(st(c.power)); const tank = parseFloat(st(c.tank));
    const dhw = c.dhw_valve ? st(c.dhw_valve) === 'on' : false;
    const hd = await hist24(h, [c.tank].concat((c.circuits || []).map((x) => x.flow)).filter(Boolean));
    const fanSpeed = run ? Math.max(0.5, 3.2 - hz / 40).toFixed(2) + 's' : '0s';
    const tankPct = isNaN(tank) ? 0 : Math.max(0, Math.min(100, (tank - 20) / (55 - 20) * 100));
    const tankCol = tank >= 45 ? '#f87171' : tank >= 38 ? '#fb923c' : '#38bdf8';
    const unit = `<svg viewBox="0 0 120 92" class="ou"><defs><linearGradient id="hpb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3640"/><stop offset="1" stop-color="#1a232a"/></linearGradient></defs>
      <rect x="4" y="6" width="112" height="76" rx="8" fill="url(#hpb)" stroke="rgba(255,255,255,.08)"/>
      <circle cx="44" cy="44" r="30" fill="#0d1418" stroke="rgba(255,255,255,.07)"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<line x1="16" y1="${20 + i * 8}" x2="72" y2="${20 + i * 8}" stroke="rgba(148,163,184,.10)" stroke-width="1"/>`).join('')}
      <g style="transform-origin:44px 44px;${run ? 'animation:spin ' + fanSpeed + ' linear infinite' : ''}">
        ${[0, 72, 144, 216, 288].map((a) => `<path d="M44 44 q6 -18 -2 -24 q-6 8 2 24z" fill="${run ? '#5eead4' : '#475569'}" opacity=".85" transform="rotate(${a} 44 44)"/>`).join('')}
        <circle cx="44" cy="44" r="5" fill="#1e293b" stroke="rgba(255,255,255,.2)"/></g>
      <rect x="84" y="18" width="24" height="5" rx="2" fill="rgba(148,163,184,.18)"/><rect x="84" y="28" width="24" height="5" rx="2" fill="rgba(148,163,184,.18)"/>
      <circle cx="96" cy="62" r="4" fill="${run ? (dhw ? '#f87171' : '#4ade80') : '#475569'}" style="${run ? 'animation:blink 1.6s infinite' : ''}"/>
      <rect x="14" y="82" width="12" height="6" rx="1" fill="#1a232a"/><rect x="94" y="82" width="12" height="6" rx="1" fill="#1a232a"/>
      ${run ? `<g opacity=".5">${[0, 1, 2].map((i) => `<path d="M80 ${50 + i * 8} q8 -4 16 0" stroke="${dhw ? '#fca5a5' : '#99f6e4'}" stroke-width="1.5" fill="none" style="animation:pulse 2s ${i * 0.4}s infinite"/>`).join('')}</g>` : ''}
    </svg>`;
    const circ = (c.circuits || []).map((x) => {
      const f = parseFloat(st(x.flow)), r = parseFloat(st(x.ret)), sp = parseFloat(st(x.setpoint));
      const on = x.climate ? st(x.climate) !== 'off' : true; const col = COL[x.color] || COL.orange;
      return `<div class="c" data-e="${x.climate || x.flow}">${spark(hd[x.flow], col, 120, 26)}<div class="cn"><ha-icon icon="${x.icon}" style="color:${col}"></ha-icon>${esc(x.name)}${on ? '' : ' <span class="off">spento</span>'}</div>
        <div class="cv"><div><b>${num(f)}°</b><span>mandata</span></div>${isNaN(r) ? '' : `<div><b class="s">${num(r)}°</b><span>ritorno</span></div>`}${isNaN(sp) ? '' : `<div><b class="s">${num(sp, 0)}°</b><span>impostata</span></div>`}</div></div>`;
    }).join('');
    const wh = c.water_heater ? h.states[c.water_heater] : null;
    const whMode = wh ? ({ auto: 'Auto', eco: 'Eco', performance: 'Prestazioni', off: 'Spento', heat_pump: 'Pompa di calore' }[wh.state] || wh.state) : '';
    const status = run ? (dhw ? 'Sta scaldando l\'acqua calda' : 'Sta riscaldando la casa') : 'In pausa';
    this.shadowRoot.innerHTML = `<style>${BASE}
.top{display:flex;gap:14px;align-items:center}.ou{width:112px;flex:none;filter:drop-shadow(0 8px 14px rgba(0,0,0,.45))}
.i{flex:1;min-width:0}.big{font-size:24px;font-weight:700;line-height:1.1;color:${run ? '#5eead4' : '#cbd5e1'}}.big small{font-size:13px;color:#9fb3bd;font-weight:500;margin-left:3px}
.sub{font-size:12.5px;color:#9fb3bd;margin-top:2px}.ch{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ch span{font-size:11px;color:#b6c4cc;background:rgba(148,163,184,.10);border-radius:99px;padding:2px 8px;display:inline-flex;gap:4px;align-items:center}.ch ha-icon{--mdc-icon-size:13px}
.cs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px}
.c{background:rgba(148,163,184,.05);border-radius:14px;padding:9px 11px 10px;position:relative;overflow:hidden;cursor:pointer}
.c .sp{position:absolute;left:0;right:0;bottom:0;width:100%;height:22px;opacity:.45}
.cn{font-size:12px;color:#b6c4cc;display:flex;align-items:center;gap:6px}.cn ha-icon{--mdc-icon-size:16px}.off{font-size:10.5px;color:#6f838d}
.cv{display:flex;align-items:flex-end;gap:16px;margin-top:4px;position:relative}.cv div{display:flex;flex-direction:column;line-height:1.15}.cv b{font-size:19px;font-variant-numeric:tabular-nums}.cv b.s{font-size:14px;color:#cbd5e1}.cv span{font-size:10px;color:#7f939d;margin-top:1px}
.tank{display:flex;gap:12px;align-items:center;margin-top:10px;background:rgba(148,163,184,.05);border-radius:14px;padding:10px 12px;cursor:pointer}
.tb{width:22px;height:46px;border-radius:11px;background:rgba(148,163,184,.14);position:relative;overflow:hidden;flex:none;border:1px solid rgba(255,255,255,.08)}
.tb div{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(0deg,${tankCol},${tankCol}aa);box-shadow:0 0 12px ${tankCol}}
.tt{flex:1}.tt b{font-size:22px}.tt small{color:#9fb3bd;font-size:12px}.tt div{font-size:12px;color:#9fb3bd}
.tank .sp{width:110px;height:34px;flex:none}
</style><ha-card>
<div class="hd"><ha-icon icon="mdi:heat-pump-outline"></ha-icon>Pompa di calore<span class="r">${c.outside ? 'esterno ' + num(st(c.outside)) + '°' : ''}</span></div>
<div class="top">${c.image === false ? '' : unit}<div class="i" style="${c.image === false ? 'display:flex;align-items:center;gap:12px;flex-wrap:wrap' : ''}"><div class="big">${run ? (c.frequency ? hz.toFixed(0) + '<small>Hz</small>' : 'In funzione') : 'Ferma'}</div><div class="sub">${status}</div>
<div class="ch">${!isNaN(pw) ? `<span><ha-icon icon="mdi:flash"></ha-icon>${pw >= 1000 ? num(pw / 1000, 2) + ' kW' : num(pw, 0) + ' W'}</span>` : ''}${c.flow ? `<span><ha-icon icon="mdi:thermometer-chevron-up"></ha-icon>${num(st(c.flow))}° / ${num(st(c.return))}°</span>` : ''}${c.today ? `<span><ha-icon icon="mdi:counter"></ha-icon>oggi ${num(st(c.today))} kWh</span>` : ''}</div></div></div>
<div class="cs">${circ}</div>
${c.tank ? `<div class="tank" data-e="${c.water_heater || c.tank}"><div class="tb"><div style="height:${tankPct}%"></div></div><div class="tt"><b>${num(tank)}°</b> <small>acqua calda</small><div>${whMode ? 'Modalità ' + esc(whMode) : ''}${dhw && run ? ' · in riscaldamento' : ''}</div></div>${spark(hd[c.tank], tankCol, 110, 34)}</div>` : ''}
</ha-card>`;
    this.shadowRoot.querySelectorAll('[data-e]').forEach((el) => el.onclick = () => moreInfo(this, el.dataset.e));
  }
}

/* ---------------- LUCI ---------------- */
class LightsCard extends Base {
  _ents() { return (this._c.items || []).map((i) => i.entity); }
  _render() {
    const c = this._c, h = this._h;
    const cols = c.columns || 3;
    const items = (c.items || []).map((it) => {
      const s = h.states[it.entity]; const dom = it.entity.split('.')[0];
      const isBtn = ['button', 'scene', 'script'].includes(dom);
      const on = s && s.state === 'on';
      const un = !s || s.state === 'unavailable';
      const br = on && s.attributes.brightness ? Math.round(s.attributes.brightness / 2.55) : null;
      const icon = it.icon || (s && s.attributes.icon) || (isBtn ? 'mdi:gesture-tap-button' : on ? 'mdi:lightbulb-on' : 'mdi:lightbulb-outline');
      return `<div class="l ${on ? 'on' : ''} ${un ? 'un' : ''} ${isBtn ? 'bt' : ''}" data-e="${it.entity}" data-d="${dom}" style="--c:${COL[it.color] || it.color || '#ffc66d'}">
        <div class="ic"><ha-icon icon="${icon}"></ha-icon></div><div class="n">${esc(it.name || (s && s.attributes.friendly_name) || it.entity)}</div>
        <div class="s">${un ? 'non disponibile' : isBtn ? 'tocca per avviare' : on ? (br != null ? br + '%' : 'accesa') : 'spenta'}</div>${br != null ? `<div class="b"><div style="width:${br}%"></div></div>` : ''}</div>`;
    }).join('');
    const nOn = (c.items || []).filter((i) => this._st(i.entity) === 'on').length;
    this.shadowRoot.innerHTML = `<style>${BASE}
.g{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:9px}
.l{border-radius:16px;padding:10px 11px;background:rgba(148,163,184,.05);cursor:pointer;position:relative;overflow:hidden;transition:background .25s,box-shadow .25s;user-select:none}
.l:hover{background:rgba(148,163,184,.10)}
.l .ic{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(148,163,184,.10);transition:all .25s}
.l .ic ha-icon{--mdc-icon-size:19px;color:#94a3b8}
.l.on{background:linear-gradient(160deg,color-mix(in srgb,var(--c) 22%,transparent),rgba(255,255,255,.02) 70%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 35%,transparent)}
.l.on .ic{background:color-mix(in srgb,var(--c) 28%,transparent);box-shadow:0 0 18px color-mix(in srgb,var(--c) 70%,transparent)}
.l.on .ic ha-icon{color:var(--c);filter:drop-shadow(0 0 4px var(--c))}
.l.bt .ic ha-icon{color:#b6c4cc}.l.un{opacity:.45}
.n{font-size:13px;font-weight:600;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s{font-size:11px;color:#8fa3ad;margin-top:1px}.on .s{color:#e5d3a6}
.b{height:3px;border-radius:2px;background:rgba(148,163,184,.15);margin-top:6px;overflow:hidden}.b div{height:100%;background:var(--c)}
</style><ha-card>${c.title ? `<div class="hd"><ha-icon icon="${c.icon || 'mdi:lightbulb-group-outline'}"></ha-icon>${esc(c.title)}<span class="r">${nOn ? nOn + ' accese' : 'tutte spente'}</span></div>` : ''}<div class="g">${items}</div></ha-card>`;
    this.shadowRoot.querySelectorAll('.l').forEach((el) => {
      let t, held = false;
      el.onpointerdown = () => { held = false; t = setTimeout(() => { held = true; moreInfo(this, el.dataset.e); }, 550); };
      el.onpointerup = el.onpointerleave = () => clearTimeout(t);
      el.onclick = () => {
        if (held) return; const e = el.dataset.e, d = el.dataset.d;
        if (d === 'button') h.callService('button', 'press', { entity_id: e });
        else if (d === 'scene') h.callService('scene', 'turn_on', { entity_id: e });
        else if (d === 'script') h.callService('script', 'turn_on', { entity_id: e });
        else h.callService('homeassistant', 'toggle', { entity_id: e });
      };
    });
  }
}

/* ---------------- TELECAMERE ---------------- */
class CameraStripCard extends Base {
  _ents() { return (this._c.cameras || []).flatMap((x) => [x.person, x.motion]).concat(this._c.gate ? [this._c.gate] : []).filter(Boolean); }
  connectedCallback() { this._iv = setInterval(() => this._refresh(), (this._c && this._c.refresh || 10) * 1000); }
  disconnectedCallback() { clearInterval(this._iv); }
  _url(cam) { const s = this._h.states[cam]; return s && s.attributes.entity_picture ? s.attributes.entity_picture + '&t=' + Date.now() : ''; }
  _refresh() { if (!this.shadowRoot || !this._h || document.hidden) return; this.shadowRoot.querySelectorAll('img[data-c]').forEach((im) => { const u = this._url(im.dataset.c); if (u) { const n = new Image(); n.onload = () => { im.src = u; }; n.src = u; } }); }
  _render() {
    const c = this._c, h = this._h;
    const cams = (c.cameras || []).map((x) => {
      const p = x.person && this._st(x.person) === 'on', m = x.motion && this._st(x.motion) === 'on';
      return `<div class="cam ${p ? 'p' : m ? 'm' : ''}" data-e="${x.entity}"><img data-c="${x.entity}" src="${this._url(x.entity)}" alt=""/><div class="ov"><span class="nm">${esc(x.name)}</span>${p ? '<span class="tg red"><ha-icon icon="mdi:account"></ha-icon>Persona</span>' : m ? '<span class="tg amb"><ha-icon icon="mdi:motion-sensor"></ha-icon>Movimento</span>' : '<span class="live"></span>'}</div></div>`;
    }).join('');
    const g = c.gate ? h.states[c.gate] : null;
    this.shadowRoot.innerHTML = `<style>${BASE}
.g{display:grid;grid-template-columns:repeat(${Math.min(2, (c.cameras || []).length)},minmax(0,1fr));gap:9px}
.cam{position:relative;border-radius:14px;overflow:hidden;background:#05080a;aspect-ratio:16/9;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.cam img{width:100%;height:100%;object-fit:cover;display:block}
.cam.p{box-shadow:0 0 0 2px #f87171,0 0 18px rgba(248,113,113,.5)}.cam.m{box-shadow:0 0 0 2px #fbbf24}
.ov{position:absolute;left:0;right:0;bottom:0;padding:16px 9px 7px;background:linear-gradient(0deg,rgba(0,0,0,.75),transparent);display:flex;align-items:center;gap:6px}
.nm{font-size:12px;font-weight:600}.tg{margin-left:auto;font-size:10.5px;border-radius:99px;padding:1px 7px;display:inline-flex;gap:3px;align-items:center}.tg ha-icon{--mdc-icon-size:12px}
.red{background:#dc2626}.amb{background:#d97706}.live{margin-left:auto;width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80;animation:pulse 2s infinite}
.gate{display:flex;align-items:center;gap:10px;margin-top:10px;background:rgba(148,163,184,.05);border-radius:14px;padding:9px 11px}
.gate .ic{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(148,163,184,.10)}.gate .ic ha-icon{--mdc-icon-size:19px;color:#cbd5e1}
.gate b{font-size:13.5px}.gate div.t{flex:1}.gate small{display:block;color:#8fa3ad;font-size:11px}
.gate button{all:unset;cursor:pointer;background:rgba(34,211,238,.16);color:#e6edf7;box-shadow:inset 0 0 0 1px rgba(34,211,238,.45);border-radius:11px;padding:8px 14px;font-size:12.5px;font-weight:600}
.gate button.cf{background:rgba(248,113,113,.25);box-shadow:inset 0 0 0 1px rgba(248,113,113,.6)}
</style><ha-card>${c.title ? `<div class="hd"><ha-icon icon="mdi:cctv"></ha-icon>${esc(c.title)}</div>` : ''}<div class="g">${cams}</div>
${g ? `<div class="gate"><div class="ic"><ha-icon icon="mdi:gate"></ha-icon></div><div class="t"><b>${esc(c.gate_name || 'Cancello')}</b><small>${g.state === 'unavailable' ? 'non disponibile' : 'tocca Apri, poi conferma'}</small></div><button>Apri</button></div>` : ''}</ha-card>`;
    this.shadowRoot.querySelectorAll('.cam').forEach((el) => el.onclick = () => moreInfo(this, el.dataset.e));
    const b = this.shadowRoot.querySelector('.gate button');
    if (b) b.onclick = () => { if (!b.classList.contains('cf')) { b.classList.add('cf'); b.textContent = 'Conferma'; setTimeout(() => { b.classList.remove('cf'); b.textContent = 'Apri'; }, 3000); return; } h.callService(c.gate.split('.')[0], c.gate.startsWith('button.') ? 'press' : 'turn_on', { entity_id: c.gate }); b.classList.remove('cf'); b.textContent = 'Inviato'; };
  }
}

/* ---------------- ROBOT ---------------- */
class VacuumCard extends Base {
  _ents() { return [this._c.entity, this._c.battery, this._c.room, this._c.mop_type, this._c.schedule].filter(Boolean); }
  _mopLab(v) { return { 1: 'ASP.', 2: 'LAV.', 3: 'ASP.+LAV.', 4: 'ASP. poi LAV.', Sweep: 'ASP.', Mop: 'LAV.', 'Sweep Mop': 'ASP.+LAV.', 'Sweep Before Mopping': 'ASP. poi LAV.' }[v] || ''; }
  _next() {
    const c = this._c; if (!c.schedule) return null; let j; try { j = JSON.parse(this._st(c.schedule)); } catch (e) { return null; }
    const now = new Date(), gg = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']; let best = null;
    for (const t of (j.time_labels || [])) { if (!t.on) continue; const hh = t.time >> 8, mm = t.time & 255;
      for (let d = 0; d < 8; d++) { const x = new Date(now); x.setDate(now.getDate() + d); x.setHours(hh, mm, 0, 0); if (x <= now) continue; if (!(t.week & (1 << x.getDay()))) continue; if (!best || x < best.x) best = { x, t }; break; } }
    if (!best) return null; const x = best.x, oggi = x.toDateString() === now.toDateString(), dom = new Date(now.getTime() + 864e5).toDateString() === x.toDateString();
    return (oggi ? 'oggi' : dom ? 'domani' : gg[x.getDay()]) + ' ' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0') + ' · ' + this._mopLab(best.t.mop);
  }
  _render() {
    const c = this._c, s = this._st(c.entity) || 'unavailable', bat = parseFloat(this._st(c.battery));
    const room = this._st(c.room); const rmap = c.rooms || {};
    const run = s === 'cleaning', ret = s === 'returning';
    const lab = { docked: 'In base', cleaning: 'Pulizia in corso', returning: 'Rientro alla base', paused: 'In pausa', idle: 'In attesa', error: 'Errore' }[s] || 'Non disponibile';
    const svg = `<svg viewBox="0 0 100 100" class="rb"><defs><radialGradient id="vr" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#111827"/></radialGradient></defs>
      ${run ? '<circle cx="50" cy="52" r="46" fill="none" stroke="rgba(251,191,36,.35)" stroke-width="2" stroke-dasharray="4 7" style="transform-origin:50px 52px;animation:spin 6s linear infinite"/>' : ''}
      <ellipse cx="50" cy="90" rx="30" ry="4" fill="rgba(0,0,0,.4)"/>
      <circle cx="50" cy="52" r="36" fill="url(#vr)" stroke="rgba(255,255,255,.12)"/><circle cx="50" cy="52" r="27" fill="none" stroke="rgba(255,255,255,.06)"/>
      <circle cx="50" cy="36" r="8" fill="#0b1115" stroke="rgba(255,255,255,.18)"/><circle cx="50" cy="36" r="3" fill="${run ? '#fbbf24' : ret ? '#38bdf8' : s === 'error' ? '#f87171' : '#4ade80'}" style="${run || ret ? 'animation:blink 1.2s infinite' : ''}"/>
      <rect x="38" y="60" width="24" height="5" rx="2.5" fill="rgba(148,163,184,.25)"/></svg>`;
    this.shadowRoot.innerHTML = `<style>${BASE}
ha-card{display:flex;gap:14px;align-items:center;cursor:pointer}${run ? 'ha-card{border-color:rgba(251,191,36,.35)}' : ''}
.rb{width:74px;flex:none}.i{flex:1;min-width:0}.nm{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad}
.big{font-size:21px;font-weight:700;color:${run ? '#fcd34d' : '#e6edf7'}}.sub{font-size:12.5px;color:#9fb3bd}
.mt{color:#fcd34d;font-weight:700;letter-spacing:.5px}.nx{font-size:12px;color:#b6c4cc;margin-top:3px}
.bt{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11.5px;color:#b6c4cc}.bb{width:60px;height:5px;border-radius:3px;background:rgba(148,163,184,.15);overflow:hidden}.bb div{height:100%;background:${bat < 25 ? '#f87171' : '#4ade80'}}
.go{all:unset;cursor:pointer;width:38px;height:38px;border-radius:12px;background:rgba(148,163,184,.10);display:flex;align-items:center;justify-content:center}.go ha-icon{--mdc-icon-size:20px;color:#cbd5e1}
</style><ha-card>${svg}<div class="i"><div class="nm">${esc(c.name || 'Robot')}</div><div class="big">${lab}</div><div class="sub">${run ? [room ? esc(rmap[room] || room) : '', c.mop_type ? '<b class="mt">' + this._mopLab(this._st(c.mop_type)) + '</b>' : ''].filter(Boolean).join(' · ') : c.subtitle || ''}</div>${this._next() ? '<div class="nx">Prossima: ' + esc(this._next()) + '</div>' : ''}
<div class="bt"><div class="bb"><div style="width:${isNaN(bat) ? 0 : bat}%"></div></div>${isNaN(bat) ? '' : Math.round(bat) + '%'}</div></div><button class="go" title="Pannello"><ha-icon icon="mdi:chevron-right"></ha-icon></button></ha-card>`;
    this.shadowRoot.querySelector('ha-card').onclick = () => c.navigation_path ? nav(c.navigation_path) : moreInfo(this, c.entity);
  }
}

/* ---------------- MEDIA ---------------- */
class MediaCard extends Base {
  _ents() { return [this._c.entity]; }
  _key() { const s = this._h.states[this._c.entity]; return s ? [s.state, s.attributes.media_title, s.attributes.volume_level, s.attributes.entity_picture, s.attributes.source].join('|') : ''; }
  _render() {
    const c = this._c, h = this._h, s = h.states[c.entity]; if (!s) return;
    const on = !['off', 'unavailable', 'standby'].includes(s.state), play = s.state === 'playing';
    const a = s.attributes, pic = a.entity_picture || '';
    const title = a.media_title || (on ? (a.source || 'Acceso') : 'Spento'), art = a.media_artist || (on && a.source && a.media_title ? a.source : '');
    const vol = a.volume_level != null ? Math.round(a.volume_level * 100) : null;
    this.shadowRoot.innerHTML = `<style>${BASE}
ha-card{display:flex;gap:12px;align-items:center;min-height:62px}
.bgimg{position:absolute;inset:0;background:${pic ? `url("${pic}") center/cover` : 'none'};filter:blur(28px) saturate(1.4);opacity:.35;transform:scale(1.3)}
.cv{width:58px;height:58px;border-radius:12px;flex:none;position:relative;background:${pic ? `url("${pic}") center/cover` : 'rgba(148,163,184,.10)'};display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,.45)}
.cv ha-icon{--mdc-icon-size:26px;color:#94a3b8}
.i{flex:1;min-width:0;position:relative}.nm{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad}
.t{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a{font-size:12px;color:#b6c4cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.eq{display:inline-flex;gap:2px;align-items:flex-end;height:10px;margin-left:6px}.eq i{width:2px;background:#4ade80;animation:eq .9s ease-in-out infinite}.eq i:nth-child(2){animation-delay:.2s}.eq i:nth-child(3){animation-delay:.4s}
@keyframes eq{0%,100%{height:3px}50%{height:10px}}
.v{height:3px;border-radius:2px;background:rgba(148,163,184,.18);margin-top:6px;overflow:hidden}.v div{height:100%;background:#cbd5e1}
.bt{display:flex;gap:6px;position:relative}.bt button{all:unset;cursor:pointer;width:36px;height:36px;border-radius:12px;background:rgba(148,163,184,.12);display:flex;align-items:center;justify-content:center}.bt ha-icon{--mdc-icon-size:20px;color:#e6edf7}
.bt button.pw.on{background:rgba(74,222,128,.18)}
</style><ha-card><div class="bgimg"></div><div class="cv">${pic ? '' : `<ha-icon icon="${c.icon || 'mdi:speaker'}"></ha-icon>`}</div>
<div class="i"><div class="nm">${esc(c.name || a.friendly_name)}${play ? '<span class="eq"><i></i><i></i><i></i></span>' : ''}</div><div class="t">${esc(title)}</div><div class="a">${esc(art)}${vol != null && on ? ' · vol ' + vol + '%' : ''}</div>${vol != null && on ? `<div class="v"><div style="width:${vol}%"></div></div>` : ''}</div>
<div class="bt">${on ? `<button data-a="vdown"><ha-icon icon="mdi:volume-minus"></ha-icon></button><button data-a="pp"><ha-icon icon="${play ? 'mdi:pause' : 'mdi:play'}"></ha-icon></button><button data-a="vup"><ha-icon icon="mdi:volume-plus"></ha-icon></button>` : ''}<button data-a="pw" class="pw ${on ? 'on' : ''}"><ha-icon icon="mdi:power"></ha-icon></button></div></ha-card>`;
    const card = this.shadowRoot.querySelector('ha-card');
    card.onclick = (ev) => {
      const b = ev.target.closest('button'); const id = { entity_id: c.entity };
      if (!b) return moreInfo(this, c.entity);
      ev.stopPropagation();
      ({ pp: () => h.callService('media_player', 'media_play_pause', id), vup: () => h.callService('media_player', 'volume_up', id), vdown: () => h.callService('media_player', 'volume_down', id), pw: () => h.callService('media_player', on ? 'turn_off' : 'turn_on', id) })[b.dataset.a]();
    };
  }
}

[['kpi-card', KpiCard, 'Valori'], ['heatpump-card', HeatpumpCard, 'Pompa di calore'], ['lights-card', LightsCard, 'Luci'], ['camera-strip-card', CameraStripCard, 'Telecamere'], ['vacuum-card', VacuumCard, 'Robot'], ['media-card', MediaCard, 'Lettore']]
  .forEach(([t, k, n]) => { if (!customElements.get(t)) customElements.define(t, k); (window.customCards = window.customCards || []).push({ type: t, name: n, description: n + ' (stile Casa)' }); });
})();
