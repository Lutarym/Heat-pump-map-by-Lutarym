/**
 * lutarym-heatpump-card
 *
 * Anlagenschema fuer Panasonic Aquarea via HeishaMon.
 * Breitformat: alle Baugruppen in einer Reihe nebeneinander.
 *
 * Autor: Lutarym
 */

const CARD_VERSION = "0.5.1";

/* ------------------------------------------------------------------ *
 *  Zeichenraster
 *
 *  Alle waagerechten Bezugslinien an einer Stelle. Die Baugruppen
 *  haengen zwischen Vorlauf oben und Ruecklauf unten, die
 *  Beschriftungen liegen darunter, nie auf einer Leitung.
 * ------------------------------------------------------------------ */
const L = {
  W: 1640,
  H: 600,
  FLOW_Y: 150, // Vorlaufleitung
  RET_Y: 500, // Ruecklaufleitung
  TANK_TOP: 200,
  TANK_BOTTOM: 440,
  RAD_TOP: 240,
  RAD_BOTTOM: 400,
  CAP_Y: 548, // Grundlinie aller Beschriftungen, klar unter der Ruecklaufleitung
};

/* ------------------------------------------------------------------ *
 *  Thermische Farbskala
 * ------------------------------------------------------------------ */
const THERMAL_STOPS = [
  { p: 0.0, c: [29, 78, 216] },
  { p: 0.3, c: [6, 166, 199] },
  { p: 0.55, c: [242, 178, 51] },
  { p: 0.78, c: [238, 122, 43] },
  { p: 1.0, c: [214, 43, 43] },
];

const NEUTRAL = "#46536A";

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function thermalColor(value, min, max) {
  if (value === null || value === undefined || Number.isNaN(value)) return NEUTRAL;
  const span = max - min || 1;
  const p = clamp((value - min) / span, 0, 1);
  let a = THERMAL_STOPS[0];
  let b = THERMAL_STOPS[THERMAL_STOPS.length - 1];
  for (let i = 0; i < THERMAL_STOPS.length - 1; i++) {
    if (p >= THERMAL_STOPS[i].p && p <= THERMAL_STOPS[i + 1].p) {
      a = THERMAL_STOPS[i];
      b = THERMAL_STOPS[i + 1];
      break;
    }
  }
  const local = (p - a.p) / ((b.p - a.p) || 1);
  const rgb = a.c.map((ch, i) => Math.round(ch + (b.c[i] - ch) * local));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/* ------------------------------------------------------------------ *
 *  Zustandshelfer
 * ------------------------------------------------------------------ */
function numState(hass, entityId) {
  if (!hass || !entityId) return null;
  const st = hass.states[entityId];
  if (!st) return null;
  const v = parseFloat(st.state);
  return Number.isNaN(v) ? null : v;
}

function rawState(hass, entityId) {
  if (!hass || !entityId) return null;
  const st = hass.states[entityId];
  return st ? st.state : null;
}

function attr(hass, entityId, key, fallback) {
  if (!hass || !entityId) return fallback;
  const st = hass.states[entityId];
  if (!st || st.attributes[key] === undefined) return fallback;
  return st.attributes[key];
}

function isOn(hass, entityId) {
  const s = rawState(hass, entityId);
  if (s === null) return null;
  if (s === "on" || s === "true") return true;
  if (s === "off" || s === "false" || s === "unknown" || s === "unavailable") return false;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n > 0;
}

function fmt(value, digits) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(digits === undefined ? 1 : digits);
}

function friendly(hass, entityId) {
  return attr(hass, entityId, "friendly_name", entityId || "");
}

