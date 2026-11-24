// window-card · «finestra» per stanze senza finestre
// Prato al vento disegnato in tempo reale (nessun video da scaricare) e suoni sintetizzati:
// soffio di vento e fruscio dell'erba. La luce del cielo segue l'ora del giorno.
// config: sound (true), volume (0..1, 0.35), wind (0..1, 0.5), sun_entity (sun.sun), preview_hour (ora fissa, solo per prove)
class WindowCard extends HTMLElement {
  setConfig(c) {
    this._c = Object.assign({ sound: true, volume: 0.35, wind: 0.5, sun_entity: 'sun.sun' }, c || {});
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._built = false;
  }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }
  set hass(h) { this._hass = h; if (!this._built) this._build(); }

  _build() {
    this._built = true;
    const r = this.shadowRoot;
    r.innerHTML = `<style>
      :host{display:block;height:100%}
      .w{position:relative;width:100%;height:100vh;min-height:320px;overflow:hidden;background:#000;cursor:none}
      canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
      .tap{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);font:500 15px -apple-system,Segoe UI,Roboto,sans-serif;color:rgba(255,255,255,.75);
        background:rgba(0,0,0,.28);padding:10px 18px;border-radius:999px;backdrop-filter:blur(8px);transition:opacity .8s}
      .tap.off{opacity:0;pointer-events:none}
    </style><div class="w"><canvas></canvas><div class="tap">Tocca per attivare il suono</div></div>`;
    this._cv = r.querySelector('canvas');
    this._tap = r.querySelector('.tap');
    if (!this._c.sound) this._tap.classList.add('off');
    r.querySelector('.w').addEventListener('click', () => this._startAudio());
    this._seed();
    this._t0 = performance.now();
    const loop = (t) => { if (!this.isConnected) { this._raf = null; return; } this._draw(t); this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
    if (this._c.sound) setTimeout(() => this._startAudio(true), 400);
  }

  connectedCallback() { if (this._built && !this._raf) { const loop = (t) => { if (!this.isConnected) { this._raf = null; return; } this._draw(t); this._raf = requestAnimationFrame(loop); }; this._raf = requestAnimationFrame(loop); } }
  disconnectedCallback() { if (this._ac) { try { this._ac.close(); } catch (e) {} this._ac = null; } }

  _seed() {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    this._blades = [];
    for (let layer = 0; layer < 4; layer++) {
      const n = 160 + layer * 150;
      for (let i = 0; i < n; i++) this._blades.push({ layer, x: rnd(), h: 0.05 + rnd() * 0.07 * (1 + layer * 0.55), w: 1 + layer * 0.9 + rnd(), ph: rnd() * 6.28, k: 0.6 + rnd() * 0.8, tint: rnd() });
    }
    this._clouds = Array.from({ length: 6 }, () => ({ x: rnd(), y: 0.06 + rnd() * 0.22, s: 0.12 + rnd() * 0.18, v: 0.004 + rnd() * 0.006 }));
    this._flowers = Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd(), c: ['#fff6d6', '#ffd75e', '#f7b2c8', '#c9b8ff'][Math.floor(rnd() * 4)], ph: rnd() * 6.28 }));
  }

  _sky() {
    // 0 notte · 1 giorno pieno, con tramonto caldo vicino all'orizzonte
    const sun = this._hass && this._hass.states[this._c.sun_entity];
    let el = (this._c.preview_hour == null && sun) ? parseFloat(sun.attributes.elevation) : null;
    if (el === null || isNaN(el)) { const hr = this._c.preview_hour != null ? this._c.preview_hour : new Date().getHours() + new Date().getMinutes() / 60; el = 50 * Math.sin((hr - 6.5) / 13 * Math.PI); }
    const day = Math.max(0, Math.min(1, (el + 6) / 26));
    const warm = Math.max(0, 1 - Math.abs(el - 3) / 9);
    return { day, warm };
  }

  _draw(t) {
    const cv = this._cv, dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const time = (t - this._t0) / 1000, { day, warm } = this._sky();
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
    const top = mix(mix([10, 16, 40], [92, 160, 225], day), [255, 170, 120], warm * 0.35);
    const hor = mix(mix([30, 36, 70], [190, 222, 245], day), [255, 196, 140], warm * 0.7);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.62); sky.addColorStop(0, rgb(top)); sky.addColorStop(1, rgb(hor));
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // sole morbido
    const sx = W * 0.78, sy = H * (0.52 - day * 0.34);
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.45);
    sg.addColorStop(0, `rgba(255,${235 - warm * 50},${190 - warm * 80},${0.55 * Math.max(day, warm)})`); sg.addColorStop(1, 'rgba(255,220,170,0)');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    // stelle e luna quando è buio
    if (day < 0.35) { const a = (0.35 - day) / 0.35; g.fillStyle = `rgba(255,255,255,${0.8 * a})`;
      for (let i = 0; i < 90; i++) { const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * W, y = (Math.sin(i * 47.3) * 0.5 + 0.5) * H * 0.5, tw = 0.5 + 0.5 * Math.sin(time * 1.3 + i); g.globalAlpha = a * (0.3 + 0.7 * tw); g.fillRect(x, y, 1.4, 1.4); }
      g.globalAlpha = a; g.fillStyle = '#f4f1e6'; g.beginPath(); g.arc(W * 0.2, H * 0.16, H * 0.035, 0, 6.28); g.fill(); g.globalAlpha = 1; }
    // nuvole
    g.fillStyle = `rgba(${day > 0.3 ? '255,255,255' : '150,160,190'},${0.06 + day * 0.5})`;
    for (const c of this._clouds) {
      const x = ((c.x + time * c.v * (0.6 + this._c.wind)) % 1.3 - 0.15) * W, y = c.y * H, s = c.s * W;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(x + (i - 2) * s * 0.22, y + Math.sin(i * 1.7) * s * 0.05, s * 0.2, s * 0.08, 0, 0, 6.28); g.fill(); }
    }
    // colline
    const hill = (yb, amp, col, f) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * yb - Math.sin(x / W * f + 1.3) * amp * H - Math.sin(x / W * f * 2.7) * amp * 0.35 * H); g.lineTo(W, H); g.fill(); };
    hill(0.6, 0.04, rgb(mix(mix([20, 34, 40], [120, 160, 150], day), [190, 150, 120], warm * 0.3)), 5);
    hill(0.66, 0.035, rgb(mix(mix([16, 34, 24], [88, 150, 84], day), [170, 140, 70], warm * 0.3)), 7);
    // prato di fondo
    const gg = g.createLinearGradient(0, H * 0.64, 0, H);
    gg.addColorStop(0, rgb(mix([14, 30, 16], [96, 160, 70], day))); gg.addColorStop(1, rgb(mix([6, 16, 8], [40, 96, 34], day)));
    g.fillStyle = gg; g.fillRect(0, H * 0.64, W, H * 0.36);
    // raffiche: vento lento con onde che attraversano il prato
    const wind = this._c.wind, gust = 0.55 + 0.45 * Math.sin(time * 0.23) * Math.sin(time * 0.071 + 1);
    // fiori
    for (const f of this._flowers) {
      const y = H * (0.7 + f.y * 0.28), x = f.x * W + Math.sin(time * 1.6 + f.x * 9 + f.ph) * 4 * wind * gust;
      g.fillStyle = f.c; g.globalAlpha = 0.35 + day * 0.6; g.beginPath(); g.arc(x, y, 1.6 + f.y * 2.4, 0, 6.28); g.fill();
    }
    g.globalAlpha = 1;
    // fili d'erba, dal fondo al primo piano
    const baseCol = [mix([20, 50, 22], [92, 168, 70], day), mix([26, 62, 26], [128, 196, 86], day), mix([14, 40, 18], [70, 140, 52], day)];
    for (const b of this._blades) {
      const L = b.layer, y0 = H * (0.66 + L * 0.1 + (b.tint - 0.5) * 0.04), x0 = b.x * W;
      const S = Math.min(H, W * 0.5625); const len = b.h * S * (1 + L * 0.6);
      const wave = Math.sin(time * 1.15 - b.x * 7 + L * 0.4) * 0.5 + Math.sin(time * 2.3 + b.ph) * 0.18;
      const bend = (0.25 + wind * 0.9) * gust * (0.6 + wave) * b.k;
      const tx = x0 + bend * len * 0.55, ty = y0 - len * (1 - 0.18 * bend * bend);
      const col = baseCol[Math.floor(b.tint * 3)];
      g.strokeStyle = `rgba(${col[0] + L * 6},${col[1] + L * 8},${col[2] + L * 4},${0.55 + L * 0.13})`;
      g.lineWidth = b.w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + bend * len * 0.1, y0 - len * 0.55, tx, ty); g.stroke();
    }
    // luce calda che entra nella stanza
    const vg = g.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.5, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.35 - day * 0.15})`);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (this._gain) this._modAudio(gust);
  }

  _startAudio(auto) {
    if (!this._c.sound || this._ac) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
      const noise = (secs) => { const b = ac.createBuffer(1, ac.sampleRate * secs, ac.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } return b; };
      const white = (secs) => { const b = ac.createBuffer(1, ac.sampleRate * secs, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
      const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      // vento: rumore marrone filtrato passa-basso, lento
      const w = ac.createBufferSource(); w.buffer = noise(8); w.loop = true;
      const wf = ac.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 420; wf.Q.value = 0.6;
      const wg = ac.createGain(); wg.gain.value = 0.55; w.connect(wf).connect(wg).connect(master);
      // fruscio dell'erba: rumore bianco passa-banda alto, modulato dalle raffiche
      const r = ac.createBufferSource(); r.buffer = white(4); r.loop = true;
      const rf = ac.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 3800; rf.Q.value = 0.7;
      const rg = ac.createGain(); rg.gain.value = 0.06; r.connect(rf).connect(rg).connect(master);
      w.start(); r.start();
      master.gain.linearRampToValueAtTime(this._c.volume, ac.currentTime + 3);
      this._ac = ac; this._gain = { wf, wg, rg, rf };
      if (ac.state === 'running') this._tap.classList.add('off');
      else if (!auto) ac.resume().then(() => this._tap.classList.add('off'));
      else { this._ac = null; this._gain = null; ac.close(); }
    } catch (e) { this._tap.textContent = 'Audio non disponibile'; }
  }

  _modAudio(gust) {
    const now = this._ac.currentTime, k = this._c.wind;
    this._gain.wf.frequency.setTargetAtTime(260 + 520 * gust * (0.5 + k), now, 0.8);
    this._gain.wg.gain.setTargetAtTime(0.3 + 0.5 * gust, now, 0.8);
    this._gain.rg.gain.setTargetAtTime(0.02 + 0.09 * gust * gust * (0.5 + k), now, 0.5);
  }
}
customElements.define('window-card', WindowCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'window-card', name: 'Finestra', description: 'Prato al vento con suoni ambientali' });
