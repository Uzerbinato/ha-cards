// device-cards · card grafiche per periferiche
// printer-card: illustrazione della stampante, stato e cartucce con il livello d'inchiostro
//   config: entity (stato IPP), name, model ('mfp' | 'plotter'), image (URL foto, facoltativa), inks: [{entity, name, color}]
// net-card: connessione internet e rete locale con illustrazione di router e access point
//   config: image (URL foto, facoltativa), internet, router, download, upload, latency, loss, nominal_down (Mbit/s), nominal_up, clients: [entity...]
const DC_CSS = `
  :host{display:block}
  ha-card{overflow:hidden;padding:16px 18px 18px;background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,0) 40%),var(--ha-card-background,var(--card-background-color));}
  .top{display:flex;gap:16px;align-items:center}
  .art{flex:0 0 auto;width:132px;height:104px}
  .meta{min-width:0;flex:1}
  .name{font-size:16px;font-weight:600;color:var(--primary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sub{font-size:13px;color:var(--secondary-text-color);margin-top:2px}
  .pill{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.02em}
  .dot{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
  .ok{color:#34d399;background:rgba(52,211,153,.12)} .busy{color:#fbbf24;background:rgba(251,191,36,.12)} .bad{color:#f87171;background:rgba(248,113,113,.12)} .off{color:#94a3b8;background:rgba(148,163,184,.12)}
`;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (h, id) => { const s = id && h.states[id]; const v = s ? parseFloat(s.state) : NaN; return isNaN(v) ? null : v; };
const fmt = (v, d = 0) => (v === null ? '–' : Number(v).toFixed(d).replace('.', ','));
const INK = { black: '#2b2f36', grey: '#6b7280', 'blue-grey': '#4b5563', cyan: '#22d3ee', 'light-blue': '#7dd3fc', magenta: '#ec4899', pink: '#f472b6', yellow: '#facc15' };

// tachimetro: arco 240°, tacche, zona colorata e lancetta
const TACHO_CSS = `.tc{position:relative;text-align:center;padding:8px 4px 6px;border-radius:16px;background:radial-gradient(circle at 50% 60%,rgba(255,255,255,.05),rgba(148,163,184,.04) 70%);border:1px solid rgba(148,163,184,.1);cursor:pointer}
  .tc svg{width:100%;max-width:150px;height:auto;display:block;margin:0 auto}
  .tc .tv{position:absolute;left:0;right:0;top:66%;font-size:18px;font-weight:600;color:var(--primary-text-color);line-height:1} .tc .tv small{font-size:11px;color:var(--secondary-text-color);font-weight:500}
  .tc .tl{font-size:12px;color:var(--secondary-text-color);margin-top:-6px}
  .tc .nd{transition:transform .8s cubic-bezier(.3,1.4,.5,1)}`;
