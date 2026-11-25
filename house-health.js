(() => {
  const DEF = {
    ignore_platforms: ["ibeacon", "updater", "energy", "battery_notes", "powercalc", "mobile_app", "spook", "presence_simulation"],
    ignore_integrations: [],
    ignore_devices: [],
    battery_low: 20,
    path: "/dashboard-casa/salute"
  };
  const BAD = { setup_error: "Errore di avvio", setup_retry: "Non raggiungibile, riprova", migration_error: "Errore di migrazione", failed_unload: "Errore" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ago = (iso) => {
    const m = Math.max(0, (Date.now() - new Date(iso).getTime()) / 6e4);
    if (m < 60) return "da " + Math.round(m) + " min";
    const h = m / 60;
    if (h < 48) return "da " + Math.round(h) + " h";
    return "da " + Math.round(h / 24) + " giorni";
  };
  let ENTRIES = null, ENTRIES_T = 0, MANI = null;
  async function loadEntries(hass) {
    if (!ENTRIES || Date.now() - ENTRIES_T > 6e4) {
      ENTRIES = await hass.callWS({ type: "config_entries/get" });
      ENTRIES_T = Date.now();
    }
    if (!MANI) {
      try {
        const l = await hass.callWS({ type: "manifest/list" });
        MANI = {};
        l.forEach((m) => MANI[m.domain] = m.name);
      } catch (e) {
        MANI = {};
      }
    }
    return ENTRIES;
  }
  const iname = (d) => MANI && MANI[d] || d;
  function analyze(hass, c, entries) {
    const ig = (arr, v) => arr.some((x) => String(x).toLowerCase() === String(v).toLowerCase());
    const ent = (entries || []).filter((e) => !e.disabled_by && !ig(c.ignore_integrations, e.domain) && !ig(c.ignore_integrations, e.title));
    const badInt = ent.filter((e) => BAD[e.state]).map((e) => ({ domain: e.domain, title: e.title, state: BAD[e.state], reason: e.reason || "" }));
    const offInt = ent.filter((e) => e.state === "not_loaded" && !ig(c.ignore_platforms, e.domain)).map((e) => ({ domain: e.domain, title: e.title }));
    const badIds = new Set(ent.filter((e) => BAD[e.state] || e.state === "not_loaded").map((e) => e.entry_id));
    const byDev = {};
    Object.values(hass.entities).forEach((e) => {
      if (!e.device_id || e.hidden || ig(c.ignore_platforms, e.platform)) return;
      const st = hass.states[e.entity_id];
      if (!st) return;
      (byDev[e.device_id] = byDev[e.device_id] || []).push({ e, st });
    });
    const unreach = [];
    Object.entries(byDev).forEach(([id, list]) => {
      const d = hass.devices[id];
      if (!d || d.disabled_by) return;
      const name = d.name_by_user || d.name || id;
      if (ig(c.ignore_devices, name)) return;
      if (d.config_entries && d.config_entries.length && d.config_entries.every((x) => badIds.has(x))) return;
      const prim = list.filter((x) => !x.e.entity_category);
      const use = prim.length ? prim : list;
      if (use.every((x) => x.st.state === "unavailable")) {
        const last = use.map((x) => x.st.last_changed).sort().pop();
        const area = d.area_id && hass.areas[d.area_id] ? hass.areas[d.area_id].name : "";
        unreach.push({ name, area, platform: use[0].e.platform, last });
      }
    });
    unreach.sort((a, b) => (b.last || "").localeCompare(a.last || ""));
    const bats = [], lowBin = [];
    Object.values(hass.states).forEach((s) => {
      if (s.attributes.device_class !== "battery") return;
      const e = hass.entities[s.entity_id];
      if (e && (e.hidden || ig(c.ignore_platforms, e.platform))) return;
      if (/state_of_charge|carica_media|_soc/.test(s.entity_id)) return;
      const d = e && e.device_id ? hass.devices[e.device_id] : null;
      let name = d ? d.name_by_user || d.name : s.attributes.friendly_name || s.entity_id;
      const area = d && d.area_id && hass.areas[d.area_id] ? hass.areas[d.area_id].name : "";
      if (area && /^[A-Z]{2}\d{6,}$/.test(name)) name = area + " (" + name.slice(0, 2) + ")";
      if (s.entity_id.startsWith("sensor.")) {
        const v = parseFloat(s.state);
        if (!isNaN(v) && v >= 0) bats.push({ name, v, id: s.entity_id, area });
      } else if (s.entity_id.startsWith("binary_sensor.") && s.state === "on") lowBin.push({ name, id: s.entity_id, area });
    });
    bats.sort((a, b) => a.v - b.v);
    const low = bats.filter((b) => b.v < c.battery_low);
    const ups = Object.values(hass.states).filter((s) => s.entity_id.startsWith("update.") && s.state === "on" && !s.attributes.skipped_version).map((s) => ({ name: s.attributes.title || s.attributes.friendly_name || s.entity_id, from: s.attributes.installed_version, to: s.attributes.latest_version, id: s.entity_id }));
    const maint = [];
    [["sensor.camilla_tempo_residuo_della_spazzola_principale", "spazzola principale"], ["sensor.camilla_tempo_residuo_della_spazzola_laterale", "spazzola laterale"], ["sensor.camilla_tempo_di_filtraggio_rimanente", "filtro"], ["sensor.camilla_tempo_residuo_del_sensore", "sensori"]].forEach(([id, n]) => {
      const s = hass.states[id];
      if (s && parseFloat(s.state) <= 0) maint.push(n);
    });
    const al = [];
    if (badInt.length) al.push({ lvl: "red", icon: "mdi:puzzle-remove-outline", title: badInt.length === 1 ? "Integrazione con problemi" : badInt.length + " integrazioni con problemi", text: badInt.slice(0, 3).map((x) => x.title).join(" \xB7 ") + (badInt.length > 3 ? "\u2026" : "") });
    if (low.length || lowBin.length) {
      const n = low.length + lowBin.length;
      al.push({ lvl: "amber", icon: "mdi:battery-alert-variant-outline", title: n === 1 ? "Batteria scarica" : n + " batterie scariche", text: low.map((b) => b.name + " " + Math.round(b.v) + "%").concat(lowBin.map((b) => b.name)).slice(0, 3).join(" \xB7 ") });
    }
    if (unreach.length) al.push({ lvl: "amber", icon: "mdi:lan-disconnect", title: unreach.length === 1 ? "Dispositivo non raggiungibile" : unreach.length + " dispositivi non raggiungibili", text: unreach.slice(0, 3).map((x) => x.name).join(" \xB7 ") + (unreach.length > 3 ? "\u2026" : "") });
    if (maint.length) al.push({ lvl: "amber", icon: "mdi:robot-vacuum-alert", title: "Camilla: manutenzione", text: "Da fare: " + maint.join(", ") });
    if (ups.length) al.push({ lvl: "blue", icon: "mdi:package-up", title: ups.length === 1 ? "Aggiornamento disponibile" : ups.length + " aggiornamenti disponibili", text: ups.slice(0, 3).map((u) => u.name).join(" \xB7 ") });
    return { al, badInt, offInt, unreach, bats, lowBin, ups };
  }
  const COL = { red: "#f87171", amber: "#fbbf24", blue: "#38bdf8", green: "#4ade80" };
  const BG = "radial-gradient(120% 90% at 50% 0%,#18242b 0%,#0d1317 62%,#0a0f12 100%)";
  const BASE = "ha-card{background:" + BG + ";border:1px solid rgba(140,200,255,.10);border-radius:20px;color:#e6edf7;font-family:var(--primary-font-family,inherit)}";
  class Base extends HTMLElement {
    setConfig(c) {
      this._c = Object.assign({}, DEF, c || {});
    }
    set hass(h) {
      this._h = h;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const now = Date.now();
      if (this._t && now - this._t < 15e3) return;
      this._t = now;
      loadEntries(h).then((en) => {
        this._d = analyze(h, this._c, en);
        this._render();
      }).catch((e) => {
        this._err = e.message || String(e);
        this._render();
      });
    }
  }
  class HouseAlertsCard extends Base {
    getCardSize() {
      return 1;
    }
    getGridOptions() {
      return { columns: 12, rows: "auto" };
    }
    _render() {
      const d = this._d;
      if (!d) return;
      const a = d.al;
      if (!a.length) {
        this.shadowRoot.innerHTML = "";
        this.style.display = "none";
        return;
      }
      this.style.display = "";
      const f = a[0], col = COL[f.lvl];
      this.shadowRoot.innerHTML = "<style>" + BASE + "ha-card{display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;border-left:3px solid " + col + ";background:linear-gradient(90deg," + col + "22,rgba(13,19,23,.92) 60%)}ha-icon{color:" + col + ';--mdc-icon-size:22px;flex:none}.m{flex:1;min-width:0}.t{font-size:14px;font-weight:600}.s{font-size:12px;color:#b6c4cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.n{font-size:12px;color:#e6edf7;background:rgba(148,163,184,.14);border-radius:99px;padding:3px 10px;flex:none}.c{color:#8fa3ad;flex:none}</style><ha-card><ha-icon icon="' + f.icon + '"></ha-icon><div class="m"><div class="t">' + esc(f.title) + '</div><div class="s">' + esc(f.text) + "</div></div>" + (a.length > 1 ? '<span class="n">e altri ' + (a.length - 1) + "</span>" : "") + '<ha-icon class="c" icon="mdi:chevron-right" style="color:#8fa3ad"></ha-icon></ha-card>';
      this.shadowRoot.querySelector("ha-card").onclick = () => {
        history.pushState(null, "", this._c.path);
        window.dispatchEvent(new CustomEvent("location-changed"));
      };
    }
  }
  class HouseHealthCard extends Base {
    getCardSize() {
      return 12;
    }
    getGridOptions() {
      return { columns: "full" };
    }
    _render() {
      const d = this._d;
      const css = BASE + "ha-card{padding:18px 20px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px}h3{font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:#8fa3ad;font-weight:500;margin:0 0 10px;display:flex;justify-content:space-between}h3 span{color:#e6edf7;letter-spacing:0}.al{display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:14px;margin-bottom:10px;background:rgba(148,163,184,.06);border-left:3px solid var(--c)}.al ha-icon{color:var(--c);--mdc-icon-size:22px;flex:none}.al b{display:block;font-size:14px}.al i{font-style:normal;font-size:12px;color:#b6c4cc}.ok{color:#4ade80;font-size:13px;padding:6px 0}.r{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:6px 0 4px;color:#d3dde3}.r em{font-style:normal;color:#8fa3ad;font-size:12px;text-align:right;white-space:nowrap}.r span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.b{height:4px;border-radius:99px;background:rgba(148,163,184,.14);overflow:hidden;margin-bottom:4px}.b div{height:100%;border-radius:99px}.sec{margin-bottom:22px}.sm{font-size:11px;color:#6f838d;margin-top:6px}.tag{font-size:11px;color:#8fa3ad;background:rgba(148,163,184,.10);border-radius:6px;padding:1px 6px;margin-left:6px}";
      let h = "<ha-card>";
      if (!d) {
        h += '<div class="ok">' + esc(this._err || "Caricamento\u2026") + "</div></ha-card>";
        this.shadowRoot.innerHTML = "<style>" + css + "</style>" + h;
        return;
      }
      let c1 = '<div class="sec"><h3>Avvisi attivi <span>' + d.al.length + "</span></h3>";
      c1 += d.al.length ? d.al.map((a) => '<div class="al" style="--c:' + COL[a.lvl] + '"><ha-icon icon="' + a.icon + '"></ha-icon><div><b>' + esc(a.title) + "</b><i>" + esc(a.text) + "</i></div></div>").join("") : '<div class="ok">Tutto a posto.</div>';
      c1 += '</div><div class="sec"><h3>Integrazioni con problemi <span>' + d.badInt.length + "</span></h3>";
      c1 += d.badInt.length ? d.badInt.map((x) => '<div class="r"><span>' + esc(x.title) + '<span class="tag">' + esc(iname(x.domain)) + '</span></span><em style="color:#f87171">' + esc(x.state) + "</em></div>").join("") : '<div class="ok">Nessuna.</div>';
      if (d.offInt.length) c1 += '<div class="sm">Non caricate: ' + d.offInt.map((x) => esc(x.title)).join(", ") + "</div>";
      c1 += "</div>";
      let c2 = '<div class="sec"><h3>Batterie <span>' + (d.bats.length + d.lowBin.length) + "</span></h3>";
      d.lowBin.forEach((b) => {
        c2 += '<div class="r"><span>' + esc(b.name) + '</span><em style="color:#f87171">batteria scarica</em></div><div class="b"><div style="width:6%;background:#f87171"></div></div>';
      });
      d.bats.forEach((b) => {
        const col = b.v < this._c.battery_low ? "#f87171" : b.v < 40 ? "#fbbf24" : "#4ade80";
        c2 += '<div class="r"><span>' + esc(b.name) + '</span><em style="color:' + col + '">' + Math.round(b.v) + '%</em></div><div class="b"><div style="width:' + Math.max(3, b.v) + "%;background:" + col + '"></div></div>';
      });
      if (!d.bats.length && !d.lowBin.length) c2 += '<div class="ok">Nessun sensore a batteria.</div>';
      c2 += '</div><div class="sec"><h3>Aggiornamenti <span>' + d.ups.length + "</span></h3>";
      c2 += d.ups.length ? d.ups.map((u) => '<div class="r"><span>' + esc(u.name) + "</span><em>" + esc(u.from || "") + " \u2192 " + esc(u.to || "") + "</em></div>").join("") : '<div class="ok">Tutto aggiornato.</div>';
      c2 += "</div>";
      let c3 = '<div class="sec"><h3>Dispositivi non raggiungibili <span>' + d.unreach.length + "</span></h3>";
      c3 += d.unreach.length ? d.unreach.map((x) => '<div class="r"><span>' + esc(x.name) + (x.area ? '<span class="tag">' + esc(x.area) + "</span>" : "") + "</span><em>" + esc(iname(x.platform)) + " \xB7 " + ago(x.last) + "</em></div>").join("") : '<div class="ok">Tutti raggiungibili.</div>';
      c3 += '<div class="sm">Un dispositivo \xE8 segnalato quando tutte le sue entit\xE0 principali risultano non disponibili.</div></div>';
      h += '<div class="g"><div>' + c1 + "</div><div>" + c2 + "</div><div>" + c3 + "</div></div></ha-card>";
      this.shadowRoot.innerHTML = "<style>" + css + "</style>" + h;
    }
  }
  if (!customElements.get("house-alerts-card")) customElements.define("house-alerts-card", HouseAlertsCard);
  if (!customElements.get("house-health-card")) customElements.define("house-health-card", HouseHealthCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "house-health-card", name: "Salute della casa", description: "Batterie, dispositivi non raggiungibili, integrazioni e aggiornamenti" });
  window.customCards.push({ type: "house-alerts-card", name: "Striscia avvisi", description: "Avviso principale con rimando alla pagina Salute" });
})();
