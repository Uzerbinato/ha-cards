/* home-cards3.js - card su misura, terza serie (stile Casa)
   custom:receiver-card   amplificatore / sintoamplificatore (Yamaha MusicCast) con copertina,
                          trasporto, volume trascinabile, sorgenti, diffusori A/B, sleep timer */
(() => {
const BG = 'radial-gradient(120% 90% at 50% 0%,#18242b 0%,#0d1317 62%,#0a0f12 100%)';
const BASE = `ha-card{background:${BG};border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit);padding:14px 16px;position:relative;overflow:hidden}
.hd{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8fa3ad;margin-bottom:10px;position:relative}
.hd ha-icon{--mdc-icon-size:16px;color:#8fa3ad}`;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const moreInfo = (el, id) => { const e = new Event('hass-more-info', { bubbles: true, composed: true }); e.detail = { entityId: id }; el.dispatchEvent(e); };
const SRC_ICON = {
  'Spotify': 'mdi:spotify', 'AirPlay': 'mdi:cast-audio-variant', 'TV': 'mdi:television', 'Net Radio': 'mdi:radio', 'Tuner': 'mdi:radio-tower',
  'Bluetooth': 'mdi:bluetooth', 'CD': 'mdi:disc', 'Phono': 'mdi:record-player', 'Server': 'mdi:server-network', 'MC Link': 'mdi:link-variant',
  'Amazon Music': 'mdi:music-circle', 'TIDAL': 'mdi:waves', 'Qobuz': 'mdi:music-note-eighth', 'Deezer': 'mdi:equalizer', 'Napster': 'mdi:headphones',
  'Optical1': 'mdi:connection', 'Optical2': 'mdi:connection', 'Coaxial': 'mdi:audio-input-rca', 'Line1': 'mdi:audio-input-stereo-minijack',
  'Line2': 'mdi:audio-input-stereo-minijack', 'USB DAC': 'mdi:usb'
};
const SRC_COL = { 'Spotify': '#1ed760', 'AirPlay': '#e6edf7', 'TV': '#38bdf8', 'Net Radio': '#fb923c', 'Tuner': '#fbbf24', 'Bluetooth': '#60a5fa', 'CD': '#a78bfa', 'Phono': '#f472b6' };
const SRC_NAME = { 'Net Radio': 'Radio web', 'Tuner': 'Radio FM', 'Phono': 'Giradischi', 'Optical1': 'Ottico 1', 'Optical2': 'Ottico 2', 'Coaxial': 'Coassiale', 'Line1': 'Linea 1', 'Line2': 'Linea 2', 'Server': 'Server', 'MC Link': 'MusicCast' };
const SLEEP = { off: 'Off', '30_min': '30′', '60_min': '60′', '90_min': '90′', '120_min': '120′' };
const fmt = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// disegno del frontale (ispirato all'R-N2000A: due VU meter retroilluminati, manopole, display OLED in basso)

// due vu-meter analogici retroilluminati, lancette animate durante la riproduzione
function vuSvg({ play, vol, brand }) {
  const one = (x, id, delay) => {
    const cx = x + 80, cy = 112, R = 78; let sc = '';
    for (let i = 0; i <= 10; i++) { const a = (-50 + i * 10) * Math.PI / 180, r1 = R - 8, r2 = R - (i % 2 ? 14 : 18), red = i >= 8;
      sc += `<line x1="${(cx + r1 * Math.sin(a)).toFixed(1)}" y1="${(cy - r1 * Math.cos(a)).toFixed(1)}" x2="${(cx + r2 * Math.sin(a)).toFixed(1)}" y2="${(cy - r2 * Math.cos(a)).toFixed(1)}" stroke="${red ? '#c2410c' : '#3b2a14'}" stroke-width="${i % 2 ? 1.2 : 2}"/>`; }
    const lab = ['-20', '-10', '-5', '0', '+3'].map((t, i) => { const a = (-45 + i * 22.5) * Math.PI / 180; return `<text x="${(cx + (R - 26) * Math.sin(a)).toFixed(1)}" y="${(cy - (R - 26) * Math.cos(a) + 3).toFixed(1)}" font-size="8" text-anchor="middle" fill="${i >= 3 ? '#c2410c' : '#3b2a14'}" font-family="Helvetica,Arial">${t}</text>`; }).join('');
    const base = -45 + Math.min(1, vol || 0) * 40;
    return `<g><rect x="${x}" y="20" width="160" height="104" rx="8" fill="url(#vuG)" stroke="#5b4526" stroke-width="2"/>
      <path d="M${cx - R + 8} ${cy - 40} A ${R} ${R} 0 0 1 ${cx + R - 8} ${cy - 40}" fill="none" stroke="#3b2a14" stroke-width="1"/>
      <path d="M${cx + 0.53 * (R - 8)} ${cy - 0.85 * (R - 8)} A ${R - 8} ${R - 8} 0 0 1 ${cx + 0.77 * (R - 8)} ${cy - 0.64 * (R - 8)}" stroke="#c2410c" stroke-width="5" fill="none" opacity=".75"/>
      ${sc}${lab}<text x="${cx}" y="${cy - 22}" font-size="11" text-anchor="middle" fill="#3b2a14" font-weight="700" font-family="Helvetica,Arial" letter-spacing="2">VU</text>
      <g class="${play ? 'nd' : ''}" style="transform-origin:${cx}px ${cy}px;transform:rotate(${base}deg);animation-delay:${delay}s;--b:${base}deg"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R + 4}" stroke="#111" stroke-width="1.8" stroke-linecap="round"/></g>
      <rect x="${x}" y="100" width="160" height="24" rx="0" fill="#2a1d0e" opacity=".9"/><circle cx="${cx}" cy="${cy}" r="7" fill="#1a1209"/>
      <text x="${cx}" y="118" font-size="8" text-anchor="middle" fill="#d6b56b" font-family="Helvetica,Arial" letter-spacing="1.5">${id}</text></g>`;
  };
  return `<svg viewBox="0 0 360 140" style="width:100%;display:block"><defs>
    <radialGradient id="vuG" cx="50%" cy="85%" r="90%"><stop offset="0" stop-color="${play ? '#ffe2a3' : '#d9c79c'}"/><stop offset=".6" stop-color="${play ? '#f5c46a' : '#b9a57a'}"/><stop offset="1" stop-color="${play ? '#c98a2c' : '#7e6d4c'}"/></radialGradient>
    <linearGradient id="vuP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26272b"/><stop offset="1" stop-color="#111214"/></linearGradient></defs>
    <rect x="0" y="0" width="360" height="140" rx="12" fill="url(#vuP)" stroke="rgba(255,255,255,.08)"/>
    <text x="16" y="14" font-size="8" letter-spacing="2" fill="#8b8f96" font-family="Helvetica,Arial" font-weight="700">${brand || ''}</text>
    ${one(16, 'LEFT', 0)}${one(184, 'RIGHT', -0.37)}
    <style>.nd{animation:vu .9s cubic-bezier(.3,1.6,.4,1) infinite alternate}@keyframes vu{0%{transform:rotate(var(--b))}18%{transform:rotate(calc(var(--b) + 22deg))}33%{transform:rotate(calc(var(--b) + 6deg))}52%{transform:rotate(calc(var(--b) + 34deg))}70%{transform:rotate(calc(var(--b) + 12deg))}86%{transform:rotate(calc(var(--b) + 28deg))}100%{transform:rotate(calc(var(--b) + 9deg))}}</style></svg>`;
}
function ampSvg({ on, play, vol, srcIdx, srcN, text, finish, brand }) {
  const silver = finish !== 'black';
  const face = silver ? ['#e9edf0', '#c3c9ce', '#9aa2a8'] : ['#3a3f44', '#24282c', '#16191c'];
  const ink = silver ? '#3b4248' : '#c9d0d6';
  const lit = on ? '#ffd79a' : (silver ? '#7c858c' : '#2a2f33');
  const glow = on ? 'url(#mglow)' : 'none';
  const knob = (cx, cy, r, ang, big) => `<g transform="translate(${cx} ${cy})">
    <circle r="${r + 2.5}" fill="${silver ? '#8d959b' : '#0d0f11'}" opacity=".55"/>
    <circle r="${r}" fill="url(#knob)"/>
    <circle r="${r * 0.82}" fill="none" stroke="${silver ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.12)'}" stroke-width=".6"/>
    <g transform="rotate(${ang})"><line x1="0" y1="${-r * 0.78}" x2="0" y2="${-r * (big ? 0.5 : 0.45)}" stroke="${ink}" stroke-width="${big ? 2 : 1.4}" stroke-linecap="round"/></g></g>`;
  const meter = (x, delay, dur) => `<g transform="translate(${x} 18)">
    <rect width="78" height="46" rx="5" fill="#0b0d0f"/>
    <rect x="3" y="3" width="72" height="40" rx="3" fill="${lit}" filter="${glow}" opacity="${on ? 1 : .9}"/>
    <path d="M12 34 A30 30 0 0 1 66 34" fill="none" stroke="#3a2a14" stroke-width=".8" opacity="${on ? .9 : .5}"/>
    <path d="M52 15.5 A30 30 0 0 1 66 34" fill="none" stroke="#c0392b" stroke-width="2.2" opacity="${on ? .9 : .4}"/>
    ${Array.from({ length: 11 }, (_, i) => { const a = (-58 + i * 11.6) * Math.PI / 180; const x1 = 39 + Math.sin(a) * 27, y1 = 40 - Math.cos(a) * 27, x2 = 39 + Math.sin(a) * (i % 2 ? 24.5 : 23), y2 = 40 - Math.cos(a) * (i % 2 ? 24.5 : 23); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#3a2a14" stroke-width=".7" opacity="${on ? .9 : .5}"/>`; }).join('')}
    <text x="39" y="31" font-size="5" text-anchor="middle" fill="#3a2a14" opacity="${on ? .85 : .45}" font-family="Georgia,serif" font-style="italic">VU</text>
    <g transform="translate(39 41)"><g class="ndl" style="animation-delay:${delay}s;animation-duration:${dur}s"><line x1="0" y1="0" x2="0" y2="-31" stroke="#1b1b1b" stroke-width=".9"/></g><circle r="2.4" fill="#1b1b1b"/></g>
    <rect x="3" y="3" width="72" height="14" rx="3" fill="url(#gloss)"/></g>`;
  return `<svg viewBox="0 0 340 112" class="amp-svg" role="img" aria-label="Amplificatore">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${face[0]}"/><stop offset=".55" stop-color="${face[1]}"/><stop offset="1" stop-color="${face[2]}"/></linearGradient>
    <linearGradient id="brush" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${silver ? .22 : .06}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="knob" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${silver ? '#ffffff' : '#5b6167'}"/><stop offset=".55" stop-color="${silver ? '#cdd3d8' : '#2c3135'}"/><stop offset="1" stop-color="${silver ? '#8e979d' : '#121417'}"/></radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="mglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="tglow"><feGaussianBlur stdDeviation=".9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  ${on ? '<ellipse cx="170" cy="40" rx="120" ry="40" fill="#ffcf8a" opacity=".10" filter="url(#mglow)"/>' : ''}
  <rect x="2" y="2" width="336" height="102" rx="6" fill="url(#face)" stroke="${silver ? '#7f878d' : '#000'}" stroke-width="1"/>
  <rect x="2" y="2" width="336" height="102" rx="6" fill="url(#brush)"/>
  <rect x="8" y="104" width="14" height="5" rx="1.5" fill="${silver ? '#b8a27a' : '#6b5b3e'}"/><rect x="318" y="104" width="14" height="5" rx="1.5" fill="${silver ? '#b8a27a' : '#6b5b3e'}"/>
  <text x="14" y="15" font-size="6.5" letter-spacing="1.6" fill="${ink}" font-family="Helvetica,Arial,sans-serif" font-weight="700">${brand || 'YAMAHA'}</text>
  <text x="326" y="15" font-size="4.6" letter-spacing=".6" fill="${ink}" text-anchor="end" font-family="Helvetica,Arial,sans-serif" opacity=".8">NATURAL SOUND NETWORK RECEIVER</text>
  <g transform="translate(22 50)"><rect x="-5" y="-9" width="10" height="18" rx="2" fill="#16191c"/><rect x="-3.2" y="${on ? -7 : -1}" width="6.4" height="8" rx="1.2" fill="${silver ? '#dfe4e8' : '#6c737a'}"/><circle cy="14" r="1.6" fill="${on ? '#ff6b3d' : '#5a2a1c'}" ${on ? 'filter="url(#tglow)"' : ''}/></g>
  ${knob(56, 50, 17, -120 + (srcN > 1 ? srcIdx / (srcN - 1) : 0) * 240, true)}
  <text x="56" y="77" font-size="4.2" text-anchor="middle" fill="${ink}" font-family="Helvetica,Arial,sans-serif" opacity=".8">INPUT</text>
  ${meter(91, 0, play ? 0.9 : 0)}${meter(171, 0.27, play ? 1.13 : 0)}
  ${knob(284, 50, 22, -135 + vol * 2.7, true)}
  <text x="284" y="82" font-size="4.2" text-anchor="middle" fill="${ink}" font-family="Helvetica,Arial,sans-serif" opacity=".8">VOLUME</text>
  ${[110, 130, 150, 190, 210, 230].map((x, i) => knob(x, 75, 4.6, [-20, 15, 0, 0, -10, 25][i], false)).join('')}
  <rect x="86" y="86" width="168" height="12" rx="2" fill="#050607"/>
  <text x="170" y="94.5" font-size="6" text-anchor="middle" fill="#9fe7ff" font-family="Menlo,Consolas,monospace" letter-spacing=".5" opacity="${on ? 1 : 0}" filter="url(#tglow)">${esc(text)}</text>
  </svg>`;
}

class ReceiverCard extends HTMLElement {
  static getStubConfig() { return { entity: 'media_player.yamaha' }; }
  setConfig(c) {
    if (!c || !c.entity) throw new Error('entity richiesta');
    this._c = Object.assign({ sources: ['Spotify', 'AirPlay', 'TV', 'Net Radio', 'Tuner', 'Bluetooth', 'CD', 'Phono'] }, c);
  }
  getGridOptions() { return { columns: 12, rows: 'auto' }; }
  getCardSize() { return 6; }
  connectedCallback() { this._tick = setInterval(() => this._progress(), 1000); }
  disconnectedCallback() { clearInterval(this._tick); }
  set hass(h) {
    this._h = h; if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (this._drag) return;
    const c = this._c, ids = [c.entity, c.music_assistant, c.speaker_a, c.speaker_b, c.sleep].filter(Boolean);
    const k = ids.map((i) => { const s = h.states[i]; if (!s) return ''; const a = s.attributes; return [s.state, a.media_title, a.media_artist, a.entity_picture, a.volume_level, a.is_volume_muted, a.source, a.sound_mode, a.media_position_updated_at].join('~'); }).join('|');
    if (k !== this._k) { this._k = k; this._render(); }
  }
  // copertina cercata su iTunes quando la sorgente (es. Bluetooth) non la fornisce
  _art(a) {
    const t = (a.media_title || '').replace(/\s*[\(\[].*?(remaster|live|version|edit|mix|deluxe).*?[\)\]]/ig, '').trim(), ar = (a.media_artist || '').trim();
    if (!t) return ''; const k = ar + '|' + t; this._artC = this._artC || {};
    if (k in this._artC) return this._artC[k];
    this._artC[k] = '';
    fetch('https://itunes.apple.com/search?entity=song&limit=1&country=it&term=' + encodeURIComponent(ar + ' ' + t))
      .then((r) => r.json()).then((j) => { const u = j.results && j.results[0] && j.results[0].artworkUrl100; if (u) { this._artC[k] = u.replace('100x100bb', '600x600bb'); this._k = null; this._render(); } }).catch(() => {});
    return '';
  }
  // sceglie da quale lettore prendere copertina e titolo (Music Assistant se sta suonando lui)
  _media() {
    const h = this._h, c = this._c, y = h.states[c.entity], m = c.music_assistant && h.states[c.music_assistant];
    if (m && ['playing', 'paused'].includes(m.state) && m.attributes.media_title && !(y && y.attributes.media_title && y.state === 'playing')) return m;
    return y;
  }
  _progress() {
    const r = this.shadowRoot && this.shadowRoot.querySelector('.pg'); if (!r || !this._h) return;
    const s = this._media(); if (!s) return; const a = s.attributes;
    if (!a.media_duration) return;
    let p = a.media_position || 0;
    if (s.state === 'playing' && a.media_position_updated_at) p += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000;
    p = Math.min(p, a.media_duration);
    r.querySelector('.pf').style.width = (p / a.media_duration * 100).toFixed(2) + '%';
    r.querySelector('.p0').textContent = fmt(p);
  }
  _call(dom, svc, data) { return this._h.callService(dom, svc, data); }
  _render() {
    const h = this._h, c = this._c, y = h.states[c.entity]; if (!y) return;
    const ya = y.attributes, on = !['off', 'unavailable', 'standby'].includes(y.state), unav = y.state === 'unavailable';
    const ms = this._media(), ma = ms.attributes, play = ms.state === 'playing';
    const pic = on ? (ma.entity_picture || '') : '';
    const src = ya.source || '';
    const srcCol = SRC_COL[src] || '#94a3b8';
    const title = on ? (ma.media_title || SRC_NAME[src] || src || 'Acceso') : (unav ? 'Non raggiungibile' : 'Spento');
    const artist = on ? [ma.media_artist, ma.media_album_name].filter(Boolean).join(' · ') : (unav ? '' : 'Tocca una sorgente per accendere');
    const vol = ya.volume_level != null ? Math.round(ya.volume_level * 100) : 0, muted = !!ya.is_volume_muted;
    const list = (ya.source_list || []);
    const srcs = (c.sources || []).filter((s) => !list.length || list.includes(s));
    const modes = ya.sound_mode_list || [];
    const spk = [c.speaker_a && ['A', c.speaker_a], c.speaker_b && ['B', c.speaker_b]].filter(Boolean);
    const sl = c.sleep && h.states[c.sleep];
    const dur = ma.media_duration;
    const bars = Array.from({ length: 14 }, (_, i) => `<i style="animation-delay:${(i * 0.13 % 1).toFixed(2)}s;animation-duration:${(0.7 + (i * 37 % 7) / 10).toFixed(2)}s"></i>`).join('');

    this.shadowRoot.innerHTML = `<style>${BASE}
