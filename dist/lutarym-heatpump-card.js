/**
 * lutarym-heatpump-card
 *
 * Anlagenschema fuer Panasonic Aquarea via HeishaMon.
 * Aussengeraet mit ein oder zwei separat drehenden Lueftern,
 * Warmwasserspeicher und Heizungspuffer mit thermischer Faerbung,
 * Heizkoerper mit Vor- und Ruecklauf, plus Sollwertsteuerung.
 *
 * Autor: Lutarym
 */

const CARD_VERSION = "0.1.0";

/* ------------------------------------------------------------------ *
 *  Thermische Farbskala
 *  Blau (kalt) ueber Cyan und Bernstein bis Rot (heiss).
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

function unitOf(hass, entityId, fallback) {
  return attr(hass, entityId, "unit_of_measurement", fallback);
}

function fmt(value, digits) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(digits === undefined ? 1 : digits);
}

function friendly(hass, entityId) {
  return attr(hass, entityId, "friendly_name", entityId || "");
}

/* ------------------------------------------------------------------ *
 *  Erkennung der Integration "Heishamon by Lutarym"
 *
 *  Die Integration setzt bei jeder Entity einen translation_key wie
 *  "top5". Der steht im Entitaetsregister und ueberlebt Umbenennungen.
 *  Faellt das Register aus, greift die Suche ueber die Entity-ID.
 * ------------------------------------------------------------------ */
const INTEGRATION_DOMAIN = "heishamon_lutarym";

const TOPIC_TO_FIELD = {
  top14: "outside_temp",
  top4: "operating_mode",
  top8: "compressor",
  top1: "pump_flow",
  top15: "heat_output",
  top16: "power_input",
  top62: "fan1_rpm",
  top63: "fan2_rpm",
  top26: "defrost",
  top6: "flow_temp",
  top5: "return_temp",
  top27: "heating_setpoint",
  top46: "buffer_temp",
  top10: "dhw_temp",
  top9: "dhw_setpoint",
  top58: "dhw_heater",
};

/**
 * Sucht die Entitaeten der Integration.
 * Rueckgabe: { found, source, entities, count, devices }
 */
function detectIntegration(hass) {
  const result = { found: false, source: "keine", entities: {}, count: 0, devices: 0 };
  if (!hass) return result;

  const assign = (topic, entityId) => {
    const field = TOPIC_TO_FIELD[topic];
    if (!field || !entityId) return;
    // Sollwerte muessen schreibbar sein, sonst laesst sich nichts einstellen.
    const needsNumber = field === "heating_setpoint" || field === "dhw_setpoint";
    const domain = entityId.split(".")[0];
    if (needsNumber && domain !== "number" && domain !== "input_number") return;
    result.entities[field] = entityId;
  };

  /* Weg 1: Entitaetsregister */
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

  /* Weg 2: Namensschema der Entity-IDs */
  let hits = 0;
  Object.keys(hass.states || {}).forEach((entityId) => {
    const m = entityId.match(/^(sensor|number)\.heishamon_(top\d+)$/);
    if (!m) return;
    hits++;
    assign(m[2], entityId);
  });
  if (hits > 0) {
    result.found = true;
    result.source = "namensschema";
    result.count = hits;
    result.devices = 1;
  }
  return result;
}

/**
 * Standardbelegung nach dem Namensschema der Integration,
 * unabhaengig davon ob die Entitaeten gerade existieren.
 */