const tacho = (v, max, col, warn, alarm) => {
  const S = 150, E = 390, cx = 60, cy = 60, R = 46, k = v === null ? 0 : Math.max(0, Math.min(1, v / max));
  const pt = (deg, r) => { const a = (deg * Math.PI) / 180; return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)]; };
  const arcP = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
  let ticks = ''; for (let i = 0; i <= 20; i++) { const a = S + (E - S) * i / 20, big = i % 5 === 0, [x0, y0] = pt(a, R - 9), [x1, y1] = pt(a, R - (big ? 15 : 12)); ticks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="rgba(226,232,240,${big ? .55 : .25})" stroke-width="${big ? 1.6 : 1}"/>`; }
  const zone = (f0, f1, c2) => `<path d="${arcP(S + (E - S) * f0, S + (E - S) * f1, R)}" stroke="${c2}" stroke-width="3" fill="none" opacity=".55"/>`;
  const zones = warn != null ? zone(warn / max, (alarm ?? max) / max, '#fbbf24') + (alarm != null ? zone(alarm / max, 1, '#f87171') : '') : '';
  const na = S + (E - S) * k, cc = v !== null && alarm != null && v >= alarm ? '#f87171' : v !== null && warn != null && v >= warn ? '#fbbf24' : col;
  return `<svg viewBox="0 0 120 104"><path d="${arcP(S, E, R + 6)}" stroke="rgba(148,163,184,.16)" stroke-width="7" fill="none" stroke-linecap="round"/>
    ${k > 0.005 ? `<path d="${arcP(S, na, R + 6)}" stroke="${cc}" stroke-width="7" fill="none" stroke-linecap="round" style="filter:drop-shadow(0 0 5px ${cc})"/>` : ''}
    ${zones}${ticks}
    <g class="nd" style="transform-origin:${cx}px ${cy}px;transform:rotate(${na - 270}deg)"><path d="M${cx - 2.2} ${cy} L${cx} ${cy - R + 12} L${cx + 2.2} ${cy} Z" fill="#e2e8f0"/></g>
    <circle cx="${cx}" cy="${cy}" r="5" fill="#1f242b" stroke="${cc}" stroke-width="2"/></svg>`;
};

class PrinterCard extends HTMLElement {
  setConfig(c) { if (!c.entity) throw new Error('entity richiesta'); this._c = c; if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  set hass(h) {
    this._h = h; const c = this._c, s = h.states[c.entity];
    const st = s ? s.state : 'unavailable';
    const lab = { idle: ['Pronta', 'ok'], printing: ['In stampa', 'busy'], processing: ['In stampa', 'busy'], stopped: ['Ferma', 'bad'], unavailable: ['Non raggiungibile', 'off'], unknown: ['Sconosciuto', 'off'] }[st] || [st, 'off'];
    const inks = (c.inks || []).map((k) => ({ ...k, v: num(h, k.entity) }));
    const low = inks.filter((k) => k.v !== null && k.v < 15);
    const key = st + inks.map((k) => k.v).join(',');
    if (key === this._key) return; this._key = key;
    const art = c.image ? `<img src="${esc(c.image)}" alt="" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))">` : (c.model === 'plotter' ? this._plotter(st) : this._mfp(st));
    this.shadowRoot.innerHTML = `<style>${DC_CSS}
      .inks{display:grid;grid-template-columns:repeat(${Math.max(4, inks.length)},1fr);gap:10px;margin-top:16px}
      .ink{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer}
      .cart{position:relative;width:100%;max-width:38px;height:62px;border-radius:7px 7px 9px 9px;background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.22);overflow:hidden}
      .cart:before{content:'';position:absolute;top:-1px;left:30%;width:40%;height:6px;border-radius:0 0 4px 4px;background:rgba(148,163,184,.35)}
      .fill{position:absolute;left:0;right:0;bottom:0;border-radius:0 0 8px 8px;transition:height .6s}
      .fill:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.22),rgba(255,255,255,0) 45%)}
      .pct{font-size:13px;font-weight:600;color:var(--primary-text-color)} .pct.low{color:#fb923c}
      .iname{font-size:11px;color:var(--secondary-text-color);text-align:center;line-height:1.2}
      .warn{margin-top:12px;font-size:12px;color:#fb923c}
    </style><ha-card><div class="top"><div class="art">${art}</div><div class="meta">
      <div class="name">${esc(c.name || (s && s.attributes.friendly_name) || c.entity)}</div>
      <div class="sub">${esc(c.subtitle || (c.model === 'plotter' ? 'Plotter grande formato' : 'Multifunzione a colori'))}</div>
      <div class="pill ${lab[1]}"><span class="dot"></span>${esc(lab[0])}</div></div></div>
      <div class="inks">${inks.map((k) => `<div class="ink" data-e="${esc(k.entity)}"><div class="cart"><div class="fill" style="height:${k.v === null ? 0 : Math.max(3, k.v)}%;background:${INK[k.color] || k.color || '#888'}"></div></div>
        <div class="pct ${k.v !== null && k.v < 15 ? 'low' : ''}">${fmt(k.v)}%</div><div class="iname">${esc(k.name)}</div></div>`).join('')}</div>
      ${low.length ? `<div class="warn">Da sostituire presto: ${low.map((k) => esc(k.name)).join(', ')}</div>` : ''}</ha-card>`;
    this.shadowRoot.querySelectorAll('.ink').forEach((el) => el.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: el.dataset.e } }))));
  }
  _mfp(st) {
    const on = st === 'printing' || st === 'processing';
    return `<svg viewBox="0 0 120 96"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8ecf1"/><stop offset="1" stop-color="#b9c2cc"/></linearGradient></defs>
      <rect x="22" y="6" width="76" height="16" rx="4" fill="url(#b)"/><rect x="26" y="10" width="34" height="8" rx="2" fill="#1f2937"/><rect x="28" y="12" width="14" height="4" rx="1" fill="${on ? '#fbbf24' : '#38bdf8'}"/>
      <rect x="14" y="22" width="92" height="30" rx="5" fill="url(#b)"/><rect x="24" y="38" width="72" height="6" rx="2" fill="#9aa4ae"/>
      <rect x="30" y="${on ? 30 : 34}" width="60" height="${on ? 12 : 6}" rx="1" fill="#fff" opacity=".95"/>
      <rect x="18" y="52" width="84" height="38" rx="5" fill="#d3d9e0"/><rect x="24" y="60" width="72" height="9" rx="2" fill="#aeb7c1"/><rect x="24" y="73" width="72" height="9" rx="2" fill="#aeb7c1"/>
      <rect x="54" y="63" width="12" height="2" rx="1" fill="#6b7280"/><rect x="54" y="76" width="12" height="2" rx="1" fill="#6b7280"/>
      <circle cx="92" cy="14" r="2.2" fill="${on ? '#fbbf24' : '#34d399'}"/></svg>`;
  }
  _plotter(st) {
    const on = st === 'printing' || st === 'processing';
    return `<svg viewBox="0 0 120 96"><defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4048"/><stop offset="1" stop-color="#1f2329"/></linearGradient></defs>
      <rect x="4" y="18" width="112" height="26" rx="6" fill="url(#p)"/><rect x="10" y="38" width="100" height="4" rx="2" fill="#0f1215"/>
      <rect x="88" y="23" width="20" height="9" rx="2" fill="#111827"/><rect x="90" y="25" width="9" height="5" rx="1" fill="${on ? '#fbbf24' : '#38bdf8'}"/>
      <path d="M16 42 h88 l-6 ${on ? 30 : 18} h-76 z" fill="#f5f7fa" opacity=".92"/>${on ? '<path d="M24 52 h70 M26 58 h52 M28 64 h60" stroke="#94a3b8" stroke-width="1.6"/>' : ''}
      <rect x="18" y="46" width="4" height="40" rx="2" fill="#2b3037"/><rect x="98" y="46" width="4" height="40" rx="2" fill="#2b3037"/>
      <rect x="12" y="84" width="16" height="4" rx="2" fill="#2b3037"/><rect x="92" y="84" width="16" height="4" rx="2" fill="#2b3037"/>
      <circle cx="14" cy="27" r="2.2" fill="${on ? '#fbbf24' : '#34d399'}"/></svg>`;
  }
}
customElements.define('printer-card', PrinterCard);

