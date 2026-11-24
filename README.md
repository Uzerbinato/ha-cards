# ha-cards

Card grafiche su misura per Home Assistant (JavaScript, nessuna dipendenza).
Contiene solo codice grafico: nessuna configurazione, nome di dispositivo o indirizzo.

| File | Card |
|---|---|
| `room-climate-card.js` | `room-climate-card` – clima per stanza |
| `energy-hud-card.js` | `energy-hud-card` – cruscotto energia con flussi animati |
| `energy-balance-card.js` | `energy-balance-card`, `energy-devices-card` – bilancio kWh/€ e consumatori |
| `meteo-hero-card.js` | `meteo-hero-card` – intestazione meteo animata |
| `home-cards2.js` | `kpi-card`, `heatpump-card`, `lights-card`, `media-card`, `vacuum-card`, `camera-strip-card` |
| `home-cards3.js` | `receiver-card` – sintoamplificatore |
| `home-cards4.js` | `lights-zone-card`, `security-card` |
| `theme-notte.js` | tema scuro blu notte (variabili CSS), senza file di tema |
| `theme-grafite.js` | tema scuro grafite con accento ambra |

## Uso in Home Assistant

Risorsa della dashboard (tipo «modulo JavaScript»), servita da jsDelivr:

```
https://cdn.jsdelivr.net/gh/Uzerbinato/ha-cards@<commit>/room-climate-card.js
```

Si usa un commit preciso invece di `main`, così la dashboard non cambia finché non si aggiorna l'indirizzo.
