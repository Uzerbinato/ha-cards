/* meteo-hero-card — intestazione animata per la dashboard di casa
   config: entity (weather), name, solar (kW), battery (%), outdoor (\u00B0C, opzionale), rooms [{entity climate, name, temperature?}] (temperature stanze a destra, solo schermi larghi) */
const IT_COND = {
  'sunny': 'Sereno', 'clear-night': 'Sereno', 'partlycloudy': 'Poco nuvoloso',
  'cloudy': 'Nuvoloso', 'fog': 'Nebbia', 'rainy': 'Pioggia', 'pouring': 'Pioggia forte',
  'snowy': 'Neve', 'snowy-rainy': 'Nevischio', 'lightning': 'Temporale',
  'lightning-rainy': 'Temporale', 'windy': 'Ventoso', 'windy-variant': 'Ventoso',
  'hail': 'Grandine', 'exceptional': 'Eccezionale'
};
const GIORNI = ['Domenica', 'Luned\u00EC', 'Marted\u00EC', 'Mercoled\u00EC', 'Gioved\u00EC', 'Venerd\u00EC', 'Sabato'];
const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function cloud(x, y, s, cls = 'cl') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="${cls}">
    <path d="M18 40h44a14 14 0 0 0 0-28 20 20 0 0 0-38-4A13 13 0 0 0 18 40z"/></g></g>`;
}
function icon(cond, small = false) {
  const night = cond === 'clear-night';
  const sun = `<g class="sun"><circle cx="50" cy="44" r="15"/>
     <g class="rays">${[...Array(8)].map((_, i) => `<line x1="50" y1="18" x2="50" y2="10" transform="rotate(${i * 45} 50 44)"/>`).join('')}</g></g>`;
  const moon = `<g class="moon"><path d="M58 22a22 22 0 1 0 14 34 18 18 0 1 1-14-34z"/></g>
     <g class="stars"><circle cx="22" cy="20" r="1.6"/><circle cx="32" cy="34" r="1.1"/><circle cx="80" cy="16" r="1.3"/></g>`;
  const drops = (n, cls = 'drop') => [...Array(n)].map((_, i) => `<line class="${cls}" style="animation-delay:${(i * 0.27).toFixed(2)}s" x1="${32 + i * 10}" y1="66" x2="${28 + i * 10}" y2="76"/>`).join('');
  const flakes = [...Array(4)].map((_, i) => `<circle class="flake" style="animation-delay:${(i * 0.5).toFixed(1)}s" cx="${34 + i * 11}" cy="68" r="2.4"/>`).join('');
  let body = '';
  switch (cond) {
    case 'sunny': body = sun; break;
    case 'clear-night': body = moon; break;
    case 'partlycloudy': body = `<g transform="translate(-6 -10) scale(.8)">${sun}</g>${cloud(26, 30, 0.8, 'cl drift')}`; break;
    case 'cloudy': body = `${cloud(8, 14, 0.75, 'cl back drift2')}${cloud(22, 26, 0.9, 'cl drift')}`; break;
    case 'fog': body = `${cloud(18, 6, 0.8, 'cl back')}<g class="fog"><line x1="16" y1="56" x2="84" y2="56"/><line class="f2" x1="24" y1="66" x2="76" y2="66"/><line x1="20" y1="76" x2="80" y2="76"/></g>`; break;
    case 'rainy': body = `${cloud(18, 10, 0.85, 'cl drift')}${drops(4)}`; break;
    case 'pouring': body = `${cloud(18, 10, 0.85, 'cl dark drift')}${drops(6)}`; break;
    case 'snowy': case 'snowy-rainy': body = `${cloud(18, 10, 0.85, 'cl drift')}${flakes}`; break;
    case 'lightning': case 'lightning-rainy': body = `${cloud(18, 10, 0.85, 'cl dark')}<path class="bolt" d="M52 58l-8 14h8l-4 12 14-18h-8l4-8z"/>${cond === 'lightning-rainy' ? drops(3) : ''}`; break;
    case 'windy': case 'windy-variant': body = `<g class="wind"><path d="M14 40h48a8 8 0 1 0-8-8"/><path class="w2" d="M14 54h60a8 8 0 1 1-8 8"/><path d="M20 68h30"/></g>`; break;
    default: body = cloud(22, 26, 0.9, 'cl drift');
  }
  return `<svg class="ico ${small ? 'sm' : ''} ${night ? 'night' : ''}" viewBox="0 0 100 90">${body}</svg>`;
}

class MeteoHeroCard extends HTMLElement {
  setConfig(c) {
    if (!c.entity) throw new Error('Serve entity (weather)');
    this._c = c;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._forecast = [];
  }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }
  connectedCallback() {
    this._tick = setInterval(() => this._render(), 15000);
    this._subscribe();
  }
  disconnectedCallback() {
    clearInterval(this._tick);
    if (this._unsub) { this._unsub.then(u => u && u()).catch(() => {}); this._unsub = null; }
  }
  set hass(h) {
    const first = !this._hass;
    this._hass = h;
    if (first) this._subscribe();
    this._render();
  }
  _subscribe() {
    if (!this._hass || this._unsub || !this.isConnected) return;
    try {
      this._unsub = this._hass.connection.subscribeMessage(ev => {
        this._forecast = (ev && ev.forecast) || [];
        this._render(true);
      }, { type: 'weather/subscribe_forecast', entity_id: this._c.entity, forecast_type: 'daily' });
    } catch (e) { /* nessuna previsione */ }
  }
  _num(id, d = 1) {
    const s = id && this._hass.states[id];
    if (!s || isNaN(parseFloat(s.state))) return null;
    return parseFloat(s.state).toFixed(d).replace('.', ',');
  }
  _render(force = false) {
    if (!this._hass || !this._c) return;
    const h = this._hass, c = this._c, w = h.states[c.entity];
    if (!w) return;
    const now = new Date();
    const hr = now.getHours();
    const saluto = hr < 5 ? 'Buonanotte' : hr < 13 ? 'Buongiorno' : hr < 18 ? 'Buon pomeriggio' : 'Buonasera';
    const ora = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const data = `${GIORNI[now.getDay()]} ${now.getDate()} ${MESI[now.getMonth()]}`;
    const cond = w.state;
    const tExt = c.outdoor ? this._num(c.outdoor) : null;
    const temp = tExt ?? (w.attributes.temperature != null ? String(Math.round(w.attributes.temperature)) : '–');
    const f = this._forecast;
    const oggi = f[0];
    const minmax = oggi ? `${Math.round(oggi.templow ?? oggi.temperature)}\u00B0 / ${Math.round(oggi.temperature)}\u00B0` : '';
    const next = f.slice(1, 4).map(d => {
      const dd = new Date(d.datetime);
      return `<div class="day">${GG[dd.getDay()]}${icon(d.condition, true)}<b>${Math.round(d.temperature)}\u00B0</b><span>${d.templow != null ? Math.round(d.templow) + '\u00B0' : ''}</span></div>`;
    }).join('');
    const _su = (this._hass.states[c.solar] || {attributes:{}}).attributes.unit_of_measurement;
    let solar = this._num(c.solar, 1); const _sv = c.solar && this._hass.states[c.solar] ? parseFloat(this._hass.states[c.solar].state) : NaN; if (solar != null && _su === 'W') solar = _sv >= 1000 ? (_sv / 1000).toFixed(1).replace('.', ',') + ' kW' : Math.round(_sv) + ' W'; else if (solar != null) solar = solar + ' kW';
    const batt = this._num(c.battery, 0);
    const fmtS = (st) => { try { return this._hass.formatEntityState ? this._hass.formatEntityState(st) : st.state; } catch (e) { return st.state; } };
    const status = (c.status || []).map(x => { const st = this._hass.states[x.entity]; if (!st) return ''; return `<div class="stx" data-e="${x.entity}"><ha-icon icon="${x.icon || st.attributes.icon || 'mdi:circle-small'}"></ha-icon><span>${x.name || st.attributes.friendly_name}</span><b>${fmtS(st)}</b></div>`; }).join('');
    const rooms = (c.rooms || []).map(r => { const st = this._hass.states[r.entity]; const a = st ? st.attributes : {}; const t = r.temperature ? parseFloat((this._hass.states[r.temperature] || {}).state) : a.current_temperature; const hu = a.current_humidity; const act = a.hvac_action;
      return `<div class="rm ${act === 'heating' ? 'heat' : act === 'cooling' ? 'cool' : ''}" data-e="${r.entity}"><span>${r.name || a.friendly_name || ''}</span><b>${t == null || isNaN(t) ? '–' : Number(t).toFixed(1).replace('.', ',')}\u00B0</b>${hu != null ? `<i>${Math.round(hu)}%</i>` : ''}</div>`; }).join('');
    const key = [status, rooms, saluto, ora, data, cond, temp, minmax, next, solar, batt].join('|');
    if (!force && key === this._key) return;
    this._key = key;
    this.shadowRoot.innerHTML = `<style>
      :host{display:block}
      .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:6px 4px 2px;font-family:var(--primary-font-family,inherit);color:var(--primary-text-color)}
      .l{min-width:0}
      h1{margin:0;font-size:2.15em;font-weight:700;letter-spacing:-.02em;line-height:1.1;background:linear-gradient(90deg,#e6edf7 0%,#7dd3fc 60%,#fbbf24 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
      .clock{font-size:3.4em;font-weight:200;letter-spacing:-.03em;line-height:1;margin:6px 0 2px;font-variant-numeric:tabular-nums;color:#e6edf7}
      .sub{color:var(--secondary-text-color);font-size:1em}
      .chips{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
      .chip{background:rgba(30,41,59,.55);border:1px solid rgba(148,163,184,.14);border-radius:999px;padding:4px 10px;font-size:.88em;color:#cbd5e1;cursor:pointer}
      .r{display:flex;align-items:center;gap:14px;cursor:pointer}
      .now{text-align:right}
      .t{font-size:3em;font-weight:300;line-height:1}
      .cond{color:var(--secondary-text-color);font-size:.95em;margin-top:2px}
      .mm{color:#94a3b8;font-size:.85em;margin-top:2px}
      .days{display:flex;gap:10px;margin-left:6px}
      .day{display:flex;flex-direction:column;align-items:center;font-size:.78em;color:#94a3b8;text-transform:capitalize}
      .day b{color:#e6edf7;font-weight:600;font-size:1.05em}.day span{font-size:.9em}
      .ico{width:104px;height:94px;overflow:visible}.ico.sm{width:36px;height:32px;margin:2px 0}
      .sun circle{fill:#fbbf24;filter:drop-shadow(0 0 10px rgba(251,191,36,.6))}
      .rays{stroke:#fbbf24;stroke-width:3.5;stroke-linecap:round;transform-origin:50px 44px;animation:spin 18s linear infinite}
      .moon path{fill:#e2e8f0;filter:drop-shadow(0 0 10px rgba(226,232,240,.45))}
      .stars circle{fill:#fff;animation:tw 3s ease-in-out infinite}.stars circle:nth-child(2){animation-delay:1s}.stars circle:nth-child(3){animation-delay:2s}
      .cl path{fill:#cbd5e1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))}.cl.back path{fill:#64748b}.cl.dark path{fill:#94a3b8}
      .drift{animation:drift 6s ease-in-out infinite alternate}.drift2{animation:drift 9s ease-in-out infinite alternate-reverse}
      .drop{stroke:#7dd3fc;stroke-width:3;stroke-linecap:round;animation:rain 1.1s linear infinite;opacity:0}
      .flake{fill:#f1f5f9;animation:snow 2.4s linear infinite;opacity:0}
      .fog line{stroke:#94a3b8;stroke-width:4;stroke-linecap:round;opacity:.75;animation:fog 5s ease-in-out infinite alternate}.fog .f2{animation-direction:alternate-reverse}
      .bolt{fill:#fde047;animation:flash 3s infinite}
      .wind path{fill:none;stroke:#cbd5e1;stroke-width:4;stroke-linecap:round;animation:drift 3s ease-in-out infinite alternate}.wind .w2{animation-delay:.6s}
      .ico.sm *{animation:none!important}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes tw{50%{opacity:.25}}
      @keyframes drift{from{transform:translateX(-3px)}to{transform:translateX(4px)}}
      @keyframes rain{0%{opacity:0;transform:translateY(-6px)}20%{opacity:1}100%{opacity:0;transform:translateY(12px)}}
      @keyframes snow{0%{opacity:0;transform:translate(0,-6px)}20%{opacity:1}100%{opacity:0;transform:translate(4px,14px)}}
      @keyframes fog{from{transform:translateX(-6px)}to{transform:translateX(6px)}}
      @keyframes flash{0%,88%,100%{opacity:.15}90%,94%{opacity:1}92%{opacity:.4}}
      .rooms{display:grid;grid-template-columns:repeat(${Math.min(3, Math.max(1, (c.rooms || []).length))},minmax(112px,1fr));gap:8px;margin-left:8px}
      .rm{background:rgba(30,41,59,.5);border:1px solid rgba(148,163,184,.14);border-radius:14px;padding:7px 12px;cursor:pointer;display:grid;grid-template-columns:1fr auto;align-items:baseline;column-gap:8px}
      .rm span{grid-column:1/3;font-size:.7em;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rm b{font-size:1.55em;font-weight:300;color:#e6edf7}.rm i{font-style:normal;font-size:.78em;color:#7fa8c0}
      .rm.heat{border-color:rgba(255,152,64,.45)}.rm.cool{border-color:rgba(100,180,255,.45)}
      .stl{display:grid;grid-template-columns:repeat(2,minmax(150px,1fr));gap:5px 8px;margin-left:8px;align-self:center}
      .stx{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:6px;background:rgba(30,41,59,.45);border:1px solid rgba(148,163,184,.12);border-radius:10px;padding:4px 10px;cursor:pointer;font-size:.8em;white-space:nowrap}
      .stx ha-icon{--mdc-icon-size:16px;color:#f5b544}.stx span{color:#94a3b8;overflow:hidden;text-overflow:ellipsis}.stx b{color:#e6edf7;font-weight:600}
      @media (max-width:700px){.rooms,.stl{display:none}}
      @media (max-width:700px){.wrap{display:grid;grid-template-columns:1fr auto;align-items:start;gap:8px}.l h1{font-size:1.6em}.clock{font-size:2.6em;margin:4px 0 0}.r{width:auto;flex-direction:column;align-items:flex-end;gap:2px}.days{display:none}.ico{width:64px;height:58px}.t{font-size:2.2em}.chips{margin-top:8px}}
      @media (prefers-reduced-motion:reduce){*{animation:none!important}}
    </style>
    <div class="wrap">
      <div class="l">
        <h1>${saluto}${c.name ? ', ' + c.name : ''}</h1>
        <div class="clock">${ora}</div>
        <div class="sub">${data}</div>
        <div class="chips">
          ${solar != null ? `<span class="chip" data-e="${c.solar}">\u2600\uFE0F ${solar}</span>` : ''}
          ${batt != null ? `<span class="chip" data-e="${c.battery}">\uD83D\uDD0B ${batt}%</span>` : ''}
        </div>
      </div>
      <div class="r" data-e="${c.entity}">
        ${icon(cond)}
        <div class="now"><div class="t">${temp}\u00B0</div><div class="cond">${IT_COND[cond] || cond}</div><div class="mm">${minmax}</div></div>
        <div class="days">${next}</div>
      </div>
      ${rooms ? `<div class="rooms">${rooms}</div>` : ''}
      ${status ? `<div class="stl">${status}</div>` : ''}
    </div>`;
    this.shadowRoot.querySelectorAll('[data-e]').forEach(el => el.addEventListener('click', ev => {
      ev.stopPropagation();
      const e = new Event('hass-more-info', { bubbles: true, composed: true });
      e.detail = { entityId: el.dataset.e };
      this.dispatchEvent(e);
    }));
  }
}
customElements.define('meteo-hero-card', MeteoHeroCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'meteo-hero-card', name: 'Meteo Hero', description: 'Saluto, orologio e meteo animato' });
