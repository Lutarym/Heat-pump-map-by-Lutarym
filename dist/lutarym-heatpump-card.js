/**
 * lutarym-heatpump-card
 *
 * Anlagenschema fuer Panasonic Aquarea via HeishaMon.
 *
 * Autor: Lutarym
 */

const CARD_VERSION = "0.2.0";

/* ------------------------------------------------------------------ *
 *  Zeichenraster
 *
 *  Alle waagerechten Bezugslinien an einer Stelle. Die Beschriftungen
 *  liegen bewusst unter der Ruecklaufleitung, damit sie nicht mehr
 *  von Leitungen verdeckt werden.
 * ------------------------------------------------------------------ */
const L = {
  W: 1240,
  H: 600,
  FLOW_Y: 150,
  RET_Y: 500,
  TANK_TOP: 196,
  TANK_BOTTOM: 444,
  CAP_Y: 545,
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
  if (s === "off" || s === "false") return false;
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
 *  Erkennung der Integration "Heishamon by Lutarym"
 *
 *  Die Integration setzt bei jeder Entity einen translation_key, bei
 *  Sensoren "top5", bei Kommandos "setheatpump". Der steht im
 *  Entitaetsregister und ueberlebt Umbenennungen. Faellt das Register
 *  aus, greift die Suche ueber das Namensschema der Entity-ID.
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
  top27: "heating_setpoint",
  top46: "buffer_temp",
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
  heating_setpoint: ["number", "input_number"],
  dhw_setpoint: ["number", "input_number"],
  power_switch: ["switch", "input_boolean"],
  heating_switch: ["switch", "input_boolean"],
  dhw_switch: ["switch", "input_boolean"],
  mode_select: ["select", "input_select"],
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

  { key: "flow_temp", label: "Vorlauftemperatur", group: "Heizkreis", hint: "TOP6" },
  { key: "return_temp", label: "Ruecklauftemperatur", group: "Heizkreis", hint: "TOP5" },
  { key: "pump_speed", label: "Umwaelzpumpe Drehzahl", group: "Heizkreis", hint: "TOP65" },
  { key: "three_way_valve", label: "Dreiwegeventil", group: "Heizkreis", hint: "TOP20" },
  { key: "room_heater", label: "Heizstab Heizung", group: "Heizkreis", hint: "TOP59" },
  { key: "heating_setpoint", label: "Heizung Sollwert", group: "Heizkreis", hint: "TOP27, number" },

  { key: "buffer_temp", label: "Puffertemperatur", group: "Heizungspuffer", hint: "TOP46" },

  { key: "dhw_temp", label: "Warmwasser Isttemperatur", group: "Warmwasser", hint: "TOP10" },
  { key: "dhw_setpoint", label: "Warmwasser Sollwert", group: "Warmwasser", hint: "TOP9, number" },
  { key: "dhw_heater", label: "Heizstab Warmwasser", group: "Warmwasser", hint: "TOP58" },

  { key: "power_switch", label: "Waermepumpe ein und aus", group: "Steuerung", hint: "SetHeatpump, switch" },
  { key: "mode_select", label: "Betriebsart umschalten", group: "Steuerung", hint: "SetOperationMode, select" },
  { key: "dhw_switch", label: "Warmwasser sofort laden", group: "Steuerung", hint: "SetForceDHW, switch" },
  { key: "heating_switch", label: "Heizung ein und aus", group: "Steuerung", hint: "eigener Helfer, optional" },
];

