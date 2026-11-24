/* energy-balance-card.js - schede energia (kWh e costo) dalle statistiche del recorder
   Seguono il periodo scelto nel selettore date (energy-date-selection) della stessa vista.
   custom:energy-balance-card  groups:{solar,import,export,charge,discharge}, prices:{import,export} (EUR/kWh)
   custom:energy-devices-card  devices:[{name, stat, entity (opzionale: contatore giornaliero per oggi)}], max (default 6) */
const CSS = 'ha-card{background:radial-gradient(120% 90% at 50% 0%,#18242b 0%,#0d1317 62%,#0a0f12 100%);border:1px solid rgba(140,200,255,.10);border-radius:20px;padding:18px 20px 20px;color:#e6edf7;font-family:var(--primary-font-family,inherit)}'
  + '.t{font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:#8fa3ad;margin-bottom:14px}'
  + '.t span{color:#b6c4cc}'
  + '.r{display:flex;align-items:center;gap:14px;margin:12px 0}'
  + 'ha-icon{--mdc-icon-size:22px;flex:none;width:22px}'
  + '.m{flex:1;min-width:0}'
  + '.l{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:#b6c4cc;margin-bottom:6px}'
  + '.l b{font-size:16px;color:#e6edf7;font-weight:600;font-variant-numeric:tabular-nums}'
  + '.l i{font-style:normal;font-size:11px;color:#8fa3ad;font-weight:400}'
  + '.b{height:7px;border-radius:99px;background:rgba(148,163,184,.12);overflow:hidden}'
  + '.b div{height:100%;border-radius:99px}'
  + '.cost{margin-top:18px;padding-top:14px;border-top:1px solid rgba(148,163,184,.12)}'
  + '.cost .l{margin:0}.cost .l b{font-size:20px;font-weight:500}'
  + '.cost small,.pn{display:block;margin-top:4px;font-size:11px;color:#6f8591}'
  + '.ss{margin-top:18px;padding-top:14px;border-top:1px solid rgba(148,163,184,.12)}'
  + '.ss .l span{font-size:11px;letter-spacing:2.4px;color:#8fa3ad}'
  + '.ss .l b{font-size:26px;font-weight:300}'
  + '.b.big{height:10px}.b.big div{background:linear-gradient(90deg,#1b7f5c,#34d399)}'
  + '.ld{color:#8fa3ad;font-size:13px;padding:10px 0}';
