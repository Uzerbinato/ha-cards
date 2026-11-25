// theme-grafite · tema scuro grafite con accento ambra, applicato senza file di tema
// Imposta le variabili CSS del frontend all'avvio e le riapplica se il frontend le sovrascrive.
(() => {
  const V = {
    'primary-font-family': "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
    'lovelace-background': 'radial-gradient(1200px 700px at 10% -10%, rgba(245,181,68,0.14), transparent 60%), radial-gradient(900px 600px at 110% 10%, rgba(148,163,184,0.10), transparent 55%), radial-gradient(1000px 800px at 50% 120%, rgba(245,158,11,0.08), transparent 60%), #101215',
    'primary-background-color': '#101215', 'secondary-background-color': '#171a1f',
    'ha-card-background': 'rgba(30, 33, 39, 0.66)', 'card-background-color': 'rgba(30, 33, 39, 0.66)',
    'ha-card-border-radius': '22px', 'ha-card-border-width': '1px', 'ha-card-border-color': 'rgba(148, 163, 184, 0.14)',
    'ha-card-box-shadow': '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
    'ha-dialog-border-radius': '26px', 'mdc-dialog-scrim-color': 'rgba(5,8,18,0.6)',
    'primary-text-color': '#e6edf7', 'secondary-text-color': '#94a3b8', 'disabled-text-color': '#5b6b85', 'text-primary-color': '#ffffff',
    'primary-color': '#f5b544', 'accent-color': '#38bdf8', 'light-primary-color': '#fcd34d', 'dark-primary-color': '#b45309',
    'state-icon-color': '#94a3b8', 'state-active-color': '#f59e0b', 'state-climate-heat-color': '#fb923c', 'state-climate-cool-color': '#38bdf8',
    'success-color': '#34d399', 'warning-color': '#fbbf24', 'error-color': '#f87171', 'info-color': '#38bdf8',
    'divider-color': 'rgba(148,163,184,0.12)',
    'app-header-background-color': 'rgba(16,18,21,0.75)', 'app-header-text-color': '#e6edf7', 'app-header-selection-bar-color': '#f5b544',
    'sidebar-background-color': '#121418', 'sidebar-text-color': '#cbd5e1', 'sidebar-selected-background-color': 'rgba(245,181,68,0.14)',
    'sidebar-selected-icon-color': '#f5b544', 'sidebar-selected-text-color': '#fef3c7', 'sidebar-icon-color': '#64748b',
    'switch-checked-color': '#f5b544', 'slider-color': '#f5b544', 'slider-track-color': 'rgba(148,163,184,0.25)',
    'input-fill-color': 'rgba(30,41,59,0.6)', 'mdc-text-field-fill-color': 'rgba(30,41,59,0.6)', 'ha-color-form-background': 'rgba(30,41,59,0.6)',
    'input-ink-color': '#e6edf7', 'mdc-theme-surface': '#1c1f25', 'ha-dialog-surface-background': '#1c1f25',
    'wa-color-surface-default': '#1c1f25', 'wa-color-surface-raised': '#1c1f25',
    'code-editor-background-color': '#0f172a',
    'energy-grid-consumption-color': '#60a5fa', 'energy-grid-return-color': '#a78bfa', 'energy-solar-color': '#fbbf24',
    'energy-battery-out-color': '#34d399', 'energy-battery-in-color': '#10b981',
  };
  const el = document.documentElement;
  let busy = false;
  const apply = () => {
    if (busy) return; busy = true;
    for (const [k, v] of Object.entries(V)) if (el.style.getPropertyValue('--' + k) !== v) el.style.setProperty('--' + k, v);
    el.style.setProperty('color-scheme', 'dark');
    busy = false;
  };
  apply();
  new MutationObserver(apply).observe(el, { attributes: true, attributeFilter: ['style'] });
})();

// Schermo TV (Google Cast): riduce la scala per far stare più schede nello schermo
(() => {
  if (!/CrKey|Cast/i.test(navigator.userAgent) && !/[?&]tv=1/.test(location.search)) return;
  const st = document.createElement('style');
  st.textContent = 'html{zoom:0.62}';
  document.head.appendChild(st);
  // TV: niente barra laterale, intestazione e navbar
  try { localStorage.setItem('dockedSidebar', '"always_hidden"'); } catch (e) {}
  const q = (root, sel) => root && root.shadowRoot && root.shadowRoot.querySelector(sel);
  const hide = () => {
    const ha = document.querySelector('home-assistant');
    const main = q(ha, 'home-assistant-main');
    const drawer = q(main, 'ha-drawer');
    const sb = drawer && drawer.querySelector('ha-sidebar'); if (sb) sb.style.display = 'none';
    if (drawer && drawer.shadowRoot) { const a = drawer.shadowRoot.querySelector('aside'); if (a) a.style.display = 'none'; const ac = drawer.shadowRoot.querySelector('.mdc-drawer-app-content'); if (ac) { ac.style.marginLeft = '0'; ac.style.paddingLeft = '0'; } }
    const panel = q(main, 'partial-panel-resolver') || (drawer && drawer.querySelector('partial-panel-resolver'));
    const lov = panel && panel.querySelector('ha-panel-lovelace');
    const root = q(lov, 'hui-root');
    if (root && root.shadowRoot && !root.shadowRoot.getElementById('tvhide')) {
      const x = document.createElement('style'); x.id = 'tvhide';
      x.textContent = '.header,.toolbar,app-header{display:none!important}#view{padding-top:0!important;min-height:100vh!important}';
      root.shadowRoot.appendChild(x);
    }
    document.querySelectorAll('*').length; // no-op
    const deep = (n) => { if (!n) return; if (n.tagName === 'NAVBAR-CARD') n.style.display = 'none'; (n.shadowRoot ? [...n.shadowRoot.children] : []).concat([...(n.children || [])]).forEach(deep); };
    if (root) deep(root);
  };
  setInterval(hide, 2000);
  // adatta la scala perché tutta la pagina stia nello schermo, senza scorrere
  let z = 0.62;
  const fit = () => {
    const se = document.scrollingElement || document.documentElement;
    const r = se.scrollHeight / Math.max(1, se.clientHeight);
    let nz = z;
    if (r > 1.01) nz = z / r * 0.99; else if (r < 0.98 && z < 1) nz = Math.min(1, z / r * 0.99);
    nz = Math.max(0.35, Math.round(nz * 1000) / 1000);
    if (Math.abs(nz - z) > 0.004) { z = nz; st.textContent = 'html{zoom:' + z + '}'; }
  };
  setInterval(fit, 3000);
  // testi piccoli più leggibili da lontano: ingrandisce del 22% i testi HTML sotto i 15 px (non gli SVG)
  const seen = new WeakSet();
  const boost = (root) => {
    const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of all) {
      if (el.shadowRoot) boost(el.shadowRoot);
      if (seen.has(el) || el instanceof SVGElement) continue;
      seen.add(el);
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs && fs < 15) el.style.setProperty('font-size', (fs * 1.22).toFixed(1) + 'px', 'important');
    }
  };
  setInterval(() => boost(document), 2500);
})();
