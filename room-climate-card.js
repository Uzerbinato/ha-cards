// room-climate-card
// Card per stanza: temperatura grande, umidità piccola, +/- sul setpoint.
// config: entity (climate.*), name, temperature_sensor?, humidity_sensor?, step?, readonly? (solo lettura, senza +/-: per la TV)
class RoomClimateCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error('entity richiesta');
    this._config = config;
    this._pending = null;
    this._timer = null;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._built = false;
  }

  getCardSize() { return 3; }
  getGridOptions() { return { columns: 6, min_columns: 4, rows: 'auto' }; }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._render();
  }

  _fmt(v, d = 1) {
    if (v === null || v === undefined || isNaN(v)) return '–';
    return Number(v).toFixed(d).replace('.', ',');
  }

  _num(id) {
    if (!id) return null;
    const s = this._hass.states[id];
    if (!s) return null;
    const v = parseFloat(s.state);
    return isNaN(v) ? null : v;
  }

  _build() {
    const r = this.shadowRoot;
    r.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          position: relative; overflow: hidden; height: 100%;
          box-sizing: border-box; padding: 14px 14px 12px;
          background: radial-gradient(120% 90% at 50% 0%, #18242b 0%, #0d1317 62%, #0a0f12 100%);
          border: 1px solid rgba(140,200,255,.10); border-radius: 20px;
          color: #e8eef1; font-family: var(--paper-font-body1_-_font-family, inherit);
          transition: border-color .4s, box-shadow .4s;
        }
        ha-card.heat { border-color: rgba(255,152,64,.35); box-shadow: inset 0 0 28px rgba(255,120,40,.10); }
        ha-card.cool { border-color: rgba(100,180,255,.35); box-shadow: inset 0 0 28px rgba(60,140,255,.10); }
        ha-card.off .big, ha-card.off .set { opacity: .55; }
        .top { display: flex; align-items: center; justify-content: space-between; gap: 6px; cursor: pointer; }
        .name { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: #8fa3ad;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .badge { display: flex; align-items: center; gap: 3px; font-size: 10px; color: #6f8590; flex: none; }
        .badge ha-icon { --mdc-icon-size: 16px; }
        .badge span { display: none; }
        .heat .badge { color: #ffa040; }
        .cool .badge { color: #64b4ff; }
        .mid { display: flex; align-items: flex-end; justify-content: space-between; margin: 6px 0 10px; cursor: pointer; }
        .big { font-size: 40px; font-weight: 300; line-height: 1; letter-spacing: -1px; }
        .big .deg { font-size: 20px; vertical-align: top; margin-left: 2px; color: #9fb3bd; }
        .hum { display: flex; align-items: center; gap: 2px; font-size: 12px; color: #7fa8c0; padding-bottom: 4px; }
        .hum ha-icon { --mdc-icon-size: 14px; }
        .set { display: flex; align-items: center; justify-content: space-between;
               background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
               border-radius: 14px; padding: 3px; }
        button { all: unset; width: 34px; height: 30px; border-radius: 11px; display: grid; place-items: center;
                 cursor: pointer; color: #cfd9de; background: rgba(255,255,255,.05); transition: background .15s; }
        button:hover { background: rgba(255,255,255,.12); }
        button:active { background: rgba(255,255,255,.2); }
        button ha-icon { --mdc-icon-size: 18px; }
        .target { font-size: 15px; font-weight: 500; color: #cfd9de; display: flex; align-items: center; gap: 4px; }
        .target small { font-size: 10px; color: #6f8590; font-weight: 400; letter-spacing: 1px; text-transform: uppercase; }
        .target.pending { color: #ffc070; }
        .heat .target:not(.pending) { color: #ffb070; }
        ha-card.ro .set { justify-content: center; padding: 7px 3px; }
        ha-card.ro button { display: none; }
      </style>
      <ha-card>
        <div class="top"><div class="name"></div><div class="badge"><ha-icon></ha-icon><span></span></div></div>
        <div class="mid"><div class="big"></div><div class="hum"><ha-icon icon="mdi:water-percent"></ha-icon><span></span></div></div>
        <div class="set">
          <button class="minus" aria-label="Diminuisci"><ha-icon icon="mdi:minus"></ha-icon></button>
          <div class="target"></div>
          <button class="plus" aria-label="Aumenta"><ha-icon icon="mdi:plus"></ha-icon></button>
        </div>
      </ha-card>`;
    r.querySelector('.minus').addEventListener('click', (e) => { e.stopPropagation(); this._step(-1); });
    r.querySelector('.plus').addEventListener('click', (e) => { e.stopPropagation(); this._step(1); });
    const more = () => {
      const ev = new Event('hass-more-info', { bubbles: true, composed: true });
      ev.detail = { entityId: this._config.entity };
      this.dispatchEvent(ev);
    };
    r.querySelector('.top').addEventListener('click', more);
    r.querySelector('.mid').addEventListener('click', more);
    this._built = true;
  }

  _step(dir) {
    const st = this._hass.states[this._config.entity];
    if (!st) return;
    const a = st.attributes;
    const step = this._config.step || (a.target_temp_step && a.target_temp_step >= 0.5 ? a.target_temp_step : 0.5);
    const base = this._pending ?? a.temperature ?? 20;
    let v = Math.round((base + dir * step) / step) * step;
    v = Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 5, v));
    this._pending = Math.round(v * 10) / 10;
    this._render();
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      const val = this._pending;
      this._hass.callService('climate', 'set_temperature', { entity_id: this._config.entity, temperature: val })
        .catch(() => {})
        .finally(() => { this._sentAt = Date.now(); setTimeout(() => { this._pending = null; this._render(); }, 20000); });
    }, 1200);
  }

  _render() {
    if (!this._hass || !this._built) return;
    const c = this._config, r = this.shadowRoot;
    const st = this._hass.states[c.entity];
    const card = r.querySelector('ha-card');
    r.querySelector('.name').textContent = c.name || st?.attributes.friendly_name || c.entity;
    if (!st || st.state === 'unavailable') {
      card.className = 'off' + (c.readonly ? ' ro' : '');
      r.querySelector('.big').innerHTML = '–';
      r.querySelector('.target').textContent = 'non disponibile';
      return;
    }
    const a = st.attributes;
    const cur = this._num(c.temperature_sensor) ?? a.current_temperature;
    const hum = this._num(c.humidity_sensor) ?? a.current_humidity;
    const action = a.hvac_action;
    const off = st.state === 'off';
    const mode = off ? 'off' : (action === 'heating' ? 'heat' : action === 'cooling' ? 'cool' : 'idle');
    card.className = mode + (c.readonly ? ' ro' : '');

    r.querySelector('.big').innerHTML = `${this._fmt(cur)}<span class="deg">°</span>`;
    const h = r.querySelector('.hum');
    h.style.visibility = (hum === null || hum === undefined) ? 'hidden' : 'visible';
    h.querySelector('span').textContent = `${Math.round(hum ?? 0)}%`;

    const bi = r.querySelector('.badge ha-icon'), bt = r.querySelector('.badge span');
    if (mode === 'heat') { bi.setAttribute('icon', 'mdi:fire'); bt.textContent = 'scalda'; }
    else if (mode === 'cool') { bi.setAttribute('icon', 'mdi:snowflake'); bt.textContent = 'raffresca'; }
    else if (mode === 'off') { bi.setAttribute('icon', 'mdi:power'); bt.textContent = 'spento'; }
    else { bi.setAttribute('icon', 'mdi:check-circle-outline'); bt.textContent = 'ok'; }

    const t = r.querySelector('.target');
    if (this._pending !== null && this._sentAt && Math.abs((a.temperature ?? -99) - this._pending) < 0.05) { this._pending = null; this._sentAt = null; }
    const target = this._pending ?? a.temperature;
    t.classList.toggle('pending', this._pending !== null);
    t.innerHTML = `<small>${off ? 'spento' : c.readonly ? 'impostata' : 'imposta'}</small>${this._fmt(target)}°`;
  }
}
customElements.define('room-climate-card', RoomClimateCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'room-climate-card', name: 'Clima stanza', description: 'Temperatura, umidità e +/- per stanza' });