class NetCard extends HTMLElement {
  setConfig(c) { this._c = Object.assign({ nominal_down: 200, nominal_up: 20 }, c); if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  set hass(h) {
    const c = this._c, on = (id) => h.states[id] && h.states[id].state === 'on';
    const net = on(c.internet), rt = on(c.router);
    const d = num(h, c.download), u = num(h, c.upload), lat = num(h, c.latency), loss = num(h, c.loss);
    const cl = (c.clients || []).reduce((a, id) => a + (num(h, id) || 0), 0);
    const key = [net, rt, d, u, lat, loss, cl].join('|'); if (key === this._key) return; this._key = key;
    const state = !rt ? ['Router non raggiungibile', 'bad'] : !net ? ['Internet assente', 'bad'] : (d !== null && d < c.nominal_down * 0.25) || (loss !== null && loss > 2) ? ['Linea lenta', 'busy'] : ['Connessione regolare', 'ok'];
    const arc = (v, max, col) => { const k = v === null ? 0 : Math.min(1, v / max), a = Math.PI * (1 - k), x = 50 + 40 * Math.cos(a), y = 50 - 40 * Math.sin(a);
      return `<svg viewBox="0 0 100 58"><path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="rgba(148,163,184,.18)" stroke-width="8" stroke-linecap="round"/>
        ${k > 0 ? `<path d="M10 50 A40 40 0 0 ${k > 0.5 ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round"/>` : ''}</svg>`; };
    const flow = net ? 'flow' : '';
    this.shadowRoot.innerHTML = `<style>${DC_CSS}
      .art{width:150px;height:96px}
      .g{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px} ${TACHO_CSS}
      .gauge{position:relative;text-align:center;padding:10px 6px 8px;border-radius:16px;background:rgba(148,163,184,.07)}
      .gauge svg{width:100%;max-width:150px;height:auto}
      .gv{position:absolute;left:0;right:0;top:42%;font-size:22px;font-weight:600;color:var(--primary-text-color)} .gv small{font-size:12px;color:var(--secondary-text-color);font-weight:500}
      .gl{font-size:12px;color:var(--secondary-text-color);margin-top:-4px}
      .row{display:flex;justify-content:space-between;gap:10px;margin-top:12px;font-size:13px;color:var(--secondary-text-color)}
      .row b{color:var(--primary-text-color);font-weight:600}
      .flow{stroke-dasharray:4 6;animation:f 1.2s linear infinite} @keyframes f{to{stroke-dashoffset:-20}}
    </style><ha-card><div class="top"><div class="art">${c.image ? `<img src="${esc(c.image)}" alt="" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))">` : `
      <svg viewBox="0 0 150 96"><path class="${flow}" d="M24 30 C50 30 52 58 74 58" stroke="${net ? '#38bdf8' : '#f87171'}" stroke-width="2.5" fill="none"/>
        <path class="${rt ? 'flow' : ''}" d="M100 58 C118 58 120 34 132 34" stroke="${rt ? '#34d399' : '#f87171'}" stroke-width="2.5" fill="none"/>
        <circle cx="18" cy="28" r="14" fill="rgba(56,189,248,.14)" stroke="${net ? '#38bdf8' : '#f87171'}" stroke-width="2"/><path d="M8 28h20M18 14c-6 8-6 20 0 28M18 14c6 8 6 20 0 28" stroke="${net ? '#7dd3fc' : '#fca5a5'}" stroke-width="1.6" fill="none"/>
        <rect x="64" y="50" width="44" height="18" rx="4" fill="#2b3037" stroke="rgba(255,255,255,.15)"/><circle cx="72" cy="59" r="2" fill="${rt ? '#34d399' : '#f87171'}"/><circle cx="79" cy="59" r="2" fill="${net ? '#34d399' : '#f87171'}"/>
        <path d="M74 50 v-12 M98 50 v-12" stroke="#4b5563" stroke-width="2.4" stroke-linecap="round"/>
        <ellipse cx="136" cy="30" rx="12" ry="12" fill="#e8ecf1"/><circle cx="136" cy="30" r="4" fill="${rt ? '#38bdf8' : '#94a3b8'}"/>
        <path d="M122 14 a20 20 0 0 1 28 0 M127 19 a13 13 0 0 1 18 0" stroke="${rt ? '#38bdf8' : '#94a3b8'}" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`}
      </div><div class="meta"><div class="name">${esc(c.name || 'Rete e internet')}</div><div class="sub">${esc(c.subtitle || 'Fibra FTTC · router Be Byte')}</div>
      <div class="pill ${state[1]}"><span class="dot"></span>${state[0]}</div></div></div>
      <div class="g"><div class="tc">${tacho(d, c.nominal_down, '#22d3ee')}<div class="tv">${fmt(d)}<small> Mbit/s</small></div><div class="tl">Download · su ${c.nominal_down}</div></div>
        <div class="tc">${tacho(u, c.nominal_up, '#a78bfa')}<div class="tv">${fmt(u)}<small> Mbit/s</small></div><div class="tl">Upload · su ${c.nominal_up}</div></div></div>
      <div class="row"><span>Latenza <b>${fmt(lat)} ms</b></span><span>Pacchetti persi <b>${fmt(loss)}%</b></span><span>Dispositivi Wi-Fi <b>${fmt(cl)}</b></span></div></ha-card>`;
  }
}
customElements.define('net-card', NetCard);