.bgimg{position:absolute;inset:-20%;background:${pic ? `url("${pic}") center/cover` : `radial-gradient(60% 50% at 30% 20%,${on ? srcCol + '33' : 'transparent'},transparent)`};filter:blur(36px) saturate(1.5);opacity:${pic ? .42 : 1};pointer-events:none}
.pw{all:unset;cursor:pointer;margin-left:auto;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(148,163,184,.12);transition:.2s}
.pw ha-icon{--mdc-icon-size:18px;color:#cbd5e1}.pw.on{background:rgba(74,222,128,.18);box-shadow:0 0 14px rgba(74,222,128,.35)}.pw.on ha-icon{color:#4ade80}
.hero{display:flex;gap:14px;align-items:center;position:relative}
.ampw{position:relative;margin:2px 0 14px;cursor:pointer;filter:drop-shadow(0 12px 18px rgba(0,0,0,.55))}
.amp-svg{width:100%;height:auto;display:block}
.ndl{transform:rotate(-56deg);${play ? 'animation:vu 1s ease-in-out infinite alternate' : ''}}
@keyframes vu{0%{transform:rotate(-34deg)}18%{transform:rotate(-8deg)}33%{transform:rotate(-26deg)}52%{transform:rotate(6deg)}70%{transform:rotate(-14deg)}86%{transform:rotate(14deg)}100%{transform:rotate(-20deg)}}
.cv{width:72px;height:72px;border-radius:16px;flex:none;background:${pic ? `url("${pic}") center/cover` : 'linear-gradient(145deg,#1f2b33,#121a1f)'};box-shadow:0 10px 26px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.cv ha-icon{--mdc-icon-size:40px;color:${on ? srcCol : '#475569'};filter:${on ? `drop-shadow(0 0 10px ${srcCol}88)` : 'none'}}
.amp{position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#0b1013,#1a242a)}
.amp::after{content:'';position:absolute;left:8px;top:1.5px;width:2px;height:2px;border-radius:50%;background:${on ? '#4ade80' : '#334155'};box-shadow:${on ? '0 0 4px #4ade80' : 'none'}}
.i{flex:1;min-width:0}
.badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 8px;border-radius:999px;background:${on ? srcCol + '22' : 'rgba(148,163,184,.10)'};color:${on ? srcCol : '#8fa3ad'};border:1px solid ${on ? srcCol + '44' : 'transparent'}}
.badge ha-icon{--mdc-icon-size:13px}
.t{font-size:18px;font-weight:700;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a{font-size:12.5px;color:#b6c4cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.eq{display:flex;gap:3px;align-items:flex-end;height:16px;margin-top:8px}
.eq i{flex:1;max-width:5px;border-radius:2px;background:linear-gradient(#4ade80,#22d3ee);height:3px;opacity:.85;${play ? 'animation:eq ease-in-out infinite' : ''}}
@keyframes eq{0%,100%{height:3px}50%{height:16px}}
.pg{margin-top:12px;position:relative}.pb{height:4px;border-radius:2px;background:rgba(148,163,184,.18);overflow:hidden}.pf{height:100%;background:#e6edf7;border-radius:2px}
.pt{display:flex;justify-content:space-between;font-size:10.5px;color:#8fa3ad;margin-top:4px;font-variant-numeric:tabular-nums}
.tr{display:flex;justify-content:center;align-items:center;gap:18px;margin:12px 0 4px;position:relative}
.tr button{all:unset;cursor:pointer;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:.15s}
.tr button:active{transform:scale(.92)}
.tr ha-icon{--mdc-icon-size:24px;color:#e6edf7}
.tr .pp{width:54px;height:54px;background:#e6edf7;box-shadow:0 6px 20px rgba(230,237,247,.25)}.tr .pp ha-icon{color:#0d1317;--mdc-icon-size:28px}
.vl{display:flex;align-items:center;gap:10px;margin-top:10px;position:relative}
.vl button{all:unset;cursor:pointer;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(148,163,184,.10)}
.vl button ha-icon{--mdc-icon-size:18px;color:${muted ? '#f87171' : '#cbd5e1'}}
.sl{flex:1;height:34px;border-radius:12px;background:rgba(148,163,184,.12);position:relative;overflow:hidden;cursor:pointer;touch-action:none}
.sf{position:absolute;inset:0 auto 0 0;width:${vol}%;background:linear-gradient(90deg,rgba(56,189,248,.35),rgba(74,222,128,.55));${muted ? 'filter:grayscale(1);opacity:.5;' : ''}}
.sf::after{content:'';position:absolute;right:0;top:7px;bottom:7px;width:3px;border-radius:2px;background:#e6edf7}
.sv{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:12px;color:#e6edf7;pointer-events:none}
.sv b{font-size:14px;font-variant-numeric:tabular-nums}
.lb{font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:#8fa3ad;margin:14px 0 7px;position:relative}
.src{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;position:relative}
.src button{all:unset;cursor:pointer;border-radius:12px;padding:8px 4px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.08);display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:#b6c4cc;transition:.15s;text-align:center}
.src button ha-icon{--mdc-icon-size:20px;color:#8fa3ad}
.src button.act{background:var(--c-bg);border-color:var(--c-bd);color:#e6edf7;box-shadow:0 0 16px var(--c-bg)}
.src button.act ha-icon{color:var(--c);filter:drop-shadow(0 0 6px var(--c))}
.row{display:flex;gap:10px;position:relative;flex-wrap:wrap;margin-top:14px}
.grp{display:flex;gap:4px;background:rgba(148,163,184,.08);border-radius:12px;padding:3px;align-items:center}
.grp span{font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#8fa3ad;padding:0 6px 0 8px}
.grp button{all:unset;cursor:pointer;padding:6px 10px;border-radius:9px;font-size:12px;color:#b6c4cc}
.grp button.act{background:rgba(56,189,248,.20);color:#e6edf7}
.grp button.spk.act{background:rgba(74,222,128,.20)}
.modes{display:flex;gap:6px;overflow-x:auto;position:relative;scrollbar-width:none}.modes::-webkit-scrollbar{display:none}
.modes button{all:unset;cursor:pointer;white-space:nowrap;padding:6px 11px;border-radius:999px;font-size:12px;background:rgba(148,163,184,.08);color:#b6c4cc}
.modes button.act{background:rgba(167,139,250,.22);color:#e6edf7}
.off .tr,.off .vl,.off .pg,.off .eq{display:none}
</style>
<ha-card class="${on ? '' : 'off'}"><div class="bgimg"></div>
<div class="hd"><ha-icon icon="mdi:speaker"></ha-icon>${esc(c.name || ya.friendly_name)}<button class="pw ${on ? 'on' : ''}" data-a="pw" title="Accendi / spegni"><ha-icon icon="mdi:power"></ha-icon></button></div>
<div class="ampw" data-a="info">${c.cover ? ((ma.entity_picture || this._art(ma)) ? `<div style="position:relative;height:${c.cover_height || 170}px;border-radius:14px;overflow:hidden;box-shadow:0 12px 28px rgba(0,0,0,.5)"><div style="position:absolute;inset:-20px;background:center/cover url('${ma.entity_picture || this._art(ma)}');filter:blur(22px) brightness(.55) saturate(1.3)"></div><div style="position:absolute;top:15px;bottom:15px;left:50%;width:${(c.cover_height || 170) - 30}px;margin-left:-${((c.cover_height || 170) - 30) / 2}px;border-radius:8px;background:center/cover url('${ma.entity_picture || this._art(ma)}');box-shadow:0 10px 24px rgba(0,0,0,.6)"></div></div>` : `<div style="height:150px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#f5b544,#9a3412);box-shadow:0 12px 28px rgba(0,0,0,.5)"><ha-icon icon="mdi:music" style="--mdc-icon-size:64px;color:rgba(26,18,6,.8)"></ha-icon></div>`) : c.vu ? vuSvg({ play, vol: muted ? 0 : vol, brand: c.brand }) : c.image ? `<img src="${c.image}" alt="" style="display:block;width:100%;max-height:120px;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))">` : ampSvg({ brand: c.brand, on, play, vol: muted ? 0 : vol, srcIdx: Math.max(0, list.indexOf(src)), srcN: list.length, finish: c.finish, text: on ? (SRC_NAME[src] || src || '').toUpperCase() + (ma.media_title ? '  ' + ma.media_title.slice(0, 26) : '') : '' })}</div>
<div class="hero" data-a="info">
  ${pic ? '<div class="cv"></div>' : ''}
  <div class="i">${on && src ? `<span class="badge"><ha-icon icon="${SRC_ICON[src] || 'mdi:import'}"></ha-icon>${esc(SRC_NAME[src] || src)}</span>` : ''}
    <div class="t">${esc(title)}</div><div class="a">${esc(artist)}</div>
    </div>
</div>
${on && dur ? `<div class="pg"><div class="pb"><div class="pf" style="width:0"></div></div><div class="pt"><span class="p0">0:00</span><span>${fmt(dur)}</span></div></div>` : ''}
<div class="tr"><button data-a="prev"><ha-icon icon="mdi:skip-previous"></ha-icon></button><button class="pp" data-a="pp"><ha-icon icon="${play ? 'mdi:pause' : 'mdi:play'}"></ha-icon></button><button data-a="next"><ha-icon icon="mdi:skip-next"></ha-icon></button></div>
<div class="vl"><button data-a="mute" title="Muto"><ha-icon icon="${muted ? 'mdi:volume-off' : 'mdi:volume-high'}"></ha-icon></button>
  <div class="sl"><div class="sf"></div><div class="sv"><span>Volume</span><b>${muted ? 'muto' : vol + '%'}</b></div></div></div>
${modes.length && on ? `<div class="lb">Modalità audio</div><div class="modes">${modes.map((m) => `<button data-m="${esc(m)}" class="${m === ya.sound_mode ? 'act' : ''}">${esc(m)}</button>`).join('')}</div>` : ''}
<div class="lb">Sorgente</div>
<div class="src">${srcs.map((s) => { const col = SRC_COL[s] || '#94a3b8'; return `<button data-s="${esc(s)}" class="${on && s === src ? 'act' : ''}" style="--c:${col};--c-bg:${col}22;--c-bd:${col}55"><ha-icon icon="${SRC_ICON[s] || 'mdi:import'}"></ha-icon>${esc(SRC_NAME[s] || s)}</button>`; }).join('')}</div>
${spk.length || sl ? `<div class="row">
  ${spk.length ? `<div class="grp"><span>Diffusori</span>${spk.map(([n, id]) => `<button class="spk ${this._st(id) === 'on' ? 'act' : ''}" data-sp="${id}">${n}</button>`).join('')}</div>` : ''}
  ${sl ? `<div class="grp"><span>Sleep</span>${(sl.attributes.options || []).map((o) => `<button data-sl="${o}" class="${o === sl.state ? 'act' : ''}">${SLEEP[o] || o}</button>`).join('')}</div>` : ''}
</div>` : ''}
</ha-card>`;

    const root = this.shadowRoot, ent = { entity_id: c.entity }, mid = { entity_id: ms.entity_id };
    root.querySelector('ha-card').onclick = (ev) => {
      const b = ev.target.closest('button,[data-a="info"]'); if (!b) return;
      const d = b.dataset;
      if (d.a === 'info') return moreInfo(this, c.entity);
      if (d.a === 'pw') return this._call('media_player', on ? 'turn_off' : 'turn_on', ent);
      if (d.a === 'pp') return this._call('media_player', 'media_play_pause', mid);
      if (d.a === 'prev') return this._call('media_player', 'media_previous_track', mid);
      if (d.a === 'next') return this._call('media_player', 'media_next_track', mid);
      if (d.a === 'mute') return this._call('media_player', 'volume_mute', Object.assign({ is_volume_muted: !muted }, ent));
      if (d.s) return this._call('media_player', 'select_source', Object.assign({ source: d.s }, ent));
      if (d.m) return this._call('media_player', 'select_sound_mode', Object.assign({ sound_mode: d.m }, ent));
      if (d.sp) return this._call('switch', 'toggle', { entity_id: d.sp });
      if (d.sl) return this._call('select', 'select_option', { entity_id: c.sleep, option: d.sl });
    };
    // volume trascinabile: aggiorna a vista mentre trascini, invia al rilascio
    const sl2 = root.querySelector('.sl');
    if (sl2) {
      const fill = sl2.querySelector('.sf'), lab = sl2.querySelector('.sv b'), max = (c.max_volume || 100) / 100;
      const at = (e) => { const r = sl2.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * max; };
      let v = null;
      sl2.onpointerdown = (e) => { this._drag = true; sl2.setPointerCapture(e.pointerId); v = at(e); fill.style.width = (v * 100) + '%'; lab.textContent = Math.round(v * 100) + '%'; };
      sl2.onpointermove = (e) => { if (!this._drag) return; v = at(e); fill.style.width = (v * 100) + '%'; lab.textContent = Math.round(v * 100) + '%'; };
      const up = () => { if (!this._drag) return; this._drag = false; if (v != null) this._call('media_player', 'volume_set', Object.assign({ volume_level: +v.toFixed(2) }, ent)); v = null; };
      sl2.onpointerup = up; sl2.onpointercancel = up;
    }
    this._progress();
  }
  _st(id) { const s = this._h.states[id]; return s ? s.state : undefined; }
}
if (!customElements.get('receiver-card')) customElements.define('receiver-card', ReceiverCard);
(window.customCards = window.customCards || []).push({ type: 'receiver-card', name: 'Amplificatore', description: 'Amplificatore con sorgenti e volume (stile Casa)' });
})();

/* ---------------- MEDIA TV: pagina musica a schermo intero ----------------
   config: entity (media_player), name
   Copertina e dettagli da iTunes; storia del brano da Wikipedia (it, poi en), con fonte. */
(() => {
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clean = (t) => (t || '').replace(/\s*[\(\[].*?(remaster|live|version|edit|mix|deluxe|mono|stereo).*?[\)\]]/ig, '').replace(/\s+-\s+(remaster|live|single|radio).*$/i, '').trim();
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const mmss = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
class MediaTvCard extends HTMLElement {
  setConfig(c) { this._c = c || {}; if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); this._info = {}; }
  getCardSize() { return 12; }
  set hass(h) { this._h = h; const s = h.states[this._c.entity]; const a = s ? s.attributes : {};
    const k = [a.media_title, a.media_artist].join('|'), k2 = [s && s.state, a.volume_level, a.source].join('|');
    if (k === this._k && k2 !== this._k2) { this._k2 = k2; this._render(); }
    if (k !== this._k) { this._k = k; this._k2 = k2; this._t0 = Date.now(); this._render(); this._lookup(a); }
    else this._tick(); }
  connectedCallback() { clearInterval(this._iv); this._iv = setInterval(() => this._tick(), 1000);
    if (!this._kh) this._kh = (e) => { const dn = e.key === 'ArrowDown' || e.keyCode === 20, up = e.key === 'ArrowUp' || e.keyCode === 19; if (!dn && !up) return; const st = this.shadowRoot && this.shadowRoot.getElementById('story'); if (!st || !this.isConnected) return;
      e.preventDefault(); e.stopPropagation(); const from = st.scrollTop, to = Math.max(0, Math.min(st.scrollHeight - st.clientHeight, from + (dn ? 1 : -1) * st.clientHeight * 0.7)); clearInterval(this._sc); let i = 0;
      this._sc = setInterval(() => { i++; const k = i / 12, ease = 1 - Math.pow(1 - k, 3); st.scrollTop = from + (to - from) * ease; if (i >= 12) { clearInterval(this._sc); this._mask(); } }, 25); };
    window.addEventListener('keydown', this._kh, true); }
  disconnectedCallback() { clearInterval(this._iv); window.removeEventListener('keydown', this._kh, true); }
  _mask() { const R = this.shadowRoot, st = R && R.getElementById('story'), hn = R && R.getElementById('hint'); if (!st) return;
    const more = st.scrollHeight - st.clientHeight > 4, atTop = st.scrollTop < 4, atEnd = st.scrollTop + st.clientHeight >= st.scrollHeight - 4;
    st.className = 'story' + (!more ? ' all' : atTop ? '' : atEnd ? ' end' : ' top');
    if (hn) hn.textContent = !more ? '' : atTop ? '▼ scorri col telecomando' : atEnd ? '▲' : '▲ ▼'; }
  async _j(u) { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return r.json(); }
  async _lookup(a) {
    const t = clean(a.media_title), ar = (a.media_artist || '').trim(); if (!t) return;
    const key = ar + '|' + t; if (this._info.key === key) return; const info = this._info = { key };
    // iTunes: copertina grande, album, anno, genere, durata, numero traccia
    try { const j = await this._j('https://itunes.apple.com/search?entity=song&limit=5&country=it&term=' + encodeURIComponent(ar + ' ' + t));
      const r = (j.results || []).find((x) => norm(x.artistName).includes(norm(ar).split(' ')[0]) && norm(x.trackName).startsWith(norm(t).slice(0, 12))) || (j.results || [])[0];
      if (r) Object.assign(info, { art: r.artworkUrl100.replace('100x100bb', '1200x1200bb'), album: r.collectionName, year: (r.releaseDate || '').slice(0, 4), genre: r.primaryGenreName, dur: r.trackTimeMillis / 1000, track: r.trackNumber, tracks: r.trackCount, artistItunes: r.artistName });
    } catch (e) {}
    if (this._info !== info) return; this._render();
    // Wikipedia: prima il brano, poi l'album, poi l'artista
    const tryWiki = async (lang, q, must) => {
      const s = await this._j(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srlimit=6&format=json&origin=*&srsearch=` + encodeURIComponent(q));
      const hit = (s.query && s.query.search || []).find((x) => must(norm(x.title))); if (!hit) return null;
      const e = await this._j(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&exchars=4000&redirects=1&format=json&origin=*&titles=` + encodeURIComponent(hit.title));
      const p = Object.values(e.query.pages)[0]; if (!p || !p.extract) return null;
      // testo fino alle sezioni "di servizio" (tracce, classifiche, formazione, note...), senza i titoli di sezione
      const out = []; for (const line of p.extract.split(/\n+/)) { const m = line.match(/^=+\s*(.*?)\s*=+$/); if (m) { if (/tracc|track|classific|chart|formazione|personnel|note|notes|refer|bibliog|collegament|external|video musicale|music video|cover|versioni|edizion|certific|credits|crediti|riconosc|accolad/i.test(m[1])) break; continue; } if (line.trim()) out.push(line.trim()); }
      const text = out.join('\n'); if (text.length < 280) return null;
      return { title: p.title, text, url: `https://${lang}.wikipedia.org/wiki/` + encodeURIComponent(p.title.replace(/ /g, '_')), lang };
    };
    const nt = norm(t), na = norm(ar), nal = norm(clean(info.album || a.media_album_name || ''));
    const steps = [
      ['brano', 'it', `${t} ${ar} brano`, (x) => x.startsWith(nt)], ['brano', 'en', `${t} ${ar} song`, (x) => x.startsWith(nt)],
      ['album', 'it', `${nal} ${ar} album`, (x) => nal && x.startsWith(nal.slice(0, 14))], ['album', 'en', `${nal} ${ar} album`, (x) => nal && x.startsWith(nal.slice(0, 14))],
      ['artista', 'it', ar, (x) => x.startsWith(na)], ['artista', 'en', ar + ' musician', (x) => x.startsWith(na)]];
    for (const [kind, lang, q, must] of steps) { if (!q.trim()) continue; try { const w = await tryWiki(lang, q, must); if (w) { info.wiki = Object.assign(w, { kind }); break; } } catch (e) {} }
    if (this._info === info) { info.done = true; this._render(); }
  }
  _pos() { const s = this._h && this._h.states[this._c.entity]; if (!s) return [0, 0]; const a = s.attributes;
    const dur = a.media_duration || this._info.dur || 0; const upd = a.media_position_updated_at ? Date.parse(a.media_position_updated_at) : 0; let p;
    if (upd && upd >= (this._t0 || 0) - 5000) { p = (a.media_position || 0) + (s.state === 'playing' ? (Date.now() - upd) / 1000 : 0); }
    else { if (s.state !== 'playing') { this._pz = this._pz || Date.now(); } else if (this._pz) { this._t0 += Date.now() - this._pz; this._pz = 0; }
      p = ((this._pz || Date.now()) - (this._t0 || Date.now())) / 1000; }
    return [dur ? Math.min(p, dur) : p, dur]; }
  _tick() { const R = this.shadowRoot; if (!R) return; const fs = R.querySelector('.fs'); if (fs) { const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1; fs.style.zoom = (1 / z).toFixed(4); } const b = R.getElementById('bar'), e = R.getElementById('el'), cl = R.getElementById('clk');
    if (cl) cl.textContent = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (!b) return; const [p, d] = this._pos(); b.style.width = d ? (100 * p / d).toFixed(2) + '%' : '0%'; if (e) e.textContent = d ? mmss(p) : ''; }
  _render() {
    const h = this._h; if (!h) return; const s = h.states[this._c.entity], a = s ? s.attributes : {}, I = this._info || {};
    const play = s && s.state === 'playing', on = s && ['playing', 'paused', 'buffering'].includes(s.state) && a.media_title;
    const art = a.entity_picture || I.art || '';
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const vol = Math.round((a.volume_level || 0) * 100);
    const w = I.wiki;
    const kindLab = { brano: 'La storia del brano', album: 'L’album', artista: 'L’artista' };
    const det = [['Album', I.album || a.media_album_name], ['Anno', I.year], ['Genere', I.genre], ['Traccia', I.track ? I.track + (I.tracks ? ' di ' + I.tracks : '') : ''], ['Durata', I.dur ? mmss(I.dur) : ''], ['Sorgente', a.source], ['Volume', vol + '%']].filter(([, v]) => v);
    this.shadowRoot.innerHTML = `<style>
      :host{display:block}
      .fs{--ts:${this._c.text_scale || 1};position:fixed;inset:0;z-index:5;overflow:hidden;background:#07090b;color:#eef2f6;font-family:var(--primary-font-family,Roboto,sans-serif);zoom:${(1 / z).toFixed(4)}}
      .bg{position:absolute;inset:-60px;background:center/cover no-repeat;filter:blur(60px) brightness(.38) saturate(1.4);transform:scale(1.1);transition:background-image 1s}
      .vg{position:absolute;inset:0;background:radial-gradient(120% 100% at 30% 40%,transparent 0%,rgba(0,0,0,.55) 75%)}
      .wrap{position:absolute;inset:0;display:grid;grid-template-columns:40vw 1fr;gap:3.2vw;padding:4.5vh 4vw 5vh}
      .left{display:flex;flex-direction:column;justify-content:center;gap:2.4vh}
      .cov{width:100%;aspect-ratio:1;border-radius:1.2vw;background:#1b2128 center/cover no-repeat;box-shadow:0 3vh 7vh rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.06)}
      .cov.none{display:grid;place-items:center;background:linear-gradient(135deg,#f5b544,#9a3412)}
      .right{display:flex;flex-direction:column;min-height:0;gap:2.2vh}
      .top{display:flex;align-items:center;gap:1vw;font-size:calc(1.05vw * var(--ts));letter-spacing:.22em;text-transform:uppercase;color:rgba(238,242,246,.6)}
      .top .dot{width:.7vw;height:.7vw;border-radius:50%;background:${play ? '#4ade80' : '#fbbf24'};box-shadow:0 0 1vw ${play ? '#4ade80' : '#fbbf24'}}
      .top .clk{margin-left:auto;letter-spacing:0;font-size:calc(2.2vw * var(--ts));font-weight:200;text-transform:none;color:#f1f5f9}
      h1{margin:.6vh 0 0;font-size:calc(4.1vw * var(--ts));line-height:1.05;font-weight:700;letter-spacing:-.01em}
      .art{font-size:calc(2.1vw * var(--ts));color:#fcd34d;font-weight:500}
      .alb{font-size:calc(1.35vw * var(--ts));color:rgba(238,242,246,.7);margin-top:.4vh}
      .prog{display:flex;align-items:center;gap:1vw;font-size:calc(1.1vw * var(--ts));color:rgba(238,242,246,.65);font-variant-numeric:tabular-nums}
      .track{flex:1;height:.55vh;border-radius:1vh;background:rgba(255,255,255,.14);overflow:hidden}
      #bar{height:100%;background:linear-gradient(90deg,#fbbf24,#f59e0b);border-radius:1vh;transition:width 1s linear}
      .panels{flex:1;min-height:0;display:grid;grid-template-columns:1.65fr 1fr;gap:1.6vw}
      .pn{background:rgba(10,14,18,.55);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.08);border-radius:1vw;padding:2.6vh 1.6vw;min-height:0;display:flex;flex-direction:column}
      .pn h2{margin:0 0 1.4vh;font-size:calc(1vw * var(--ts));letter-spacing:.22em;text-transform:uppercase;color:rgba(252,211,77,.9);font-weight:600}
      .story{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;font-size:calc(1.32vw * var(--ts));line-height:1.55;color:rgba(238,242,246,.9);-webkit-mask-image:linear-gradient(180deg,#000 82%,transparent);mask-image:linear-gradient(180deg,#000 82%,transparent)}
      .story p{margin:0 0 1.2vh}.story::-webkit-scrollbar{display:none}.story.top{-webkit-mask-image:linear-gradient(180deg,transparent,#000 12%,#000 82%,transparent);mask-image:linear-gradient(180deg,transparent,#000 12%,#000 82%,transparent)}.story.end{-webkit-mask-image:linear-gradient(180deg,transparent,#000 12%);mask-image:linear-gradient(180deg,transparent,#000 12%)}.story.all{-webkit-mask-image:none;mask-image:none}.hint{float:right;letter-spacing:0;text-transform:none;color:rgba(238,242,246,.45);font-weight:400}
      .src{margin-top:1.2vh;font-size:calc(.85vw * var(--ts));color:rgba(238,242,246,.45)}
      .dl{display:grid;grid-template-columns:auto 1fr;gap:1.3vh 1.2vw;font-size:calc(1.25vw * var(--ts));align-content:start}
      .dl dt{color:rgba(238,242,246,.5)}.dl dd{margin:0;color:#eef2f6;font-weight:500}
      .vol{height:.5vh;border-radius:1vh;background:rgba(255,255,255,.14);margin-top:.9vh;overflow:hidden}.vol i{display:block;height:100%;width:${vol}%;background:#94a3b8}
      .idle{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2vh;color:rgba(238,242,246,.7)}
      .idle .c{font-size:calc(7vw * var(--ts));font-weight:200;color:#f1f5f9}.idle .m{font-size:calc(1.6vw * var(--ts))}
      .wait{color:rgba(238,242,246,.45);font-style:italic}
    </style><div class="fs"><div class="bg" style="${art ? `background-image:url('${art}')` : ''}"></div><div class="vg"></div>
    ${on ? `<div class="wrap">
      <div class="left">${art ? `<div class="cov" style="background-image:url('${art}')"></div>` : `<div class="cov none"><ha-icon icon="mdi:music" style="--mdc-icon-size:10vw;color:rgba(26,18,6,.8)"></ha-icon></div>`}</div>
      <div class="right">
        <div class="top"><span class="dot"></span>${esc(this._c.name || a.friendly_name || 'Musica')} · ${play ? 'In riproduzione' : 'In pausa'}${a.source ? ' · ' + esc(a.source) : ''}<span class="clk" id="clk"></span></div>
        <div><h1>${esc(clean(a.media_title))}</h1><div class="art">${esc(a.media_artist || I.artistItunes || '')}</div><div class="alb">${esc([I.album || a.media_album_name, I.year].filter(Boolean).join(' · '))}</div></div>
        <div class="prog"><span id="el"></span><div class="track"><div id="bar"></div></div><span>${I.dur || a.media_duration ? mmss(a.media_duration || I.dur) : ''}</span></div>
        <div class="panels">
          <div class="pn"><h2>${w ? kindLab[w.kind] : 'La storia del brano'}<span class="hint" id="hint"></span></h2><div class="story" id="story">${w ? w.text.split(/\n+/).filter((x) => x.trim()).map((p) => `<p>${esc(p)}</p>`).join('') : `<p class="wait">${I.done ? 'Nessuna informazione trovata su Wikipedia per questo brano.' : 'Cerco la storia del brano…'}</p>`}</div>${w ? `<div class="src">Fonte: Wikipedia${w.lang === 'en' ? ' (in inglese)' : ''} · «${esc(w.title)}» · CC BY-SA</div>` : ''}</div>
          <div class="pn"><h2>Dettagli</h2><dl class="dl">${det.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><div class="vol"><i></i></div></div>
        </div>
      </div></div>` : `<div class="idle"><div class="c" id="clk"></div><div class="m">${esc(this._c.name || 'Musica')} · nessun brano in riproduzione</div></div>`}
    </div>`;
    this._tick(); setTimeout(() => this._mask(), 50);
  }
}
if (!customElements.get('media-tv-card')) customElements.define('media-tv-card', MediaTvCard);
})();