const fmt = (v, d) => {
  const s = Math.abs(v).toFixed(d).split('.');
  return (v < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'") + (d ? ',' + s[1] : '');
};
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const dl = (x) => x.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const todayP = () => { const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setHours(23, 59, 59, 999); return { start: s, end: e }; };
const isToday = (p) => sameDay(p.start, p.end) && sameDay(p.start, new Date());
const plabel = (p) => isToday(p) ? 'oggi' : sameDay(p.start, p.end) ? dl(p.start) : dl(p.start) + ' – ' + dl(p.end);
const rng = (p, end) => ({ start_time: p.start.toISOString(), end_time: (end || p.end).toISOString(), period: (p.end - p.start) > 400 * 864e5 ? 'month' : 'day', types: ['change'] });

class Base extends HTMLElement {
  setConfig(c) {
    this._c = Object.assign({}, this.constructor.defaults, c);
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._t = 0;
    this._p = this._p || todayP();
    this._render();
  }
  set hass(h) {
    this._h = h;
    this._attach();
    this._sync();
    if (!this._busy && Date.now() - this._t > 300000) this._load();
  }
  _attach() {
    if (this._col || !this._h || !this._h.connection) return;
    const conn = this._h.connection;
    const key = this._c.collection_key ? '_energy_' + this._c.collection_key : Object.keys(conn).find((k) => k.indexOf('_energy_') === 0);
    const col = key && conn[key];
    if (!col || !col.subscribe) return;
    this._col = col;
    this._un = col.subscribe((s) => {
      if (!s.start || !s.end) return;
      if (this._p && this._p.start.getTime() === s.start.getTime() && this._p.end.getTime() === s.end.getTime()) return;
      this._p = { start: new Date(s.start), end: new Date(s.end) };
      this._t = 0;
      if (this._h) this._load();
    });
  }
  _sync() {
    const col = this._col;
    if (!col || !col.start || !col.end) return;
    if (this._p.start.getTime() === col.start.getTime() && this._p.end.getTime() === col.end.getTime()) return;
    this._p = { start: new Date(col.start), end: new Date(col.end) };
    this._t = 0;
    this._load();
  }
  disconnectedCallback() {
    if (this._un) { try { this._un(); } catch (e) {} }
    this._un = null; this._col = null;
  }
  async _load() {
    if (this._busy) return;
    this._busy = true;
    const p = this._p;
    try { this._d = await this._fetch(p); this._err = null; this._t = Date.now(); }
    catch (err) { this._err = String((err && err.message) || err); this._t = Date.now() - 240000; }
    this._busy = false;
    if (this._p !== p) { this._t = 0; return this._load(); }
    this._render();
  }
}

class EnergyBalanceCard extends Base {
  getCardSize() { return 7; }
  async _fetch(p) {
    const g = this._c.groups || {};
    const ids = [...new Set([].concat(...Object.values(g)))];
    const r = await this._h.callWS(Object.assign({ type: 'recorder/statistics_during_period', statistic_ids: ids }, rng(p)));
    let anom = false;
    const sum = (k) => (g[k] || []).reduce((a, id) => a + (r[id] || []).reduce((b, x) => {
      const c = x.change || 0;
      if (c < 0 || c > 500) { anom = true; return b; }
      return b + c;
    }, 0), 0);
    const pv = sum('solar'), i = sum('import'), e = sum('export'), c = sum('charge'), d = sum('discharge');
    const use = Math.max(0, pv + i + d - e - c);
    return { p, anom, pv, i, e, c, d, use, ss: use > 0 ? Math.max(0, Math.min(100, (use - i) / use * 100)) : 0 };
  }
  _render() {
    if (!this.shadowRoot) return;
    const d = this._d;
    const today = d && isToday(d.p);
    const rows = d ? [
      ['Prodotta', d.pv, '#FFB300', 'mdi:solar-power'],
      ['Consumata dalla casa', d.use, '#4DD0E1', 'mdi:home-lightning-bolt-outline'],
      ['Prelevata dalla rete', d.i, '#EF9A9A', 'mdi:transmission-tower'],
      ['Immessa in rete', d.e, '#90CAF9', 'mdi:transmission-tower'],
      ['Batterie caricate', d.c, '#66BB6A', 'mdi:battery-charging'],
      ['Batterie scaricate', d.d, '#26A69A', 'mdi:battery-arrow-down']
    ] : [];
    const mx = Math.max(0.1, ...rows.map((x) => x[1]));
    const dec = (v) => v >= 1000 ? 0 : 1;
    let h = '<ha-card><div class="t">' + this._c.title + ' · <span>' + (d ? plabel(d.p) : plabel(this._p)) + '</span></div>';
    rows.forEach((x) => {
      const w = Math.max(2, x[1] / mx * 100);
      h += '<div class="r"><ha-icon icon="' + x[3] + '" style="color:' + x[2] + '"></ha-icon><div class="m"><div class="l"><span>' + x[0] + '</span><b>' + fmt(x[1], dec(x[1])) + ' <i>kWh</i></b></div><div class="b"><div style="width:' + w + '%;background:linear-gradient(90deg,' + x[2] + '55,' + x[2] + ')"></div></div></div></div>';
    });
    const pr = this._c.prices;
    const note = d && d.anom ? '<span class="pn">Alcuni giorni con dati anomali dei contatori sono stati esclusi: i valori del periodo possono essere parziali.</span>' : '';
    if (d && pr) {
      const net = d.i * pr.import - d.e * pr.export;
      h += '<div class="cost"><div class="l"><span>' + (net >= 0 ? 'Spesa' : 'Ricavo') + (today ? ' di oggi' : ' del periodo') + '</span><b>' + fmt(Math.abs(net), 2) + ' <i>€</i></b></div><small>Prelievo ' + fmt(pr.import, 3) + ' €/kWh · immissione ' + fmt(pr.export, 2) + ' €/kWh (prezzi impostati nella configurazione energia)</small></div>';
    }
    if (d) h += '<div class="ss"><div class="l"><span>AUTOSUFFICIENZA ' + (today ? 'DI OGGI' : 'DEL PERIODO') + '</span><b>' + Math.round(d.ss) + '<i>%</i></b></div><div class="b big"><div style="width:' + Math.max(1, d.ss) + '%"></div></div></div>';
    else h += '<div class="ld">' + (this._err || 'Caricamento…') + '</div>';
    h += note + '</ha-card>';
    this.shadowRoot.innerHTML = '<style>' + CSS + '</style>' + h;
  }
}
EnergyBalanceCard.defaults = { title: 'Bilancio' };

class EnergyDevicesCard extends Base {
  getCardSize() { return 6; }
  async _fetch(p) {
    const devs = this._c.devices || [];
    const now = new Date();
    const tm = new Date(now); tm.setHours(0, 0, 0, 0);
    const incToday = p.end >= tm;
    const useEnt = (x) => x.entity && incToday;
    const idsA = devs.filter((x) => !useEnt(x)).map((x) => x.stat);
    const idsB = devs.filter((x) => useEnt(x)).map((x) => x.stat);
    const rA = idsA.length ? await this._h.callWS(Object.assign({ type: 'recorder/statistics_during_period', statistic_ids: idsA }, rng(p), { types: ['change', 'state'] })) : {};
    const rB = idsB.length && p.start < tm ? await this._h.callWS(Object.assign({ type: 'recorder/statistics_during_period', statistic_ids: idsB }, rng(p, tm), { types: ['change', 'state'] })) : {};
    let anom = false;
    const sumStat = (arr) => (arr || []).reduce((a, y, k, all) => {
      let c = y.change || 0;
      if (c > 300 || c < 0) {
        const pv = k > 0 ? all[k - 1].state : null;
        const alt = (pv != null && y.state != null) ? y.state - pv : -1;
        if (alt >= 0 && alt <= 300) c = alt; else { anom = true; return a; }
      }
      return a + c;
    }, 0);
    const list = devs.map((x) => {
      let v = 0;
      if (useEnt(x)) {
        const s = this._h.states[x.entity];
        v = (s ? parseFloat(s.state) || 0 : 0) + sumStat(rB[x.stat]);
      } else v = sumStat(rA[x.stat]);
      return { name: x.name, v: Math.max(0, v) };
    }).sort((a, b) => b.v - a.v);
    return { p, list, anom };
  }
  _render() {
    if (!this.shadowRoot) return;
    const d = this._d;
    let h = '<ha-card><div class="t">' + this._c.title + ' · <span>' + (d ? plabel(d.p) : plabel(this._p)) + '</span></div>';
    if (d) {
      const list = d.list.filter((x) => x.v >= 0.05).slice(0, this._c.max);
      const mx = Math.max(0.1, ...list.map((x) => x.v));
      list.forEach((x) => {
        const w = Math.max(2, x.v / mx * 100);
        h += '<div class="r"><div class="m"><div class="l"><span>' + x.name + '</span><b>' + fmt(x.v, x.v < 1 ? 2 : x.v >= 1000 ? 0 : 1) + ' <i>kWh</i></b></div><div class="b"><div style="width:' + w + '%;background:linear-gradient(90deg,#26A69A55,#4DD0E1)"></div></div></div></div>';
      });
      if (!list.length) h += '<div class="ld">Nessun consumo rilevato nel periodo.</div>';
      if (d.anom) h += '<span class="pn">Alcuni valori anomali di un contatore sono stati esclusi dal conteggio.</span>';
    } else h += '<div class="ld">' + (this._err || 'Caricamento…') + '</div>';
    h += '</ha-card>';
    this.shadowRoot.innerHTML = '<style>' + CSS + '</style>' + h;
  }
}
EnergyDevicesCard.defaults = { title: 'Consumatori', max: 6 };

customElements.define('energy-balance-card', EnergyBalanceCard);
customElements.define('energy-devices-card', EnergyDevicesCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'energy-balance-card', name: 'Bilancio energia', description: 'Energia e costo del periodo scelto: prodotta, consumata, rete, batterie, autosufficienza' });
window.customCards.push({ type: 'energy-devices-card', name: 'Consumatori', description: 'Elenco ordinato dei consumi del periodo scelto per dispositivo' });
