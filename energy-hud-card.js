/* energy-hud-card — cruscotto energia 01ENG per Home Assistant */
const HUD_CSS = `
:host{display:block}
ha-card{display:block}
ha-card{background:radial-gradient(120% 90% at 50% 0%,#18242b 0%,#0d1317 62%,#0a0f12 100%);border:1px solid rgba(140,200,255,.10);border-radius:20px;overflow:hidden;position:relative;color:#e3e9ec;font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(120,180,220,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(120,180,220,.05) 1px,transparent 1px);background-size:22px 22px;mask-image:radial-gradient(ellipse at 50% 45%,#000 30%,transparent 80%);-webkit-mask-image:radial-gradient(ellipse at 50% 45%,#000 30%,transparent 80%);pointer-events:none}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0;position:relative}
.ttl{font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:#8fa3ad}
.live{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:1.6px;color:#7cffb2;text-transform:uppercase}
.live i{width:6px;height:6px;border-radius:50%;background:#7cffb2;box-shadow:0 0 8px #7cffb2;animation:pulse 1.6s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 14px 2px;position:relative}
.st{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:8px 10px;cursor:pointer}
.st .k{font-size:9.5px;letter-spacing:1.3px;text-transform:uppercase;color:#7f939c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st .v{font-family:"JetBrains Mono","SF Mono",Menlo,Consolas,monospace;font-size:17px;font-weight:600;margin-top:2px;white-space:nowrap}
.st .v small{font-size:10px;color:#8fa3ad;font-weight:500;margin-left:2px}
.bar{height:3px;border-radius:2px;background:rgba(255,255,255,.07);margin-top:6px;overflow:hidden}
.bar b{display:block;height:100%;border-radius:2px}
svg{display:block;width:100%;height:auto;position:relative}
.node{cursor:pointer}
.num{font-family:"JetBrains Mono","SF Mono",Menlo,Consolas,monospace;font-weight:600}
.lbl{font-size:8.5px;letter-spacing:1.6px;text-transform:uppercase;fill:#8fa3ad}
.flow{fill:none;stroke-linecap:round}
.base{fill:none;stroke:rgba(160,190,210,.10);stroke-width:1.2}
@keyframes dash{to{stroke-dashoffset:-48}}
@keyframes wv{to{transform:translateX(-60px)}}
`;
class EnergyHudCard extends HTMLElement {
setConfig(c) {
this._c = Object.assign({ pv_peak: 18, title: 'Energia' }, c);
if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
}
getCardSize() { return 6; }
getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
set hass(h) { this._h = h; this._render(); }
_kw(id) {
if (!id || !this._h) return null;
const s = this._h.states[id];
if (!s || isNaN(parseFloat(s.state))) return null;
const v = parseFloat(s.state), u = (s.attributes.unit_of_measurement || '').toLowerCase();
return u === 'w' ? v / 1000 : u === 'mw' ? v * 1000 : v;
}
_num(id) { const s = this._h && id && this._h.states[id]; const v = s ? parseFloat(s.state) : NaN; return isNaN(v) ? null : v; }
_str(id) { const s = this._h && id && this._h.states[id]; return s ? s.state : '—'; }
_fmt(kw) {
if (kw === null) return ['—', ''];
const a = Math.abs(kw);
return a < 1 ? [String(Math.round(a * 1000)), 'W'] : [a.toFixed(a < 10 ? 2 : 1).replace('.', ','), 'kW'];
}
_more(id) {
if (!id) return;
const e = new Event('hass-more-info', { bubbles: true, composed: true });
e.detail = { entityId: id };
this.dispatchEvent(e);
}
_render() {
if (!this._h || !this._c) return;
const c = this._c;
const pv = Math.max(0, this._kw(c.solar) || 0);
const bat = this._kw(c.battery) || 0;
const soc = this._num(c.battery_soc);
const imp = Math.max(0, this._kw(c.grid_import) || 0);
const exp = Math.max(0, this._kw(c.grid_export) || 0);
const home = Math.max(0, this._kw(c.home) || 0);
const pdc = Math.max(0, this._kw(c.heat_pump) || 0);
const ev = this._kw(c.ev);
const evSoc = this._num(c.ev_soc);
const s2b = Math.min(pv, Math.max(0, bat));
const s2g = Math.min(Math.max(0, pv - s2b), exp);
const s2h = Math.max(0, pv - s2b - s2g);
const b2h = Math.max(0, -bat);
const g2h = imp;
const self = home > 0 ? Math.max(0, Math.min(100, (1 - imp / home) * 100)) : 100;
const pvToday = (c.solar_today || []).reduce((a, id) => a + (this._num(id) || 0), 0);
const fc = this._num(c.forecast_today);
const fcRem = this._num(c.forecast_remaining);
const fascia = this._str(c.tariff);
const dur = (kw) => kw <= 0.02 ? 0 : Math.max(0.5, Math.min(6, 2.4 / Math.sqrt(kw)));
const W = (kw) => kw <= 0.02 ? 0 : Math.min(4.2, 1.4 + kw * 0.35);
const flow = (d, kw, col, rev) => {
const t = dur(kw);
if (!t) return `<path class="base" d="${d}"/>`;
const T = Math.max(1.3, Math.min(4.5, t * 1.4));
const n = kw > 2 ? 4 : kw > 0.5 ? 3 : 2;
const rr = Math.min(3.2, 1.8 + kw * 0.12);
let p = '';
for (let i = 0; i < n; i++) p += `<circle r="${rr}" fill="${col}" filter="url(#gl)"><animateMotion dur="${T.toFixed(2)}s" begin="-${(i * T / n).toFixed(2)}s" repeatCount="indefinite" calcMode="linear" path="${d}"${rev ? ' keyPoints="1;0" keyTimes="0;1"' : ''}/></circle>`;
return `<path class="base" d="${d}"/>
<path class="flow" d="${d}" stroke="${col}" stroke-width="${W(kw) + 3}" opacity=".16" filter="url(#bl)"/>
<path class="flow" d="${d}" stroke="${col}" stroke-width="1" opacity=".35"/>
${p}`;
};
const ring = (cx, cy, r, frac, col) => {
const C = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"
stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" filter="url(#gl)"/>`;
};
const lq = (cx, cy, r, f, col) => {
const lv = Math.max(0, Math.min(1, f));
if (lv <= 0) return '';
const y = cy + r - 2 * r * lv;
const id = 'lq' + cx + '_' + cy;
return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r - 1}"/></clipPath>
<g clip-path="url(#${id})"><g style="animation:wv 3.4s linear infinite"><path d="M${cx - 2 * r} ${y.toFixed(1)} q ${r / 2} -5 ${r} 0 t ${r} 0 t ${r} 0 t ${r} 0 t ${r} 0 V ${cy + r + 6} H ${cx - 2 * r} Z" fill="${col}" opacity=".30"/></g></g>`;
};
const node = (id, cx, cy, r, col, icon, kw, label, sub, frac, labelTop, liquid) => {
const [v, u] = this._fmt(kw);
const active = kw !== null && Math.abs(kw) > 0.02;
const small = r < 30;
const ly = labelTop ? cy - r - 14 : cy + r + (small ? 16 : 20);
const sy = labelTop ? cy - r - 4 : ly + 10;
return `<g class="node" data-e="${id || ''}">
<circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="url(#halo_${col.slice(1)})" opacity="${active ? 1 : .25}"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0f171b" stroke="${active ? col : 'rgba(160,190,210,.25)'}" stroke-width="1.2"/>
${liquid !== undefined ? lq(cx, cy, r, liquid, col) : ''}
${frac !== undefined ? ring(cx, cy, r + 5, frac, col) : ''}
<path d="${icon}" transform="translate(${cx - (small ? 6.6 : 9)} ${cy - r * (small ? 0.78 : 0.62)}) scale(${small ? .55 : .75})" fill="${active ? col : '#6b7f89'}"/>
<text x="${cx}" y="${cy + r * (small ? 0.45 : 0.28)}" text-anchor="middle" class="num" font-size="${r > 34 ? 15 : small ? 10 : 12}" fill="${active ? '#eef3f5' : '#7f939c'}">${v}<tspan font-size="${small ? 6.5 : 8}" fill="#8fa3ad" dx="1.5">${u}</tspan></text>
${!small ? `<text x="${cx}" y="${cy + r * 0.62}" text-anchor="middle" font-size="7.5" fill="${col}" opacity=".85">${sub || ''}</text>` : ''}
<text x="${cx}" y="${ly}" text-anchor="middle" class="lbl">${label}</text>
${small && sub ? `<text x="${cx}" y="${sy}" text-anchor="middle" font-size="7" fill="${col}" opacity=".7">${sub}</text>` : ''}
</g>`;
};
const I = {
sun: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0-5 2.4 3.4h-4.8L12 2M3.3 7l4.1-.4-2.4 4.2L3.3 7m0 10 1.7-3.8 2.4 4.2-4.1-.4M20.7 7l-1.7 3.8-2.4-4.2 4.1.4m0 10-4.1.4 2.4-4.2 1.7 3.8M12 22l-2.4-3.4h4.8L12 22Z',
bat: 'M16 20H8V6h8m.67-2H15V2H9v2H7.33A1.33 1.33 0 0 0 6 5.33v15.34C6 21.4 6.6 22 7.33 22h9.34A1.33 1.33 0 0 0 18 20.67V5.33C18 4.6 17.4 4 16.67 4Z',
grid: 'M8.28 5.45 6.5 4.55 7.76 2h8.47l1.27 2.55-1.78.89L15 4H9l-.72 1.45M18.62 8h-4.53l-.79-3h-2.6l-.79 3H5.38L4.1 10.55l1.79.89.73-1.44h10.76l.72 1.45 1.79-.89L18.62 8m-.85 14H15.7l-.24-.9L12 15.9l-3.47 5.2-.23.9H6.23L9.89 8h2.07l-.36 1.35L12 10l.4-.65L12.04 8h2.07l3.66 14M11.5 13.5l-.65-.98-1.08 4.04 1.73-3.06m1.33.17-.58.83 1.75 3.06-1.17-3.89Z',
home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5Z',
hp: 'M2 3h20v14H2V3m2 2v10h16V5H4m3 13h10v2H7v-2m5-11a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
ev: 'M19.77 7.23 19.78 7.22 16.06 3.5 15 4.56l2.11 2.11A2.5 2.5 0 0 0 17.5 11.5c.36 0 .69-.08 1-.21v7.21a1 1 0 1 1-2 0V14a2 2 0 0 0-2-2h-1V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16h10v-7.5h1.5v5a2.5 2.5 0 0 0 5 0V9c0-.69-.28-1.32-.73-1.77M12 10H6V5h6v5m-4 9v-4.5H6L10 7v5h2l-4 7Z',
};
const C = { pv: '#FFC14D', bat: '#3DDBB0', imp: '#8AB4F8', exp: '#7CFFB2', home: '#CFE3EA', hp: '#64B5F6', ev: '#C792EA' };
const gridKw = imp > 0.02 ? imp : -exp;
const halo = (col) => `<radialGradient id="halo_${col.slice(1)}"><stop offset="55%" stop-color="${col}" stop-opacity=".16"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
const svg = `
<svg viewBox="0 6 400 318" xmlns="http://www.w3.org/2000/svg">
<defs>
<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
${Object.values(C).map(halo).join('')}
</defs>
${flow('M200 98 L200 128', s2h, C.pv)}
${flow('M172 72 C118 76 80 100 74 128', s2b, C.pv)}
${flow('M228 72 C282 76 320 100 326 128', s2g, C.exp)}
${flow('M106 168 L158 168', b2h, C.bat)}
${flow('M294 168 L242 168', g2h, C.imp)}
${flow('M188 208 C178 228 150 236 140 248', pdc, C.hp)}
${flow('M212 208 C222 228 250 236 260 248', ev || 0, C.ev)}
${node(c.solar, 200, 64, 30, C.pv, I.sun, pv, 'Fotovoltaico', `${Math.round(pv / c.pv_peak * 100)}% picco`, pv / c.pv_peak, true)}
${node(c.battery_soc || c.battery, 70, 168, 30, C.bat, I.bat, bat === 0 ? 0 : bat, 'Batterie', soc === null ? '' : `${Math.round(soc)}% · ${bat > 0.02 ? 'carica' : bat < -0.02 ? 'scarica' : 'riposo'}`, soc === null ? 0 : soc / 100, false, soc === null ? undefined : soc / 100)}
${node(c.grid_import, 330, 168, 30, imp > 0.02 ? C.imp : C.exp, I.grid, gridKw, 'Rete', imp > 0.02 ? 'prelievo' : exp > 0.02 ? 'immissione' : 'in equilibrio')}
${node(c.home, 200, 168, 38, '#CFE3EA', I.home, home, 'Casa', `autonomia ${Math.round(self)}%`, self / 100)}
${node(c.heat_pump, 128, 270, 22, C.hp, I.hp, pdc, 'Pompa di calore', '')}
${node(c.ev, 272, 270, 22, C.ev, I.ev, ev === null && evSoc !== null ? 0 : ev, 'Auto', evSoc !== null ? Math.round(evSoc) + '%' + (ev > 0.02 ? ' · ricarica' : '') : ev === null ? 'non collegata' : '', evSoc !== null ? evSoc / 100 : undefined)}
</svg>`;
const pct = fc ? Math.min(100, pvToday / fc * 100) : 0;
const st = (k, v, u, id, bar, col) => `<div class="st" data-e="${id || ''}"><div class="k">${k}</div><div class="v">${v}<small>${u}</small></div>${bar !== undefined ? `<div class="bar"><b style="width:${bar}%;background:${col};box-shadow:0 0 8px ${col}"></b></div>` : ''}</div>`;
const html = `<ha-card><div class="grid"></div>
<div class="hdr"><div class="ttl">${c.title}</div><div class="live"><i></i>live</div></div>
<div class="stats">
${st('Prodotta oggi', pvToday.toFixed(1).replace('.', ','), 'kWh', (c.solar_today || [])[0], pct, C.pv)}
${st('Previsione', fc === null ? '—' : fc.toFixed(0), 'kWh', c.forecast_today, fc ? Math.min(100, (fc - (fcRem || 0)) / fc * 100) : 0, '#ffe08a')}
${st('Autonomia', Math.round(self), '%', c.home, self, C.bat)}
${st('Fascia', fascia, '', c.tariff)}
</div>${svg}</ha-card>`;
if (this._last === html) return;
this._last = html;
this.shadowRoot.innerHTML = `<style>${HUD_CSS}</style>${html}`;
this.shadowRoot.querySelectorAll('[data-e]').forEach(n => n.addEventListener('click', () => this._more(n.dataset.e)));
}
}
customElements.define('energy-hud-card', EnergyHudCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'energy-hud-card', name: 'Energy HUD 01ENG', description: 'Cruscotto energia con flussi animati' });