// host-card: computer/server con risorse (CPU, temperatura, RAM, disco, rete, avvio)
//   config: name, subtitle, image (foto, facoltativa), ip, cpu, temp, mem, disk, load, boot (timestamp ultimo avvio), net_in, net_out (MB/s o Mbit/s)
class HostCard extends HTMLElement {
  setConfig(c) { this._c = c; if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  set hass(h) {
    const c = this._c, g = (k) => num(h, c[k]), u = (k) => (c[k] && h.states[c[k]] ? h.states[c[k]].attributes.unit_of_measurement || '' : '');
    const v = { cpu: g('cpu'), temp: g('temp'), mem: g('mem'), disk: g('disk'), load: g('load'), ni: g('net_in'), no: g('net_out') };
    const ip = c.ip && h.states[c.ip] ? h.states[c.ip].state : '';
    const bs = c.boot && h.states[c.boot] ? h.states[c.boot].state : null;
    let up = '–'; if (bs && !isNaN(Date.parse(bs))) { const m = (Date.now() - Date.parse(bs)) / 60000, d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60); up = d ? `${d} g ${hh} h` : `${hh} h ${Math.floor(m % 60)} min`; }
    const key = JSON.stringify(v) + ip + up; if (key === this._key) return; this._key = key;
    const online = v.cpu !== null;
    const col = (x, w, a) => (x === null ? '#475569' : x >= a ? '#f87171' : x >= w ? '#fbbf24' : '#f5b544');
    const bar = (lab, x, unit, w, a, max = 100, d = 0) => `<div class="row" data-e="${esc(c[{ CPU: 'cpu', Temperatura: 'temp', Memoria: 'mem', Disco: 'disk' }[lab]] || '')}"><div class="rl"><span>${lab}</span><b>${fmt(x, d)}${unit}</b></div>
      <div class="trk"><div class="bf" style="width:${x === null ? 0 : Math.min(100, (x / max) * 100)}%;background:${col(x, w, a)}"></div></div></div>`;
    const art = c.image ? `<div class="art"><img src="${esc(c.image)}" alt="" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))"></div>` : '';
    this.shadowRoot.innerHTML = `<style>${DC_CSS}
      .tg{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:10px;margin-top:16px} ${TACHO_CSS}
      .row{cursor:pointer} .rl{display:flex;justify-content:space-between;font-size:12px;color:var(--secondary-text-color);margin-bottom:5px} .rl b{color:var(--primary-text-color);font-weight:600;font-size:13px}
      .trk{height:7px;border-radius:99px;background:rgba(148,163,184,.14);overflow:hidden} .bf{height:100%;border-radius:99px;transition:width .6s;box-shadow:0 0 10px rgba(245,181,68,.35)}
      .foot{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}
      .k{background:rgba(255,255,255,.04);border:1px solid rgba(148,163,184,.12);border-radius:10px;padding:8px 10px} .k span{display:block;font-size:11px;color:var(--secondary-text-color)} .k b{font-size:13px;color:var(--primary-text-color);font-weight:600;white-space:nowrap}
    </style><ha-card><div class="top">${art}<div class="meta">
      <div class="name">${esc(c.name || 'Server')}</div><div class="sub">${esc(c.subtitle || '')}${ip ? ` · ${esc(ip)}` : ''}</div>
      <div class="pill ${online ? 'ok' : 'off'}"><span class="dot"></span>${online ? 'In funzione' : 'Non raggiungibile'}</div></div></div>
      <div class="tg">${[['CPU','cpu',v.cpu,'%',100,60,85,0],['Temperatura','temp',v.temp,' °C',100,70,85,0],['Memoria','mem',v.mem,'%',100,75,90,0],['Disco','disk',v.disk,'%',100,80,92,0]].map(([l,k,x,un,mx,w,a]) => `<div class="tc row" data-e="${esc(c[k] || '')}">${tacho(x, mx, '#f5b544', w, a)}<div class="tv">${fmt(x)}<small>${un}</small></div><div class="tl">${l}</div></div>`).join('')}</div>
      <div class="foot"><div class="k"><span>Acceso da</span><b>${up}</b></div><div class="k"><span>Carico 5 min</span><b>${fmt(v.load, 2)}</b></div>
      <div class="k"><span>Rete ↓ / ↑</span><b>${fmt(v.ni, 1)} / ${fmt(v.no, 1)} ${esc(u('net_in'))}</b></div></div></ha-card>`;
    this.shadowRoot.querySelectorAll('.row').forEach((el) => el.dataset.e && el.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: el.dataset.e } }))));
  }
}
customElements.define('host-card', HostCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'printer-card', name: 'Stampante', description: 'Stampante con cartucce' }, { type: 'host-card', name: 'Computer / server', description: 'Risorse del computer' }, { type: 'net-card', name: 'Rete e internet', description: 'Connessione e velocità' });