function escapeHtml(text) {
  return String(text === undefined || text === null ? "" : text).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* ------------------------------------------------------------------ *
 *  SG Ready
 *
 *  Vier Betriebszustaende nach der Schnittstellenbeschreibung des
 *  Bundesverbands Waermepumpe. Die Klemmenloesung codiert sie ueber
 *  zwei Kontakte, K1 gesperrt und K2 Anlauf:
 *    1:0 Zustand 1, 0:0 Zustand 2, 0:1 Zustand 3, 1:1 Zustand 4.
 *
 *  HeishaMon liefert SG Ready nicht. Die Werte muessen aus der
 *  eigenen Verkabelung kommen, etwa aus zwei Relais.
 * ------------------------------------------------------------------ */
const SG_STATES = {
  1: { kurz: "Sperre", lang: "Sperre, hoechstens zwei Stunden", farbe: "#D6534A" },
  2: { kurz: "Normal", lang: "Energieeffizienter Normalbetrieb", farbe: "#7E8CA0" },
  3: { kurz: "Empfehlung", lang: "Einschaltempfehlung, verstaerkter Betrieb", farbe: "#F2B233" },
  4: { kurz: "Anlauf", lang: "Anlaufbefehl", farbe: "#46C07A" },
};

/* ------------------------------------------------------------------ *
 *  Erkennung der Integration "Heishamon by Lutarym"
 * ------------------------------------------------------------------ */
const INTEGRATION_DOMAIN = "heishamon_lutarym";

const TOPIC_TO_FIELD = {
  top14: "outside_temp",
  top4: "operating_mode",
  top8: "compressor",
  top1: "pump_flow",
  top15: "heat_output",
  top16: "power_input",
  top44: "error",
  top115: "water_pressure",
  top62: "fan1_rpm",
  top63: "fan2_rpm",
  top26: "defrost",
  top6: "flow_temp",
  top5: "return_temp",
  top65: "pump_speed",
  top20: "three_way_valve",
  top59: "room_heater",
  top46: "buffer_temp",
  // Heizkreis 1
  top36: "hk1_water",
  top42: "hk1_water_target",
  top56: "hk1_room",
  top124: "hk1_pump",
  top27: "hk1_setpoint",
  // Heizkreis 2
  top37: "hk2_water",
  top43: "hk2_water_target",
  top57: "hk2_room",
  top123: "hk2_pump",
  top34: "hk2_setpoint",
  // Warmwasser
  top10: "dhw_temp",
  top9: "dhw_setpoint",
  top58: "dhw_heater",
};

const COMMAND_TO_FIELD = {
  setheatpump: "power_switch",
  setforcedhw: "dhw_switch",
  setoperationmode: "mode_select",
};

const FIELD_DOMAIN = {
  hk1_setpoint: ["number", "input_number"],
  hk2_setpoint: ["number", "input_number"],
  dhw_setpoint: ["number", "input_number"],
  power_switch: ["switch", "input_boolean"],
  heating_switch: ["switch", "input_boolean"],
  dhw_switch: ["switch", "input_boolean"],
  mode_select: ["select", "input_select"],
  sg_k1: ["switch", "input_boolean", "binary_sensor", "sensor"],
  sg_k2: ["switch", "input_boolean", "binary_sensor", "sensor"],
};

function detectIntegration(hass) {
  const result = { found: false, source: "keine", entities: {}, count: 0, devices: 0 };
  if (!hass) return result;

  const assign = (key, entityId) => {
    const field = TOPIC_TO_FIELD[key] || COMMAND_TO_FIELD[key];
    if (!field || !entityId) return;
    const allowed = FIELD_DOMAIN[field];
    if (allowed && !allowed.includes(entityId.split(".")[0])) return;
    result.entities[field] = entityId;
  };

  const registry = hass.entities;
  if (registry && typeof registry === "object") {
    const deviceIds = new Set();
    let hits = 0;
    Object.keys(registry).forEach((entityId) => {
      const entry = registry[entityId];
      if (!entry || entry.platform !== INTEGRATION_DOMAIN) return;
      hits++;
      if (entry.device_id) deviceIds.add(entry.device_id);
      const key =
        entry.translation_key ||
        (entityId.match(/_(top\d+)$/) || [])[1] ||
        (entityId.match(/heishamon_(set\w+)$/) || [])[1] ||
        null;
      if (key) assign(key, entityId);
    });
    if (hits > 0) {
      result.found = true;
      result.source = "register";
      result.count = hits;
      result.devices = deviceIds.size;
      return result;
    }
  }

  let hits = 0;
  Object.keys(hass.states || {}).forEach((entityId) => {
    const m = entityId.match(
      /^(?:sensor|number|switch|select)\.heishamon_((?:top\d+)|(?:set\w+))$/
    );
    if (!m) return;
    hits++;
    assign(m[1], entityId);
  });
  if (hits > 0) {
    result.found = true;
    result.source = "namensschema";
    result.count = hits;
    result.devices = 1;
  }
  return result;
}

function defaultEntityMap() {
  const map = {};
  Object.keys(TOPIC_TO_FIELD).forEach((topic) => {
    const field = TOPIC_TO_FIELD[topic];
    const allowed = FIELD_DOMAIN[field];
    map[field] = `${allowed ? allowed[0] : "sensor"}.heishamon_${topic}`;
  });
  Object.keys(COMMAND_TO_FIELD).forEach((cmd) => {
    const field = COMMAND_TO_FIELD[cmd];
    map[field] = `${FIELD_DOMAIN[field][0]}.heishamon_${cmd}`;
  });
  return map;
}

/* ------------------------------------------------------------------ *
 *  Konfiguration
 * ------------------------------------------------------------------ */
const ENTITY_FIELDS = [
  { key: "outside_temp", label: "Aussentemperatur", group: "Aussenfuehler", hint: "TOP14" },

  { key: "operating_mode", label: "Betriebsart", group: "Anlage", hint: "TOP4" },
  { key: "compressor", label: "Verdichterdrehzahl", group: "Anlage", hint: "TOP8" },
  { key: "pump_flow", label: "Wasserdurchfluss", group: "Anlage", hint: "TOP1" },
  { key: "heat_output", label: "Abgegebene Heizleistung", group: "Anlage", hint: "TOP15" },
  { key: "power_input", label: "Stromaufnahme", group: "Anlage", hint: "TOP16" },
  { key: "error", label: "Fehlercode", group: "Anlage", hint: "TOP44" },
  { key: "water_pressure", label: "Wasserdruck", group: "Anlage", hint: "TOP115" },

  { key: "fan1_rpm", label: "Luefter 1 Drehzahl", group: "Aussengeraet", hint: "TOP62" },
  { key: "fan2_rpm", label: "Luefter 2 Drehzahl", group: "Aussengeraet", hint: "TOP63" },
  { key: "defrost", label: "Abtauung laeuft", group: "Aussengeraet", hint: "TOP26" },

  { key: "flow_temp", label: "Vorlauftemperatur", group: "Primaerkreis", hint: "TOP6" },
  { key: "return_temp", label: "Ruecklauftemperatur", group: "Primaerkreis", hint: "TOP5" },
  { key: "pump_speed", label: "Primaerpumpe Drehzahl", group: "Primaerkreis", hint: "TOP65" },
  { key: "three_way_valve", label: "Dreiwegeventil", group: "Primaerkreis", hint: "TOP20" },

  { key: "buffer_temp", label: "Puffertemperatur", group: "Heizungspuffer", hint: "TOP46" },
  { key: "room_heater", label: "Heizstab Heizung", group: "Heizungspuffer", hint: "TOP59" },

  { key: "hk1_water", label: "HK1 Wassertemperatur", group: "Heizkreis 1", hint: "TOP36" },
  { key: "hk1_water_target", label: "HK1 Wasser Sollwert", group: "Heizkreis 1", hint: "TOP42" },
  { key: "hk1_room", label: "HK1 Raumtemperatur", group: "Heizkreis 1", hint: "TOP56" },
  { key: "hk1_pump", label: "HK1 Pumpe laeuft", group: "Heizkreis 1", hint: "TOP124" },
  { key: "hk1_setpoint", label: "HK1 Sollwert einstellbar", group: "Heizkreis 1", hint: "TOP27, number" },

  { key: "hk2_water", label: "HK2 Wassertemperatur", group: "Heizkreis 2", hint: "TOP37" },
  { key: "hk2_water_target", label: "HK2 Wasser Sollwert", group: "Heizkreis 2", hint: "TOP43" },
  { key: "hk2_room", label: "HK2 Raumtemperatur", group: "Heizkreis 2", hint: "TOP57" },
  { key: "hk2_pump", label: "HK2 Pumpe laeuft", group: "Heizkreis 2", hint: "TOP123" },
  { key: "hk2_setpoint", label: "HK2 Sollwert einstellbar", group: "Heizkreis 2", hint: "TOP34, number" },

  { key: "dhw_temp", label: "Warmwasser Isttemperatur", group: "Warmwasser", hint: "TOP10" },
  { key: "dhw_setpoint", label: "Warmwasser Sollwert", group: "Warmwasser", hint: "TOP9, number" },
  { key: "dhw_heater", label: "Heizstab Warmwasser", group: "Warmwasser", hint: "TOP58" },

  { key: "sg_k1", label: "Kontakt K1 Sperre", group: "SG Ready", hint: "Shelly, Relais oder Eingang" },
  { key: "sg_k2", label: "Kontakt K2 Anlauf", group: "SG Ready", hint: "Shelly, Relais oder Eingang" },

  { key: "power_switch", label: "Waermepumpe ein und aus", group: "Steuerung", hint: "SetHeatpump, switch" },
  { key: "mode_select", label: "Betriebsart umschalten", group: "Steuerung", hint: "SetOperationMode, select" },
  { key: "dhw_switch", label: "Warmwasser sofort laden", group: "Steuerung", hint: "SetForceDHW, switch" },
  { key: "heating_switch", label: "Heizung ein und aus", group: "Steuerung", hint: "eigener Helfer, optional" },
];

const DEFAULT_CONFIG = {
  type: "custom:lutarym-heatpump-card",
  title: "Waermepumpe",
  fan_count: 2,
  hk_count: 2,
  scale_min: 20,
  scale_max: 60,
  outdoor_min: -15,
  outdoor_max: 35,
  show_controls: true,
  show_switches: true,
  animate: true,
  entities: {},
};

/* ------------------------------------------------------------------ *
 *  Karte
 * ------------------------------------------------------------------ */
class LutarymHeatpumpCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
    this._config = null;
    this._hass = null;
    this._auto = null;
    this._dragging = null;
  }

  static getConfigElement() {
    return document.createElement("lutarym-heatpump-card-editor");
  }

  static getStubConfig(hass) {
    const found = detectIntegration(hass);
    return { ...DEFAULT_CONFIG, entities: found.found ? found.entities : {} };
  }

  setConfig(config) {
    if (!config) throw new Error("Keine Konfiguration angegeben.");
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      entities: { ...(config.entities || {}) },
    };
    this._config.fan_count = this._config.fan_count === 1 ? 1 : 2;
    this._config.hk_count = this._config.hk_count === 1 ? 1 : 2;
    this._built = false;
    this._auto = null;
    if (this.shadowRoot) this.shadowRoot.innerHTML = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._render();
  }

  getCardSize() {
    return 20;
  }

  _e(key) {
    const configured = (this._config.entities || {})[key];
    if (configured) return configured;
    if (!this._auto) this._auto = detectIntegration(this._hass).entities;
    return this._auto[key] || "";
  }

  /**
   * Leitet den SG-Ready-Zustand 1 bis 4 aus den beiden Kontakten ab.
   * K1 ist der Sperrkontakt, K2 der Anlaufkontakt.
   * Gibt null zurueck, solange ein Kontakt fehlt oder unbekannt ist.
   */
  _sgMode() {
    const k1 = this._e("sg_k1");
    const k2 = this._e("sg_k2");
    if (!k1 || !k2) return null;
    // Ein nicht erreichbarer Kontakt darf nicht als "offen" gelten,
    // sonst zeigt die Karte Normalbetrieb, obwohl der Zustand unbekannt ist.
    const unklar = [null, "unknown", "unavailable", ""];
    if (unklar.includes(rawState(this._hass, k1))) return null;
    if (unklar.includes(rawState(this._hass, k2))) return null;
    const a = isOn(this._hass, k1);
    const b = isOn(this._hass, k2);
    if (a === null || b === null) return null;
    if (a && !b) return 1; // 1:0 Sperre
    if (!a && !b) return 2; // 0:0 Normalbetrieb
    if (!a && b) return 3; // 0:1 Einschaltempfehlung
    return 4; // 1:1 Anlaufbefehl
  }

  _render() {
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this._update();
  }

  /* -------------------- Aufbau -------------------- */

  _build() {
    const root = document.createElement("div");
    root.innerHTML = `
      <style>${this._css()}</style>
      <ha-card class="lhc">
        <header class="lhc-head">
          <div class="lhc-title">
            <span class="lhc-kicker">Anlagenschema</span>
            <h2>${escapeHtml(this._config.title)}</h2>
          </div>
          <div class="lhc-head-right">
            <div class="lhc-outside">
              <svg class="lhc-outside-icon" viewBox="0 0 24 44" aria-hidden="true">
                <rect x="8" y="2" width="8" height="28" rx="4"
                      fill="#1A2330" stroke="#33415A" stroke-width="1.5"/>
                <circle cx="12" cy="34" r="8" fill="#1A2330" stroke="#33415A" stroke-width="1.5"/>
                <circle cx="12" cy="34" r="5.5" id="mini-bulb" fill="${NEUTRAL}"/>
                <rect x="10" y="26" width="4" height="6" id="mini-neck" fill="${NEUTRAL}"/>
                <rect x="10" y="28" width="4" height="0" rx="2" id="mini-fill" fill="${NEUTRAL}"/>
              </svg>
              <span class="lhc-outside-text">
                <span class="lhc-outside-label">Aussen</span>
                <span class="lhc-outside-value" id="outside-v">--</span>
              </span>
            </div>
            <div class="lhc-sg" id="sg-chip" hidden>
              <span class="lhc-sg-head">
                <span class="lhc-outside-label">SG Ready</span>
                <span class="lhc-sg-value" id="sg-text">--</span>
              </span>
              <span class="lhc-sg-bar">
                <i id="sg-seg-1"></i><i id="sg-seg-2"></i><i id="sg-seg-3"></i><i id="sg-seg-4"></i>
              </span>
            </div>
            <div class="lhc-mode" id="mode">--</div>
          </div>
        </header>

        <div class="lhc-alert" id="alert" hidden></div>
        <section class="lhc-stats" id="stats"></section>
        <div class="lhc-scene">${this._svg()}</div>
        <section class="lhc-switches" id="switches"></section>
        <section class="lhc-controls" id="controls"></section>
      </ha-card>
    `;
    this.shadowRoot.appendChild(root);
    this._buildStats();
    this._buildSwitches();
    this._buildControls();
  }

  _buildStats() {
    const items = [
      { id: "st-comp", label: "Verdichter" },
      { id: "st-flowrate", label: "Durchfluss" },
      { id: "st-output", label: "Waermeleistung" },
      { id: "st-input", label: "Stromaufnahme" },
      { id: "st-cop", label: "Arbeitszahl" },
    ];
    this.shadowRoot.getElementById("stats").innerHTML = items
      .map(
        (i) => `
        <div class="lhc-stat">
          <span class="lhc-stat-label">${i.label}</span>
          <span class="lhc-stat-value" id="${i.id}">--</span>
        </div>`
      )
      .join("");
  }

  _buildSwitches() {
    const host = this.shadowRoot.getElementById("switches");
    if (this._config.show_switches === false) {
      host.hidden = true;
      return;
    }
    const toggles = [
      { key: "power_switch", id: "sw-power", label: "Waermepumpe" },
      { key: "heating_switch", id: "sw-heat", label: "Heizung" },
      { key: "dhw_switch", id: "sw-dhw", label: "Warmwasser" },
    ].filter((t) => this._e(t.key));
    const hasMode = Boolean(this._e("mode_select"));
    if (!toggles.length && !hasMode) {
      host.hidden = true;
      return;
    }

    host.innerHTML = `
      ${toggles
        .map(
          (t) => `
        <button type="button" class="lhc-toggle" id="${t.id}" aria-pressed="false">
          <span class="lhc-toggle-dot"></span>
          <span class="lhc-toggle-text">
            <span class="lhc-toggle-label">${t.label}</span>
            <span class="lhc-toggle-state" id="${t.id}-state">--</span>
          </span>
        </button>`
        )
        .join("")}
      ${
        hasMode
          ? `<label class="lhc-modepick">
               <span class="lhc-toggle-label">Betriebsart</span>
               <select id="mode-select"></select>
             </label>`
          : ""
      }
    `;

    toggles.forEach((t) => {
      this.shadowRoot.getElementById(t.id).addEventListener("click", () => {
        const entityId = this._e(t.key);
        const on = isOn(this._hass, entityId);
        this._hass.callService("homeassistant", on ? "turn_off" : "turn_on", {
          entity_id: entityId,
        });
      });
    });

    if (hasMode) {
      const sel = this.shadowRoot.getElementById("mode-select");
      sel.addEventListener("change", () => {
        this._hass.callService("select", "select_option", {
          entity_id: this._e("mode_select"),
          option: sel.value,
        });
      });
    }
  }

  _buildControls() {
    const host = this.shadowRoot.getElementById("controls");
    if (this._config.show_controls === false) {
      host.hidden = true;
      return;
    }
    const rows = [
      { key: "hk1_setpoint", id: "ctl-hk1", label: "Heizkreis 1 Sollwert" },
      { key: "hk2_setpoint", id: "ctl-hk2", label: "Heizkreis 2 Sollwert" },
      { key: "dhw_setpoint", id: "ctl-dhw", label: "Warmwasser Sollwert" },
    ].filter((r) => this._e(r.key) && (r.id !== "ctl-hk2" || this._config.hk_count === 2));

    if (!rows.length) {
      host.innerHTML = `<p class="lhc-empty">Keine Sollwert-Entitaet gefunden. Die Integration legt diese nur an, wenn "Nur lesen" bei der Einrichtung deaktiviert ist.</p>`;
      return;
    }

    host.innerHTML = rows
      .map(
        (r) => `
        <div class="lhc-ctl">
          <div class="lhc-ctl-head">
            <span class="lhc-ctl-label">${r.label}</span>
            <output class="lhc-ctl-out" id="${r.id}-out">--</output>
          </div>
          <input class="lhc-slider" type="range" id="${r.id}-range"
                 min="0" max="100" step="1" value="0" aria-label="${r.label}">
          <div class="lhc-ctl-scale">
            <span id="${r.id}-min">--</span><span id="${r.id}-max">--</span>
          </div>
        </div>`
      )
      .join("");

    rows.forEach((r) => {
      const range = this.shadowRoot.getElementById(`${r.id}-range`);
      const out = this.shadowRoot.getElementById(`${r.id}-out`);
      range.addEventListener("input", () => {
        this._dragging = r.id;
        out.textContent = `${range.value} °C`;
      });
      range.addEventListener("change", () => {
        this._dragging = null;
        const entityId = this._e(r.key);
        this._hass.callService(entityId.split(".")[0], "set_value", {
          entity_id: entityId,
          value: parseFloat(range.value),
        });
      });
    });
  }

  /* -------------------- Szene -------------------- */

  _svg() {
    const two = this._config.fan_count === 2;
    const fans = two
      ? `${this._fan("fan1", 180, 185, 54)}${this._fan("fan2", 180, 360, 54)}`
      : this._fan("fan1", 180, 280, 88);

    const F = L.FLOW_Y;
    const R = L.RET_Y;
    const T = L.TANK_TOP;
    const B = L.TANK_BOTTOM;
    const C = L.CAP_Y;
    const hk2 = this._config.hk_count === 2;

    return `
    <svg viewBox="0 0 ${L.W} ${L.H}" class="lhc-svg" role="img"
         aria-label="Schema der Waermepumpenanlage mit zwei Heizkreisen">
      <defs>
        <linearGradient id="casing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#232C3A"/><stop offset="100%" stop-color="#161D28"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.16"/>
          <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
        </linearGradient>
        <linearGradient id="bufferFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" id="bg-top" stop-color="${NEUTRAL}"/>
          <stop offset="100%" id="bg-bottom" stop-color="${NEUTRAL}"/>
        </linearGradient>
        <linearGradient id="dhwFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" id="dhw-top" stop-color="${NEUTRAL}"/>
          <stop offset="100%" id="dhw-bottom" stop-color="${NEUTRAL}"/>
        </linearGradient>
        <linearGradient id="rad1Fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" id="rad1-top" stop-color="${NEUTRAL}"/>
          <stop offset="100%" id="rad1-bottom" stop-color="${NEUTRAL}"/>
        </linearGradient>
        <linearGradient id="rad2Fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" id="rad2-top" stop-color="${NEUTRAL}"/>
          <stop offset="100%" id="rad2-bottom" stop-color="${NEUTRAL}"/>
        </linearGradient>
      </defs>

      <!-- ===== Sammelleitungen ===== -->
      <path class="pipe-shell" d="M320 ${R} H 1425"/>
      <path class="pipe" id="pipe-return" d="M320 ${R} H 1425"/>
      <path class="pipe-shell" d="M320 ${F} H 1425"/>
      <path class="pipe" id="pipe-flow" d="M320 ${F} H 1425"/>
      <path class="flowdots rev" id="dots-primary" d="M320 ${R} H 1425"/>
      <path class="flowdots" id="dots-primary2" d="M320 ${F} H 1425"/>

      <path class="pipe-shell" d="M530 ${F} V ${T} M530 ${B} V ${R}"/>
      <path class="pipe" id="pipe-buf-in" d="M530 ${F} V ${T}"/>
      <path class="pipe" id="pipe-buf-out" d="M530 ${B} V ${R}"/>
      <path class="flowdots" id="dots-buf" d="M530 ${F} V ${T} M530 ${B} V ${R}"/>

      <path class="pipe-shell" d="M1425 ${F} V ${T} M1425 ${B} V ${R}"/>
      <path class="pipe" id="pipe-dhw-in" d="M1425 ${F} V ${T}"/>
      <path class="pipe" id="pipe-dhw-out" d="M1425 ${B} V ${R}"/>
      <path class="flowdots" id="dots-dhw" d="M1425 ${F} V ${T} M1425 ${B} V ${R}"/>

      <!-- ===== Aussengeraet ===== -->
      <g class="unit">
        <rect x="40" y="80" width="280" height="420" rx="16"
              fill="url(#casing)" stroke="#33415A" stroke-width="2"/>
        <rect id="unit-glow" x="40" y="80" width="280" height="420" rx="16"
              fill="none" stroke="#E0762E" stroke-width="2" opacity="0"/>
        <rect x="40" y="80" width="280" height="420" rx="16" fill="url(#glass)"/>
        <text class="cap" x="180" y="108" text-anchor="middle">Aussengeraet</text>
        ${fans}
        <g id="defrost-badge" class="badge" transform="translate(180 478)">
          <rect x="-64" y="-16" width="128" height="32" rx="16"
                fill="#0E2A4A" stroke="#3E9BE0" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Abtauung</text>
        </g>
      </g>

      <!-- ===== Primaerpumpe ===== -->
      <g>
        <text class="value-s" id="pump-v" x="380" y="462" text-anchor="middle">--</text>
        <circle cx="380" cy="${R}" r="26" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <g id="pump-rotor" class="rotor" transform="translate(380 ${R})">
          <path d="M0 -15 L5 -4 L16 0 L5 4 L0 15 L-5 4 L-16 0 L-5 -4 Z" fill="#55637A"/>
          <circle r="4" fill="#0D1219"/>
        </g>
        <text class="cap-s" x="380" y="${C}" text-anchor="middle">Pumpe</text>
      </g>

      <!-- ===== Heizungspuffer ===== -->
      <g>
        <rect x="440" y="${T}" width="190" height="240" rx="26"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="448" y="208" width="174" height="224" rx="20" fill="url(#bufferFill)"/>
        <rect x="448" y="208" width="174" height="224" rx="20" fill="url(#glass)"/>
        <text class="value-l" id="buf-v" x="535" y="316" text-anchor="middle">--</text>
        <g id="roomheater-badge" class="badge" transform="translate(535 392)">
          <rect x="-56" y="-15" width="112" height="30" rx="15"
                fill="#3A1B08" stroke="#E0762E" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Heizstab</text>
        </g>
        <text class="cap" x="535" y="${C}" text-anchor="middle">Puffer</text>
      </g>

      <!-- ===== Wasserdruck ===== -->
      <g>
        <text class="value-s" id="press-v" x="660" y="462" text-anchor="middle">--</text>
        <circle cx="660" cy="${R}" r="26" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <circle cx="660" cy="${R}" r="18" fill="none" stroke="#26303F" stroke-width="3"/>
        <line id="press-needle" x1="660" y1="${R}" x2="660" y2="${R - 15}"
              stroke="${NEUTRAL}" stroke-width="3" stroke-linecap="round"
              transform="rotate(-120 660 ${R})"/>
        <circle cx="660" cy="${R}" r="4" fill="#55637A"/>
        <text class="cap-s" x="660" y="${C}" text-anchor="middle">Druck</text>
      </g>

      ${this._circuit(1, 720, 940, 770, 890)}
      ${hk2 ? this._circuit(2, 1010, 1230, 1060, 1180) : ""}

      <!-- ===== Dreiwegeventil ===== -->
      <g>
        <text class="value-s" id="valve-v" x="1425" y="128" text-anchor="middle">--</text>
        <rect x="1407" y="158" width="36" height="36" rx="8"
              fill="#0D1219" stroke="#33415A" stroke-width="2"
              transform="rotate(45 1425 176)"/>
        <circle cx="1425" cy="176" r="9" id="valve-dot" fill="${NEUTRAL}"/>
      </g>

      <!-- ===== Warmwasserspeicher ===== -->
      <g>
        <rect x="1340" y="${T}" width="170" height="240" rx="34"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="1348" y="208" width="154" height="224" rx="28" fill="url(#dhwFill)"/>
        <rect x="1348" y="208" width="154" height="224" rx="28" fill="url(#glass)"/>
        <path class="coil" d="M1370 306 q28 -18 55 0 q28 18 55 0
                              M1370 340 q28 -18 55 0 q28 18 55 0
                              M1370 374 q28 -18 55 0 q28 18 55 0"/>
        <text class="value-l" id="dhw-v" x="1425" y="272" text-anchor="middle">--</text>
        <text class="value-sp" id="dhw-sp" x="1425" y="294" text-anchor="middle"></text>
        <g id="dhwheater-badge" class="badge" transform="translate(1425 406)">
          <rect x="-56" y="-15" width="112" height="30" rx="15"
                fill="#3A1B08" stroke="#E0762E" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Heizstab</text>
        </g>
        <text class="cap" x="1425" y="${C}" text-anchor="middle">Warmwasser</text>
      </g>
    </svg>`;
  }

  /**
   * Ein Heizkreis: Abgang vom Vorlauf, Pumpe, Heizkoerper, Ruecklauf.
   */
  _circuit(n, x1, x2, dropX, backX) {
    const F = L.FLOW_Y;
    const R = L.RET_Y;
    const RT = L.RAD_TOP;
    const RB = L.RAD_BOTTOM;
    const mid = (x1 + x2) / 2;
    const drop = `M${dropX} ${F} V ${RT}`;
    const back = `M${backX} ${RB} V ${R}`;

    let fins = "";
    for (let x = x1 + 26; x < x2 - 10; x += 30) {
      fins += `<line x1="${x}" y1="${RT + 10}" x2="${x}" y2="${RB - 10}"/>`;
    }

    return `
      <g class="circuit">
        <path class="pipe-shell" d="${drop} ${back}"/>
        <path class="pipe" id="pipe-hk${n}-in" d="${drop}"/>
        <path class="pipe" id="pipe-hk${n}-out" d="${back}"/>
        <path class="flowdots" id="dots-hk${n}" d="${drop}"/>
        <path class="flowdots rev" id="dots-hk${n}b" d="${back}"/>

        <circle cx="${dropX}" cy="196" r="21" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <g id="hk${n}-rotor" class="rotor" transform="translate(${dropX} 196)">
          <path d="M0 -12 L4 -3 L13 0 L4 3 L0 12 L-4 3 L-13 0 L-4 -3 Z" fill="#55637A"/>
          <circle r="3.5" fill="#0D1219"/>
        </g>
        <text class="value-s" id="hk${n}-pump-v" x="${dropX + 30}" y="202"
              text-anchor="start">--</text>

        <rect x="${x1}" y="${RT}" width="${x2 - x1}" height="${RB - RT}" rx="10"
              fill="url(#rad${n}Fill)" stroke="#33415A" stroke-width="2"/>
        <g stroke="#0D1219" stroke-width="7" opacity="0.5">${fins}</g>
        <rect x="${x1}" y="${RT}" width="${x2 - x1}" height="${RB - RT}" rx="10" fill="url(#glass)"/>

        <g transform="translate(${mid - 52} ${RT + 80})">
          <rect x="-48" y="-26" width="96" height="46" rx="9" fill="#0B1017" opacity="0.88"/>
          <text class="tag-l" x="0" y="-10" text-anchor="middle">Wasser</text>
          <text class="tag-v" id="hk${n}-water-v" x="0" y="12" text-anchor="middle">--</text>
        </g>
        <g transform="translate(${mid + 52} ${RT + 80})">
          <rect x="-48" y="-26" width="96" height="46" rx="9" fill="#0B1017" opacity="0.88"/>
          <text class="tag-l" x="0" y="-10" text-anchor="middle">Raum</text>
          <text class="tag-v" id="hk${n}-room-v" x="0" y="12" text-anchor="middle">--</text>
        </g>

        <text class="cap" x="${mid}" y="${L.CAP_Y}" text-anchor="middle">Heizkreis ${n}</text>
      </g>`;
  }

  _fan(id, cx, cy, r) {
    const count = 5;
    let blades = "";
    for (let i = 0; i < count; i++) {
      blades += `<path d="M0 0 C ${r * 0.34} ${-r * 0.3}, ${r * 0.8} ${-r * 0.26}, ${
        r * 0.92
      } ${r * 0.06} C ${r * 0.62} ${r * 0.3}, ${r * 0.22} ${r * 0.26}, 0 0 Z"
        transform="rotate(${(360 / count) * i})"/>`;
    }
    return `
      <g transform="translate(${cx} ${cy})">
        <circle r="${r + 10}" fill="#0B1017" stroke="#33415A" stroke-width="2"/>
        <circle r="${r + 2}" fill="none" stroke="#1E2836" stroke-width="6"/>
        <g class="rotor" id="${id}">
          <g class="blades">${blades}</g>
          <circle r="${r * 0.17}" fill="#2B3546"/>
        </g>
        <g stroke="#2A3446" stroke-width="1.5" fill="none" opacity="0.55">
          <circle r="${r * 0.4}"/><circle r="${r * 0.65}"/><circle r="${r * 0.9}"/>
        </g>
        <text class="value-s" id="${id}-rpm" y="${r + 28}" text-anchor="middle">--</text>
      </g>`;
  }

  /* -------------------- Aktualisierung -------------------- */

  _update() {
    const hass = this._hass;
    if (!hass) return;
    const sr = this.shadowRoot;
    const min = Number(this._config.scale_min);
    const max = Number(this._config.scale_max);
    const col = (v) => thermalColor(v, min, max);
    const animate = this._config.animate !== false;

    const set = (id, text) => {
      const el = sr.getElementById(id);
      if (el) el.textContent = text;
    };
    const paint = (id, color) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("stop-color", color);
    };
    const stroke = (id, color) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("stroke", color);
    };
    const toggle = (id, on) => {
      const el = sr.getElementById(id);
      if (el) el.classList.toggle("is-on", Boolean(on));
    };
    // Laufpunkte einer Leitung ein oder ausschalten
    const flowing = (ids, on, color) => {
      ids.forEach((id) => {
        const el = sr.getElementById(id);
        if (!el) return;
        el.classList.toggle("is-on", animate && Boolean(on));
        if (color) el.setAttribute("stroke", color);
      });
    };

    /* Kopfzeile */
    const modeEntity = this._e("operating_mode");
    set(
      "mode",
      attr(hass, modeEntity, "beschreibung", null) || rawState(hass, modeEntity) || "--"
    );

    /* Stoerung */
    const alertEl = sr.getElementById("alert");
    if (alertEl) {
      const err = rawState(hass, this._e("error"));
      const harmlos = [null, "", "OK", "ok", "0", "No error", "unknown", "unavailable"];
      const stoerung = err !== null && !harmlos.includes(err);
      alertEl.hidden = !stoerung;
      alertEl.classList.toggle("is-pulsing", stoerung && animate);
      if (stoerung) alertEl.textContent = `Stoerung der Waermepumpe: ${err}`;
    }

    /* Kennzahlen */
    const comp = numState(hass, this._e("compressor"));
    const flowRate = numState(hass, this._e("pump_flow"));
    const output = numState(hass, this._e("heat_output"));
    const input = numState(hass, this._e("power_input"));
    set("st-comp", comp === null ? "--" : `${fmt(comp, 0)} Hz`);
    set("st-flowrate", flowRate === null ? "--" : `${fmt(flowRate)} l/min`);
    set("st-output", output === null ? "--" : `${fmt(output, 0)} W`);
    set("st-input", input === null ? "--" : `${fmt(input, 0)} W`);
    set("st-cop", output && input && input > 0 ? (output / input).toFixed(2) : "--");

    /* Aussentemperatur, bewusst im Kopfbereich und nicht im Schema */
    const outside = numState(hass, this._e("outside_temp"));
    const oMin = Number(this._config.outdoor_min);
    const oMax = Number(this._config.outdoor_max);
    const outColor = thermalColor(outside, oMin, oMax);
    set("outside-v", outside === null ? "--" : `${fmt(outside)} °C`);
    ["mini-bulb", "mini-neck"].forEach((id) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("fill", outColor);
    });
    const column = sr.getElementById("mini-fill");
    if (column) {
      const ratio =
        outside === null ? 0 : clamp((outside - oMin) / ((oMax - oMin) || 1), 0, 1);
      const h = Math.round(23 * ratio);
      column.setAttribute("fill", outColor);
      column.setAttribute("height", String(h));
      column.setAttribute("y", String(28 - h));
    }

    /* SG Ready */
    const chip = sr.getElementById("sg-chip");
    if (chip) {
      const sg = this._sgMode();
      const konfiguriert = Boolean(this._e("sg_k1")) && Boolean(this._e("sg_k2"));
      chip.hidden = !konfiguriert;
      if (konfiguriert) {
        const info = SG_STATES[sg];
        set("sg-text", sg === null ? "unbekannt" : `${sg} ${info.kurz}`);
        chip.title = sg === null ? "SG Ready nicht auswertbar" : info.lang;
        chip.style.setProperty("--sg", info ? info.farbe : NEUTRAL);
        // Sperre und Anlaufbefehl sind Ausnahmezustaende und blinken.
        chip.classList.toggle("is-pulsing", animate && (sg === 1 || sg === 4));
        for (let i = 1; i <= 4; i++) {
          const seg = sr.getElementById(`sg-seg-${i}`);
          if (seg) seg.classList.toggle("is-on", sg === i);
        }
      }
    }

    /* Aussengeraet */
    this._spin("fan1", numState(hass, this._e("fan1_rpm")), "fan1-rpm", "U/min");
    if (this._config.fan_count === 2) {
      this._spin("fan2", numState(hass, this._e("fan2_rpm")), "fan2-rpm", "U/min");
    }
    const defrostOn = isOn(hass, this._e("defrost")) === true;
    toggle("defrost-badge", defrostOn);
    sr.getElementById("defrost-badge").classList.toggle("is-pulsing", defrostOn && animate);
    const glow = sr.getElementById("unit-glow");
    if (glow) glow.classList.toggle("is-on", animate && comp !== null && comp > 0);

    /* Temperaturen und Leitungsfarben */
    const flow = numState(hass, this._e("flow_temp"));
    const ret = numState(hass, this._e("return_temp"));
    const buf = numState(hass, this._e("buffer_temp"));
    const dhw = numState(hass, this._e("dhw_temp"));
    ["pipe-flow", "pipe-buf-in", "pipe-dhw-in"].forEach((id) => stroke(id, col(flow)));
    ["pipe-return", "pipe-buf-out", "pipe-dhw-out"].forEach((id) => stroke(id, col(ret)));

    /* Puffer */
    paint("bg-top", col(buf));
    paint("bg-bottom", col(buf === null ? null : buf - 4));
    set("buf-v", buf === null ? "--" : `${fmt(buf)} °C`);
    const roomHeaterOn = isOn(hass, this._e("room_heater")) === true;
    toggle("roomheater-badge", roomHeaterOn);
    sr.getElementById("roomheater-badge").classList.toggle(
      "is-pulsing",
      roomHeaterOn && animate
    );

    /* Warmwasser */
    const dhwSp = numState(hass, this._e("dhw_setpoint"));
    paint("dhw-top", col(dhw));
    paint("dhw-bottom", col(dhw === null ? null : dhw - 6));
    set("dhw-v", dhw === null ? "--" : `${fmt(dhw)} °C`);
    set("dhw-sp", dhwSp === null ? "" : `Ziel ${fmt(dhwSp, 0)} °C`);
    const dhwHeaterOn = isOn(hass, this._e("dhw_heater")) === true;
    toggle("dhwheater-badge", dhwHeaterOn);
    sr.getElementById("dhwheater-badge").classList.toggle(
      "is-pulsing",
      dhwHeaterOn && animate
    );

    /* Primaerpumpe */
    const pumpRpm = numState(hass, this._e("pump_speed"));
    this._spin("pump-rotor", pumpRpm, "pump-v", "U/min");

    /* Wasserdruck */
    const bar = numState(hass, this._e("water_pressure"));
    set("press-v", bar === null ? "--" : `${fmt(bar)} bar`);
    const needle = sr.getElementById("press-needle");
    if (needle) {
      const ratio = bar === null ? 0 : clamp(bar / 4, 0, 1);
      needle.setAttribute("transform", `rotate(${-120 + 240 * ratio} 900 ${L.RET_Y})`);
      needle.setAttribute(
        "stroke",
        bar !== null && (bar < 0.8 || bar > 2.8) ? "#D62B2B" : "#9BAAC0"
      );
    }

    /* Dreiwegeventil */
    const valveEntity = this._e("three_way_valve");
    const valveText = attr(hass, valveEntity, "beschreibung", null);
    const valveNum = numState(hass, valveEntity);
    const zuWarmwasser = valveNum !== null && valveNum > 0;
    set(
      "valve-v",
      valveText || (valveNum === null ? "--" : zuWarmwasser ? "Warmwasser" : "Heizen")
    );
    const dot = sr.getElementById("valve-dot");
    if (dot) {
      dot.setAttribute(
        "fill",
        valveNum === null ? NEUTRAL : zuWarmwasser ? col(dhw) : col(flow)
      );
    }

    /* Heizkreise */
    this._circuitUpdate(1, col, animate);
    if (this._config.hk_count === 2) this._circuitUpdate(2, col, animate);

    /* Durchflussanimation, je Abschnitt einzeln */
    // Die Sammelleitungen laufen, wenn Wasser umgewaelzt wird.
    const primaer =
      (pumpRpm !== null && pumpRpm > 0) || (flowRate !== null && flowRate > 0);
    flowing(["dots-primary2"], primaer, col(flow));
    flowing(["dots-primary"], primaer, col(ret));
    // Der Puffer wird nur beschickt, wenn das Ventil auf Heizen steht.
    flowing(["dots-buf"], primaer && !zuWarmwasser, col(flow));
    // Der Speicher nur, wenn das Ventil auf Warmwasser steht.
    flowing(["dots-dhw"], primaer && zuWarmwasser, col(flow));

    /* Bedienung */
    this._syncToggle("sw-power", "power_switch");
    this._syncToggle("sw-heat", "heating_switch");
    this._syncToggle("sw-dhw", "dhw_switch");
    this._syncModeSelect();
    this._syncSlider("ctl-hk1", "hk1_setpoint");
    this._syncSlider("ctl-hk2", "hk2_setpoint");
    this._syncSlider("ctl-dhw", "dhw_setpoint");
  }

  /**
   * Aktualisiert einen Heizkreis und meldet, ob seine Pumpe foerdert.
   */
  _circuitUpdate(n, col, animate) {
    const hass = this._hass;
    const sr = this.shadowRoot;
    const water = numState(hass, this._e(`hk${n}_water`));
    const target = numState(hass, this._e(`hk${n}_water_target`));
    const room = numState(hass, this._e(`hk${n}_room`));
    const pumpOn = isOn(hass, this._e(`hk${n}_pump`)) === true;

    const set = (id, text) => {
      const el = sr.getElementById(id);
      if (el) el.textContent = text;
    };
    const paint = (id, color) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("stop-color", color);
    };

    paint(`rad${n}-top`, col(water));
    paint(`rad${n}-bottom`, col(water === null ? null : water - 6));
    set(
      `hk${n}-water-v`,
      water === null ? "--" : `${fmt(water, 0)}°${target === null ? "" : ` / ${fmt(target, 0)}`}`
    );
    set(`hk${n}-room-v`, room === null ? "--" : `${fmt(room)}°`);

    // Die Pumpe meldet nur an oder aus, keine Drehzahl. Feste Umlaufzeit.
    const rotor = sr.getElementById(`hk${n}-rotor`);
    if (rotor) {
      rotor.classList.toggle("is-still", !pumpOn);
      rotor.style.animationDuration = "1.4s";
      rotor.style.animationPlayState = pumpOn && animate ? "running" : "paused";
    }
    set(`hk${n}-pump-v`, pumpOn ? "laeuft" : "aus");

    ["in", "out"].forEach((seite) => {
      const el = sr.getElementById(`pipe-hk${n}-${seite}`);
      if (el) el.setAttribute("stroke", col(seite === "in" ? water : water - 6));
    });
    [`dots-hk${n}`, `dots-hk${n}b`].forEach((id) => {
      const el = sr.getElementById(id);
      if (el) {
        el.classList.toggle("is-on", animate && pumpOn);
        el.setAttribute("stroke", col(water));
      }
    });

    return pumpOn;
  }

  _spin(rotorId, rpm, labelId, unit) {
    const label = this.shadowRoot.getElementById(labelId);
    if (label) label.textContent = rpm === null ? "--" : `${fmt(rpm, 0)} ${unit}`;
    const el = this.shadowRoot.getElementById(rotorId);
    if (!el) return;
    const animate = this._config.animate !== false;
    if (rpm === null || rpm <= 0 || !animate) {
      el.style.animationPlayState = "paused";
      el.classList.toggle("is-still", rpm === null || rpm <= 0);
      return;
    }
    el.classList.remove("is-still");
    el.style.animationDuration = `${clamp(900 / rpm, 0.25, 6).toFixed(2)}s`;
    el.style.animationPlayState = "running";
  }

  _syncToggle(id, key) {
    const btn = this.shadowRoot.getElementById(id);
    if (!btn) return;
    const entityId = this._e(key);
    const known = this._hass.states[entityId] !== undefined;
    const on = isOn(this._hass, entityId);
    btn.disabled = !known;
    btn.classList.toggle("is-on", on === true);
    btn.setAttribute("aria-pressed", on === true ? "true" : "false");
    const state = this.shadowRoot.getElementById(`${id}-state`);
    if (state) state.textContent = !known ? "nicht gefunden" : on ? "an" : "aus";
  }

  _syncModeSelect() {
    const sel = this.shadowRoot.getElementById("mode-select");
    if (!sel) return;
    const st = this._hass.states[this._e("mode_select")];
    if (!st) {
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    const options = st.attributes.options || [];
    const signature = options.join("|");
    if (sel.dataset.signature !== signature) {
      sel.innerHTML = options
        .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
        .join("");
      sel.dataset.signature = signature;
    }
    if (sel.value !== st.state) sel.value = st.state;
  }

  _syncSlider(id, key) {
    const range = this.shadowRoot.getElementById(`${id}-range`);
    if (!range) return;
    const out = this.shadowRoot.getElementById(`${id}-out`);
    const st = this._hass.states[this._e(key)];
    if (!st) {
      range.disabled = true;
      if (out) out.textContent = "nicht gefunden";
      return;
    }
    range.disabled = false;
    const lo = Number(st.attributes.min !== undefined ? st.attributes.min : 15);
    const hi = Number(st.attributes.max !== undefined ? st.attributes.max : 65);
    range.min = lo;
    range.max = hi;
    range.step = Number(st.attributes.step !== undefined ? st.attributes.step : 1);
    this.shadowRoot.getElementById(`${id}-min`).textContent = `${lo} °C`;
    this.shadowRoot.getElementById(`${id}-max`).textContent = `${hi} °C`;

    if (this._dragging === id) return;
    const v = parseFloat(st.state);
    if (!Number.isNaN(v)) {
      range.value = v;
      if (out) out.textContent = `${v} °C`;
      range.style.setProperty(
        "--thumb",
        thermalColor(v, Number(this._config.scale_min), Number(this._config.scale_max))
      );
    }
  }

  /* -------------------- Styles -------------------- */

  _css() {
    return `
      :host { display: block; }
      .lhc {
        --ink: #E8EDF4; --muted: #7E8CA0; --line: #26303F; --panel: #131A24;
        background: linear-gradient(180deg, #131A24 0%, #0D131B 100%);
        color: var(--ink); padding: 20px 20px 24px; overflow: hidden;
      }
      .lhc-head {
        display: flex; align-items: flex-start; justify-content: space-between;
        gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--line);
      }
      .lhc-kicker {
        display: block; font-size: 11px; letter-spacing: 0.18em;
        text-transform: uppercase; color: var(--muted); margin-bottom: 4px;
      }
      .lhc-title h2 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em; }
      .lhc-head-right {
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end;
      }
      .lhc-outside {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 14px 8px 10px; border-radius: 12px;
        background: #1B2431; border: 1px solid var(--line);
      }
      .lhc-outside-icon { width: 18px; height: 33px; flex: 0 0 auto; }
      .lhc-outside-text { display: flex; flex-direction: column; line-height: 1.25; }
      .lhc-outside-label {
        font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
      }
      .lhc-outside-value {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums;
      }
      .lhc-sg {
        --sg: ${NEUTRAL};
        display: flex; flex-direction: column; gap: 6px;
        padding: 7px 14px; border-radius: 12px;
        background: #1B2431; border: 1px solid var(--line);
      }
      .lhc-sg[hidden] { display: none; }
      .lhc-sg-head { display: flex; flex-direction: column; line-height: 1.25; }
      .lhc-sg-value {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 16px; font-weight: 600; color: var(--sg); white-space: nowrap;
      }
      .lhc-sg-bar { display: flex; gap: 3px; }
      .lhc-sg-bar i {
        width: 16px; height: 4px; border-radius: 2px; background: #2C3646;
        transition: background 300ms ease;
      }
      .lhc-sg-bar i.is-on { background: var(--sg); }
      .lhc-sg.is-pulsing .lhc-sg-bar i.is-on,
      .lhc-sg.is-pulsing .lhc-sg-value { animation: lhc-pulse 1.6s ease-in-out infinite; }
      .lhc-mode {
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 13px; padding: 7px 14px; border-radius: 999px;
        background: #1B2431; border: 1px solid var(--line); white-space: nowrap;
      }
      .lhc-alert {
        margin-top: 16px; padding: 12px 16px; border-radius: 10px;
        background: #3A1214; border: 1px solid #D6534A; color: #FFD9D6;
        font-size: 14px; font-weight: 500;
      }
      .lhc-alert[hidden] { display: none; }
      .lhc-alert.is-pulsing { animation: lhc-pulse 2s ease-in-out infinite; }
      .lhc-stats {
        display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 1px; background: var(--line); border: 1px solid var(--line);
        border-radius: 12px; overflow: hidden; margin: 16px 0 20px;
      }
      .lhc-stat { background: var(--panel); padding: 12px 14px; min-width: 0; }
      .lhc-stat-label {
        display: block; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--muted); margin-bottom: 6px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .lhc-stat-value {
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 19px; font-variant-numeric: tabular-nums; white-space: nowrap;
      }
      .lhc-svg { width: 100%; height: auto; display: block; }

      .pipe-shell {
        fill: none; stroke: #0B1017; stroke-width: 18;
        stroke-linecap: round; stroke-linejoin: round;
      }
      .pipe {
        fill: none; stroke: ${NEUTRAL}; stroke-width: 9;
        stroke-linecap: round; stroke-linejoin: round; transition: stroke 900ms ease;
      }
      /* Laufende Punkte zeigen an, dass in dieser Leitung wirklich Wasser stroemt. */
      .flowdots {
        fill: none; stroke: #FFFFFF; stroke-width: 5;
        stroke-linecap: round; stroke-dasharray: 2 26;
        opacity: 0; animation: lhc-flow 1.6s linear infinite;
        animation-play-state: paused;
      }
      .flowdots.is-on { opacity: 0.9; animation-play-state: running; }
      .flowdots.rev { animation-name: lhc-flow-rev; }
      @keyframes lhc-flow { to { stroke-dashoffset: -28; } }
      @keyframes lhc-flow-rev { to { stroke-dashoffset: 28; } }

      .cap { fill: #98A6BA; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; }
      .cap-s { fill: #7E8CA0; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; }
      .value-l {
        fill: #FFFFFF; font-size: 28px; font-weight: 650;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
        paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 5px;
      }
      .value-s {
        fill: #98A6BA; font-size: 14px;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .value-sp { fill: rgba(255,255,255,0.78); font-size: 13px; }
      .coil { fill: none; stroke: rgba(255,255,255,0.28); stroke-width: 5; stroke-linecap: round; }
      .tag-l { fill: #8494AA; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
      .tag-v {
        fill: #FFFFFF; font-size: 19px; font-weight: 600;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .badge-t { fill: #E8EDF4; font-size: 13px; }
      .badge { opacity: 0; transition: opacity 300ms ease; }
      .badge.is-on { opacity: 1; }
      .badge.is-on.is-pulsing { animation: lhc-pulse 2.2s ease-in-out infinite; }
      #unit-glow { transition: opacity 600ms ease; }
      #unit-glow.is-on { animation: lhc-glow 2.6s ease-in-out infinite; }
      #valve-dot, #press-needle { transition: all 900ms ease; }
      @keyframes lhc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      @keyframes lhc-glow { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.5; } }

      .rotor {
        transform-origin: 0 0; animation: lhc-spin 2s linear infinite;
        animation-play-state: paused;
      }
      #pump-rotor, [id$="-rotor"] { transform-box: fill-box; transform-origin: center; }
      .rotor .blades path { fill: #55637A; }
      .rotor.is-still .blades path, .rotor.is-still > path { fill: #3A4557; }
      @keyframes lhc-spin { to { transform: rotate(360deg); } }

      .lhc-switches {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px; margin-top: 20px;
      }
      .lhc-switches[hidden] { display: none; }
      .lhc-toggle {
        display: flex; align-items: center; gap: 12px; cursor: pointer;
        padding: 12px 14px; border-radius: 12px; text-align: left; font: inherit;
        background: var(--panel); border: 1px solid var(--line); color: var(--ink);
      }
      .lhc-toggle:disabled { opacity: 0.45; cursor: not-allowed; }
      .lhc-toggle:hover:not(:disabled) { border-color: #3E4C61; }
      .lhc-toggle:focus-visible { outline: 2px solid #E0762E; outline-offset: 2px; }
      .lhc-toggle-dot {
        width: 14px; height: 14px; border-radius: 50%; flex: 0 0 auto;
        background: #3A4557; box-shadow: 0 0 0 3px rgba(58,69,87,0.25);
        transition: all 250ms ease;
      }
      .lhc-toggle.is-on .lhc-toggle-dot {
        background: #46C07A; box-shadow: 0 0 0 3px rgba(70,192,122,0.25);
      }
      .lhc-toggle-text { display: flex; flex-direction: column; min-width: 0; }
      .lhc-toggle-label {
        font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
      }
      .lhc-toggle-state { font-size: 15px; font-weight: 500; }
      .lhc-modepick {
        display: flex; flex-direction: column; gap: 6px; justify-content: center;
        padding: 10px 14px; border-radius: 12px;
        background: var(--panel); border: 1px solid var(--line);
      }
      .lhc-modepick select {
        background: #0D131B; color: var(--ink); font: inherit; font-size: 15px;
        border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; width: 100%;
      }

      .lhc-controls {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px; margin-top: 16px; padding-top: 20px; border-top: 1px solid var(--line);
      }
      .lhc-controls[hidden] { display: none; }
      .lhc-ctl {
        background: var(--panel); border: 1px solid var(--line);
        border-radius: 12px; padding: 14px 16px 12px;
      }
      .lhc-ctl-head {
        display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;
      }
      .lhc-ctl-label {
        font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
      }
      .lhc-ctl-out {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 20px; font-variant-numeric: tabular-nums;
      }
      .lhc-ctl-scale {
        display: flex; justify-content: space-between; margin-top: 6px;
        font-size: 11px; color: var(--muted);
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
      }
      .lhc-slider {
        -webkit-appearance: none; appearance: none; width: 100%; height: 6px;
        border-radius: 3px; background: #26303F; outline: none;
      }
      .lhc-slider:disabled { opacity: 0.4; }
      .lhc-slider::-webkit-slider-thumb {
        -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
        background: var(--thumb, #E0762E); border: 3px solid #0D131B;
        cursor: pointer; box-shadow: 0 0 0 1px #3A4757;
      }
      .lhc-slider::-moz-range-thumb {
        width: 18px; height: 18px; border-radius: 50%;
        background: var(--thumb, #E0762E); border: 3px solid #0D131B; cursor: pointer;
      }
      .lhc-slider:focus-visible { box-shadow: 0 0 0 3px rgba(224,118,46,0.4); }
      .lhc-empty { color: var(--muted); font-size: 13px; margin: 0; }

      @media (max-width: 860px) {
        .lhc-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .lhc-title h2 { font-size: 20px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .rotor, .flowdots, .badge, .lhc-alert, #unit-glow,
        .lhc-sg-bar i, .lhc-sg-value { animation: none !important; }
      }
    `;
  }
}

