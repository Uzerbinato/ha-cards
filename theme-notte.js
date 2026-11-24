// theme-notte · tema scuro blu notte, applicato senza file di tema
// Imposta le variabili CSS del frontend all'avvio e le riapplica se il frontend le sovrascrive.
(() => {
  const V = {
    'primary-font-family': "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
    'lovelace-background': 'radial-gradient(1200px 700px at 10% -10%, rgba(56,189,248,0.16), transparent 60%), radial-gradient(900px 600px at 110% 10%, rgba(245,158,11,0.10), transparent 55%), radial-gradient(1000px 800px at 50% 120%, rgba(99,102,241,0.12), transparent 60%), #0b1020',
    'primary-background-color': '#0b1020', 'secondary-background-color': '#121a2e',
    'ha-card-background': 'rgba(22, 30, 52, 0.62)', 'card-background-color': 'rgba(22, 30, 52, 0.62)',
    'ha-card-border-radius': '22px', 'ha-card-border-width': '1px', 'ha-card-border-color': 'rgba(148, 163, 184, 0.14)',
    'ha-card-box-shadow': '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
    'ha-dialog-border-radius': '26px', 'mdc-dialog-scrim-color': 'rgba(5,8,18,0.6)',
    'primary-text-color': '#e6edf7', 'secondary-text-color': '#94a3b8', 'disabled-text-color': '#5b6b85', 'text-primary-color': '#ffffff',
    'primary-color': '#38bdf8', 'accent-color': '#f59e0b', 'light-primary-color': '#7dd3fc', 'dark-primary-color': '#0284c7',
    'state-icon-color': '#94a3b8', 'state-active-color': '#f59e0b', 'state-climate-heat-color': '#fb923c', 'state-climate-cool-color': '#38bdf8',
    'success-color': '#34d399', 'warning-color': '#fbbf24', 'error-color': '#f87171', 'info-color': '#38bdf8',
    'divider-color': 'rgba(148,163,184,0.12)',
    'app-header-background-color': 'rgba(11,16,32,0.72)', 'app-header-text-color': '#e6edf7', 'app-header-selection-bar-color': '#38bdf8',
    'sidebar-background-color': '#0d1426', 'sidebar-text-color': '#cbd5e1', 'sidebar-selected-background-color': 'rgba(56,189,248,0.14)',
    'sidebar-selected-icon-color': '#38bdf8', 'sidebar-selected-text-color': '#e0f2fe', 'sidebar-icon-color': '#64748b',
    'switch-checked-color': '#38bdf8', 'slider-color': '#38bdf8', 'slider-track-color': 'rgba(148,163,184,0.25)',
    'input-fill-color': 'rgba(30,41,59,0.6)', 'mdc-text-field-fill-color': 'rgba(30,41,59,0.6)', 'ha-color-form-background': 'rgba(30,41,59,0.6)',
    'input-ink-color': '#e6edf7', 'mdc-theme-surface': '#161e34', 'ha-dialog-surface-background': '#161e34',
    'wa-color-surface-default': '#161e34', 'wa-color-surface-raised': '#161e34',
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