function defaultEntityMap() {
  const map = {};
  Object.keys(TOPIC_TO_FIELD).forEach((topic) => {
    const field = TOPIC_TO_FIELD[topic];
    const domain =
      field === "heating_setpoint" || field === "dhw_setpoint" ? "number" : "sensor";
    map[field] = `${domain}.heishamon_${topic}`;
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

  { key: "fan1_rpm", label: "Luefter 1 Drehzahl", group: "Aussengeraet", hint: "TOP62" },
  { key: "fan2_rpm", label: "Luefter 2 Drehzahl", group: "Aussengeraet", hint: "TOP63" },
  { key: "defrost", label: "Abtauung laeuft", group: "Aussengeraet", hint: "TOP26" },

  { key: "flow_temp", label: "Vorlauftemperatur", group: "Heizkreis", hint: "TOP6" },
  { key: "return_temp", label: "Ruecklauftemperatur", group: "Heizkreis", hint: "TOP5" },
  { key: "heating_setpoint", label: "Heizung Sollwert (einstellbar)", group: "Heizkreis", hint: "TOP27, number" },

  { key: "buffer_temp", label: "Puffertemperatur", group: "Heizungspuffer", hint: "TOP46" },

  { key: "dhw_temp", label: "Warmwasser Isttemperatur", group: "Warmwasser", hint: "TOP10" },
  { key: "dhw_setpoint", label: "Warmwasser Sollwert (einstellbar)", group: "Warmwasser", hint: "TOP9, number" },
  { key: "dhw_heater", label: "Heizstab Warmwasser", group: "Warmwasser", hint: "TOP58" },
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
  }

  static getConfigElement() {
    return document.createElement("lutarym-heatpump-card-editor");
  }

  static getStubConfig(hass) {
    const found = detectIntegration(hass);
    return {
      ...DEFAULT_CONFIG,
      entities: found.found ? found.entities : {},
    };
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
    return 14;
  }

  /* -------------------- Rendering -------------------- */

  _render() {
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this._update();
  }

  _e(key) {
    const configured = (this._config.entities || {})[key];
    if (configured) return configured;
    // Ist nichts eingetragen, greift die Erkennung der Integration.
    if (!this._auto) this._auto = detectIntegration(this._hass).entities;
    return this._auto[key] || "";
  }

  _build() {
    const twoFans = this._config.fan_count === 2;
    const root = document.createElement("div");
    root.innerHTML = `
      <style>${this._css()}</style>
      <ha-card class="lhc">
        <header class="lhc-head">
          <div class="lhc-title">
            <span class="lhc-kicker">Anlagenschema</span>
            <h2>${this._config.title}</h2>
          </div>
          <div class="lhc-mode" id="mode">--</div>
        </header>

        <section class="lhc-stats" id="stats"></section>

        <div class="lhc-scene">
          ${this._svg(twoFans)}
        </div>

        <section class="lhc-controls" id="controls"></section>
      </ha-card>
    `;
    this.shadowRoot.appendChild(root);
    this._buildStats();
    this._buildControls();
  }

  _buildStats() {
    const host = this.shadowRoot.getElementById("stats");
    const items = [
      { id: "st-comp", label: "Verdichter" },
      { id: "st-flowrate", label: "Durchfluss" },
      { id: "st-output", label: "Waermeleistung" },
      { id: "st-input", label: "Stromaufnahme" },
      { id: "st-cop", label: "Arbeitszahl" },
    ];
    host.innerHTML = items
      .map(
        (i) => `
        <div class="lhc-stat">
          <span class="lhc-stat-label">${i.label}</span>
          <span class="lhc-stat-value" id="${i.id}">--</span>
        </div>`
      )
      .join("");
  }

  _buildControls() {
    const host = this.shadowRoot.getElementById("controls");
    if (!this._config.show_controls) {
      host.style.display = "none";
      return;
    }
    const rows = [
      { key: "heating_setpoint", id: "ctl-heat", label: "Heizung Sollwert" },
      { key: "dhw_setpoint", id: "ctl-dhw", label: "Warmwasser Sollwert" },
    ].filter((r) => this._e(r.key));

    if (!rows.length) {
      host.innerHTML = `<p class="lhc-empty">Keine Sollwert-Entitaet konfiguriert. Trage im Karteneditor eine Number-Entitaet ein, um die Temperatur hier einzustellen.</p>`;
      return;
    }

    host.innerHTML = rows
      .map(
        (r) => `
        <div class="lhc-ctl" id="${r.id}">
          <div class="lhc-ctl-head">
            <span class="lhc-ctl-label">${r.label}</span>
            <output class="lhc-ctl-out" id="${r.id}-out">--</output>
          </div>
          <input class="lhc-slider" type="range" id="${r.id}-range"
                 min="0" max="100" step="1" value="0"
                 aria-label="${r.label}">
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
        this._setValue(this._e(r.key), parseFloat(range.value));
      });
    });
  }

  _setValue(entityId, value) {
    if (!entityId || !this._hass) return;
    const domain = entityId.split(".")[0];
    const service = domain === "input_number" ? "set_value" : "set_value";
    this._hass.callService(domain, service, {
      entity_id: entityId,
      value: value,
    });
  }

  /* -------------------- SVG-Szene -------------------- */

  _svg(twoFans) {
    const fans = twoFans
      ? `
      ${this._fanGroup("fan1", 180, 168, 62)}
      ${this._fanGroup("fan2", 180, 330, 62)}`
      : `${this._fanGroup("fan1", 180, 250, 92)}`;

    return `
    <svg viewBox="0 0 1240 560" class="lhc-svg" role="img"
         aria-label="Schema der Waermepumpenanlage">
      <defs>
        <linearGradient id="casing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#232C3A"/>
          <stop offset="100%" stop-color="#161D28"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.16"/>
          <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
        </linearGradient>
        <linearGradient id="bufferFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   id="bg-top"    stop-color="${NEUTRAL}"/>
          <stop offset="100%" id="bg-bottom" stop-color="${NEUTRAL}"/>
        </linearGradient>
        <clipPath id="thermoClip">
          <rect x="366" y="214" width="28" height="182" rx="14"/>
        </clipPath>
        <linearGradient id="dhwFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   id="dhw-top"    stop-color="${NEUTRAL}"/>
          <stop offset="100%" id="dhw-bottom" stop-color="${NEUTRAL}"/>
        </linearGradient>
        <linearGradient id="radFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   id="rad-top"    stop-color="${NEUTRAL}"/>
          <stop offset="100%" id="rad-bottom" stop-color="${NEUTRAL}"/>
        </linearGradient>
      </defs>

      <!-- Ruecklaufleitung -->
      <path class="pipe-shell" d="M1095 470 H 320" />
      <path class="pipe" id="pipe-return" d="M1095 470 H 320" />
      <!-- Vorlaufleitung -->
      <path class="pipe-shell" d="M320 170 H 1095" />
      <path class="pipe" id="pipe-flow" d="M320 170 H 1095" />

      <!-- Stichleitungen -->
      <path class="pipe-shell" d="M540 170 V 200 M540 440 V 470" />
      <path class="pipe" id="pipe-buf-in"  d="M540 170 V 200" />
      <path class="pipe" id="pipe-buf-out" d="M540 440 V 470" />

      <path class="pipe-shell" d="M835 170 V 236 M835 404 V 470" />
      <path class="pipe" id="pipe-rad-in"  d="M835 170 V 236" />
      <path class="pipe" id="pipe-rad-out" d="M835 404 V 470" />

      <path class="pipe-shell" d="M1095 170 V 200 M1095 440 V 470" />
      <path class="pipe" id="pipe-dhw-in"  d="M1095 170 V 200" />
      <path class="pipe" id="pipe-dhw-out" d="M1095 440 V 470" />

      <!-- ===== Aussengeraet ===== -->
      <g class="unit">
        <rect x="40" y="80" width="280" height="352" rx="16"
              fill="url(#casing)" stroke="#33415A" stroke-width="2"/>
        <rect x="40" y="80" width="280" height="352" rx="16" fill="url(#glass)"/>
        <text class="cap" x="180" y="112" text-anchor="middle">Aussengeraet</text>
        ${fans}
        <g id="defrost-badge" class="badge" transform="translate(180 412)" opacity="0">
          <rect x="-62" y="-15" width="124" height="30" rx="15"
                fill="#0E2A4A" stroke="#3E9BE0" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Abtauung</text>
        </g>
      </g>

      <!-- ===== Aussenfuehler ===== -->
      <g class="thermo">
        <rect x="356" y="204" width="48" height="202" rx="24"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <circle cx="380" cy="424" r="30" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="366" y="214" width="28" height="182" rx="14" fill="#1A2330"/>
        <circle cx="380" cy="424" r="21" id="thermo-bulb" fill="${NEUTRAL}"/>
        <rect x="366" y="380" width="28" height="16" id="thermo-neck" fill="${NEUTRAL}"/>
        <g clip-path="url(#thermoClip)">
          <rect x="366" y="396" width="28" height="0" id="thermo-fill" fill="${NEUTRAL}"/>
        </g>
        <g class="ticks" stroke="#46536A" stroke-width="2">
          <line x1="404" y1="232" x2="416" y2="232"/>
          <line x1="404" y1="277" x2="412" y2="277"/>
          <line x1="404" y1="322" x2="416" y2="322"/>
          <line x1="404" y1="367" x2="412" y2="367"/>
        </g>
        <rect x="356" y="204" width="48" height="202" rx="24" fill="url(#glass)"/>
        <text class="thermo-v" id="outside-v" x="380" y="188" text-anchor="middle">--</text>
        <text class="cap" x="380" y="478" text-anchor="middle">Aussen</text>
      </g>

      <!-- ===== Heizungspuffer ===== -->
      <g class="vessel">
        <rect x="440" y="196" width="200" height="248" rx="26"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="448" y="204" width="184" height="232" rx="20"
              fill="url(#bufferFill)"/>
        <rect x="448" y="204" width="184" height="232" rx="20" fill="url(#glass)"/>

        <text class="tank-v" id="buf-v" x="540" y="330" text-anchor="middle">--</text>
        <text class="cap" x="540" y="478" text-anchor="middle">Heizungspuffer</text>
      </g>

      <!-- ===== Heizkoerper ===== -->
      <g class="rad">
        <rect x="730" y="236" width="210" height="168" rx="10"
              fill="url(#radFill)" stroke="#33415A" stroke-width="2"/>
        <g class="fins" stroke="#0D1219" stroke-width="7" opacity="0.5">
          <line x1="760" y1="244" x2="760" y2="396"/>
          <line x1="790" y1="244" x2="790" y2="396"/>
          <line x1="820" y1="244" x2="820" y2="396"/>
          <line x1="850" y1="244" x2="850" y2="396"/>
          <line x1="880" y1="244" x2="880" y2="396"/>
          <line x1="910" y1="244" x2="910" y2="396"/>
        </g>
        <rect x="730" y="236" width="210" height="168" rx="10" fill="url(#glass)"/>
        <g class="tag" transform="translate(835 282)">
          <rect x="-64" y="-24" width="128" height="42" rx="10" fill="#0B1017" opacity="0.86"/>
          <text class="tag-l" x="0" y="-8" text-anchor="middle">Vorlauf</text>
          <text class="tag-v" id="rad-flow-v" x="0" y="12" text-anchor="middle">--</text>
        </g>
        <g class="tag" transform="translate(835 362)">
          <rect x="-64" y="-24" width="128" height="42" rx="10" fill="#0B1017" opacity="0.86"/>
          <text class="tag-l" x="0" y="-8" text-anchor="middle">Ruecklauf</text>
          <text class="tag-v" id="rad-ret-v" x="0" y="12" text-anchor="middle">--</text>
        </g>
        <text class="cap" x="835" y="440" text-anchor="middle">Heizkreis</text>
      </g>

      <!-- ===== Warmwasserspeicher ===== -->
      <g class="vessel">
        <rect x="1010" y="196" width="170" height="248" rx="34"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="1018" y="204" width="154" height="232" rx="28"
              fill="url(#dhwFill)"/>
        <rect x="1018" y="204" width="154" height="232" rx="28" fill="url(#glass)"/>
        <path class="coil" d="M1040 300 q28 -18 55 0 q28 18 55 0
                              M1040 336 q28 -18 55 0 q28 18 55 0
                              M1040 372 q28 -18 55 0 q28 18 55 0"/>
        <text class="tank-v" id="dhw-v" x="1095" y="268" text-anchor="middle">--</text>
        <text class="tank-sp" id="dhw-sp" x="1095" y="292" text-anchor="middle">--</text>
        <g id="dhw-heater-badge" opacity="0" transform="translate(1095 414)">
          <rect x="-52" y="-14" width="104" height="28" rx="14"
                fill="#3A1B08" stroke="#E0762E" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Heizstab</text>
        </g>
        <text class="cap" x="1095" y="478" text-anchor="middle">Warmwasser</text>
      </g>
    </svg>`;
  }

  _fanGroup(id, cx, cy, r) {
    const blades = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const rot = (360 / count) * i;
      blades.push(
        `<path d="M0 0 C ${r * 0.34} ${-r * 0.30}, ${r * 0.80} ${-r * 0.26}, ${r * 0.92} ${r * 0.06}
                  C ${r * 0.62} ${r * 0.30}, ${r * 0.22} ${r * 0.26}, 0 0 Z"
               transform="rotate(${rot})"/>`
      );
    }
    return `
      <g class="fan-wrap" transform="translate(${cx} ${cy})">
        <circle r="${r + 10}" fill="#0B1017" stroke="#33415A" stroke-width="2"/>
        <circle r="${r + 2}" fill="none" stroke="#1E2836" stroke-width="6"/>
        <g class="fan" id="${id}">
          <g class="blades">${blades.join("")}</g>
          <circle r="${r * 0.17}" fill="#2B3546"/>
        </g>
        <g class="grill" stroke="#2A3446" stroke-width="1.5" fill="none" opacity="0.55">
          <circle r="${r * 0.4}"/><circle r="${r * 0.65}"/><circle r="${r * 0.9}"/>
        </g>
        <text class="rpm" id="${id}-rpm" y="${r + 30}" text-anchor="middle">--</text>
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

    /* Kopfzeile */
    const modeEl = sr.getElementById("mode");
    if (modeEl) {
      const modeEntity = this._e("operating_mode");
      const desc = attr(hass, modeEntity, "beschreibung", null);
      modeEl.textContent = desc || rawState(hass, modeEntity) || "--";
    }

    /* Kennzahlen */
    const outside = numState(hass, this._e("outside_temp"));
    const comp = numState(hass, this._e("compressor"));
    const flowRate = numState(hass, this._e("pump_flow"));
    const output = numState(hass, this._e("heat_output"));
    const input = numState(hass, this._e("power_input"));

    set("st-comp", comp === null ? "--" : `${fmt(comp, 0)} ${unitOf(hass, this._e("compressor"), "Hz")}`);
    set("st-flowrate", flowRate === null ? "--" : `${fmt(flowRate)} l/min`);
    set("st-output", output === null ? "--" : `${fmt(output, 0)} W`);
    set("st-input", input === null ? "--" : `${fmt(input, 0)} W`);
    set(
      "st-cop",
      output && input && input > 0 ? (output / input).toFixed(2) : "--"
    );

    /* Luefter */
    this._updateFan("fan1", numState(hass, this._e("fan1_rpm")));
    if (this._config.fan_count === 2) {
      this._updateFan("fan2", numState(hass, this._e("fan2_rpm")));
    }

    /* Aussenfuehler */
    const oMin = Number(this._config.outdoor_min);
    const oMax = Number(this._config.outdoor_max);
    const outsideColor = thermalColor(outside, oMin, oMax);
    set("outside-v", outside === null ? "--" : `${fmt(outside)} °C`);
    const bulb = sr.getElementById("thermo-bulb");
    const neck = sr.getElementById("thermo-neck");
    const column = sr.getElementById("thermo-fill");
    if (bulb) bulb.setAttribute("fill", outsideColor);
    if (neck) neck.setAttribute("fill", outsideColor);
    if (column) {
      // Saeule waechst von unten nach oben, 182 Pixel entsprechen der Skala.
      const ratio = outside === null ? 0 : clamp((outside - oMin) / ((oMax - oMin) || 1), 0, 1);
      const h = Math.round(182 * ratio);
      column.setAttribute("fill", outsideColor);
      column.setAttribute("height", String(h));
      column.setAttribute("y", String(396 - h));
    }

    /* Abtauung */
    const defrostEl = sr.getElementById("defrost-badge");
    if (defrostEl) {
      const d = rawState(hass, this._e("defrost"));
      const active = d === "on" || d === "1" || d === "true";
      defrostEl.setAttribute("opacity", active ? "1" : "0");
    }

    /* Heizungspuffer */
    // buffer_top bleibt als Schluessel gueltig, falls die Karte schon
    // mit der aelteren Feldbezeichnung eingerichtet wurde.
    const bufferEntity = this._e("buffer_temp") || this._e("buffer_top");
    const buf = numState(hass, bufferEntity);
    paint("bg-top", col(buf));
    paint("bg-bottom", col(buf === null ? null : buf - 4));
    set("buf-v", buf === null ? "--" : `${fmt(buf)} °C`);

    /* Warmwasser */
    const dhw = numState(hass, this._e("dhw_temp"));
    const dhwSp = numState(hass, this._e("dhw_setpoint"));
    paint("dhw-top", col(dhw));
    paint("dhw-bottom", col(dhw === null ? null : dhw - 6));
    set("dhw-v", dhw === null ? "--" : `${fmt(dhw)} °C`);
    set("dhw-sp", dhwSp === null ? "" : `Ziel ${fmt(dhwSp, 0)} °C`);

    const heaterEl = sr.getElementById("dhw-heater-badge");
    if (heaterEl) {
      const h = rawState(hass, this._e("dhw_heater"));
      const on = h === "on" || h === "1" || h === "true";
      heaterEl.setAttribute("opacity", on ? "1" : "0");
    }

    /* Heizkreis */
    const flow = numState(hass, this._e("flow_temp"));
    const ret = numState(hass, this._e("return_temp"));
    paint("rad-top", col(flow));
    paint("rad-bottom", col(ret));
    set("rad-flow-v", flow === null ? "--" : `${fmt(flow)} °C`);
    set("rad-ret-v", ret === null ? "--" : `${fmt(ret)} °C`);

    /* Leitungen */
    const strokeOf = (id, color) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("stroke", color);
    };
    const flowColor = col(flow);
    const retColor = col(ret);
    ["pipe-flow", "pipe-buf-in", "pipe-rad-in", "pipe-dhw-in"].forEach((id) =>
      strokeOf(id, flowColor)
    );
    ["pipe-return", "pipe-buf-out", "pipe-rad-out", "pipe-dhw-out"].forEach((id) =>
      strokeOf(id, retColor)
    );

    /* Sollwertregler */
    this._updateControl("ctl-heat", "heating_setpoint");
    this._updateControl("ctl-dhw", "dhw_setpoint");
  }

  _updateFan(id, rpm) {
    const el = this.shadowRoot.getElementById(id);
    const label = this.shadowRoot.getElementById(`${id}-rpm`);
    if (label) label.textContent = rpm === null ? "--" : `${fmt(rpm, 0)} U/min`;
    if (!el) return;
    if (rpm === null || rpm <= 0) {
      el.style.animationPlayState = "paused";
      el.classList.add("is-still");
      return;
    }
    el.classList.remove("is-still");
    // Sichtbare Umdrehungsdauer, gedrosselt damit es bei hoher Drehzahl
    // nicht flimmert. 900 U/min entsprechen etwa einer Sekunde pro Umdrehung.
    const seconds = clamp(900 / rpm, 0.25, 6);
    el.style.animationDuration = `${seconds.toFixed(2)}s`;
    el.style.animationPlayState = "running";
  }

  _updateControl(id, key) {
    const entityId = this._e(key);
    if (!entityId) return;
    const range = this.shadowRoot.getElementById(`${id}-range`);
    const out = this.shadowRoot.getElementById(`${id}-out`);
    if (!range) return;

    const st = this._hass.states[entityId];
    if (!st) {
      if (out) out.textContent = "Entitaet nicht gefunden";
      range.disabled = true;
      return;
    }
    range.disabled = false;
    const lo = Number(st.attributes.min !== undefined ? st.attributes.min : 15);
    const hi = Number(st.attributes.max !== undefined ? st.attributes.max : 65);
    const step = Number(st.attributes.step !== undefined ? st.attributes.step : 1);
    range.min = lo;
    range.max = hi;
    range.step = step;
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
        --ink: #E8EDF4;
        --muted: #7E8CA0;
        --line: #26303F;
        --panel: #131A24;
        background: linear-gradient(180deg, #131A24 0%, #0D131B 100%);
        color: var(--ink);
        padding: 20px 20px 24px;
        overflow: hidden;
      }
      .lhc-head {
        display: flex; align-items: flex-start; justify-content: space-between;
        gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--line);
      }
      .lhc-kicker {
        display: block; font-size: 11px; letter-spacing: 0.18em;
        text-transform: uppercase; color: var(--muted); margin-bottom: 4px;
      }
      .lhc-title h2 {
        margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;
      }
      .lhc-mode {
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 13px; padding: 7px 14px; border-radius: 999px;
        background: #1B2431; border: 1px solid var(--line); color: var(--ink);
        white-space: nowrap;
      }
      .lhc-stats {
        display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 1px; background: var(--line); border: 1px solid var(--line);
        border-radius: 12px; overflow: hidden; margin: 16px 0 20px;
      }
      .lhc-stat { background: var(--panel); padding: 12px 14px; min-width: 0; }
      .lhc-stat-label {
        display: block; font-size: 10px; letter-spacing: 0.12em;
        text-transform: uppercase; color: var(--muted); margin-bottom: 6px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .lhc-stat-value {
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 19px; font-variant-numeric: tabular-nums; white-space: nowrap;
      }
      .lhc-scene { width: 100%; }
      .lhc-svg { width: 100%; height: auto; display: block; }

      .pipe-shell {
        fill: none; stroke: #0B1017; stroke-width: 18;
        stroke-linecap: round; stroke-linejoin: round;
      }
      .pipe {
        fill: none; stroke: ${NEUTRAL}; stroke-width: 9;
        stroke-linecap: round; stroke-linejoin: round;
        transition: stroke 900ms ease;
      }
      .cap {
        fill: #98A6BA; font-size: 15px; letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .thermo-v {
        fill: #FFFFFF; font-size: 26px; font-weight: 650;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      #thermo-fill, #thermo-bulb, #thermo-neck { transition: all 900ms ease; }
      .tank-v {
        fill: #FFFFFF; font-size: 30px; font-weight: 650;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
        paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 5px;
      }
      .tank-sp { fill: rgba(255,255,255,0.78); font-size: 13px; }
      .coil { fill: none; stroke: rgba(255,255,255,0.28); stroke-width: 5; stroke-linecap: round; }
      .tag-l { fill: #8494AA; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
      .tag-v {
        fill: #FFFFFF; font-size: 20px; font-weight: 600;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .badge-t { fill: #E8EDF4; font-size: 13px; }
      .badge, #dhw-heater-badge { transition: opacity 300ms ease; }
      .rpm {
        fill: #7E8CA0; font-size: 13px;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }

      .fan {
        transform-origin: 0 0;
        animation: lhc-spin 2s linear infinite;
        animation-play-state: paused;
      }
      .fan .blades path { fill: #55637A; }
      .fan.is-still .blades path { fill: #3A4557; }
      @keyframes lhc-spin { to { transform: rotate(360deg); } }

      .lhc-controls {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px; margin-top: 20px; padding-top: 20px;
        border-top: 1px solid var(--line);
      }
      .lhc-ctl {
        background: var(--panel); border: 1px solid var(--line);
        border-radius: 12px; padding: 14px 16px 12px;
      }
      .lhc-ctl-head {
        display: flex; justify-content: space-between; align-items: baseline;
        margin-bottom: 10px;
      }
      .lhc-ctl-label {
        font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--muted);
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
        background: var(--thumb, #E0762E); border: 3px solid #0D131B;
        cursor: pointer;
      }
      .lhc-slider:focus-visible { box-shadow: 0 0 0 3px rgba(224,118,46,0.4); }
      .lhc-empty { color: var(--muted); font-size: 13px; margin: 0; }

      @media (max-width: 860px) {
        .lhc-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .lhc-controls { grid-template-columns: 1fr; }
        .lhc-title h2 { font-size: 20px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .fan { animation: none !important; }
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
      if (!g) {
        g = { name: f.group, fields: [] };
        groups.push(g);
      }
      g.fields.push(f);
    });

    const entityOptions = Object.keys(this._hass.states)
      .filter((e) => /^(sensor|number|input_number|binary_sensor|switch)\./.test(e))
      .sort()
      .map((e) => `<option value="${e}">${friendly(this._hass, e)}</option>`)
      .join("");

    const found = detectIntegration(this._hass);
    this._found = found;

    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <div class="ed">
        <div class="ed-group ed-detect ${found.found ? "is-found" : "is-missing-int"}">
          <h3>Integration</h3>
          <p class="ed-status">${
            found.found
              ? `Heishamon by Lutarym erkannt. ${found.count} Entitaeten gefunden, ` +
                `${Object.keys(found.entities).length} davon passen zu dieser Karte.`
              : "Keine Entitaeten der Integration gefunden. Du kannst die Standardnamen eintragen und danach von Hand anpassen."
          }</p>
          <div class="ed-actions">
            <button type="button" id="btn-adopt" ${found.found ? "" : "disabled"}>
              Aus Integration uebernehmen
            </button>
            <button type="button" id="btn-default">Standardnamen eintragen</button>
            <button type="button" id="btn-clear" class="is-quiet">Alle leeren</button>
          </div>
        </div>

        <div class="ed-group">
          <h3>Darstellung</h3>
          <label class="ed-row">
            <span>Titel</span>
            <input type="text" id="opt-title" value="${this._config.title}">
          </label>
          <label class="ed-row">
            <span>Anzahl Luefter</span>
            <select id="opt-fans">
              <option value="1">1 Luefter</option>
              <option value="2">2 Luefter</option>
            </select>
          </label>
          <label class="ed-row">
            <span>Heizungsskala kalt<em>Grad, faerbt Tanks und Leitungen</em></span>
            <input type="number" id="opt-min" value="${this._config.scale_min}">
          </label>
          <label class="ed-row">
            <span>Heizungsskala heiss<em>Grad</em></span>
            <input type="number" id="opt-max" value="${this._config.scale_max}">
          </label>
          <label class="ed-row">
            <span>Aussenskala kalt<em>Grad, faerbt das Thermometer</em></span>
            <input type="number" id="opt-omin" value="${this._config.outdoor_min}">
          </label>
          <label class="ed-row">
            <span>Aussenskala warm<em>Grad</em></span>
            <input type="number" id="opt-omax" value="${this._config.outdoor_max}">
          </label>
          <label class="ed-row ed-check">
            <input type="checkbox" id="opt-controls">
            <span>Sollwertregler anzeigen</span>
          </label>
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

        <datalist id="lhc-entities">${entityOptions}</datalist>

        <p class="ed-note">
          Die Sollwertregler brauchen Number-Entitaeten. Die legt die Integration
          nur an, wenn "Nur lesen" bei der Einrichtung deaktiviert ist.
        </p>
      </div>
    `;

    /* Ereignisse */
    const bind = (id, handler, evt) => {
      const el = this.shadowRoot.getElementById(id);
      el.addEventListener(evt || "change", () => handler(el));
    };
    bind("opt-title", (el) => {
      this._config = { ...this._config, title: el.value };
      this._emit();
    });
    bind("opt-fans", (el) => {
      this._config = { ...this._config, fan_count: parseInt(el.value, 10) };
      this._emit();
    });
    bind("opt-min", (el) => {
      this._config = { ...this._config, scale_min: parseFloat(el.value) };
      this._emit();
    });
    bind("opt-max", (el) => {
      this._config = { ...this._config, scale_max: parseFloat(el.value) };
      this._emit();
    });
    bind("opt-omin", (el) => {
      this._config = { ...this._config, outdoor_min: parseFloat(el.value) };
      this._emit();
    });
    bind("opt-omax", (el) => {
      this._config = { ...this._config, outdoor_max: parseFloat(el.value) };
      this._emit();
    });
    bind("opt-controls", (el) => {
      this._config = { ...this._config, show_controls: el.checked };
      this._emit();
    });

    const applyMap = (map) => {
      this._config = { ...this._config, entities: { ...map } };
      this._syncValues();
      this._emit();
    };
    this.shadowRoot.getElementById("btn-adopt").addEventListener("click", () => {
      const f = detectIntegration(this._hass);
      if (f.found) applyMap(f.entities);
    });
    this.shadowRoot.getElementById("btn-default").addEventListener("click", () => {
      applyMap(defaultEntityMap());
    });
    this.shadowRoot.getElementById("btn-clear").addEventListener("click", () => {
      applyMap({});
    });

    this.shadowRoot.querySelectorAll("[data-entity]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.entity;
        const entities = { ...this._config.entities };
        if (input.value.trim()) {
          entities[key] = input.value.trim();
        } else {
          delete entities[key];
        }
        this._config = { ...this._config, entities };
        this._emit();
      });
    });

    this._built = true;
    this._syncValues();
  }

  _syncValues() {
    const sr = this.shadowRoot;
    const t = sr.getElementById("opt-title");
    if (t) t.value = this._config.title;
    const f = sr.getElementById("opt-fans");
    if (f) f.value = String(this._config.fan_count);
    const mn = sr.getElementById("opt-min");
    if (mn) mn.value = this._config.scale_min;
    const mx = sr.getElementById("opt-max");
    if (mx) mx.value = this._config.scale_max;
    const omn = sr.getElementById("opt-omin");
    if (omn) omn.value = this._config.outdoor_min;
    const omx = sr.getElementById("opt-omax");
    if (omx) omx.value = this._config.outdoor_max;
    const c = sr.getElementById("opt-controls");
    if (c) c.checked = this._config.show_controls !== false;

    sr.querySelectorAll("[data-entity]").forEach((input) => {
      const v = (this._config.entities || {})[input.dataset.entity] || "";
      if (input.value !== v) input.value = v;
      const exists = !v || (this._hass && this._hass.states[v]);
      input.classList.toggle("is-missing", !exists);
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
        font-style: normal; font-size: 11px;
        color: var(--secondary-text-color, #8A94A6);
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
      .ed-detect.is-missing-int { border-color: #B07B2E; }
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
        background: transparent; color: var(--secondary-text-color, #8A94A6);
        flex: 0 0 auto;
      }
      .ed-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
      .ed-actions button:hover:not(:disabled) { filter: brightness(1.1); }
      .ed-note {
        margin: 0; font-size: 12px; line-height: 1.5;
        color: var(--secondary-text-color, #8A94A6);
      }
      @media (max-width: 600px) {
        .ed-row { grid-template-columns: 1fr; align-items: stretch; }
      }
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
    "Anlagenschema mit Luefteranimation, Warmwasserspeicher, Heizungspuffer und Sollwertsteuerung.",
  preview: true,
  documentationURL: "https://github.com/Lutarym",
});

console.info(
  `%c LUTARYM-HEATPUMP-CARD %c ${CARD_VERSION} `,
  "background:#0D131B;color:#E0762E;font-weight:600;padding:2px 6px;border-radius:3px 0 0 3px",
  "background:#E0762E;color:#0D131B;font-weight:600;padding:2px 6px;border-radius:0 3px 3px 0"
);