/* ------------------------------------------------------------------ *
 *  Editor
 * ------------------------------------------------------------------ */
class LutarymHeatpumpCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
  }

  setConfig(config) {
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      entities: { ...(config.entities || {}) },
    };
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (this._built) {
      this._syncValues();
      return;
    }

    const groups = [];
    ENTITY_FIELDS.forEach((f) => {
      let g = groups.find((x) => x.name === f.group);
      if (!g) groups.push((g = { name: f.group, fields: [] }));
      g.fields.push(f);
    });

    const options = Object.keys(this._hass.states)
      .filter((e) =>
        /^(sensor|number|input_number|binary_sensor|switch|input_boolean|select|input_select)\./.test(
          e
        )
      )
      .sort()
      .map((e) => `<option value="${e}">${escapeHtml(friendly(this._hass, e))}</option>`)
      .join("");

    const found = detectIntegration(this._hass);

    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <div class="ed">
        <div class="ed-group ed-detect ${found.found ? "is-found" : "is-absent"}">
          <h3>Integration</h3>
          <p class="ed-status">${
            found.found
              ? `Heishamon by Lutarym erkannt. ${found.count} Entitaeten gefunden, ${
                  Object.keys(found.entities).length
                } davon passen zu dieser Karte.`
              : "Keine Entitaeten der Integration gefunden. Du kannst die Standardnamen eintragen und danach anpassen."
          }</p>
          <div class="ed-actions">
            <button type="button" id="btn-adopt" ${
              found.found ? "" : "disabled"
            }>Aus Integration uebernehmen</button>
            <button type="button" id="btn-default">Standardnamen eintragen</button>
            <button type="button" id="btn-clear" class="is-quiet">Alle leeren</button>
          </div>
        </div>

        <div class="ed-group">
          <h3>Darstellung</h3>
          <label class="ed-row"><span>Titel</span><input type="text" id="opt-title"></label>
          <label class="ed-row">
            <span>Anzahl Luefter</span>
            <select id="opt-fans"><option value="1">1 Luefter</option><option value="2">2 Luefter</option></select>
          </label>
          <label class="ed-row">
            <span>Anzahl Heizkreise</span>
            <select id="opt-hk"><option value="1">1 Heizkreis</option><option value="2">2 Heizkreise</option></select>
          </label>
          <label class="ed-row">
            <span>Heizungsskala kalt<em>Grad, faerbt Tanks und Leitungen</em></span>
            <input type="number" id="opt-min">
          </label>
          <label class="ed-row"><span>Heizungsskala heiss<em>Grad</em></span><input type="number" id="opt-max"></label>
          <label class="ed-row">
            <span>Aussenskala kalt<em>Grad, faerbt das Thermometer</em></span>
            <input type="number" id="opt-omin">
          </label>
          <label class="ed-row"><span>Aussenskala warm<em>Grad</em></span><input type="number" id="opt-omax"></label>
          <label class="ed-row ed-check"><input type="checkbox" id="opt-animate"><span>Bewegung anzeigen</span></label>
          <label class="ed-row ed-check"><input type="checkbox" id="opt-switches"><span>Schalter anzeigen</span></label>
          <label class="ed-row ed-check"><input type="checkbox" id="opt-controls"><span>Sollwertregler anzeigen</span></label>
        </div>

        ${groups
          .map(
            (g) => `
          <div class="ed-group">
            <h3>${g.name}</h3>
            ${g.fields
              .map(
                (f) => `
              <label class="ed-row">
                <span>${f.label}<em>${f.hint}</em></span>
                <input type="text" list="lhc-entities" data-entity="${f.key}"
                       placeholder="entity_id" autocomplete="off">
              </label>`
              )
              .join("")}
          </div>`
          )
          .join("")}

        <datalist id="lhc-entities">${options}</datalist>

        <p class="ed-note">
          HeishaMon kennt keine getrennten Schalter fuer Heizung und Warmwasser.
          Was die Anlage wirklich umschaltet, ist die Betriebsart. Das Feld
          "Heizung ein und aus" ist fuer einen eigenen Helfer gedacht.
          Die Heizkreispumpen melden nur an oder aus, keine Drehzahl, sie drehen
          sich daher mit fester Geschwindigkeit.
          SG Ready liefert HeishaMon nicht. Trage die beiden Kontakte ein,
          K1 fuer Sperre und K2 fuer Anlauf. Den Betriebszustand 1 bis 4
          leitet die Karte daraus selbst ab.
          Die Knoepfe oben fuehren zusammen und loeschen eigene Eintraege nicht.
        </p>
      </div>
    `;

    const bind = (id, handler) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.addEventListener("change", () => handler(el));
    };
    const put = (patch) => {
      this._config = { ...this._config, ...patch };
      this._emit();
    };
    bind("opt-title", (el) => put({ title: el.value }));
    bind("opt-fans", (el) => put({ fan_count: parseInt(el.value, 10) }));
    bind("opt-hk", (el) => put({ hk_count: parseInt(el.value, 10) }));
    bind("opt-min", (el) => put({ scale_min: parseFloat(el.value) }));
    bind("opt-max", (el) => put({ scale_max: parseFloat(el.value) }));
    bind("opt-omin", (el) => put({ outdoor_min: parseFloat(el.value) }));
    bind("opt-omax", (el) => put({ outdoor_max: parseFloat(el.value) }));
    bind("opt-animate", (el) => put({ animate: el.checked }));
    bind("opt-switches", (el) => put({ show_switches: el.checked }));
    bind("opt-controls", (el) => put({ show_controls: el.checked }));

    // Beim Uebernehmen wird zusammengefuehrt, damit eigene Eintraege
    // wie SG Ready oder der Heizungshelfer nicht verloren gehen.
    const applyMap = (map, merge) => {
      const entities = merge ? { ...this._config.entities, ...map } : { ...map };
      this._config = { ...this._config, entities };
      this._syncValues();
      this._emit();
    };
    this.shadowRoot.getElementById("btn-adopt").addEventListener("click", () => {
      const f = detectIntegration(this._hass);
      if (f.found) applyMap(f.entities, true);
    });
    this.shadowRoot
      .getElementById("btn-default")
      .addEventListener("click", () => applyMap(defaultEntityMap(), true));
    this.shadowRoot
      .getElementById("btn-clear")
      .addEventListener("click", () => applyMap({}, false));

    this.shadowRoot.querySelectorAll("[data-entity]").forEach((input) => {
      input.addEventListener("change", () => {
        const entities = { ...this._config.entities };
        const v = input.value.trim();
        if (v) entities[input.dataset.entity] = v;
        else delete entities[input.dataset.entity];
        this._config = { ...this._config, entities };
        this._emit();
      });
    });

    this._built = true;
    this._syncValues();
  }

  _syncValues() {
    const sr = this.shadowRoot;
    const put = (id, value) => {
      const el = sr.getElementById(id);
      if (el) el.value = value;
    };
    const check = (id, value) => {
      const el = sr.getElementById(id);
      if (el) el.checked = value !== false;
    };
    put("opt-title", this._config.title);
    put("opt-fans", String(this._config.fan_count));
    put("opt-hk", String(this._config.hk_count));
    put("opt-min", this._config.scale_min);
    put("opt-max", this._config.scale_max);
    put("opt-omin", this._config.outdoor_min);
    put("opt-omax", this._config.outdoor_max);
    check("opt-animate", this._config.animate);
    check("opt-switches", this._config.show_switches);
    check("opt-controls", this._config.show_controls);

    sr.querySelectorAll("[data-entity]").forEach((input) => {
      const v = (this._config.entities || {})[input.dataset.entity] || "";
      if (input.value !== v) input.value = v;
      input.classList.toggle("is-missing", Boolean(v) && !this._hass.states[v]);
    });
  }

  _css() {
    return `
      .ed { display: flex; flex-direction: column; gap: 18px; padding: 4px 0 8px; }
      .ed-group {
        border: 1px solid var(--divider-color, #3A4757);
        border-radius: 10px; padding: 12px 14px 14px;
      }
      h3 {
        margin: 0 0 10px; font-size: 12px; letter-spacing: 0.14em;
        text-transform: uppercase; color: var(--secondary-text-color, #8A94A6);
      }
      .ed-row {
        display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
        align-items: center; gap: 12px; padding: 6px 0;
      }
      .ed-row > span {
        font-size: 14px; color: var(--primary-text-color, #E8EDF4);
        display: flex; flex-direction: column;
      }
      .ed-row em {
        font-style: normal; font-size: 11px; color: var(--secondary-text-color, #8A94A6);
      }
      .ed-check { grid-template-columns: auto 1fr; }
      input[type="text"], input[type="number"], select {
        width: 100%; box-sizing: border-box; padding: 8px 10px;
        border-radius: 8px; font-size: 14px;
        border: 1px solid var(--divider-color, #3A4757);
        background: var(--card-background-color, #12181F);
        color: var(--primary-text-color, #E8EDF4);
      }
      input.is-missing { border-color: #D6534A; }
      .ed-detect.is-found { border-color: #3E8E5A; }
      .ed-detect.is-absent { border-color: #B07B2E; }
      .ed-status {
        margin: 0 0 12px; font-size: 13px; line-height: 1.5;
        color: var(--primary-text-color, #E8EDF4);
      }
      .ed-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .ed-actions button {
        flex: 1 1 auto; padding: 9px 14px; border-radius: 8px; cursor: pointer;
        font-size: 13px; font-weight: 500;
        border: 1px solid var(--divider-color, #3A4757);
        background: var(--primary-color, #03A9F4); color: #FFFFFF;
      }
      .ed-actions button.is-quiet {
        background: transparent; color: var(--secondary-text-color, #8A94A6); flex: 0 0 auto;
      }
      .ed-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
      .ed-actions button:hover:not(:disabled) { filter: brightness(1.1); }
      .ed-note {
        margin: 0; font-size: 12px; line-height: 1.5;
        color: var(--secondary-text-color, #8A94A6);
      }
      @media (max-width: 600px) { .ed-row { grid-template-columns: 1fr; align-items: stretch; } }
    `;
  }
}

customElements.define("lutarym-heatpump-card", LutarymHeatpumpCard);
customElements.define("lutarym-heatpump-card-editor", LutarymHeatpumpCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "lutarym-heatpump-card",
  name: "Lutarym Waermepumpe",
  description:
    "Anlagenschema mit zwei Heizkreisen, Pumpen, Speichern und Durchflussanimation.",
  preview: true,
  documentationURL: "https://github.com/Lutarym/lutarym-heatpump-card",
});

console.info(
  `%c LUTARYM-HEATPUMP-CARD %c ${CARD_VERSION} `,
  "background:#0D131B;color:#E0762E;font-weight:600;padding:2px 6px;border-radius:3px 0 0 3px",
  "background:#E0762E;color:#0D131B;font-weight:600;padding:2px 6px;border-radius:0 3px 3px 0"
);
