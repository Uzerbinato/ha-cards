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
})();