const DEFAULT_CONFIG = {
  type: "custom:lutarym-heatpump-card",
  title: "Waermepumpe",
  fan_count: 2,
  scale_min: 20,
  scale_max: 60,
  outdoor_min: -15,
  outdoor_max: 35,
  show_controls: true,
  show_switches: true,
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
    return 16;
  }

  _e(key) {
    const configured = (this._config.entities || {})[key];
    if (configured) return configured;
    if (!this._auto) this._auto = detectIntegration(this._hass).entities;
    return this._auto[key] || "";
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
      { key: "heating_setpoint", id: "ctl-heat", label: "Heizung Sollwert" },
      { key: "dhw_setpoint", id: "ctl-dhw", label: "Warmwasser Sollwert" },
    ].filter((r) => this._e(r.key));

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
            <span id="${r.id}-min">--</span>
            <span id="${r.id}-max">--</span>
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
      ? `${this._fan("fan1", 180, 190, 58)}${this._fan("fan2", 180, 360, 58)}`
      : this._fan("fan1", 180, 280, 95);

    const F = L.FLOW_Y;
    const R = L.RET_Y;
    const T = L.TANK_TOP;
    const B = L.TANK_BOTTOM;
    const C = L.CAP_Y;

    return `
    <svg viewBox="0 0 ${L.W} ${L.H}" class="lhc-svg" role="img"
         aria-label="Schema der Waermepumpenanlage">
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
        <linearGradient id="radFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" id="rad-top" stop-color="${NEUTRAL}"/>
          <stop offset="100%" id="rad-bottom" stop-color="${NEUTRAL}"/>
        </linearGradient>
      </defs>

      <path class="pipe-shell" d="M320 ${R} H 1095"/>
      <path class="pipe" id="pipe-return" d="M320 ${R} H 1095"/>
      <path class="pipe-shell" d="M320 ${F} H 1095"/>
      <path class="pipe" id="pipe-flow" d="M320 ${F} H 1095"/>

      <path class="pipe-shell" d="M540 ${F} V ${T} M540 ${B} V ${R}"/>
      <path class="pipe" id="pipe-buf-in" d="M540 ${F} V ${T}"/>
      <path class="pipe" id="pipe-buf-out" d="M540 ${B} V ${R}"/>

      <path class="pipe-shell" d="M835 ${F} V 236 M835 404 V ${R}"/>
      <path class="pipe" id="pipe-rad-in" d="M835 ${F} V 236"/>
      <path class="pipe" id="pipe-rad-out" d="M835 404 V ${R}"/>

      <path class="pipe-shell" d="M1095 ${F} V ${T} M1095 ${B} V ${R}"/>
      <path class="pipe" id="pipe-dhw-in" d="M1095 ${F} V ${T}"/>
      <path class="pipe" id="pipe-dhw-out" d="M1095 ${B} V ${R}"/>

      <g class="unit">
        <rect x="40" y="80" width="280" height="430" rx="16"
              fill="url(#casing)" stroke="#33415A" stroke-width="2"/>
        <rect x="40" y="80" width="280" height="430" rx="16" fill="url(#glass)"/>
        <text class="cap" x="180" y="110" text-anchor="middle">Aussengeraet</text>
        ${fans}
        <g id="defrost-badge" opacity="0" transform="translate(180 484)">
          <rect x="-64" y="-16" width="128" height="32" rx="16"
                fill="#0E2A4A" stroke="#3E9BE0" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Abtauung</text>
        </g>
      </g>

      <g class="vessel">
        <rect x="440" y="${T}" width="200" height="248" rx="26"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="448" y="204" width="184" height="232" rx="20" fill="url(#bufferFill)"/>
        <rect x="448" y="204" width="184" height="232" rx="20" fill="url(#glass)"/>
        <text class="value-l" id="buf-v" x="540" y="330" text-anchor="middle">--</text>
        <g id="roomheater-badge" opacity="0" transform="translate(540 412)">
          <rect x="-56" y="-15" width="112" height="30" rx="15"
                fill="#3A1B08" stroke="#E0762E" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Heizstab</text>
        </g>
        <text class="cap" x="540" y="${C}" text-anchor="middle">Heizungspuffer</text>
      </g>

      <g class="device">
        <text class="value-s" id="pump-v" x="380" y="462" text-anchor="middle">--</text>
        <text class="cap-s" x="380" y="${C}" text-anchor="middle">Pumpe</text>
        <circle cx="380" cy="${R}" r="26" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <g id="pump-rotor" class="rotor" transform="translate(380 ${R})">
          <path d="M0 -15 L5 -4 L16 0 L5 4 L0 15 L-5 4 L-16 0 L-5 -4 Z" fill="#55637A"/>
          <circle r="4" fill="#0D1219"/>
        </g>
      </g>

      <g class="rad">
        <rect x="730" y="236" width="210" height="168" rx="10"
              fill="url(#radFill)" stroke="#33415A" stroke-width="2"/>
        <g stroke="#0D1219" stroke-width="7" opacity="0.5">
          <line x1="760" y1="244" x2="760" y2="396"/><line x1="790" y1="244" x2="790" y2="396"/>
          <line x1="820" y1="244" x2="820" y2="396"/><line x1="850" y1="244" x2="850" y2="396"/>
          <line x1="880" y1="244" x2="880" y2="396"/><line x1="910" y1="244" x2="910" y2="396"/>
        </g>
        <rect x="730" y="236" width="210" height="168" rx="10" fill="url(#glass)"/>
        <g transform="translate(835 288)">
          <rect x="-66" y="-26" width="132" height="44" rx="10" fill="#0B1017" opacity="0.88"/>
          <text class="tag-l" x="0" y="-9" text-anchor="middle">Vorlauf</text>
          <text class="tag-v" id="rad-flow-v" x="0" y="12" text-anchor="middle">--</text>
        </g>
        <g transform="translate(835 366)">
          <rect x="-66" y="-26" width="132" height="44" rx="10" fill="#0B1017" opacity="0.88"/>
          <text class="tag-l" x="0" y="-9" text-anchor="middle">Ruecklauf</text>
          <text class="tag-v" id="rad-ret-v" x="0" y="12" text-anchor="middle">--</text>
        </g>
        <text class="cap" x="835" y="${C}" text-anchor="middle">Heizkreis</text>
      </g>

      <g class="device">
        <text class="value-s" id="press-v" x="975" y="462" text-anchor="middle">--</text>
        <circle cx="975" cy="${R}" r="26" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <circle cx="975" cy="${R}" r="18" fill="none" stroke="#26303F" stroke-width="3"/>
        <line id="press-needle" x1="975" y1="${R}" x2="975" y2="${R - 15}"
              stroke="${NEUTRAL}" stroke-width="3" stroke-linecap="round"
              transform="rotate(-120 975 ${R})"/>
        <circle cx="975" cy="${R}" r="4" fill="#55637A"/>
      </g>

      <g class="device">
        <rect x="1077" y="158" width="36" height="36" rx="8"
              fill="#0D1219" stroke="#33415A" stroke-width="2"
              transform="rotate(45 1095 176)"/>
        <circle cx="1095" cy="176" r="9" id="valve-dot" fill="${NEUTRAL}"/>
        <text class="value-s" id="valve-v" x="1128" y="181" text-anchor="start">--</text>
      </g>

      <g class="vessel">
        <rect x="1010" y="${T}" width="170" height="248" rx="34"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="1018" y="204" width="154" height="232" rx="28" fill="url(#dhwFill)"/>
        <rect x="1018" y="204" width="154" height="232" rx="28" fill="url(#glass)"/>
        <path class="coil" d="M1040 300 q28 -18 55 0 q28 18 55 0
                              M1040 336 q28 -18 55 0 q28 18 55 0
                              M1040 372 q28 -18 55 0 q28 18 55 0"/>
        <text class="value-l" id="dhw-v" x="1095" y="266" text-anchor="middle">--</text>
        <text class="value-sp" id="dhw-sp" x="1095" y="290" text-anchor="middle"></text>
        <g id="dhwheater-badge" opacity="0" transform="translate(1095 412)">
          <rect x="-56" y="-15" width="112" height="30" rx="15"
                fill="#3A1B08" stroke="#E0762E" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Heizstab</text>
        </g>
        <text class="cap" x="1095" y="${C}" text-anchor="middle">Warmwasser</text>
      </g>
    </svg>`;
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
        <text class="value-s" id="${id}-rpm" y="${r + 30}" text-anchor="middle">--</text>
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
    const set = (id, text) => {
      const el = sr.getElementById(id);
      if (el) el.textContent = text;
    };
    const paint = (id, color) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("stop-color", color);
    };
    const show = (id, visible) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("opacity", visible ? "1" : "0");
    };

    const modeEntity = this._e("operating_mode");
    set(
      "mode",
      attr(hass, modeEntity, "beschreibung", null) || rawState(hass, modeEntity) || "--"
    );

    const alertEl = sr.getElementById("alert");
    if (alertEl) {
      const err = rawState(hass, this._e("error"));
      const harmlos = [null, "", "OK", "ok", "0", "No error", "unknown", "unavailable"];
      if (err !== null && !harmlos.includes(err)) {
        alertEl.hidden = false;
        alertEl.textContent = `Stoerung der Waermepumpe: ${err}`;
      } else {
        alertEl.hidden = true;
      }
    }

    const comp = numState(hass, this._e("compressor"));
    const flowRate = numState(hass, this._e("pump_flow"));
    const output = numState(hass, this._e("heat_output"));
    const input = numState(hass, this._e("power_input"));
    set("st-comp", comp === null ? "--" : `${fmt(comp, 0)} Hz`);
    set("st-flowrate", flowRate === null ? "--" : `${fmt(flowRate)} l/min`);
    set("st-output", output === null ? "--" : `${fmt(output, 0)} W`);
    set("st-input", input === null ? "--" : `${fmt(input, 0)} W`);
    set("st-cop", output && input && input > 0 ? (output / input).toFixed(2) : "--");

    this._spin("fan1", numState(hass, this._e("fan1_rpm")), "fan1-rpm", "U/min");
    if (this._config.fan_count === 2) {
      this._spin("fan2", numState(hass, this._e("fan2_rpm")), "fan2-rpm", "U/min");
    }
    show("defrost-badge", isOn(hass, this._e("defrost")) === true);

    // Aussentemperatur bewusst im Kopfbereich, nicht im Anlagenschema.
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

    const buf = numState(hass, this._e("buffer_temp"));
    paint("bg-top", col(buf));
    paint("bg-bottom", col(buf === null ? null : buf - 4));
    set("buf-v", buf === null ? "--" : `${fmt(buf)} °C`);
    show("roomheater-badge", isOn(hass, this._e("room_heater")) === true);

    const dhw = numState(hass, this._e("dhw_temp"));
    const dhwSp = numState(hass, this._e("dhw_setpoint"));
    paint("dhw-top", col(dhw));
    paint("dhw-bottom", col(dhw === null ? null : dhw - 6));
    set("dhw-v", dhw === null ? "--" : `${fmt(dhw)} °C`);
    set("dhw-sp", dhwSp === null ? "" : `Ziel ${fmt(dhwSp, 0)} °C`);
    show("dhwheater-badge", isOn(hass, this._e("dhw_heater")) === true);

    const flow = numState(hass, this._e("flow_temp"));
    const ret = numState(hass, this._e("return_temp"));
    paint("rad-top", col(flow));
    paint("rad-bottom", col(ret));
    set("rad-flow-v", flow === null ? "--" : `${fmt(flow)} °C`);
    set("rad-ret-v", ret === null ? "--" : `${fmt(ret)} °C`);

    const stroke = (id, color) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("stroke", color);
    };
    ["pipe-flow", "pipe-buf-in", "pipe-rad-in", "pipe-dhw-in"].forEach((id) =>
      stroke(id, col(flow))
    );
    ["pipe-return", "pipe-buf-out", "pipe-rad-out", "pipe-dhw-out"].forEach((id) =>
      stroke(id, col(ret))
    );

    this._spin("pump-rotor", numState(hass, this._e("pump_speed")), "pump-v", "U/min");

    const bar = numState(hass, this._e("water_pressure"));
    set("press-v", bar === null ? "--" : `${fmt(bar)} bar`);
    const needle = sr.getElementById("press-needle");
    if (needle) {
      const ratio = bar === null ? 0 : clamp(bar / 4, 0, 1);
      needle.setAttribute("transform", `rotate(${-120 + 240 * ratio} 975 ${L.RET_Y})`);
      const kritisch = bar !== null && (bar < 0.8 || bar > 2.8);
      needle.setAttribute("stroke", kritisch ? "#D62B2B" : "#9BAAC0");
    }

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

    this._syncToggle("sw-power", "power_switch");
    this._syncToggle("sw-heat", "heating_switch");
    this._syncToggle("sw-dhw", "dhw_switch");
    this._syncModeSelect();
    this._syncSlider("ctl-heat", "heating_setpoint");
    this._syncSlider("ctl-dhw", "dhw_setpoint");
  }

  _spin(rotorId, rpm, labelId, unit) {
    const label = this.shadowRoot.getElementById(labelId);
    if (label) label.textContent = rpm === null ? "--" : `${fmt(rpm, 0)} ${unit}`;
    const el = this.shadowRoot.getElementById(rotorId);
    if (!el) return;
    if (rpm === null || rpm <= 0) {
      el.style.animationPlayState = "paused";
      el.classList.add("is-still");
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
      .lhc-head-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
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
      .cap { fill: #98A6BA; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; }
      .value-l {
        fill: #FFFFFF; font-size: 30px; font-weight: 650;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
        paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 5px;
      }
      .value-m {
        fill: #FFFFFF; font-size: 26px; font-weight: 650;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
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
        fill: #FFFFFF; font-size: 20px; font-weight: 600;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .badge-t { fill: #E8EDF4; font-size: 13px; }
      #defrost-badge, #roomheater-badge, #dhwheater-badge { transition: opacity 300ms ease; }
      #mini-fill, #mini-bulb, #mini-neck, #valve-dot, #press-needle {
        transition: all 900ms ease;
      }
      .cap-s { fill: #7E8CA0; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; }

      .rotor {
        transform-origin: 0 0; animation: lhc-spin 2s linear infinite;
        animation-play-state: paused;
      }
      #pump-rotor { transform-box: fill-box; transform-origin: center; }
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
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
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
        .lhc-controls { grid-template-columns: 1fr; }
        .lhc-title h2 { font-size: 20px; }
      }
      @media (prefers-reduced-motion: reduce) { .rotor { animation: none !important; } }
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
            <span>Heizungsskala kalt<em>Grad, faerbt Tanks und Leitungen</em></span>
            <input type="number" id="opt-min">
          </label>
          <label class="ed-row"><span>Heizungsskala heiss<em>Grad</em></span><input type="number" id="opt-max"></label>
          <label class="ed-row">
            <span>Aussenskala kalt<em>Grad, faerbt das Thermometer</em></span>
            <input type="number" id="opt-omin">
          </label>
          <label class="ed-row"><span>Aussenskala warm<em>Grad</em></span><input type="number" id="opt-omax"></label>
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
          "Heizung ein und aus" ist deshalb fuer einen eigenen Helfer gedacht,
          etwa einen Schalter, der eine Automation ausloest.
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
    bind("opt-min", (el) => put({ scale_min: parseFloat(el.value) }));
    bind("opt-max", (el) => put({ scale_max: parseFloat(el.value) }));
    bind("opt-omin", (el) => put({ outdoor_min: parseFloat(el.value) }));
    bind("opt-omax", (el) => put({ outdoor_max: parseFloat(el.value) }));
    bind("opt-switches", (el) => put({ show_switches: el.checked }));
    bind("opt-controls", (el) => put({ show_controls: el.checked }));

    const applyMap = (map) => {
      this._config = { ...this._config, entities: { ...map } };
      this._syncValues();
      this._emit();
    };
    this.shadowRoot.getElementById("btn-adopt").addEventListener("click", () => {
      const f = detectIntegration(this._hass);
      if (f.found) applyMap(f.entities);
    });
    this.shadowRoot
      .getElementById("btn-default")
      .addEventListener("click", () => applyMap(defaultEntityMap()));
    this.shadowRoot
      .getElementById("btn-clear")
      .addEventListener("click", () => applyMap({}));

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
    put("opt-title", this._config.title);
    put("opt-fans", String(this._config.fan_count));
    put("opt-min", this._config.scale_min);
    put("opt-max", this._config.scale_max);
    put("opt-omin", this._config.outdoor_min);
    put("opt-omax", this._config.outdoor_max);
    const sw = sr.getElementById("opt-switches");
    if (sw) sw.checked = this._config.show_switches !== false;
    const ct = sr.getElementById("opt-controls");
    if (ct) ct.checked = this._config.show_controls !== false;

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
    "Anlagenschema mit Luefteranimation, Speichern, Ventil, Pumpe und Steuerung.",
  preview: true,
  documentationURL: "https://github.com/Lutarym/lutarym-heatpump-card",
});

console.info(
  `%c LUTARYM-HEATPUMP-CARD %c ${CARD_VERSION} `,
  "background:#0D131B;color:#E0762E;font-weight:600;padding:2px 6px;border-radius:3px 0 0 3px",
  "background:#E0762E;color:#0D131B;font-weight:600;padding:2px 6px;border-radius:0 3px 3px 0"
);
