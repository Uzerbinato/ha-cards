// device-cards · card grafiche per periferiche
// printer-card: illustrazione della stampante, stato e cartucce con il livello d'inchiostro
//   config: entity (stato IPP), name, model ('mfp' | 'plotter'), image (URL foto, facoltativa), compact (foto accanto alle cartucce), inks: [{entity, name, color}]
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
  .tc svg{width:100%;max-width:64px;height:auto;display:block;margin:0 auto}
  .tc .tv{position:absolute;left:0;right:0;top:54%;font-size:12px;font-weight:600;color:var(--primary-text-color);line-height:1} .tc .tv small{font-size:11px;color:var(--secondary-text-color);font-weight:500}
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
    const rs = String((s && s.attributes.state_reason) || '').toLowerCase();
    const RS = [['media-empty', 'Carta esaurita'], ['media-needed', 'Carta esaurita'], ['media-jam', 'Carta inceppata'], ['media-low', 'Carta in esaurimento'], ['door-open', 'Sportello aperto'], ['cover-open', 'Coperchio aperto'], ['toner-empty', 'Toner esaurito'], ['marker-supply-empty', 'Inchiostro esaurito'], ['offline', 'Offline']];
    const rmsg = (RS.find(([k]) => rs.includes(k)) || [])[1] || '';
    const key = st + rs + inks.map((k) => k.v).join(',');
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
      .cmp{display:grid;grid-template-columns:110px 1fr;gap:14px;align-items:center}
      .cmp .art{width:110px;height:96px}
      .cmp .hd{display:flex;align-items:center;gap:10px;min-width:0}.cmp .hd .name{flex:1;min-width:0}.cmp .pill{margin-top:0}
      .cmp .inks{margin-top:10px;gap:8px}.cmp .cart{height:44px;max-width:30px}
    </style><ha-card>${c.compact ? `<div class="cmp" style="grid-template-columns:${inks.length > 4 ? 84 : 110}px 1fr"><div class="art" style="width:${inks.length > 4 ? 84 : 110}px">${art}</div><div style="min-width:0">
      <div class="hd"><div class="name">${esc(c.name || (s && s.attributes.friendly_name) || c.entity)}</div><div class="pill ${lab[1]}"><span class="dot"></span>${esc(lab[0])}</div></div>` : `<div class="top"><div class="art">${art}</div><div class="meta">
      <div class="name">${esc(c.name || (s && s.attributes.friendly_name) || c.entity)}</div>
      <div class="sub">${esc(c.subtitle || (c.model === 'plotter' ? 'Plotter grande formato' : 'Multifunzione a colori'))}</div>
      <div class="pill ${lab[1]}"><span class="dot"></span>${esc(lab[0])}</div></div></div>`}
      <div class="inks">${inks.map((k) => `<div class="ink" data-e="${esc(k.entity)}"><div class="cart"><div class="fill" style="height:${k.v === null ? 0 : Math.max(3, k.v)}%;background:${INK[k.color] || k.color || '#888'}"></div></div>
        <div class="pct ${k.v !== null && k.v < 15 ? 'low' : ''}">${fmt(k.v)}%</div><div class="iname">${esc(k.name)}</div></div>`).join('')}</div>
      ${rmsg ? `<div class="warn" style="color:#f87171;font-weight:600;font-size:13px">\u26A0 ${esc(rmsg)}</div>` : ''}${low.length ? `<div class="warn">Da sostituire presto: ${low.map((k) => esc(k.name)).join(', ')}</div>` : ''}${c.compact ? '</div></div>' : ''}</ha-card>`;
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
    </style><ha-card><div class="top"><div class="art" style="${c.image === false ? 'display:none' : ''}">${c.image ? `<img src="${esc(c.image)}" alt="" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))">` : `
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
    const art = c.image ? `<div class="art" style="${c.image === false ? 'display:none' : ''}"><img src="${esc(c.image)}" alt="" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))"></div>` : '';
    this.shadowRoot.innerHTML = `<style>${DC_CSS}
      .tg{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px} ${TACHO_CSS}
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

// now-playing-card: brano in riproduzione, scuro e leggibile da lontano
//   config: entity (media_player), name, controls (default true)
class NowPlayingCard extends HTMLElement {
  setConfig(c) { if (!c.entity) throw new Error('entity richiesta'); this._c = c; if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); }
  getCardSize() { return 2; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  set hass(h) {
    this._h = h; const c = this._c, s = h.states[c.entity]; if (!s) return; const a = s.attributes;
    const pic = a.entity_picture || '', key = s.state + a.media_title + a.media_artist + pic;
    if (key === this._key) return; this._key = key;
    const play = s.state === 'playing', ctl = c.controls !== false;
    this.shadowRoot.innerHTML = `<style>${DC_CSS}
      .np{display:flex;gap:14px;align-items:center}
      .cov{flex:0 0 64px;height:64px;border-radius:12px;background:${pic ? `center/cover url('${esc(pic)}')` : 'linear-gradient(135deg,#f5b544,#b45309)'};display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,0,0,.4)}
      .cov ha-icon{--mdc-icon-size:30px;color:#1a1206}
      .tt{font-size:17px;font-weight:600;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ar{font-size:14px;color:#f5b544;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .src{font-size:11px;color:var(--secondary-text-color);margin-top:4px;letter-spacing:.06em;text-transform:uppercase}
      .eq{display:inline-flex;gap:2px;align-items:flex-end;height:12px;margin-right:6px;vertical-align:-1px}
      .eq i{width:3px;background:#f5b544;border-radius:2px;animation:eq 1s ease-in-out infinite}.eq i:nth-child(2){animation-delay:.2s}.eq i:nth-child(3){animation-delay:.4s}
      @keyframes eq{0%,100%{height:3px}50%{height:12px}}
      .bt{display:flex;gap:8px;margin-left:auto}.bt button{all:unset;cursor:pointer;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.07);color:#e2e8f0}
      .bt button.m{background:#f5b544;color:#1a1206}
    </style><ha-card><div class="np"><div class="cov">${pic ? '' : '<ha-icon icon="mdi:music"></ha-icon>'}</div>
      <div class="meta"><div class="tt">${esc(a.media_title || 'Nessun brano')}</div><div class="ar">${esc(a.media_artist || '')}</div>
      <div class="src">${play ? '<span class="eq"><i></i><i></i><i></i></span>' : ''}${esc(c.name || a.friendly_name)}${a.source ? ' · ' + esc(a.source) : ''}</div></div>
      ${ctl ? `<div class="bt"><button data-a="media_previous_track"><ha-icon icon="mdi:skip-previous"></ha-icon></button><button class="m" data-a="media_play_pause"><ha-icon icon="mdi:${play ? 'pause' : 'play'}"></ha-icon></button><button data-a="media_next_track"><ha-icon icon="mdi:skip-next"></ha-icon></button></div>` : ''}</div></ha-card>`;
    this.shadowRoot.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => this._h.callService('media_player', b.dataset.a, { entity_id: c.entity })));
  }
}
customElements.define('now-playing-card', NowPlayingCard);

// meter-card: tachimetro grande con soglie e avviso (es. prelievo dal contatore)
//   config: entity (W o kW), name, max (kW, def 8), warn (kW, def 6), alarm (kW, def 6.6), note
class MeterCard extends HTMLElement {
  setConfig(c) { if (!c.entity) throw new Error('entity richiesta'); this._c = Object.assign({ max: 8, warn: 6, alarm: 6.6, name: 'Prelievo dal contatore' }, c); if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  set hass(h) {
    const c = this._c, s = h.states[c.entity]; let v = s ? parseFloat(s.state) : NaN;
    if (!isNaN(v) && s.attributes.unit_of_measurement === 'W') v = v / 1000; if (isNaN(v)) v = null;
    const key = String(v); if (key === this._key) return; this._key = key;
    const lvl = v === null ? 'off' : v >= c.alarm ? 'bad' : v >= c.warn ? 'busy' : 'ok';
    const msg = lvl === 'bad' ? 'Oltre il limite: il contatore può staccare. Spegni qualcosa!' : lvl === 'busy' ? 'Vicino al limite: evita di accendere altro' : 'Margine disponibile ' + fmt(Math.max(0, c.warn - (v || 0)), 1) + ' kW';
    this.shadowRoot.innerHTML = `<style>${DC_CSS} ${TACHO_CSS}
      .w{display:flex;gap:14px;align-items:center}.w .tc{flex:0 0 130px;background:none;border:0;padding:0}.w .tc svg{max-width:130px}.w .tc .tv{font-size:20px}
      .msg{font-size:13px;color:var(--secondary-text-color);margin-top:6px}.bad .msg{color:#f87171;font-weight:600}.busy .msg{color:#fbbf24}
      ha-card.bad{border:1px solid rgba(248,113,113,.6);box-shadow:0 0 24px rgba(248,113,113,.25);animation:pl 1.4s ease-in-out infinite}@keyframes pl{50%{box-shadow:0 0 6px rgba(248,113,113,.1)}}
    </style><ha-card class="${lvl}"><div class="w"><div class="tc" data-e="${esc(c.entity)}">${tacho(v, c.max, '#22d3ee', c.warn, c.alarm)}<div class="tv">${fmt(v, 1)}<small> kW</small></div></div>
      <div class="meta"><div class="name">${esc(c.name)}</div><div class="sub">Impegnata ${fmt(c.warn, 0)} kW · stacca oltre ${fmt(c.alarm, 1)} kW</div>
      <div class="pill ${lvl}"><span class="dot"></span>${lvl === 'bad' ? 'Sovraccarico' : lvl === 'busy' ? 'Attenzione' : lvl === 'off' ? 'Non disponibile' : 'Regolare'}</div><div class="msg">${msg}</div></div></div></ha-card>`;
    this.shadowRoot.querySelector('.tc').addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: c.entity } })));
  }
}
customElements.define('meter-card', MeterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'printer-card', name: 'Stampante', description: 'Stampante con cartucce' }, { type: 'host-card', name: 'Computer / server', description: 'Risorse del computer' }, { type: 'net-card', name: 'Rete e internet', description: 'Connessione e velocità' });

// ---- card di casa (batterie, rifiuti, elettrodomestici, priorità) incorporate per compatibilità con la TV
;(() => {
(() => {
  const BG = "radial-gradient(120% 90% at 50% 0%,#18242b 0%,#0d1317 62%,#0a0f12 100%)";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const hhmm = (d) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const PROG = {
    cotton: "Cotone",
    synthetic: "Sintetici",
    mix: "Misti",
    towels: "Asciugamani",
    time_cold: "Aria fredda",
    time_warm: "Aria calda a tempo",
    super_40: "Super 40\u2032",
    shirts_15: "Camicie",
    delicates: "Delicati",
    wool_finish: "Lana",
    outdoor: "Outdoor",
    down_feathers: "Piumini",
    blankets: "Coperte",
    dessous: "Intimo",
    intensiv_70: "Intensivo 70\xB0",
    auto_2: "Auto 45\u201365\xB0",
    auto_1: "Auto 35\u201345\xB0",
    auto_3: "Auto 65\u201375\xB0",
    eco_50: "Eco 50\xB0",
    glas_40: "Vetri 40\xB0",
    quick_45: "Rapido 45\xB0",
    pre_rinse: "Prelavaggio",
    night_wash: "Notturno",
    kurz_60: "Breve 60\xB0",
    machine_care: "Cura macchina",
    quick_65: "Rapido 65\xB0"
  };
  const progName = (v) => {
    if (!v || ["unknown", "unavailable"].includes(v)) return "";
    const k = v.replace(/^.*_program_/, "");
    return PROG[k] || k.replace(/_/g, " ");
  };
  function dryerSVG(st, pct) {
    const run = st === "run", fin = st === "finished";
    const ring = 2 * Math.PI * 33, off = ring * (1 - (pct || 0) / 100);
    const acc = run ? "#22d3ee" : fin ? "#4ade80" : "#64748b";
    return `<svg viewBox="0 0 100 124" class="ill">
  <defs><radialGradient id="dg" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${run ? "#0e3a47" : "#141c22"}"/><stop offset="1" stop-color="#0a0f13"/></radialGradient>
  <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3640"/><stop offset="1" stop-color="#1a232a"/></linearGradient></defs>
  <rect x="6" y="4" width="88" height="116" rx="12" fill="url(#bd)" stroke="rgba(255,255,255,.08)"/>
  <rect x="6" y="4" width="88" height="20" rx="12" fill="rgba(255,255,255,.04)"/>
  <circle cx="20" cy="14" r="4.5" fill="#0f161b" stroke="rgba(255,255,255,.15)"/>
  <rect x="34" y="10" width="30" height="8" rx="2" fill="#0b1115"/><rect x="36" y="12" width="${run ? 26 * (pct || 0) / 100 : 0}" height="4" rx="1" fill="${acc}" opacity=".9"/>
  <circle cx="78" cy="14" r="2.2" fill="${acc}" class="${run ? "blink" : ""}"/>
  <circle cx="50" cy="70" r="38" fill="#0d1418" stroke="rgba(255,255,255,.07)"/>
  <circle cx="50" cy="70" r="33" fill="none" stroke="rgba(148,163,184,.14)" stroke-width="3.5"/>
  <circle cx="50" cy="70" r="33" fill="none" stroke="${acc}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${ring}" stroke-dashoffset="${run ? off : fin ? 0 : ring}" transform="rotate(-90 50 70)" style="filter:drop-shadow(0 0 4px ${acc})"/>
  <circle cx="50" cy="70" r="27" fill="url(#dg)"/>
  <g class="${run ? "spin" : ""}" style="transform-origin:50px 70px">
    <path d="M36 74 q6 -10 14 -4 q6 5 12 -2 q2 8 -6 12 q-10 4 -20 -6z" fill="${run ? "#38bdf8" : "#334155"}" opacity=".85"/>
    <path d="M44 58 q8 -4 12 2 q-4 6 -12 4z" fill="${run ? "#f472b6" : "#3b4656"}" opacity=".8"/>
    <path d="M58 80 q6 2 4 8 q-6 0 -8 -4z" fill="${run ? "#fbbf24" : "#3b4656"}" opacity=".8"/>
    <circle cx="50" cy="70" r="27" fill="none" stroke="rgba(255,255,255,.05)" stroke-dasharray="3 6"/>
  </g>
  <ellipse cx="42" cy="58" rx="12" ry="6" fill="rgba(255,255,255,.06)" transform="rotate(-30 42 58)"/>
  ${fin ? '<circle cx="76" cy="104" r="10" fill="#16a34a"/><path d="M71 104 l3.5 3.5 l6.5 -7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>' : ""}
  </svg>`;
  }
  function dishSVG(st, pct) {
    const run = st === "run", fin = st === "finished";
    const acc = run ? "#22d3ee" : fin ? "#4ade80" : "#64748b";
    const drops = run ? [18, 30, 44, 58, 72, 84].map((x, i) => `<circle cx="${x}" cy="40" r="2.2" fill="#7dd3fc" class="drop" style="animation-delay:${(i * 0.27).toFixed(2)}s"/>`).join("") : "";
    const steam = run || fin ? [34, 50, 66].map((x, i) => `<path d="M${x} 2 q-4 -6 0 -12 q4 -6 0 -12" stroke="rgba(203,213,225,.35)" stroke-width="2" fill="none" class="steam" style="animation-delay:${i * 0.6}s"/>`).join("") : "";
    return `<svg viewBox="0 -26 100 150" class="ill">
  <defs><linearGradient id="db" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3640"/><stop offset="1" stop-color="#1a232a"/></linearGradient>
  <linearGradient id="dw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${run ? "#0e3a47" : "#121a20"}"/><stop offset="1" stop-color="#0a1014"/></linearGradient>
  <clipPath id="dc"><rect x="12" y="30" width="76" height="80" rx="6"/></clipPath></defs>
  ${steam}
  <rect x="6" y="4" width="88" height="116" rx="10" fill="url(#db)" stroke="rgba(255,255,255,.08)"/>
  <rect x="6" y="4" width="88" height="18" rx="10" fill="rgba(255,255,255,.04)"/>
  <rect x="14" y="9" width="40" height="8" rx="2" fill="#0b1115"/><rect x="16" y="11" width="${run ? 36 * (pct || 0) / 100 : fin ? 36 : 0}" height="4" rx="1" fill="${acc}" opacity=".9"/>
  <circle cx="64" cy="13" r="2.4" fill="#3b4656"/><circle cx="72" cy="13" r="2.4" fill="#3b4656"/><circle cx="82" cy="13" r="2.4" fill="${acc}" class="${run ? "blink" : ""}"/>
  <rect x="12" y="30" width="76" height="80" rx="6" fill="url(#dw)" stroke="rgba(255,255,255,.06)"/>
  <g clip-path="url(#dc)">
    <g stroke="rgba(148,163,184,.25)" stroke-width="1.5" fill="none"><path d="M16 64 h68"/><path d="M16 94 h68"/></g>
    ${[22, 34, 46, 58, 70].map((x) => `<rect x="${x}" y="70" width="7" height="22" rx="3" fill="${run ? "#1e4b5a" : "#26323b"}"/>`).join("")}
    ${[24, 40, 56, 72].map((x) => `<path d="M${x} 60 a7 7 0 0 1 12 0" fill="none" stroke="${run ? "#2a6577" : "#2b3741"}" stroke-width="3"/>`).join("")}
    ${drops}
    ${run ? `<rect x="12" y="${110 - 80 * (pct || 0) / 100}" width="76" height="${80 * (pct || 0) / 100}" fill="rgba(34,211,238,.08)"/>` : ""}
  </g>
  <rect x="30" y="26" width="40" height="3" rx="1.5" fill="rgba(255,255,255,.18)"/>
  ${fin ? '<circle cx="78" cy="102" r="10" fill="#16a34a"/><path d="M73 102 l3.5 3.5 l6.5 -7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>' : ""}
  </svg>`;
  }
  const CSS_APP = `
ha-card{background:${BG};border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit);padding:14px 16px;display:flex;gap:14px;align-items:center;position:relative;overflow:hidden;cursor:pointer;transition:border-color .3s}
ha-card.run{border-color:rgba(34,211,238,.38);box-shadow:0 0 0 1px rgba(34,211,238,.10),0 10px 30px rgba(8,145,178,.18)}
ha-card.run::before{content:'';position:absolute;inset:-40%;background:radial-gradient(circle at 20% 50%,rgba(34,211,238,.14),transparent 40%);animation:glow 4s ease-in-out infinite;pointer-events:none}
ha-card.fin{border-color:rgba(74,222,128,.40)}
ha-card.off .ill{opacity:.55;filter:saturate(.4)}
.ill{width:78px;flex:none;display:block;position:relative}
.i{flex:1;min-width:0;position:relative}
.nm{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nm b{color:#cbd5e1;font-weight:600;letter-spacing:.5px;text-transform:none;font-size:12px}
.big{font-size:30px;font-weight:700;line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums;letter-spacing:-.5px}
.big small{font-size:14px;font-weight:500;color:#9fb3bd;margin-left:4px;letter-spacing:0}
.run .big{color:#67e8f9}.fin .big{color:#4ade80}.off .big,.idle .big{color:#cbd5e1;font-size:22px}
.sub{font-size:12.5px;color:#9fb3bd;margin-top:1px}
.bar{height:6px;border-radius:99px;background:rgba(148,163,184,.14);overflow:hidden;margin-top:9px}
.bar div{height:100%;border-radius:99px;background:linear-gradient(90deg,#0891b2,#22d3ee);box-shadow:0 0 8px rgba(34,211,238,.6);position:relative}
.bar div::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:shim 2.2s linear infinite}
.ch{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ch span{font-size:11px;color:#b6c4cc;background:rgba(148,163,184,.10);border-radius:99px;padding:2px 8px;display:inline-flex;align-items:center;gap:4px}
.ch ha-icon{--mdc-icon-size:13px}
.ac{display:flex;flex-direction:column;gap:6px;position:relative}
.ac button{all:unset;cursor:pointer;width:34px;height:34px;border-radius:11px;background:rgba(148,163,184,.10);display:flex;align-items:center;justify-content:center;color:#cbd5e1}
.ac button:hover{background:rgba(148,163,184,.2)}.ac button.warn{background:rgba(248,113,113,.22);color:#fecaca}
.ac ha-icon{--mdc-icon-size:18px}
.spin{animation:spin 2.6s linear infinite}
.blink{animation:blink 1.4s ease-in-out infinite}
.drop{animation:drop 1.6s ease-in infinite}
.steam{animation:steam 3s ease-in-out infinite;opacity:0}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{50%{opacity:.25}}
@keyframes drop{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(62px);opacity:0}}
@keyframes steam{0%{opacity:0;transform:translateY(6px)}40%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}
@keyframes shim{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
@keyframes glow{50%{transform:translateX(30%)}}
`;
  class ApplianceCard extends HTMLElement {
    setConfig(c) {
      if (!c.prefix) throw new Error("prefix obbligatorio");
      this._c = Object.assign({ kind: "dryer", name: "Elettrodomestico" }, c);
    }
    getCardSize() {
      return 2;
    }
    getGridOptions() {
      return { columns: 12, rows: "auto" };
    }
    connectedCallback() {
      this._iv = setInterval(() => this._render(), 3e4);
    }
    disconnectedCallback() {
      clearInterval(this._iv);
    }
    set hass(h) {
      this._h = h;
      if (!this.shadowRoot) {
        this.attachShadow({ mode: "open" });
      }
      const p = this._c.prefix, key = ["_stato_di_funzionamento", "_avanzamento_del_programma", "_orario_di_fine_del_programma", "_porta"].map((s) => h.states[p + s] && h.states[p + s].state).join("|") + "|" + [this._c.program, this._c.selected, this._c.remote, this._c.power].map((e) => e && h.states[e] ? h.states[e].state : "").join("|");
      if (key !== this._k) {
        this._k = key;
        this._render();
      }
    }
    _s(id) {
      const s = this._h && this._h.states[id];
      return s ? s.state : void 0;
    }
    _render() {
      if (!this._h || !this.shadowRoot) return;
      const c = this._c, p = c.prefix;
      let op = this._s(p + "_stato_di_funzionamento") || "unavailable";
      const pct = parseFloat(this._s(p + "_avanzamento_del_programma")) || 0;
      const fin = this._s(p + "_orario_di_fine_del_programma");
      const door = this._s(p + "_porta");
      const prog = progName(this._s(c.program)) || progName(this._s(c.selected));
      const remote = c.remote ? this._s(c.remote) === "on" : false;
      const pw = c.power ? parseFloat(this._s(c.power)) : NaN;
      const RUN = ["run", "pause", "delayedstart", "actionrequired"];
      let cls, big, sub = "", bar = "";
      if (op === "run" || op === "pause" || op === "actionrequired") {
        cls = "run";
        let m = null;
        if (fin && !["unknown", "unavailable"].includes(fin)) m = Math.round((new Date(fin) - Date.now()) / 6e4);
        big = m != null ? m > 0 ? m >= 60 ? Math.floor(m / 60) + "<small>h</small> " + m % 60 + "<small>min</small>" : m + "<small>min</small>" : "Quasi finito" : pct + "<small>%</small>";
        sub = (op === "pause" ? "In pausa" : op === "actionrequired" ? "Richiede un intervento" : "In funzione") + (m != null && m > 0 ? " \xB7 fine alle " + hhmm(new Date(fin)) : "");
        bar = '<div class="bar"><div style="width:' + Math.max(3, pct) + '%"></div></div>';
      } else if (op === "delayedstart") {
        cls = "run";
        big = "Programmata";
        sub = fin && !["unknown", "unavailable"].includes(fin) ? "fine prevista alle " + hhmm(new Date(fin)) : "partenza ritardata";
      } else if (op === "finished") {
        cls = "fin";
        big = "Finito";
        sub = c.kind === "dryer" ? "Il bucato \xE8 asciutto: puoi svuotarla" : "Piatti puliti: puoi svuotarla";
      } else if (op === "ready") {
        cls = "idle";
        big = "Pronta";
        sub = prog ? "Programma impostato: " + prog : "Accesa, nessun programma in corso";
      } else if (op === "inactive") {
        cls = "off";
        big = "Spenta";
        sub = "In standby";
      } else {
        cls = "off";
        big = "Non raggiungibile";
        sub = "Controlla il Wi-Fi dell'elettrodomestico";
      }
      if (cls === "off" || cls === "idle") op = op === "ready" ? "ready" : "off";
      const chips = [];
      if (door) chips.push('<span><ha-icon icon="' + (door === "open" ? "mdi:door-open" : door === "locked" ? "mdi:lock" : "mdi:door-closed") + '"></ha-icon>' + (door === "open" ? "Porta aperta" : door === "locked" ? "Porta bloccata" : "Porta chiusa") + "</span>");
      if (remote) chips.push('<span><ha-icon icon="mdi:cellphone-wireless"></ha-icon>Avvio remoto</span>');
      if (!isNaN(pw) && pw > 5) chips.push('<span><ha-icon icon="mdi:flash"></ha-icon>' + Math.round(pw) + " W</span>");
      if (cls === "run" && pct) chips.unshift('<span><ha-icon icon="mdi:progress-clock"></ha-icon>' + Math.round(pct) + "%</span>");
      const ill = c.kind === "dishwasher" ? dishSVG(op, pct) : dryerSVG(op, pct);
      let ac = "";
      if (RUN.includes(this._s(p + "_stato_di_funzionamento"))) {
        if (c.pause) ac += '<button data-a="pause" title="Pausa"><ha-icon icon="mdi:pause"></ha-icon></button>';
        if (c.stop) ac += '<button data-a="stop" title="Interrompi"><ha-icon icon="mdi:stop"></ha-icon></button>';
      }
      this.shadowRoot.innerHTML = "<style>" + CSS_APP + '</style><ha-card class="' + cls + '">' + ill + '<div class="i"><div class="nm">' + esc(c.name) + (prog && cls !== "off" ? " \xB7 <b>" + esc(prog) + "</b>" : "") + '</div><div class="big">' + big + '</div><div class="sub">' + esc(sub) + "</div>" + bar + (chips.length ? '<div class="ch">' + chips.join("") + "</div>" : "") + "</div>" + (ac ? '<div class="ac">' + ac + "</div>" : "") + "</ha-card>";
      const card = this.shadowRoot.querySelector("ha-card");
      card.onclick = (ev) => {
        const b = ev.target.closest("button");
        if (b) {
          ev.stopPropagation();
          const ent = b.dataset.a === "stop" ? c.stop : c.pause;
          if (b.dataset.a === "stop" && !b.classList.contains("warn")) {
            b.classList.add("warn");
            b.title = "Tocca di nuovo per interrompere";
            setTimeout(() => b.classList.remove("warn"), 3e3);
            return;
          }
          this._h.callService("button", "press", { entity_id: ent });
          return;
        }
        const e = new Event("hass-more-info", { bubbles: true, composed: true });
        e.detail = { entityId: p + "_stato_di_funzionamento" };
        this.dispatchEvent(e);
      };
    }
  }
  const WASTE = {
    Umido: { c: "#c0844a", d: "#5c2d0f", b: "#6b3d1e", icon: "mdi:food-apple-outline", t: "Organico", sb: "Organico", rc: 1 },
    Plastica: { c: "#facc15", d: "#854d0e", b: "#eab308", icon: "mdi:bottle-soda-classic-outline", t: "Plastica e lattine", sb: "e lattine", rc: 1 },
    Carta: { c: "#5b8def", d: "#1e3a8a", b: "#274b9f", icon: "mdi:newspaper-variant-outline", t: "Carta e cartone", sb: "e cartone", rc: 1 },
    Secco: { c: "#9ca3af", d: "#374151", b: "#80868f", icon: "mdi:delete-variant", t: "Secco non riciclabile", sb: "non riciclabile", rc: 0 },
    Vetro: { c: "#22c55e", d: "#14532d", b: "#2f7d3f", icon: "mdi:glass-wine", t: "Vetro", sb: "bottiglie e vasetti", rc: 1 }
  };
  const WICO = {
    Plastica: '<path d="M15 6h6v4h-6z"/><path d="M14 10h8v5l4 5v22a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V20l4-5z"/><path d="M10 27h16M10 35h16"/><rect x="36" y="18" width="15" height="27" rx="3"/><path d="M36 23h15M36 40h15M41 14h5"/>',
    Carta: '<path d="M13 8h24v30"/><rect x="8" y="12" width="24" height="31" rx="2"/><path d="M13 19h14M13 24h14M13 29h14M13 34h9"/><path d="M39 27l9-5 9 5v12l-9 5-9-5z"/><path d="M39 27l9 5 9-5M48 32v12"/>',
    Vetro: '<path d="M7 12h18v5H7z"/><path d="M8 17h16v25a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z"/><path d="M8 27h16"/><path d="M39 5h6v8c0 3 5 5 5 10v20a2 2 0 0 1-2 2H36a2 2 0 0 1-2-2V23c0-5 5-7 5-10z"/><path d="M34 30h16"/>',
    Umido: '<path d="M21 16c-6-3-14 1-14 10 0 9 7 17 12 17 2 0 3-1 4-1s2 1 4 1c5 0 11-8 11-17 0-9-7-13-13-10"/><path d="M22 16c0-4 2-7 5-9"/><path d="M24 11c3-3 7-3 9-1-3 3-6 3-9 1z"/><path d="M41 28h17M45 24v8M49 23v10M53 24v8M41 28l-3-3v6zM58 28l4-4v8z"/>',
    Secco: '<path d="M21 18c-8 6-12 14-12 20a6 6 0 0 0 6 6h18a6 6 0 0 0 6-6c0-6-4-14-12-20"/><path d="M21 18l-3-6M27 18l3-6M21 18h6"/><path d="M48 26c-5 4-8 9-8 13a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4c0-4-3-9-8-13"/><path d="M48 26l-2-4M50 26l2-4M48 26h2"/>'
  };
  function wIcon(type, w) {
    return `<svg class="ic" viewBox="0 0 64 48" width="${w}" height="${Math.round(w * 0.75)}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WICO[type] || WICO.Secco}</svg>`;
  }
  function wBanner(type, small) {
    const w = WASTE[type] || { b: "#475569", sb: "", rc: 0 };
    return `<div class="bn${small ? " sm" : ""}" style="--b:${w.b};--n:${String(type).length}"><div class="l"><div class="rc"><ha-icon icon="${w.rc ? "mdi:recycle" : "mdi:delete-outline"}"></ha-icon>${w.rc ? "RICICLO" : "INDIFFERENZIATO"}</div>${wIcon(type, small ? 50 : 64)}</div><div class="r"><div class="nm">${esc(type)}</div><div class="sb">${esc(w.sb)}</div></div></div>`;
  }
  const CSS_W = `
ha-card{background:${BG};border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit);padding:14px 16px;position:relative;overflow:hidden;cursor:pointer}
.hd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:10px}
.k{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad}
.wh{font-size:12.5px;color:#cbd5e1}
.wh ha-icon{--mdc-icon-size:14px;vertical-align:-2px;margin-right:3px;color:#8fa3ad}
.bns{display:flex;flex-direction:column;gap:8px}
.bn{display:flex;align-items:center;gap:12px;border-radius:14px;padding:10px 16px 12px;background:var(--b);color:#fff;position:relative;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 8px 18px rgba(0,0,0,.35)}
.bn::after{content:'';position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,.10),transparent 45%);pointer-events:none}
.bn .l{display:flex;flex-direction:column;gap:4px;flex:none}
.bn .rc{display:flex;align-items:center;gap:3px;font-size:10px;font-weight:700;letter-spacing:1.2px}
.bn .rc ha-icon{--mdc-icon-size:13px}
.bn .r{flex:1;min-width:0;text-align:center;container-type:inline-size}
.bn .nm{font-family:'Roboto Condensed','Arial Narrow','Helvetica Neue',Arial,sans-serif;font-stretch:condensed;font-weight:900;font-size:min(46px,calc(100cqw / (var(--n) * .68)));line-height:.95;letter-spacing:0;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 0 rgba(0,0,0,.12)}
.bn .sb{font-weight:800;font-size:14px;letter-spacing:2.5px;text-transform:uppercase;margin-top:3px;opacity:.95}
.bn.sm .nm{font-size:min(32px,calc(100cqw / (var(--n) * .68)))}.bn.sm .sb{font-size:11px;letter-spacing:1.8px}
.bn.none{--b:#334155}.bn.none .nm{font-size:min(24px,calc(100cqw / 10))}
.wk{display:flex;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(148,163,184,.10)}
.d{flex:1;min-width:0;text-align:center;padding:6px 3px;border-radius:12px;background:rgba(148,163,184,.05);display:flex;flex-direction:column;gap:3px}
.d .g{font-size:10.5px;color:#8fa3ad;text-transform:uppercase;letter-spacing:1px}
.d .n{font-size:13px;font-weight:600}
.d .p{border-radius:7px;padding:3px 0 2px;display:flex;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}.d .p svg{width:30px;height:22px}.d .t{font-size:9.5px;color:#b6c4cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d .x{font-size:11px;color:#64748b;padding:3px 0}
.d.none{opacity:.45}
`;
  const GG = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  class WasteCard extends HTMLElement {
    setConfig(c) {
      this._c = Object.assign({ today: "sensor.rifiuti_oggi", tomorrow: "sensor.rifiuti_domani", week: "sensor.rifiuti_prossimi_giorni", days: 6 }, c || {});
    }
    getCardSize() {
      return 3;
    }
    getGridOptions() {
      return { columns: 12, rows: "auto" };
    }
    set hass(h) {
      this._h = h;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const k = [this._c.today, this._c.tomorrow, this._c.week].map((e) => h.states[e] ? h.states[e].state : "").join("|") + (/* @__PURE__ */ new Date()).getHours();
      if (k !== this._k) {
        this._k = k;
        this._render();
      }
    }
    _render() {
      const h = this._h, c = this._c;
      const st = (e) => h.states[e] ? h.states[e].state : "";
      const list = (s) => !s || s === "Nessuna raccolta" || s === "unknown" || s === "unavailable" ? [] : s.split(" + ").map((x) => x.trim());
      const hr = (/* @__PURE__ */ new Date()).getHours();
      const showToday = hr < 8 && list(st(c.today)).length;
      const main = showToday ? list(st(c.today)) : list(st(c.tomorrow));
      const label = showToday ? "Oggi" : "Domani";
      const week = st(c.week).split(" \xB7 ").filter(Boolean).map((x) => {
        const [d, t] = x.split(": ");
        return { d, t: list(t) };
      });
      let top;
      if (main.length) {
        top = '<div class="hd"><div class="k">Rifiuti \xB7 ' + label + '</div><div class="wh"><ha-icon icon="mdi:clock-outline"></ha-icon>' + (showToday ? "Passano stamattina" : "Esponi stasera dopo le 19") + '</div></div><div class="bns">' + main.map((t) => wBanner(t, main.length > 1)).join("") + "</div>";
      } else {
        const nx = week.find((x) => x.t.length);
        top = '<div class="hd"><div class="k">Rifiuti \xB7 Domani</div>' + (nx ? '<div class="wh">Prossima: <b>' + esc(nx.t.join(" + ")) + "</b> " + esc(nx.d) + "</div>" : "") + '</div><div class="bn none"><div class="l"><div class="rc"><ha-icon icon="mdi:calendar-check-outline"></ha-icon>CALENDARIO</div>' + wIcon("Secco", 50) + '</div><div class="r"><div class="nm">Nessuna raccolta</div></div></div>';
      }
      const days = [];
      for (let i = 1; i <= 7 && days.length < c.days; i++) {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() + i);
        if (!showToday && i === 1 && main.length) continue;
        const key = GG[d.getDay()] + " " + d.getDate();
        const f = week.find((x) => x.d === key);
        days.push({ g: GG[d.getDay()], n: d.getDate(), t: f ? f.t : [] });
      }
      const wk = '<div class="wk">' + days.map((x) => '<div class="d' + (x.t.length ? "" : " none") + '"><div class="g">' + x.g + '</div><div class="n">' + x.n + "</div>" + (x.t.length ? x.t.map((t) => '<div class="p" title="' + esc(t) + '" style="background:' + ((WASTE[t] || {}).b || "#475569") + '">' + wIcon(t, 30) + "</div>").join("") + '<div class="t">' + esc(x.t.join(" + ")) + "</div>" : '<div class="x">\u2014</div>') + "</div>").join("") + "</div>";
      this.shadowRoot.innerHTML = "<style>" + CSS_W + "</style><ha-card>" + top + wk + "</ha-card>";
      (this.shadowRoot.querySelector("ha-card") || {}).onclick = () => {
        const e = new Event("hass-more-info", { bubbles: true, composed: true });
        e.detail = { entityId: c.week };
        this.dispatchEvent(e);
      };
    }
  }
  const CSS_B = `
ha-card{background:${BG};border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit);padding:16px;position:relative;overflow:hidden}
ha-card.dis{border-color:rgba(251,191,36,.30)}ha-card.chg{border-color:rgba(52,211,153,.34);box-shadow:0 10px 30px rgba(16,185,129,.12)}
.hd{display:flex;align-items:flex-start;gap:12px}
.hd .t{flex:1;min-width:0}
.lb{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad}
.big{font-size:28px;font-weight:700;line-height:1.1;margin-top:2px;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.big small{font-size:14px;font-weight:500;color:#9fb3bd;margin-left:4px;letter-spacing:0}
.chg .big{color:#6ee7b7}.dis .big{color:#fcd34d}.hold .big{color:#fdba74}.idle .big{color:#cbd5e1}
.sub{font-size:12.5px;color:#9fb3bd;margin-top:2px}
.avg{flex:none;text-align:right}
.avg b{display:block;font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-1px}
.avg span{font-size:11px;color:#8fa3ad;letter-spacing:1px;text-transform:uppercase}
.cells{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.cell{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:10px 10px 10px 8px;display:flex;align-items:center;gap:10px;cursor:pointer}
.cell svg{width:58px;height:96px;flex:none;display:block}
.cell .ci{min-width:0}
.cell .n{font-size:11px;color:#8fa3ad;letter-spacing:1.5px;text-transform:uppercase}
.cell .p{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.5px;line-height:1.15}
.cell .p small{font-size:13px;color:#9fb3bd;font-weight:500;margin-left:2px}
.cell .w{font-size:12.5px;color:#b6c4cc;display:flex;align-items:center;gap:4px;margin-top:1px}
.cell .w ha-icon{--mdc-icon-size:15px}
.cell .tg{display:inline-block;margin-top:5px;font-size:10.5px;padding:2px 7px;border-radius:99px;background:rgba(251,146,60,.16);color:#fdba74}
.sec{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06)}
.row{display:flex;align-items:center;gap:10px;margin-top:10px}
.row:first-child{margin-top:0}
.row .k{flex:1;min-width:0}
.row .k b{display:block;font-size:13.5px;font-weight:600;color:#e2e8f0}
.row .k span{font-size:11.5px;color:#8fa3ad}
.seg{display:flex;background:rgba(148,163,184,.10);border-radius:12px;padding:3px;gap:2px;margin-top:8px}
.seg button{all:unset;cursor:pointer;flex:1;text-align:center;font-size:12.5px;padding:7px 4px;border-radius:9px;color:#b6c4cc;white-space:nowrap}
.seg button.on{background:linear-gradient(180deg,#1f9e78,#13795b);color:#fff;font-weight:600;box-shadow:0 2px 10px rgba(16,185,129,.35)}
.seg button.warn{background:rgba(248,113,113,.25);color:#fecaca}
.sw{all:unset;cursor:pointer;width:46px;height:26px;border-radius:99px;background:rgba(148,163,184,.25);position:relative;flex:none;transition:background .25s}
.sw::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#e2e8f0;transition:transform .25s;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.sw.on{background:#10b981}.sw.on::after{transform:translateX(20px)}
.sw.amber.on{background:#f59e0b}.sw.warn{background:rgba(248,113,113,.5)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}
.chips .cap{font-size:11px;color:#8fa3ad;margin-right:2px;min-width:58px}
.chips button{all:unset;cursor:pointer;font-size:12px;padding:4px 10px;border-radius:99px;background:rgba(148,163,184,.10);color:#cbd5e1;font-variant-numeric:tabular-nums}
.chips button.on{background:rgba(245,158,11,.22);color:#fde68a;box-shadow:inset 0 0 0 1px rgba(245,158,11,.5)}
.dim{opacity:.45;pointer-events:none}
.note{font-size:11.5px;color:#a8b8c0;margin-top:8px;display:flex;gap:6px;align-items:flex-start}.note ha-icon{--mdc-icon-size:14px;color:#fbbf24;flex:none;margin-top:1px}
.ft{margin-top:12px;font-size:11.5px;color:#7f939d;display:flex;flex-wrap:wrap;gap:4px 14px}
.ft ha-icon{--mdc-icon-size:13px;vertical-align:-2px;margin-right:3px}
.flow{animation:flow 1.6s linear infinite}
.flowd{animation:flowd 1.6s linear infinite}
@keyframes flow{from{transform:translateY(10px);opacity:0}30%{opacity:1}to{transform:translateY(-26px);opacity:0}}
@keyframes flowd{from{transform:translateY(-10px);opacity:0}30%{opacity:1}to{transform:translateY(26px);opacity:0}}
`;
  const fmtKW = (w) => (Math.abs(w) / 1e3).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtKWh = (v) => isNaN(v) ? "\u2013" : v.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function batSVG(soc, w, floor, res, held, uid) {
    const H = 76, y0 = 14, x = 8, wd = 42;
    const s = isNaN(soc) ? 0 : Math.max(0, Math.min(100, soc));
    const fh = H * s / 100, fy = y0 + H - fh;
    const col = s <= floor + 2 ? ["#ef4444", "#7f1d1d"] : s < 30 ? ["#f59e0b", "#78350f"] : ["#34d399", "#065f46"];
    const ln = (p, c, dash) => {
      const yy = y0 + H - H * p / 100;
      return `<line x1="${x - 3}" x2="${x + wd + 3}" y1="${yy}" y2="${yy}" stroke="${c}" stroke-width="1.4" ${dash ? 'stroke-dasharray="3 2.5"' : ""}/>`;
    };
    const chg = w > 30, dis = w < -30;
    const bub = chg || dis ? [16, 29, 42].map((cx, i) => `<circle cx="${cx}" cy="${chg ? fy + fh - 6 : fy + 8}" r="2.2" fill="rgba(255,255,255,.75)" class="${chg ? "flow" : "flowd"}" style="animation-delay:${(i * 0.5).toFixed(1)}s"/>`).join("") : "";
    return `<svg viewBox="0 0 58 96"><defs><linearGradient id="bf${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient>
  <clipPath id="bc${uid}"><rect x="${x}" y="${y0}" width="${wd}" height="${H}" rx="7"/></clipPath></defs>
  <rect x="21" y="6" width="16" height="8" rx="2.5" fill="#2a3640"/>
  <rect x="${x - 2}" y="${y0 - 2}" width="${wd + 4}" height="${H + 4}" rx="9" fill="#141c22" stroke="rgba(255,255,255,.14)" stroke-width="1.4"/>
  <g clip-path="url(#bc${uid})"><rect x="${x}" y="${fy}" width="${wd}" height="${fh}" fill="url(#bf${uid})" style="filter:drop-shadow(0 0 6px ${col[0]}66)"/>
  <rect x="${x}" y="${fy}" width="${wd}" height="2.5" fill="rgba(255,255,255,.35)"/>${bub}
  <rect x="${x + 4}" y="${y0}" width="6" height="${H}" fill="rgba(255,255,255,.07)"/></g>
  ${ln(floor, "rgba(248,113,113,.75)", true)}${res != null ? ln(res, "#fbbf24", false) : ""}
  ${held ? `<g transform="translate(29 ${y0 + H / 2})"><circle r="10" fill="rgba(15,23,42,.85)" stroke="#fdba74"/><path d="M-4 -1v-2.5a4 4 0 0 1 8 0V-1M-5.5 -1h11v7h-11z" fill="none" stroke="#fdba74" stroke-width="1.6" stroke-linejoin="round"/></g>` : ""}
  </svg>`;
  }
  class BatteryCard extends HTMLElement {
    setConfig(c) {
      this._c = Object.assign({
        name: "Batterie",
        batteries: [
          { name: "Batteria 1", soc: "sensor.batterie_stato_della_capacita", power: "sensor.batterie_potenza_di_carica_scarica", mode: "select.batterie_modalita_di_funzionamento_batteria", grid: "switch.batterie_carica_dalla_rete", dmax: "number.inverter_potenza_massima_di_scaricamento_batteria", floor: "number.batterie_termine_dello_scaricamento_batteria_soc", top: "number.inverter_termine_della_carica_batteria_soc", cday: "sensor.batterie_carica_giornaliera", dday: "sensor.batterie_scarica_giornaliera" },
          { name: "Batteria 2", soc: "sensor.batterie_stato_della_capacita_2", power: "sensor.batterie_potenza_di_carica_scarica_2", mode: "select.batterie_modalita_di_funzionamento_batteria_2", grid: "switch.batterie_carica_dalla_rete_2", dmax: "number.inverter_potenza_massima_di_scaricamento_batteria_2", floor: "number.batterie_termine_dello_scaricamento_batteria_soc_2", top: "number.inverter_termine_della_carica_batteria_soc_2", cday: "sensor.batterie_carica_giornaliera_2", dday: "sensor.batterie_scarica_giornaliera_2" }
        ],
        reserve: "input_boolean.batterie_riserva_per_la_sera",
        threshold: "input_number.batterie_soglia_riserva",
        release: "input_datetime.batterie_rilascio_riserva",
        thresholds: [25, 30, 35, 40, 50],
        releases: ["17:30", "18:00", "18:30", "19:00"]
      }, c);
    }
    getCardSize() {
      return 6;
    }
    getGridOptions() {
      return { columns: 12, rows: "auto" };
    }
    set hass(h) {
      this._h = h;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const c = this._c, ids = [c.reserve, c.threshold, c.release];
      c.batteries.forEach((b) => ids.push(b.soc, b.power, b.mode, b.grid, b.dmax, b.floor, b.top, b.cday, b.dday));
      const key = ids.map((e) => h.states[e] ? h.states[e].state : "").join("|");
      if (key !== this._k) {
        this._k = key;
        this._render();
      }
    }
    _s(id) {
      const s = this._h.states[id];
      return s ? s.state : void 0;
    }
    _n(id) {
      return parseFloat(this._s(id));
    }
    _render() {
      const c = this._c, B = c.batteries;
      const d = B.map((b, i) => ({ b, i, soc: this._n(b.soc), w: this._n(b.power) || 0, floor: isNaN(this._n(b.floor)) ? 15 : this._n(b.floor), top: this._n(b.top), held: this._n(b.dmax) === 0, mode: this._s(b.mode), grid: this._s(b.grid) === "on" }));
      const resOn = this._s(c.reserve) === "on", thr = this._n(c.threshold) || 35, rel = (this._s(c.release) || "18:00").slice(0, 5);
      const tot = d.reduce((a, x) => a + x.w, 0), socs = d.map((x) => x.soc).filter((v) => !isNaN(v));
      const avg = socs.length ? Math.round(socs.reduce((a, v) => a + v, 0) / socs.length) : NaN;
      const anyHeld = d.some((x) => x.held);
      let cls, big, sub;
      if (tot > 60) {
        cls = "chg";
        big = fmtKW(tot) + "<small>kW in carica</small>";
        sub = "Il fotovoltaico sta riempiendo le batterie";
      } else if (tot < -60) {
        cls = "dis";
        big = fmtKW(tot) + "<small>kW alla casa</small>";
        sub = "Le batterie stanno alimentando la casa";
      } else if (anyHeld) {
        cls = "hold";
        big = "Riserva trattenuta";
        sub = "La scarica riprende alle " + rel + " o se i consumi salgono";
      } else {
        cls = "idle";
        big = "A riposo";
        sub = avg <= Math.max(...d.map((x) => x.floor)) + 1 ? "Scariche: si ricaricano col sole" : avg >= 99 ? "Cariche al massimo" : "Nessuno scambio in questo momento";
      }
      if (anyHeld && cls !== "hold") sub += " \xB7 riserva trattenuta su una batteria";
      const cday = d.reduce((a, x) => a + (this._n(x.b.cday) || 0), 0), dday = d.reduce((a, x) => a + (this._n(x.b.dday) || 0), 0);
      const cells = d.map((x) => {
        const ws = x.w > 30 ? '<ha-icon icon="mdi:arrow-up-bold" style="color:#6ee7b7"></ha-icon>' + fmtKW(x.w) + " kW" : x.w < -30 ? '<ha-icon icon="mdi:arrow-down-bold" style="color:#fcd34d"></ha-icon>' + fmtKW(x.w) + " kW" : '<ha-icon icon="mdi:pause"></ha-icon>ferma';
        return '<div class="cell" data-e="' + x.b.soc + '">' + batSVG(x.soc, x.w, x.floor, resOn ? thr : null, x.held, x.i) + '<div class="ci"><div class="n">' + esc(x.b.name) + '</div><div class="p">' + (isNaN(x.soc) ? "\u2013" : Math.round(x.soc)) + '<small>%</small></div><div class="w">' + ws + "</div>" + (x.held ? '<span class="tg">riserva</span>' : "") + "</div></div>";
      }).join("");
      const M = [["maximise_self_consumption", "Autoconsumo"], ["time_of_use_luna2000", "Fasce orarie"], ["fully_fed_to_grid", "Tutto in rete"]];
      const mode = d[0].mode, same = d.every((x) => x.mode === mode);
      const seg = M.map(([v, l]) => '<button data-mode="' + v + '" class="' + (same && mode === v ? "on" : "") + '">' + l + "</button>").join("");
      const grid = d.some((x) => x.grid);
      const chips = c.thresholds.map((t) => '<button data-thr="' + t + '" class="' + (Math.round(thr) === t ? "on" : "") + '">' + t + "%</button>").join("");
      const rels = c.releases.map((t) => '<button data-rel="' + t + '" class="' + (rel === t ? "on" : "") + '">' + t + "</button>").join("");
      const modeTxt = !same ? "Le due batterie hanno modalit\xE0 diverse" : mode === "maximise_self_consumption" ? "Caricano col sole, scaricano quando la casa consuma" : mode === "time_of_use_luna2000" ? "Seguono il calendario a fasce impostato nell'inverter" : "Il fotovoltaico va in rete, le batterie restano ferme";
      this.shadowRoot.innerHTML = "<style>" + CSS_B + '</style><ha-card class="' + cls + '"><div class="hd"><div class="t"><div class="lb">' + esc(c.name) + '</div><div class="big">' + big + '</div><div class="sub">' + esc(sub) + '</div></div><div class="avg"><b>' + (isNaN(avg) ? "\u2013" : avg) + '<small style="font-size:15px;color:#9fb3bd">%</small></b><span>media</span></div></div><div class="cells">' + cells + "</div>" + (c.info ? "" : '<div class="sec"><div class="row"><div class="k"><b>Modalit\xE0</b><span>' + esc(modeTxt) + '</span></div></div><div class="seg">' + seg + '</div></div><div class="sec"><div class="row"><div class="k"><b>Riserva per la sera</b><span>' + (resOn ? "Tiene almeno il " + Math.round(thr) + "% fino alle " + rel + ", poi la rilascia per la cena" : "Le batterie scaricano liberamente fino al " + Math.round(d[0].floor) + "%") + '</span></div><button class="sw amber' + (resOn ? " on" : "") + '" data-t="res"></button></div><div class="' + (resOn ? "" : "dim") + '"><div class="note"><ha-icon icon="mdi:shield-flash-outline"></ha-icon>Se il prelievo supera 8 kW la riserva si libera subito, per non far staccare il contatore</div><div class="chips"><span class="cap">Tieni</span>' + chips + '</div><div class="chips"><span class="cap">Rilascia alle</span>' + rels + '</div></div></div><div class="sec"><div class="row"><div class="k"><b>Carica dalla rete</b><span>' + (grid ? "Attiva: le batterie possono caricarsi anche dalla rete" : "Spenta: con la tariffa monoraria non fa risparmiare") + '</span></div><button class="sw' + (grid ? " on" : "") + '" data-t="grid"></button></div></div>') + '<div class="ft"><span><ha-icon icon="mdi:calendar-today"></ha-icon>oggi caricati ' + fmtKWh(cday) + " kWh \xB7 scaricati " + fmtKWh(dday) + ' kWh</span><span><ha-icon icon="mdi:arrow-expand-vertical"></ha-icon>lavorano tra ' + Math.round(d[0].floor) + "% e " + (isNaN(d[0].top) ? "\u2013" : Math.round(d[0].top)) + "%</span></div></ha-card>";
      const R = this.shadowRoot, h = this._h;
      const confirm = (el, msg) => {
        if (el.classList.contains("warn")) return true;
        el.classList.add("warn");
        const o = el.title;
        el.title = msg;
        setTimeout(() => {
          el.classList.remove("warn");
          el.title = o;
        }, 3e3);
        return false;
      };
      R.querySelectorAll("[data-mode]").forEach((el) => el.onclick = () => {
        const v = el.dataset.mode;
        if (same && mode === v) return;
        if (v !== "maximise_self_consumption" && !confirm(el, "Tocca di nuovo per confermare")) return;
        B.forEach((b) => h.callService("select", "select_option", { entity_id: b.mode, option: v }));
      });
      R.querySelectorAll("[data-thr]").forEach((el) => el.onclick = () => h.callService("input_number", "set_value", { entity_id: c.threshold, value: +el.dataset.thr }));
      R.querySelectorAll("[data-rel]").forEach((el) => el.onclick = () => h.callService("input_datetime", "set_datetime", { entity_id: c.release, time: el.dataset.rel + ":00" }));
      (R.querySelector('[data-t="res"]') || {}).onclick = () => h.callService("input_boolean", resOn ? "turn_off" : "turn_on", { entity_id: c.reserve });
      (R.querySelector('[data-t="grid"]') || {}).onclick = (ev) => {
        if (!grid && !confirm(ev.currentTarget, "Tocca di nuovo per attivare")) return;
        B.forEach((b) => h.callService("switch", grid ? "turn_off" : "turn_on", { entity_id: b.grid }));
      };
      R.querySelectorAll(".cell").forEach((el) => el.onclick = () => {
        const e = new Event("hass-more-info", { bubbles: true, composed: true });
        e.detail = { entityId: el.dataset.e };
        this.dispatchEvent(e);
      });
    }
  }
  const CSS_P = `
ha-card{background:${BG};border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit);padding:16px;position:relative;overflow:hidden}
ha-card.act{border-color:rgba(248,113,113,.45);box-shadow:0 10px 30px rgba(220,38,38,.15)}
.lb{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad}
.ttl{font-size:21px;font-weight:700;margin-top:2px;letter-spacing:-.3px}
.sub{font-size:12.5px;color:#9fb3bd;margin-top:3px;line-height:1.4}
.meter{margin-top:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:10px 12px}
.meter .r{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;color:#9fb3bd}
.meter .r b{font-size:20px;color:#e6edf7;font-variant-numeric:tabular-nums}
.meter .bar{position:relative;height:8px;border-radius:99px;background:rgba(148,163,184,.14);margin-top:8px;overflow:visible}
.meter .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#10b981,#f59e0b 70%,#ef4444)}
.meter .bar s{position:absolute;top:-4px;bottom:-4px;width:2px;background:#f87171;border-radius:2px}
.list{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.it{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:9px 10px;transition:transform .25s,opacity .25s}
.it .n{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;background:linear-gradient(180deg,#f59e0b,#b45309);color:#fff;box-shadow:0 2px 8px rgba(245,158,11,.35)}
.it .ic{width:34px;height:34px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:rgba(148,163,184,.12);color:#e2e8f0}
.it .ic ha-icon{--mdc-icon-size:20px}
.it .tx{flex:1;min-width:0}
.it .tx b{display:block;font-size:14px;font-weight:600}
.it .tx span{display:block;font-size:11.5px;color:#8fa3ad;line-height:1.3;margin-top:1px}
.it .st{font-size:10.5px;padding:2px 7px;border-radius:99px;background:rgba(16,185,129,.16);color:#6ee7b7;margin-left:6px;font-weight:500;vertical-align:1px}
.it .st.off{background:rgba(148,163,184,.12);color:#8fa3ad}
.it .mv{display:flex;flex-direction:column;gap:2px}
.it button{all:unset;cursor:pointer;width:28px;height:20px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;background:rgba(148,163,184,.10)}
.it button:hover{background:rgba(148,163,184,.22)}.it button[disabled]{opacity:.2;pointer-events:none}
.it button ha-icon{--mdc-icon-size:18px}
.it .sw{all:unset;cursor:pointer;width:42px;height:24px;border-radius:99px;background:rgba(148,163,184,.25);position:relative;flex:none}
.it .sw::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#e2e8f0;transition:transform .25s}
.it .sw.on{background:#f59e0b}.it .sw.on::after{transform:translateX(18px)}
.it.never{opacity:.55}.it.never .n{background:rgba(148,163,184,.2);box-shadow:none;color:#94a3b8}
.sep{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7f939d;margin:6px 2px 0}
.ft{margin-top:12px;font-size:11.5px;color:#7f939d;display:flex;gap:6px;align-items:flex-start}
.ft ha-icon{--mdc-icon-size:14px;flex:none}
.flash{animation:fl .6s ease}
@keyframes fl{0%{background:rgba(245,158,11,.25)}100%{background:rgba(255,255,255,.035)}}
`;
  const LOADS = {
    auto: { n: "Ricarica Audi A3", d: "Prima scende al minimo (6 A), poi va in pausa", i: "mdi:ev-station", on: (h) => {
      var _a;
      return parseFloat((_a = h.states["sensor.auto_potenza_ricarica"]) == null ? void 0 : _a.state) > 0.1;
    }, p: (h) => {
      var _a;
      const v = parseFloat((_a = h.states["sensor.auto_potenza_ricarica"]) == null ? void 0 : _a.state);
      return v > 0.1 ? v.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " kW" : "";
    } },
    acqua: { n: "Acqua calda", d: "La pompa di calore abbassa la temperatura del boiler", i: "mdi:water-boiler", on: (h) => {
      var _a;
      return !["off", "unavailable"].includes((_a = h.states["water_heater.pompa_di_calore"]) == null ? void 0 : _a.state);
    } },
    split: { n: "Condizionatori Samsung", d: "Studio e cucina nuova", i: "mdi:air-conditioner", on: (h) => ["climate.studio_condizionatore", "climate.cucina_nuova_condizionatore_cucina_nuova"].some((e) => {
      var _a;
      return !["off", "unavailable", void 0].includes((_a = h.states[e]) == null ? void 0 : _a.state);
    }) },
    clima: { n: "Climatizzatori stanze", d: "Cucina, soggiorno, camere e palestra", i: "mdi:snowflake-thermometer", on: (h) => ["cucina", "soggiorno", "umberto", "lorenzo", "manu", "palestra"].some((e) => {
      var _a;
      return !["off", "unavailable", void 0].includes((_a = h.states["climate." + e]) == null ? void 0 : _a.state);
    }) },
    asciugatrice: { n: "Asciugatrice", d: "Spegne la presa: il programma andr\xE0 riavviato", i: "mdi:tumble-dryer", on: (h) => {
      var _a;
      return parseFloat((_a = h.states["sensor.asciugatrice_power"]) == null ? void 0 : _a.state) > 100;
    }, p: (h) => {
      var _a;
      const v = parseFloat((_a = h.states["sensor.asciugatrice_power"]) == null ? void 0 : _a.state);
      return v > 100 ? Math.round(v) + " W" : "";
    } },
    lavastoviglie: { n: "Lavastoviglie", d: "Il programma viene interrotto: andr\xE0 riavviato a mano", i: "mdi:dishwasher", on: (h) => {
      var _a;
      return ((_a = h.states["sensor.cucina_lavastoviglie_stato_di_funzionamento"]) == null ? void 0 : _a.state) === "run";
    } },
    forno: { n: "Forno e microonde", d: "La cottura viene fermata: andr\xE0 riavviata a mano", i: "mdi:stove", on: (h) => ["sensor.cucina_forno_machine_state", "sensor.cucina_nuova_forno_con_touch_screen_machine_state"].some((e) => {
      var _a;
      return ((_a = h.states[e]) == null ? void 0 : _a.state) === "running";
    }) },
    riscaldamento: { n: "Riscaldamento a pompa di calore", d: "Radiatori e pavimento si fermano per qualche minuto", i: "mdi:radiator", on: (h) => ["climate.pompa_di_calore_radiatori", "climate.pompa_di_calore_pavimento"].some((e) => {
      var _a;
      return !["off", "unavailable", void 0].includes((_a = h.states[e]) == null ? void 0 : _a.state);
    }) }
  };
  class PriorityCard extends HTMLElement {
    setConfig(c) {
      this._c = Object.assign({ order: "input_text.protezione_contatore_ordine_di_sospensione", last: "input_text.protezione_contatore_ultimo_intervento", active: "input_boolean.carichi_ridotti_protezione_contatore", threshold: "input_number.soglia_protezione_contatore", power: "sensor.alfa_potenza_importata" }, c);
    }
    getCardSize() {
      return 7;
    }
    getGridOptions() {
      return { columns: 12, rows: "auto" };
    }
    set hass(h) {
      this._h = h;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const c = this._c;
      const key = [c.order, c.last, c.active, c.threshold, c.power].map((e) => {
        var _a;
        return (_a = h.states[e]) == null ? void 0 : _a.state;
      }).join("|") + "|" + Object.keys(LOADS).map((k) => LOADS[k].on(h) + (LOADS[k].p ? LOADS[k].p(h) : "")).join("|");
      if (key !== this._k) {
        this._k = key;
        this._render();
      }
    }
    _list() {
      var _a;
      const raw = (((_a = this._h.states[this._c.order]) == null ? void 0 : _a.state) || "").split(",").map((s) => s.trim()).filter(Boolean);
      const seen = /* @__PURE__ */ new Set(), L = [];
      raw.forEach((s) => {
        const k = s.replace(/^!/, "");
        if (LOADS[k] && !seen.has(k)) {
          seen.add(k);
          L.push({ k, on: !s.startsWith("!") });
        }
      });
      Object.keys(LOADS).forEach((k) => {
        if (!seen.has(k)) L.push({ k, on: false });
      });
      return L;
    }
    _save(L) {
      const act = L.filter((x) => x.on), nev = L.filter((x) => !x.on);
      this._h.callService("input_text", "set_value", { entity_id: this._c.order, value: act.map((x) => x.k).concat(nev.map((x) => "!" + x.k)).join(",") });
    }
    _render() {
      var _a, _b, _c, _d;
      const h = this._h, c = this._c, L = this._list();
      const act = L.filter((x) => x.on), nev = L.filter((x) => !x.on);
      const pw = parseFloat((_a = h.states[c.power]) == null ? void 0 : _a.state) || 0, th = parseFloat((_b = h.states[c.threshold]) == null ? void 0 : _b.state) || 10.3, mx = Math.max(11.5, th + 1);
      const running = ((_c = h.states[c.active]) == null ? void 0 : _c.state) === "on";
      const last = (_d = h.states[c.last]) == null ? void 0 : _d.state;
      const row = (x, i, n) => {
        const L0 = LOADS[x.k], on = L0.on(h), p = L0.p ? L0.p(h) : "";
        return '<div class="it' + (x.on ? "" : " never") + '" data-k="' + x.k + '"><div class="n">' + (x.on ? i + 1 : "\u2013") + '</div><div class="ic"><ha-icon icon="' + L0.i + '"></ha-icon></div><div class="tx"><b>' + esc(L0.n) + '<span class="st' + (on ? "" : " off") + '" style="display:inline">' + (on ? p || "acceso" : "spento") + "</span></b><span>" + esc(x.on ? L0.d : "Non viene mai sospeso") + "</span></div>" + (x.on ? '<div class="mv"><button data-up' + (i === 0 ? " disabled" : "") + '><ha-icon icon="mdi:chevron-up"></ha-icon></button><button data-dn' + (i === n - 1 ? " disabled" : "") + '><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>' : "") + '<button class="sw' + (x.on ? " on" : "") + '" data-sw title="' + (x.on ? "Non sospendere mai" : "Pu\xF2 essere sospeso") + '"></button></div>';
      };
      this.shadowRoot.innerHTML = "<style>" + CSS_P + '</style><ha-card class="' + (running ? "act" : "") + '"><div class="lb">Protezione contatore</div><div class="ttl">' + (running ? "Carichi sospesi adesso" : "Cosa sospendere per primo") + '</div><div class="sub">Se i consumi superano ' + th.toLocaleString("it-IT") + ` kW, la casa spegne queste cose una alla volta, nell'ordine che scegli, e si ferma appena torna sicuro. Dopo 10 minuti tranquilli si riaccende tutto da solo, tranne lavastoviglie e forno.</div><div class="meter"><div class="r"><span>Prelievo dalla rete adesso</span><b>` + pw.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + ' <small style="font-size:12px;color:#9fb3bd">kW</small></b></div><div class="bar"><i style="width:' + Math.min(100, pw / mx * 100) + '%"></i><s style="left:' + th / mx * 100 + '%"></s></div></div><div class="list">' + act.map((x, i) => row(x, i, act.length)).join("") + (nev.length ? '<div class="sep">Mai sospendere</div>' + nev.map((x, i) => row(x, i, 0)).join("") : "") + '</div><div class="ft"><ha-icon icon="mdi:history"></ha-icon><span>' + (last && !["unknown", "unavailable", ""].includes(last) ? "Ultimo intervento: " + esc(last) : "Nessun intervento finora") + "</span></div></ha-card>";
      const R = this.shadowRoot;
      R.querySelectorAll(".it").forEach((el) => {
        const k = el.dataset.k;
        const mv = (d) => {
          const A = L.filter((x) => x.on), i = A.findIndex((x) => x.k === k), j = i + d;
          if (j < 0 || j >= A.length) return;
          [A[i], A[j]] = [A[j], A[i]];
          this._save(A.concat(L.filter((x) => !x.on)));
        };
        const u = el.querySelector("[data-up]"), dn = el.querySelector("[data-dn]");
        if (u) u.onclick = () => mv(-1);
        if (dn) dn.onclick = () => mv(1);
        el.querySelector("[data-sw]").onclick = () => {
          const x = L.find((y) => y.k === k);
          x.on = !x.on;
          const A = L.filter((y) => y.on && y.k !== k);
          if (x.on) A.push(x);
          this._save(A.concat(L.filter((y) => !y.on)));
        };
      });
    }
  }
  if (!customElements.get("appliance-card")) customElements.define("appliance-card", ApplianceCard);
  if (!customElements.get("waste-card")) customElements.define("waste-card", WasteCard);
  if (!customElements.get("battery-card")) customElements.define("battery-card", BatteryCard);
  if (!customElements.get("priority-card")) customElements.define("priority-card", PriorityCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "appliance-card", name: "Elettrodomestico", description: "Stato del ciclo con illustrazione animata (Home Connect)" });
  window.customCards.push({ type: "waste-card", name: "Raccolta rifiuti", description: "Bidoni di domani e dei prossimi giorni" });
})();

})();
