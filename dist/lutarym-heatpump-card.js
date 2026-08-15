/**
 * lutarym-heatpump-card
 *
 * Anlagenschema fuer Panasonic Aquarea via HeishaMon.
 * Breitformat, alle Baugruppen in einer Reihe.
 *
 * Autor: Lutarym
 */

const CARD_VERSION = "1.5.5";

/* ------------------------------------------------------------------ *
 *  Zeichenraster
 * ------------------------------------------------------------------ */
const L = {
  W: 1740,
  H: 820,
  FLOW_Y: 240,
  RET_Y: 700,
  TANK_TOP: 290,
  TANK_BOTTOM: 640,
  RAD_TOP: 340,
  RAD_BOTTOM: 540,
  UNIT_TOP: 60,
  UNIT_BOTTOM: 760,
  CAP_Y: 768,
  SG_Y: 104,
}

/* ------------------------------------------------------------------ *
 *  Klartexte
 *
 *  Alle englischen Kuerzel der Firmware werden uebersetzt.
 *  DHW steht fuer Domestic Hot Water, also Trinkwarmwasser.
 *  Quelle der Originaltexte: HeishaMon decode.h.
 * ------------------------------------------------------------------ */
const MODE_LABELS = {
  // Auswahlwerte der Integration
  mode_0: "Nur Heizen",
  mode_1: "Nur Kühlen",
  mode_2: "Automatik Heizen",
  mode_3: "Nur Warmwasser",
  mode_4: "Heizen und Warmwasser",
  mode_5: "Kühlen und Warmwasser",
  mode_6: "Automatik Heizen und Warmwasser",
  // Originaltexte der Firmware
  Heat: "Nur Heizen",
  Cool: "Nur Kühlen",
  "Auto(heat)": "Automatik Heizen",
  DHW: "Nur Warmwasser",
  "Heat+DHW": "Heizen und Warmwasser",
  "Cool+DHW": "Kühlen und Warmwasser",
  "Auto(heat)+DHW": "Automatik Heizen und Warmwasser",
  "Auto(cool)": "Automatik Kühlen",
  "Auto(cool)+DHW": "Automatik Kühlen und Warmwasser",
  // Rohe Zahlenwerte von TOP4
  0: "Nur Heizen",
  1: "Nur Kühlen",
  2: "Automatik Heizen",
  3: "Nur Warmwasser",
  4: "Heizen und Warmwasser",
  5: "Kühlen und Warmwasser",
  6: "Automatik Heizen und Warmwasser",
  7: "Automatik Kühlen",
  8: "Automatik Kühlen und Warmwasser",
};

const VALVE_LABELS = { Room: "Heizung", DHW: "Warmwasser", 0: "Heizung", 1: "Warmwasser" };

function modeLabel(wert) {
  if (wert === null || wert === undefined || wert === "") return null;
  return MODE_LABELS[wert] !== undefined ? MODE_LABELS[wert] : String(wert);
}

/* ------------------------------------------------------------------ *
 *  SG Ready
 *
 *  Vier Betriebszustaende nach der Schnittstellenbeschreibung des
 *  Bundesverbands Waermepumpe. Klemmenloesung ueber zwei Kontakte,
 *  K1 Sperre und K2 Anlauf:
 *  1:0 Zustand 1, 0:0 Zustand 2, 0:1 Zustand 3, 1:1 Zustand 4.
 * ------------------------------------------------------------------ */
const SG_STATES = {
  1: { kurz: "Stopp", lang: "Sperre durch den Netzbetreiber", farbe: "#FF6B5E" },
  2: { kurz: "Normal", lang: "Normalbetrieb", farbe: "#C3D0E0" },
  3: { kurz: "PV Überschuss 1", lang: "Einschaltempfehlung", farbe: "#FFC44D" },
  4: { kurz: "PV Überschuss 2", lang: "Anlaufbefehl, verstärkter Betrieb", farbe: "#5BE08F" },
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

// Pumpen drehen bewusst langsam und immer gleich schnell. Sie sollen
// nur zeigen, dass sie foerdern, nicht wie schnell.
const PUMP_SECONDS = 3;

// Vorrat an Blasen je Speicher. Sichtbar ist ein Anteil davon.
const BUBBLE_COUNT = 14;

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
 *  Erkennung der Integration "Heishamon by Lutarym"
 * ------------------------------------------------------------------ */
const INTEGRATION_DOMAIN = "heishamon_lutarym";

const TOPIC_TO_FIELD = {
  top14: "outside_temp",
  top4: "operating_mode",
  top8: "compressor",
  top1: "pump_flow",
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
  top94: "zones_state",
  top99: "buffer_installed",
  top100: "dhw_installed",
  top7: "buffer_target",
  top36: "hk1_water",
  top42: "hk1_water_target",
  top56: "hk1_room",
  top124: "hk1_pump",
  top27: "hk1_setpoint",
  top37: "hk2_water",
  top43: "hk2_water_target",
  top57: "hk2_room",
  top123: "hk2_pump",
  top34: "hk2_setpoint",
  top10: "dhw_temp",
  top9: "dhw_setpoint",
  top58: "dhw_heater",
};

const COMMAND_TO_FIELD = {
  setheatpump: "power_state",
  setoperationmode: "mode_select",
};

const FIELD_DOMAIN = {
  hk1_setpoint: ["number", "input_number"],
  hk2_setpoint: ["number", "input_number"],
  dhw_setpoint: ["number", "input_number"],
  power_state: ["switch", "input_boolean", "binary_sensor", "sensor"],
  heating_switch: ["switch", "input_boolean"],
  mode_select: ["select", "input_select"],
  circulation_pump: ["switch", "input_boolean", "binary_sensor", "sensor"],
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
  { key: "outside_temp", label: "Außentemperatur", group: "Außenfühler", hint: "TOP14" },

  { key: "power_state", label: "Wärmepumpe Status, grüne LED", group: "Außengerät", hint: "SetHeatpump oder TOP0" },
  { key: "compressor", label: "Verdichterdrehzahl", group: "Außengerät", hint: "TOP8" },
  { key: "fan1_rpm", label: "Lüfter 1 Drehzahl", group: "Außengerät", hint: "TOP62" },
  { key: "fan2_rpm", label: "Lüfter 2 Drehzahl", group: "Außengerät", hint: "TOP63" },
  { key: "defrost", label: "Abtauung läuft", group: "Außengerät", hint: "TOP26" },
  { key: "error", label: "Fehlercode", group: "Außengerät", hint: "TOP44" },
  { key: "power_now", label: "Aktuelle Leistungsaufnahme", group: "Außengerät", hint: "Shelly PM, Watt" },
  { key: "energy_today", label: "Energiezähler", group: "Außengerät", hint: "Shelly PM, kWh" },

  { key: "sg_k1", label: "Kontakt K1 Sperre", group: "SG Ready", hint: "Shelly, Relais oder Eingang" },
  { key: "sg_k2", label: "Kontakt K2 Anlauf", group: "SG Ready", hint: "Shelly, Relais oder Eingang" },

  { key: "flow_temp", label: "Vorlauftemperatur", group: "Primärkreis", hint: "TOP6" },
  { key: "return_temp", label: "Rücklauftemperatur", group: "Primärkreis", hint: "TOP5" },
  { key: "pump_speed", label: "Primärpumpe Drehzahl", group: "Primärkreis", hint: "TOP65" },
  { key: "pump_flow", label: "Durchflussmenge", group: "Primärkreis", hint: "TOP1" },
  { key: "three_way_valve", label: "Dreiwegeventil", group: "Primärkreis", hint: "TOP20" },
  { key: "water_pressure", label: "Wasserdruck", group: "Primärkreis", hint: "TOP115" },

  { key: "buffer_temp", label: "Puffertemperatur", group: "Heizungspuffer", hint: "TOP46" },
  { key: "buffer_installed", label: "Puffer vorhanden", group: "Heizungspuffer", hint: "TOP99" },
  { key: "buffer_target", label: "Puffer Zieltemperatur", group: "Heizungspuffer", hint: "TOP7, Soll Vorlauf" },
  { key: "room_heater", label: "Heizstab Heizung", group: "Heizungspuffer", hint: "TOP59" },

  { key: "zones_state", label: "Aktivierte Zonen", group: "Heizkreis 1", hint: "TOP94, gilt für beide" },
  { key: "hk1_water", label: "HK1 Wassertemperatur", group: "Heizkreis 1", hint: "TOP36" },
  { key: "hk1_water_target", label: "HK1 Wasser Sollwert", group: "Heizkreis 1", hint: "TOP42" },
  { key: "hk1_room", label: "HK1 Raumtemperatur", group: "Heizkreis 1", hint: "TOP56" },
  { key: "hk1_pump", label: "HK1 Pumpe läuft", group: "Heizkreis 1", hint: "TOP124" },
  { key: "hk1_setpoint", label: "HK1 Sollwert einstellbar", group: "Heizkreis 1", hint: "TOP27, number" },

  { key: "hk2_water", label: "HK2 Wassertemperatur", group: "Heizkreis 2", hint: "TOP37" },
  { key: "hk2_water_target", label: "HK2 Wasser Sollwert", group: "Heizkreis 2", hint: "TOP43" },
  { key: "hk2_room", label: "HK2 Raumtemperatur", group: "Heizkreis 2", hint: "TOP57" },
  { key: "hk2_pump", label: "HK2 Pumpe läuft", group: "Heizkreis 2", hint: "TOP123" },
  { key: "hk2_setpoint", label: "HK2 Sollwert einstellbar", group: "Heizkreis 2", hint: "TOP34, number" },

  { key: "dhw_installed", label: "Warmwasser vorhanden", group: "Warmwasser", hint: "TOP100" },
  { key: "dhw_temp", label: "Warmwasser Isttemperatur", group: "Warmwasser", hint: "TOP10" },
  { key: "dhw_setpoint", label: "Warmwasser Sollwert", group: "Warmwasser", hint: "TOP9, number" },
  { key: "dhw_heater", label: "Heizstab Warmwasser", group: "Warmwasser", hint: "TOP58" },
  { key: "circulation_pump", label: "Zirkulationspumpe läuft", group: "Warmwasser", hint: "Shelly oder eigener Schalter" },

  { key: "mode_select", label: "Betriebsart umschalten", group: "Steuerung", hint: "SetOperationMode, select" },
  { key: "heating_switch", label: "Heizung ein und aus", group: "Steuerung", hint: "eigener Helfer, optional" },
];

const DEFAULT_CONFIG = {
  type: "custom:lutarym-heatpump-card",
  fan_count: 2,
  hk_count: 2,
  scale_min: 20,
  scale_max: 60,
  outdoor_min: -15,
  outdoor_max: 35,
  show_controls: true,
  show_switches: true,
  label_hk1: "Heizkreis 1",
  label_hk2: "Heizkreis 2",
  label_dhw: "Warmwasser",
  label_energy: "Energie",
  label_buffer: "Puffer",
  energy_daily: true,
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
    this._tagStart = undefined;
    this._tagStartTag = undefined;
    this._tagVersuch = 0;
    if (this.shadowRoot) this.shadowRoot.innerHTML = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._render();
  }

  getCardSize() {
    return 18;
  }

  _e(key) {
    const eintraege = this._config.entities || {};
    // Frueherer Feldname bleibt gueltig, damit bestehende Karten weiterlaufen.
    const alias = { power_state: "power_switch", buffer_temp: "buffer_top" };
    const configured = eintraege[key] || eintraege[alias[key]];
    if (configured) return configured;
    if (!this._auto) this._auto = detectIntegration(this._hass).entities;
    return this._auto[key] || "";
  }

  /**
   * Holt den Zaehlerstand von heute null Uhr und merkt ihn.
   * Damit laesst sich der Tagesverbrauch aus dem Gesamtzaehler rechnen,
   * ohne dass ein eigener Zaehler-Helfer noetig ist.
   * Schlaegt die Abfrage fehl, bleibt der Gesamtstand stehen.
   */
  async _ladeTagesstart() {
    const id = this._e("energy_today");
    if (!id || !this._hass || !this._hass.callWS) return;

    const jetzt = new Date();
    const mitternacht = new Date(
      jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()
    ).getTime();

    // Einmal je Tag, danach hoechstens alle fuenf Minuten erneut versuchen.
    if (this._tagStartTag === mitternacht && this._tagStart !== undefined) return;
    if (this._tagVersuch && jetzt.getTime() - this._tagVersuch < 300000) return;
    this._tagVersuch = jetzt.getTime();

    try {
      const antwort = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(mitternacht).toISOString(),
        end_time: new Date(mitternacht + 120000).toISOString(),
        entity_ids: [id],
        include_start_time_state: true,
        significant_changes_only: false,
        minimal_response: true,
        no_attributes: true,
      });
      const reihe = antwort && antwort[id];
      if (!reihe || !reihe.length) return;
      // Je nach Fassung heisst das Feld "s" oder "state".
      const roh = reihe[0].s !== undefined ? reihe[0].s : reihe[0].state;
      const wert = parseFloat(roh);
      if (!Number.isNaN(wert)) {
        this._tagStart = wert;
        this._tagStartTag = mitternacht;
        this._render();
      }
    } catch (err) {
      // Keine Historie verfuegbar, es bleibt beim Gesamtstand.
    }
  }

  _sgMode() {
    const k1 = this._e("sg_k1");
    const k2 = this._e("sg_k2");
    if (!k1 || !k2) return null;
    const unklar = [null, "unknown", "unavailable", ""];
    if (unklar.includes(rawState(this._hass, k1))) return null;
    if (unklar.includes(rawState(this._hass, k2))) return null;
    const a = isOn(this._hass, k1);
    const b = isOn(this._hass, k2);
    if (a === null || b === null) return null;
    if (a && !b) return 1;
    if (!a && !b) return 2;
    if (!a && b) return 3;
    return 4;
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
        <div class="lhc-alert" id="alert" hidden></div>
        <div class="lhc-hint" id="hinweis" hidden></div>
        <div class="lhc-scene">${this._svg()}</div>
        <section class="lhc-switches" id="switches"></section>
        <section class="lhc-controls" id="controls"></section>

        <div class="lhc-dialog" id="dialog" hidden>
          <div class="lhc-dialog-box" role="dialog" aria-modal="true">
            <div class="lhc-dialog-head">
              <span class="lhc-dialog-title" id="dlg-title">--</span>
              <button type="button" class="lhc-dialog-close" id="dlg-close"
                      aria-label="Schließen">&times;</button>
            </div>
            <output class="lhc-dialog-value" id="dlg-value">--</output>
            <div class="lhc-dialog-row">
              <button type="button" class="lhc-step" id="dlg-minus" aria-label="Kleiner">&minus;</button>
              <input class="lhc-slider" type="range" id="dlg-range"
                     min="0" max="100" step="1" value="0" aria-label="Temperatur">
              <button type="button" class="lhc-step" id="dlg-plus" aria-label="Größer">+</button>
            </div>
            <div class="lhc-ctl-scale">
              <span id="dlg-min">--</span><span id="dlg-max">--</span>
            </div>
          </div>
        </div>
      </ha-card>
    `;
    this.shadowRoot.appendChild(root);
    this._buildDialog();
    this._buildKlicks();
    this._buildSwitches();
    this._buildControls();
  }

  /** Verdrahtet das Einstellfenster. */
  _buildDialog() {
    const sr = this.shadowRoot;
    // Ausdruecklich schliessen, nicht nur auf das Attribut im Markup vertrauen.
    sr.getElementById("dialog").hidden = true;
    this._dialogKey = null;
    const range = sr.getElementById("dlg-range");
    const out = sr.getElementById("dlg-value");

    const schreiben = (wert) => {
      const id = this._e(this._dialogKey);
      if (!id) return;
      this._hass.callService(id.split(".")[0], "set_value", {
        entity_id: id,
        value: wert,
      });
    };
    const schritt = (richtung) => {
      const neu =
        Math.round(
          (Number(range.value) + richtung * Number(range.step || 1)) * 10
        ) / 10;
      const begrenzt = clamp(neu, Number(range.min), Number(range.max));
      range.value = begrenzt;
      out.textContent = `${begrenzt} °C`;
      schreiben(begrenzt);
    };

    range.addEventListener("input", () => {
      this._dialogZieht = true;
      out.textContent = `${range.value} °C`;
    });
    range.addEventListener("change", () => {
      this._dialogZieht = false;
      schreiben(parseFloat(range.value));
    });
    sr.getElementById("dlg-minus").addEventListener("click", () => schritt(-1));
    sr.getElementById("dlg-plus").addEventListener("click", () => schritt(1));
    sr.getElementById("dlg-close").addEventListener("click", () => this._schliesseDialog());
    sr.getElementById("dialog").addEventListener("click", (ev) => {
      // Klick auf den Hintergrund schliesst, Klick im Kasten nicht.
      if (ev.target && ev.target.id === "dialog") this._schliesseDialog();
    });
  }

  /** Macht Speicher und Heizkörper anklickbar. */
  _buildKlicks() {
    const sr = this.shadowRoot;
    [
      ["dhw-group", "dhw_setpoint", "label_dhw"],
      ["hk1-group", "hk1_setpoint", "label_hk1"],
      ["hk2-group", "hk2_setpoint", "label_hk2"],
    ].forEach(([gruppe, feld, beschriftung]) => {
      const el = sr.getElementById(gruppe);
      if (!el || !this._e(feld)) return;
      el.classList.add("klickbar");
      el.addEventListener("click", () =>
        this._oeffneDialog(feld, this._config[beschriftung])
      );
    });
  }

  _oeffneDialog(feld, titel) {
    const id = this._e(feld);
    if (!id || !this._hass.states[id]) return;
    this._dialogKey = feld;
    const sr = this.shadowRoot;
    sr.getElementById("dlg-title").textContent = titel || "Temperatur";
    sr.getElementById("dialog").hidden = false;
    this._syncDialog();
  }

  _schliesseDialog() {
    this._dialogKey = null;
    this._dialogZieht = false;
    this.shadowRoot.getElementById("dialog").hidden = true;
  }

  /** Haelt das offene Fenster auf dem aktuellen Stand. */
  _syncDialog() {
    if (!this._dialogKey) return;
    const sr = this.shadowRoot;
    const st = this._hass.states[this._e(this._dialogKey)];
    if (!st) return this._schliesseDialog();
    const range = sr.getElementById("dlg-range");
    const wert = parseFloat(st.state);
    if (Number.isNaN(wert)) return;
    let lo = Number(st.attributes.min !== undefined ? st.attributes.min : 15);
    let hi = Number(st.attributes.max !== undefined ? st.attributes.max : 65);
    if (wert < lo) lo = Math.floor(wert);
    if (wert > hi) hi = Math.ceil(wert);
    range.min = lo;
    range.max = hi;
    range.step = Number(st.attributes.step !== undefined ? st.attributes.step : 1);
    sr.getElementById("dlg-min").textContent = `${lo} °C`;
    sr.getElementById("dlg-max").textContent = `${hi} °C`;
    if (this._dialogZieht) return;
    range.value = wert;
    sr.getElementById("dlg-value").textContent = `${wert} °C`;
  }

  _buildSwitches() {
    const host = this.shadowRoot.getElementById("switches");
    if (this._config.show_switches === false) {
      host.hidden = true;
      return;
    }
    const hatHeizung = Boolean(this._e("heating_switch"));
    const hatModus = Boolean(this._e("mode_select"));
    if (!hatHeizung && !hatModus) {
      host.hidden = true;
      return;
    }

    host.innerHTML = `
      ${
        hatModus
          ? `<label class="lhc-modepick">
               <span class="lhc-field-label">Betriebsart</span>
               <select id="mode-select"></select>
             </label>`
          : ""
      }
      ${
        hatHeizung
          ? `<button type="button" class="lhc-toggle" id="sw-heat" aria-pressed="false">
               <span class="lhc-toggle-dot"></span>
               <span class="lhc-toggle-text">
                 <span class="lhc-field-label">Heizung</span>
                 <span class="lhc-toggle-state" id="sw-heat-state">--</span>
               </span>
             </button>`
          : ""
      }
    `;

    if (hatHeizung) {
      this.shadowRoot.getElementById("sw-heat").addEventListener("click", () => {
        const entityId = this._e("heating_switch");
        const on = isOn(this._hass, entityId);
        this._hass.callService("homeassistant", on ? "turn_off" : "turn_on", {
          entity_id: entityId,
        });
      });
    }
    if (hatModus) {
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
      { key: "hk1_setpoint", id: "ctl-hk1", label: this._config.label_hk1 },
      { key: "hk2_setpoint", id: "ctl-hk2", label: this._config.label_hk2 },
      { key: "dhw_setpoint", id: "ctl-dhw", label: this._config.label_dhw },
    ].filter((r) => this._e(r.key) && (r.id !== "ctl-hk2" || this._config.hk_count === 2));

    if (!rows.length) {
      host.innerHTML = `<p class="lhc-empty">Keine Sollwert-Entität gefunden. Die Integration legt diese nur an, wenn "Nur lesen" bei der Einrichtung deaktiviert ist.</p>`;
      return;
    }

    host.innerHTML = rows
      .map(
        (r) => `
        <div class="lhc-ctl">
          <div class="lhc-ctl-head">
            <span class="lhc-field-label" id="${r.id}-label">${r.label}</span>
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
    // Luefter uebereinander, wie beim echten Aussengeraet.
    const fans = two
      ? `${this._fan("fan1", 190, 300, 96)}${this._fan("fan2", 190, 548, 96)}`
      : this._fan("fan1", 190, 420, 120);

    const F = L.FLOW_Y;
    const R = L.RET_Y;
    const T = L.TANK_TOP;
    const B = L.TANK_BOTTOM;
    const C = L.CAP_Y;
    const SG = L.SG_Y;
    const hk2 = this._config.hk_count === 2;

    return `
    <svg viewBox="0 0 ${L.W} ${L.H}" class="lhc-svg" role="img"
         aria-label="Schema der Wärmepumpenanlage">
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
        <clipPath id="bufClip">
          <rect x="548" y="298" width="174" height="334" rx="20"/>
        </clipPath>
        <clipPath id="dhwClip">
          <rect x="1448" y="298" width="154" height="334" rx="28"/>
        </clipPath>
      </defs>

      <!-- Sammelleitungen -->
      <path class="pipe-shell" d="M340 ${R} H 1525"/>
      <path class="pipe" id="pipe-return" d="M340 ${R} H 1525"/>
      <path class="pipe-shell" d="M340 ${F} H 1525"/>
      <path class="pipe" id="pipe-flow" d="M340 ${F} H 1525"/>
      <path class="flowdots" id="dots-vorlauf" d="M340 ${F} H 1525"/>
      <path class="flowdots rev" id="dots-ruecklauf" d="M340 ${R} H 1525"/>

      <path class="pipe-shell" d="M630 ${F} V ${T} M630 ${B} V ${R}"/>
      <path class="pipe" id="pipe-buf-in" d="M630 ${F} V ${T}"/>
      <path class="pipe" id="pipe-buf-out" d="M630 ${B} V ${R}"/>
      <path class="flowdots" id="dots-buf" d="M630 ${F} V ${T}"/>
      <path class="flowdots rev" id="dots-buf2" d="M630 ${B} V ${R}"/>

      <path class="pipe-shell" d="M1525 ${F} V ${T} M1525 ${B} V ${R}"/>
      <path class="pipe" id="pipe-dhw-in" d="M1525 ${F} V ${T}"/>
      <path class="pipe" id="pipe-dhw-out" d="M1525 ${B} V ${R}"/>
      <path class="flowdots" id="dots-dhw" d="M1525 ${F} V ${T}"/>
      <path class="flowdots rev" id="dots-dhw2" d="M1525 ${B} V ${R}"/>

      <!-- Außengerät -->
      <g class="unit">
        <rect x="40" y="${L.UNIT_TOP}" width="300" height="640" rx="16"
              fill="url(#casing)" stroke="#33415A" stroke-width="2"/>
        <rect id="unit-glow" x="40" y="${L.UNIT_TOP}" width="300" height="640" rx="16"
              fill="none" stroke="#E0762E" stroke-width="2" opacity="0"/>
        <rect x="40" y="${L.UNIT_TOP}" width="300" height="640" rx="16" fill="url(#glass)"/>

        <circle cx="66" cy="96" r="9" id="power-led" fill="#2C3646"/>
        <text class="unit-label" x="86" y="101">Betrieb</text>
        <g id="defrost-badge" class="badge" transform="translate(250 96)">
          <rect x="-62" y="-16" width="124" height="32" rx="16"
                fill="#0E2A4A" stroke="#3E9BE0" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Abtauung</text>
        </g>

        <text class="unit-label" x="115" y="140" text-anchor="middle">Außen</text>
        <text class="unit-value" id="outside-v" x="115" y="168"
              text-anchor="middle">--</text>
        <text class="unit-label" x="265" y="140" text-anchor="middle">Verdichter</text>
        <text class="unit-value" id="comp-v" x="265" y="168" text-anchor="middle">--</text>

        ${fans}

      </g>

      <!-- SG Ready, neben der Wärmepumpe, ohne Rahmen -->
      <g id="sg-group" opacity="0">
        <text class="sg-label" x="480" y="${SG}" text-anchor="middle">SG Ready</text>
        <g transform="translate(480 ${SG + 12})">
          <rect x="-60" y="0" width="26" height="12" rx="6" id="sg-seg-1" fill="#586A88"/>
          <rect x="-30" y="0" width="26" height="12" rx="6" id="sg-seg-2" fill="#586A88"/>
          <rect x="4" y="0" width="26" height="12" rx="6" id="sg-seg-3" fill="#586A88"/>
          <rect x="34" y="0" width="26" height="12" rx="6" id="sg-seg-4" fill="#586A88"/>
        </g>
        <text class="sg-value" id="sg-text" x="480" y="${SG + 58}"
              text-anchor="middle">--</text>
      </g>

      <!-- Vorlauf am Ausgang, Rücklauf am Eingang -->
      <text class="vl-value" id="unit-flow-v" x="410" y="${F - 20}"
            text-anchor="middle">--</text>
      <text class="rl-value" id="unit-ret-v" x="410" y="${R - 20}"
            text-anchor="middle">--</text>

      <!-- Stromverbrauch der Wärmepumpe, aus dem Shelly PM -->
      <g id="verbrauch-group" opacity="0">
        <text class="unit-label" x="410" y="404" text-anchor="middle">Leistung</text>
        <text class="verbrauch-v" id="power-now-v" x="410" y="440"
              text-anchor="middle">--</text>
        <text class="unit-label" x="410" y="492" text-anchor="middle">${escapeHtml(
          this._config.label_energy
        )}</text>
        <text class="unit-value" id="energy-today-v" x="410" y="524"
              text-anchor="middle">--</text>
      </g>

      <!-- Primärpumpe -->
      <g>
        <text class="value-s" id="pump-v" x="780" y="640" text-anchor="middle">--</text>
        <text class="unit-value" id="flow-v" x="780" y="664" text-anchor="middle">--</text>
        <g transform="translate(780 ${R})">
          <circle r="26" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
          <g class="rotor" id="pump-rotor">
            <path d="M0 -15 L5 -4 L16 0 L5 4 L0 15 L-5 4 L-16 0 L-5 -4 Z" fill="#55637A"/>
            <circle r="4" fill="#0D1219"/>
          </g>
        </g>
        <text class="cap-s" x="780" y="${C}" text-anchor="middle">Pumpe</text>
      </g>

      <!-- Heizungspuffer -->
      <g id="buffer-group">
        <rect x="540" y="${T}" width="190" height="350" rx="26"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="548" y="298" width="174" height="334" rx="20" fill="url(#bufferFill)"/>
        <g clip-path="url(#bufClip)">${this._bubbles("buf-bubbles", 548, 298, 174, 334)}</g>
        <rect x="548" y="298" width="174" height="334" rx="20" fill="url(#glass)"/>
        <text class="value-l" id="buf-v" x="635" y="460" text-anchor="middle">--</text>
        <text class="value-sp" id="buf-sp" x="635" y="488" text-anchor="middle"></text>
        <g id="roomheater-badge" class="badge" transform="translate(635 586)">
          <rect x="-56" y="-15" width="112" height="30" rx="15"
                fill="#3A1B08" stroke="#E0762E" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Heizstab</text>
        </g>
        <text class="cap" x="635" y="${C}" text-anchor="middle">${escapeHtml(
          this._config.label_buffer
        )}</text>
      </g>

      <!-- Wasserdruck -->
      <g id="press-group" opacity="0">
        <text class="value-s" id="press-v" x="1390" y="660" text-anchor="middle">--</text>
        <g transform="translate(1390 ${R})">
          <circle r="26" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
          <circle r="18" fill="none" stroke="#26303F" stroke-width="3"/>
          <line id="press-needle" x1="0" y1="0" x2="0" y2="-15"
                stroke="${NEUTRAL}" stroke-width="3" stroke-linecap="round"/>
          <circle r="4" fill="#55637A"/>
        </g>
        <text class="cap-s" x="1390" y="${C}" text-anchor="middle">Druck</text>
      </g>

      ${this._circuit(1, 820, 1040, 870, 990)}
      ${hk2 ? this._circuit(2, 1110, 1330, 1160, 1280) : ""}

      <!-- Dreiwegeventil -->
      <g>
        <rect x="1507" y="248" width="36" height="36" rx="8"
              fill="#0D1219" stroke="#33415A" stroke-width="2"
              transform="rotate(45 1525 266)"/>
        <circle cx="1525" cy="266" r="9" id="valve-dot" fill="${NEUTRAL}"/>
      </g>

      <!-- Warmwasserspeicher -->
      <g id="dhw-group">
        <rect x="1440" y="${T}" width="170" height="350" rx="34"
              fill="#0D1219" stroke="#33415A" stroke-width="2"/>
        <rect x="1448" y="298" width="154" height="334" rx="28" fill="url(#dhwFill)"/>
        <g clip-path="url(#dhwClip)">${this._bubbles("dhw-bubbles", 1448, 298, 154, 334)}</g>
        <rect x="1448" y="298" width="154" height="334" rx="28" fill="url(#glass)"/>
        <text class="value-l" id="dhw-v" x="1525" y="440" text-anchor="middle">--</text>
        <text class="value-sp" id="dhw-sp" x="1525" y="468" text-anchor="middle"></text>
        <g id="dhwheater-badge" class="badge" transform="translate(1525 604)">
          <rect x="-56" y="-15" width="112" height="30" rx="15"
                fill="#3A1B08" stroke="#E0762E" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Heizstab</text>
        </g>
        <text class="cap" x="1525" y="${C}" text-anchor="middle">${escapeHtml(
          this._config.label_dhw
        )}</text>
      </g>

      <!-- Zirkulationskreis am Warmwasserspeicher -->
      <g id="zirkulation-group" opacity="0">
        <path class="pipe-shell" fill="none" d="M1610 420 H 1680 V 560 H 1610"/>
        <path class="pipe" id="pipe-zirk" fill="none" d="M1610 420 H 1680 V 560 H 1610"/>
        <path class="flowdots" id="dots-zirk" fill="none" d="M1610 420 H 1680 V 560 H 1610"/>
        <g transform="translate(1680 490)">
          <circle r="24" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
          <g class="rotor" id="zirk-rotor">
            <path d="M0 -13 L4 -3 L14 0 L4 3 L0 13 L-4 3 L-14 0 L-4 -3 Z" fill="#55637A"/>
            <circle r="4" fill="#0D1219"/>
          </g>
        </g>
        <text class="cap-s" x="1680" y="606" text-anchor="middle">Zirkulation</text>
        <text class="value-s" id="zirk-v" x="1680" y="630" text-anchor="middle">--</text>
      </g>

      <text class="version" x="${L.W - 10}" y="${L.H - 8}"
            text-anchor="end">v${CARD_VERSION}</text>
    </svg>`;
  }

  _circuit(n, x1, x2, dropX, backX) {
    const F = L.FLOW_Y;
    const R = L.RET_Y;
    const RT = L.RAD_TOP;
    const RB = L.RAD_BOTTOM;
    const mid = (x1 + x2) / 2;
    const drop = `M${dropX} ${F} V ${RT}`;
    // Die Pumpe sitzt in der Mitte der Stichleitung, rechnerisch aus
    // Vorlauf und Heizkoerper. So verrutscht sie bei Rasteraenderungen nicht.
    const pumpY = Math.round((F + RT) / 2);
    const back = `M${backX} ${RB} V ${R}`;

    let fins = "";
    for (let x = x1 + 26; x < x2 - 10; x += 30) {
      fins += `<line x1="${x}" y1="${RT + 10}" x2="${x}" y2="${RB - 10}"/>`;
    }

    return `
      <g class="circuit" id="hk${n}-group">
        <path class="pipe-shell" d="${drop} ${back}"/>
        <path class="pipe" id="pipe-hk${n}-in" d="${drop}"/>
        <path class="pipe" id="pipe-hk${n}-out" d="${back}"/>
        <path class="flowdots" id="dots-hk${n}" d="${drop}"/>
        <path class="flowdots rev" id="dots-hk${n}b" d="${back}"/>

        <g transform="translate(${dropX} ${pumpY})">
          <circle r="24" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
          <g class="rotor" id="hk${n}-rotor">
            <path d="M0 -13 L4 -3 L14 0 L4 3 L0 13 L-4 3 L-14 0 L-4 -3 Z" fill="#55637A"/>
            <circle r="4" fill="#0D1219"/>
          </g>
        </g>
        <text class="value-s" id="hk${n}-pump-v" x="${dropX + 34}" y="${pumpY + 6}"
              text-anchor="start">--</text>

        <rect x="${x1}" y="${RT}" width="${x2 - x1}" height="${RB - RT}" rx="10"
              fill="url(#rad${n}Fill)" stroke="#33415A" stroke-width="2"/>
        <g stroke="#0D1219" stroke-width="7" opacity="0.5">${fins}</g>
        <rect x="${x1}" y="${RT}" width="${x2 - x1}" height="${RB - RT}" rx="10" fill="url(#glass)"/>

        <g transform="translate(${mid} ${RT + 100})">
          <rect x="-100" y="-42" width="200" height="84" rx="10"
                fill="#0B1017" opacity="0.9"/>
          <text class="tag-l" x="-86" y="-14">Wasser</text>
          <text class="tag-v" id="hk${n}-water-v" x="86" y="-12" text-anchor="end">--</text>
          <text class="tag-l" x="-86" y="24">Raum</text>
          <text class="tag-v" id="hk${n}-room-v" x="86" y="26" text-anchor="end">--</text>
        </g>

        <text class="cap" x="${mid}" y="${L.CAP_Y}" text-anchor="middle">${escapeHtml(
          this._config[`label_hk${n}`] || `Heizkreis ${n}`
        )}</text>
      </g>`;
  }

  /**
   * Aufsteigende Blasen in einem Speicher.
   * Die Lage jeder Blase ist fest vorberechnet, damit das Bild bei
   * jedem Neuaufbau gleich aussieht. Wie viele davon sichtbar sind,
   * entscheidet spaeter die Temperatur.
   */
  _bubbles(id, x, y, w, h, anzahl) {
    const n = anzahl || BUBBLE_COUNT;
    let zufall = 1; // einfacher, wiederholbarer Zahlengenerator
    const naechste = () => {
      zufall = (zufall * 1103515245 + 12345) % 2147483648;
      return zufall / 2147483648;
    };
    let kreise = "";
    for (let i = 0; i < n; i++) {
      const cx = Math.round(x + 10 + naechste() * (w - 20));
      const r = (1.6 + naechste() * 2.4).toFixed(1);
      const dauer = (4 + naechste() * 4).toFixed(1);
      const start = (naechste() * 7).toFixed(1);
      kreise +=
        `<circle class="bubble" cx="${cx}" cy="${y + h - 4}" r="${r}"` +
        ` style="animation-duration:${dauer}s;animation-delay:-${start}s"/>`;
    }
    return `<g id="${id}">${kreise}</g>`;
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
    const zeige = (id, sichtbar) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("opacity", sichtbar ? "1" : "0");
    };
    const abzeichen = (id, aktiv) => {
      const el = sr.getElementById(id);
      if (!el) return;
      el.classList.toggle("is-on", aktiv);
      el.classList.toggle("is-pulsing", aktiv && animate);
    };
    // Schaltet die Laufstriche eines Leitungsabschnitts.
    const stroemt = (ids, an, farbe) => {
      ids.forEach((id) => {
        const el = sr.getElementById(id);
        if (!el) return;
        el.classList.toggle("is-on", animate && an === true);
        if (farbe) el.setAttribute("stroke", farbe);
      });
    };

    /* Sichtbarer Hinweis, wenn ueberhaupt keine Entitaet gefunden wurde.
       Sonst zeigt die Karte nur Striche und man sucht an der falschen Stelle. */
    const pflicht = ["outside_temp", "compressor", "flow_temp", "return_temp",
                     "buffer_temp", "dhw_temp"];
    const gefunden = pflicht.filter((k) => {
      const id = this._e(k);
      return id && hass.states[id] !== undefined;
    }).length;
    const hinweis = sr.getElementById("hinweis");
    if (hinweis) {
      hinweis.hidden = gefunden > 0;
      if (gefunden === 0) {
        hinweis.textContent =
          "Keine Entitäten zugeordnet. Karte bearbeiten und oben auf " +
          "\u201eAus Integration übernehmen\u201c drücken.";
      }
    }

    /* Störung */
    const alertEl = sr.getElementById("alert");
    if (alertEl) {
      const err = rawState(hass, this._e("error"));
      const harmlos = [null, "", "OK", "ok", "0", "No error", "unknown", "unavailable"];
      const stoerung = err !== null && !harmlos.includes(err);
      alertEl.hidden = !stoerung;
      alertEl.classList.toggle("is-pulsing", stoerung && animate);
      if (stoerung) alertEl.textContent = `Störung der Wärmepumpe: ${err}`;
    }

    /* Außenfühler */
    const outside = numState(hass, this._e("outside_temp"));
    const oMin = Number(this._config.outdoor_min);
    const oMax = Number(this._config.outdoor_max);
    const outColor = thermalColor(outside, oMin, oMax);
    set("outside-v", outside === null ? "--" : `${fmt(outside)} °C`);
    const aussenEl = sr.getElementById("outside-v");
    if (aussenEl) aussenEl.setAttribute("fill", outColor);

    /* Außengerät */
    const comp = numState(hass, this._e("compressor"));
    set("comp-v", comp === null ? "--" : `${fmt(comp, 0)} Hz`);

    const anAus = isOn(hass, this._e("power_state"));
    const led = sr.getElementById("power-led");
    if (led) {
      led.setAttribute("fill", anAus === true ? "#46C07A" : "#2C3646");
      led.classList.toggle("is-on", anAus === true);
    }

    this._spin("fan1", numState(hass, this._e("fan1_rpm")), "fan1-rpm", "U/min");
    if (this._config.fan_count === 2) {
      this._spin("fan2", numState(hass, this._e("fan2_rpm")), "fan2-rpm", "U/min");
    }
    abzeichen("defrost-badge", isOn(hass, this._e("defrost")) === true);
    const glow = sr.getElementById("unit-glow");
    if (glow) glow.classList.toggle("is-on", animate && comp !== null && comp > 0);

    /* SG Ready */
    const sgGroup = sr.getElementById("sg-group");
    if (sgGroup) {
      const konfiguriert = Boolean(this._e("sg_k1")) && Boolean(this._e("sg_k2"));
      sgGroup.setAttribute("opacity", konfiguriert ? "1" : "0");
      if (konfiguriert) {
        const sg = this._sgMode();
        const info = SG_STATES[sg];
        const farbe = info ? info.farbe : NEUTRAL;
        set("sg-text", sg === null ? "unbekannt" : info.kurz);
        const t = sr.getElementById("sg-text");
        if (t) {
          t.setAttribute("fill", farbe);
          t.style.color = farbe;
          t.classList.toggle("is-active", sg !== null);
        }
        for (let i = 1; i <= 4; i++) {
          const seg = sr.getElementById(`sg-seg-${i}`);
          if (!seg) continue;
          const aktiv = sg === i;
          seg.setAttribute("fill", aktiv ? farbe : "#586A88");
          seg.style.color = farbe;
          seg.classList.toggle("is-active", aktiv);
        }
      }
    }

    /* Stromverbrauch, nur sichtbar wenn ein Wert vorliegt */
    const leistung = numState(hass, this._e("power_now"));
    const energie = numState(hass, this._e("energy_today"));
    zeige("verbrauch-group", leistung !== null || energie !== null);
    set("power-now-v", leistung === null ? "--" : `${fmt(leistung, 0)} W`);
    // Tagesverbrauch, sofern der Stand von Mitternacht bekannt ist.
    let energieAnzeige = energie;
    if (this._config.energy_daily !== false && energie !== null) {
      this._ladeTagesstart();
      if (this._tagStart !== undefined && energie >= this._tagStart) {
        energieAnzeige = energie - this._tagStart;
      }
    }
    set(
      "energy-today-v",
      energieAnzeige === null ? "--" : `${fmt(energieAnzeige, 1)} kWh`
    );

    /* Zirkulationspumpe */
    const zirkId = this._e("circulation_pump");
    const zirkAn = isOn(hass, zirkId) === true;
    zeige("zirkulation-group", Boolean(zirkId) && hass.states[zirkId] !== undefined);
    set("zirk-v", !zirkId ? "--" : zirkAn ? "läuft" : "aus");
    const zirkRotor = sr.getElementById("zirk-rotor");
    if (zirkRotor) {
      zirkRotor.classList.toggle("is-still", !zirkAn);
      zirkRotor.style.animationDuration = `${PUMP_SECONDS}s`;
      zirkRotor.style.animationPlayState = zirkAn && animate ? "running" : "paused";
    }

    /* Temperaturen und Leitungsfarben */
    const flow = numState(hass, this._e("flow_temp"));
    const ret = numState(hass, this._e("return_temp"));
    const buf = numState(hass, this._e("buffer_temp"));
    const dhw = numState(hass, this._e("dhw_temp"));
    ["pipe-flow", "pipe-buf-in", "pipe-dhw-in"].forEach((id) => stroke(id, col(flow)));
    ["pipe-return", "pipe-buf-out", "pipe-dhw-out"].forEach((id) => stroke(id, col(ret)));

    // Beide Temperaturen zusaetzlich als Zahl im Gehaeuse, thermisch gefaerbt.
    set("unit-flow-v", flow === null ? "--" : `${fmt(flow)} °C`);
    set("unit-ret-v", ret === null ? "--" : `${fmt(ret)} °C`);
    // Die Farbe steht fest im Stil, rot fuer Vorlauf und blau fuer Ruecklauf.

    paint("bg-top", col(buf));
    paint("bg-bottom", col(buf === null ? null : buf - 4));
    set("buf-v", buf === null ? "--" : `${fmt(buf)} °C`);
    const bufSp = numState(hass, this._e("buffer_target"));
    set("buf-sp", bufSp === null ? "" : `Ziel ${fmt(bufSp, 0)} °C`);
    abzeichen("roomheater-badge", isOn(hass, this._e("room_heater")) === true);

    const dhwSp = numState(hass, this._e("dhw_setpoint"));
    paint("dhw-top", col(dhw));
    paint("dhw-bottom", col(dhw === null ? null : dhw - 6));
    set("dhw-v", dhw === null ? "--" : `${fmt(dhw)} °C`);
    set("dhw-sp", dhwSp === null ? "" : `Ziel ${fmt(dhwSp, 0)} °C`);
    const dhwHeizt = isOn(hass, this._e("dhw_heater")) === true;
    abzeichen("dhwheater-badge", dhwHeizt);

    /* Primärpumpe und Durchfluss */
    const pumpRpm = numState(hass, this._e("pump_speed"));
    const flowRate = numState(hass, this._e("pump_flow"));
    this._spin("pump-rotor", pumpRpm, "pump-v", "U/min", PUMP_SECONDS);
    set("flow-v", flowRate === null ? "--" : `${fmt(flowRate)} l/min`);

    /* Wasserdruck, nur bei vorhandenem Wert */
    const bar = numState(hass, this._e("water_pressure"));
    zeige("press-group", bar !== null);
    if (bar !== null) {
      set("press-v", `${fmt(bar)} bar`);
      const needle = sr.getElementById("press-needle");
      if (needle) {
        needle.setAttribute("transform", `rotate(${-120 + 240 * clamp(bar / 4, 0, 1)})`);
        needle.setAttribute("stroke", bar < 0.8 || bar > 2.8 ? "#D62B2B" : "#9BAAC0");
      }
    }

    /* Dreiwegeventil, Klartext statt Room und DHW */
    const valveEntity = this._e("three_way_valve");
    const valveRoh = attr(hass, valveEntity, "beschreibung", null);
    const valveNum = numState(hass, valveEntity);
    const zuWarmwasser = valveNum !== null && valveNum > 0;
    let valveText = "--";
    if (valveRoh !== null && VALVE_LABELS[valveRoh] !== undefined) {
      valveText = VALVE_LABELS[valveRoh];
    } else if (valveNum !== null) {
      valveText = zuWarmwasser ? "Warmwasser" : "Heizung";
    }
    set("valve-v", valveText);
    const dot = sr.getElementById("valve-dot");
    if (dot) {
      dot.setAttribute(
        "fill",
        valveNum === null ? NEUTRAL : zuWarmwasser ? col(dhw) : col(flow)
      );
    }

    /* Welche Kreise sind ueberhaupt aktiviert?
       TOP94 kennt drei Zustaende, TOP99 und TOP100 je zwei.
       Ist nichts zugeordnet, wird nichts abgeblendet. */
    const zonen = numState(hass, this._e("zones_state"));
    const zone1 = zonen === null ? true : zonen === 0 || zonen === 2;
    const zone2 = zonen === null ? true : zonen === 1 || zonen === 2;
    const pufferDa = (() => {
      const v = numState(hass, this._e("buffer_installed"));
      return v === null ? true : v > 0;
    })();
    const wasserDa = (() => {
      const v = numState(hass, this._e("dhw_installed"));
      return v === null ? true : v > 0;
    })();
    const blende = (id, aktiv) => {
      const el = sr.getElementById(id);
      if (el) el.classList.toggle("is-inaktiv", !aktiv);
    };
    blende("hk1-group", zone1);
    blende("hk2-group", zone2);
    blende("buffer-group", pufferDa);
    blende("dhw-group", wasserDa);

    /* Heizkreise */
    this._circuitUpdate(1, col, animate);
    if (this._config.hk_count === 2) this._circuitUpdate(2, col, animate);

    /* Durchflussanimation */
    // Der Primaerkreis foerdert, wenn Pumpe oder Durchfluss das melden.
    // Ohne diese Werte bewegt sich nichts, es wird nichts angenommen.
    const primaer =
      (pumpRpm !== null && pumpRpm > 0) || (flowRate !== null && flowRate > 0);
    // Jeder Abschnitt einzeln, abhaengig nur vom eigenen Kreis.
    stroemt(["dots-vorlauf"], primaer, col(flow));
    stroemt(["dots-ruecklauf"], primaer, col(ret));
    stroemt(["dots-buf", "dots-buf2"], primaer && !zuWarmwasser, col(buf));
    stroemt(["dots-dhw", "dots-dhw2"], primaer && zuWarmwasser, col(dhw));
    stroemt(["dots-zirk"], zirkAn, col(dhw));
    stroke("pipe-zirk", col(dhw));

    // Blasen: je waermer der Speicher, desto mehr steigen auf.
    const blasen = (id, wert) => {
      const g = sr.getElementById(id);
      if (!g || !g.children) return;
      const anteil =
        wert === null ? 0 : clamp((wert - min) / ((max - min) || 1), 0, 1);
      const sichtbar = animate ? Math.round(anteil * BUBBLE_COUNT) : 0;
      Array.from(g.children).forEach((el, i) => {
        // Eine pausierte Animation setzt ihre Deckkraft weiter und
        // ueberschreibt dabei jeden Inline-Stil. Ausgeblendete Blasen
        // bekommen deshalb gar keine Animation, sonst blieben sie
        // sichtbar in der Luft stehen.
        el.style.animationName = i < sichtbar ? "" : "none";
      });
    };
    blasen("buf-bubbles", buf);
    blasen("dhw-bubbles", dhw);

    /* Bedienung */
    this._syncToggle("sw-heat", "heating_switch");
    this._syncModeSelect();
    this._syncSlider("ctl-hk1", "hk1_setpoint", "hk1_water_target");
    this._syncSlider("ctl-hk2", "hk2_setpoint", "hk2_water_target");
    this._syncSlider("ctl-dhw", "dhw_setpoint");
    this._syncDialog();
  }

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
      water === null
        ? "--"
        : `${fmt(water, 0)}${target === null ? "" : ` / ${fmt(target, 0)}`} °C`
    );
    set(`hk${n}-room-v`, room === null ? "--" : `${fmt(room)} °C`);

    const rotor = sr.getElementById(`hk${n}-rotor`);
    if (rotor) {
      rotor.classList.toggle("is-still", !pumpOn);
      rotor.style.animationDuration = `${PUMP_SECONDS}s`;
      rotor.style.animationPlayState = pumpOn && animate ? "running" : "paused";
    }
    set(`hk${n}-pump-v`, pumpOn ? "läuft" : "aus");

    // Die beiden Leitungen dieses Heizkreises laufen nur mit seiner Pumpe.
    [`dots-hk${n}`, `dots-hk${n}b`].forEach((id) => {
      const el = sr.getElementById(id);
      if (!el) return;
      el.classList.toggle("is-on", animate && pumpOn);
      el.setAttribute("stroke", col(water));
    });

    ["in", "out"].forEach((seite) => {
      const el = sr.getElementById(`pipe-hk${n}-${seite}`);
      if (el) el.setAttribute("stroke", col(seite === "in" ? water : water - 6));
    });
    return pumpOn;
  }

  /**
   * Dreht einen Rotor.
   * Ohne festeDauer richtet sich das Tempo nach der Drehzahl, das
   * passt zu den Lueftern. Pumpen bekommen eine feste, ruhige Dauer,
   * denn dort soll nur erkennbar sein, dass sie ueberhaupt foerdern.
   */
  _spin(rotorId, rpm, labelId, unit, festeDauer) {
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
    el.style.animationDuration = festeDauer
      ? `${festeDauer}s`
      : `${clamp(900 / rpm, 0.25, 6).toFixed(2)}s`;
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
      // Die Rohwerte bleiben als Wert erhalten, angezeigt wird Klartext.
      sel.innerHTML = options
        .map(
          (o) =>
            `<option value="${escapeHtml(o)}">${escapeHtml(modeLabel(o) || o)}</option>`
        )
        .join("");
      sel.dataset.signature = signature;
    }
    if (sel.value !== st.state) sel.value = st.state;
  }

  /**
   * Aktualisiert einen Sollwertregler.
   * key      ist die stellbare Entitaet, auf die geschrieben wird.
   * anzeige  ist optional die Entitaet, deren Wert angezeigt wird.
   *          Damit steht am Regler der tatsaechliche Sollwert des
   *          Kreises, auch wenn die stellbare Entitaet etwas
   *          anderes fuehrt.
   */
  _syncSlider(id, key, anzeige) {
    const range = this.shadowRoot.getElementById(`${id}-range`);
    if (!range) return;
    const out = this.shadowRoot.getElementById(`${id}-out`);
    const minEl = this.shadowRoot.getElementById(`${id}-min`);
    const maxEl = this.shadowRoot.getElementById(`${id}-max`);
    const entityId = this._e(key);
    const st = this._hass.states[entityId];
    const anzeigeId = anzeige ? this._e(anzeige) : "";
    const stAnzeige = anzeigeId ? this._hass.states[anzeigeId] : null;

    const sperren = (text) => {
      range.disabled = true;
      if (out) out.textContent = text;
      if (minEl) minEl.textContent = "";
      if (maxEl) maxEl.textContent = "";
    };

    if (!st) {
      sperren("nicht gefunden");
      return;
    }

    // Zuerst den tatsaechlichen Wert lesen, erst danach den Bereich setzen.
    // Ist eine Anzeigequelle eingetragen, hat deren Wert Vorrang.
    const quelle = stAnzeige && !Number.isNaN(parseFloat(stAnzeige.state)) ? stAnzeige : st;
    const wert = parseFloat(quelle.state);
    if (Number.isNaN(wert)) {
      sperren("nicht verfügbar");
      return;
    }

    let lo = Number(st.attributes.min !== undefined ? st.attributes.min : 15);
    let hi = Number(st.attributes.max !== undefined ? st.attributes.max : 65);
    // Zeigt der Regler eine andere Quelle, muss der Bereich dazu passen.
    if (quelle !== st) {
      lo = Math.min(lo, Math.floor(wert) - 10);
      hi = Math.max(hi, Math.ceil(wert) + 10);
    }
    // Liegt der Sollwert ausserhalb, wird der Bereich erweitert.
    // Sonst klemmt der Browser den Regler an den Rand und zeigt etwas
    // anderes an, als die Waermepumpe tatsaechlich eingestellt hat.
    if (wert < lo) lo = Math.floor(wert);
    if (wert > hi) hi = Math.ceil(wert);

    range.disabled = false;
    range.min = lo;
    range.max = hi;
    range.step = Number(st.attributes.step !== undefined ? st.attributes.step : 1);
    if (minEl) minEl.textContent = `${lo} °C`;
    if (maxEl) maxEl.textContent = `${hi} °C`;

    if (this._dragging === id) return;
    range.value = wert;
    if (out) out.textContent = `${wert} °C`;
    range.style.setProperty(
      "--thumb",
      thermalColor(wert, Number(this._config.scale_min), Number(this._config.scale_max))
    );
  }

  /* -------------------- Styles -------------------- */

  _css() {
    return `
      :host { display: block; }
      .lhc {
        --ink: #E8EDF4; --muted: #7E8CA0; --line: #26303F; --panel: #131A24;
        background: linear-gradient(180deg, #131A24 0%, #0D131B 100%);
        color: var(--ink); padding: 16px 20px 22px; overflow: hidden;
        position: relative;
      }
      .lhc-alert {
        margin-bottom: 14px; padding: 12px 16px; border-radius: 10px;
        background: #3A1214; border: 1px solid #D6534A; color: #FFD9D6;
        font-size: 14px; font-weight: 500;
      }
      .lhc-alert[hidden] { display: none; }
      .lhc-alert.is-pulsing { animation: lhc-pulse 2s ease-in-out infinite; }
      .lhc-hint {
        margin-bottom: 14px; padding: 12px 16px; border-radius: 10px;
        background: #2A2313; border: 1px solid #B07B2E; color: #F2DFB0;
        font-size: 14px;
      }
      .lhc-hint[hidden] { display: none; }
      .lhc-svg { width: 100%; height: auto; display: block; }

      .pipe-shell {
        fill: none; stroke: #0B1017; stroke-width: 18;
        stroke-linecap: round; stroke-linejoin: round;
      }
      .pipe {
        fill: none; stroke: ${NEUTRAL}; stroke-width: 9;
        stroke-linecap: round; stroke-linejoin: round; transition: stroke 900ms ease;
      }
      /* Signalleitung des Außenfühlers, bewusst keine Rohrleitung */
      .signal {
        fill: none; stroke: #46536A; stroke-width: 2; stroke-dasharray: 5 5;
      }
      /* Laufende Striche zeigen an, dass in genau dieser Leitung
         gerade Wasser stroemt. Kurze Punkte verschwinden beim
         Herunterskalieren, daher bewusst lang und kraeftig. */
      .flowdots {
        fill: none; stroke: #FFFFFF; stroke-width: 7;
        stroke-linecap: round; stroke-dasharray: 14 30;
        opacity: 0; animation: lhc-flow 1.2s linear infinite;
        animation-play-state: paused;
      }
      .flowdots.is-on { opacity: 0.9; animation-play-state: running; }
      .flowdots.rev { animation-name: lhc-flow-rev; }
      @keyframes lhc-flow { to { stroke-dashoffset: -44; } }
      @keyframes lhc-flow-rev { to { stroke-dashoffset: 44; } }

      .unit-label {
        fill: #7E8CA0; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase;
      }
      .verbrauch-v {
        fill: #E0762E; font-size: 26px; font-weight: 650;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      #verbrauch-group, #zirkulation-group { transition: opacity 300ms ease; }
      .unit-value {
        fill: #E8EDF4; font-size: 20px; font-weight: 600;
        transition: fill 600ms ease;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .sensor-value {
        fill: ${NEUTRAL}; font-size: 30px; font-weight: 650;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums; transition: fill 600ms ease;
      }
      /* Nicht aktivierte Kreise werden abgeblendet, nicht ausgeblendet.
         So bleibt erkennbar, dass es sie gibt. */
      .is-inaktiv { opacity: 0.28; transition: opacity 600ms ease; }
      .cap { fill: #98A6BA; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; }
      .cap-s { fill: #7E8CA0; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; }
      .value-l {
        fill: #FFFFFF; font-size: 30px; font-weight: 650;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
        paint-order: stroke; stroke: rgba(0,0,0,0.45); stroke-width: 5px;
      }
      .value-s {
        fill: #98A6BA; font-size: 14px;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .value-sp { fill: rgba(255,255,255,0.85); font-size: 17px; }
      /* Aufsteigende Blasen. Je waermer der Speicher, desto mehr
         davon werden sichtbar geschaltet. */
      .bubble {
        fill: #FFFFFF; opacity: 0;
        animation-name: lhc-bubble; animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      @keyframes lhc-bubble {
        0% { transform: translateY(0); opacity: 0; }
        15% { opacity: 0.38; }
        85% { opacity: 0.34; }
        100% { transform: translateY(-330px); opacity: 0; }
      }
      .tag-l { fill: #8494AA; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
      /* Vorlauf rot, Ruecklauf blau, unabhaengig von der Temperatur. */
      .vl-value, .rl-value {
        font-size: 22px; font-weight: 700;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .vl-value { fill: #FF5F52; }
      .rl-value { fill: #4D9BFF; }
      .tag-v {
        fill: #FFFFFF; font-size: 19px; font-weight: 600;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .badge-t { fill: #E8EDF4; font-size: 13px; }
      .version {
        fill: #3A4757; font-size: 12px;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
      }
      .badge { opacity: 0; transition: opacity 300ms ease; }
      .badge.is-on { opacity: 1; }
      .badge.is-on.is-pulsing { animation: lhc-pulse 2.2s ease-in-out infinite; }

      .sg-label {
        fill: #C3D0E0; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
      }
      .sg-value {
        fill: ${NEUTRAL}; font-size: 23px; font-weight: 700;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums; transition: fill 400ms ease;
      }
      /* Der Zustandstext leuchtet leicht in seiner eigenen Farbe,
         damit er sich vom dunklen Gehaeuse abhebt. */
      .sg-value.is-active { filter: drop-shadow(0 0 6px currentColor); }
      #sg-group { transition: opacity 300ms ease; }
      #sg-group rect { transition: fill 400ms ease; }
      /* Der aktive Balken leuchtet, damit er sich klar abhebt. */
      #sg-group rect.is-active { filter: drop-shadow(0 0 5px currentColor); }
      #power-led { transition: fill 400ms ease; }
      #power-led.is-on { filter: drop-shadow(0 0 6px rgba(70,192,122,0.9)); }
      #unit-glow { transition: opacity 600ms ease; }
      #unit-glow.is-on { animation: lhc-glow 2.6s ease-in-out infinite; }
      #press-group { transition: opacity 300ms ease; }
      #valve-dot, #press-needle { transition: all 900ms ease; }
      @keyframes lhc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      @keyframes lhc-glow { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.5; } }

      /* Die Rotoren tragen selbst kein transform-Attribut, sonst wuerde
         die Animation es ueberschreiben und sie an den Nullpunkt werfen. */
      .rotor {
        transform-origin: 0 0; animation: lhc-spin 2s linear infinite;
        animation-play-state: paused;
      }
      .rotor .blades path { fill: #55637A; }
      .rotor.is-still .blades path, .rotor.is-still > path { fill: #3A4557; }
      @keyframes lhc-spin { to { transform: rotate(360deg); } }

      .lhc-field-label {
        font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
      }
      .lhc-switches {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 10px; margin-top: 18px;
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
        gap: 16px; margin-top: 14px; padding-top: 18px; border-top: 1px solid var(--line);
      }
      .lhc-controls[hidden] { display: none; }
      .lhc-ctl {
        background: var(--panel); border: 1px solid var(--line);
        border-radius: 12px; padding: 14px 16px 12px;
      }
      .lhc-ctl-head {
        display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;
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

      /* Anklickbare Baugruppen und das Einstellfenster. */
      .klickbar { cursor: pointer; }
      .klickbar:hover { filter: brightness(1.15); }
      .lhc-dialog {
        position: absolute; inset: 0; z-index: 5;
        display: flex; align-items: center; justify-content: center;
        background: rgba(6, 10, 16, 0.72);
      }
      .lhc-dialog[hidden] { display: none; }
      .lhc-dialog-box {
        width: min(360px, 90%); padding: 20px 22px 18px; border-radius: 16px;
        background: #161D28; border: 1px solid var(--line);
        box-shadow: 0 18px 48px rgba(0,0,0,0.55);
      }
      .lhc-dialog-head {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
      }
      .lhc-dialog-title {
        font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
        color: var(--muted);
      }
      .lhc-dialog-close {
        background: none; border: none; color: var(--muted); cursor: pointer;
        font-size: 26px; line-height: 1; padding: 0 4px;
      }
      .lhc-dialog-close:hover { color: var(--ink); }
      .lhc-dialog-value {
        display: block; margin: 10px 0 18px; text-align: center;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 40px; font-weight: 650; font-variant-numeric: tabular-nums;
      }
      .lhc-dialog-row { display: flex; align-items: center; gap: 14px; }
      .lhc-step {
        width: 44px; height: 44px; flex: 0 0 auto; border-radius: 12px;
        background: #1B2431; border: 1px solid var(--line); color: var(--ink);
        font-size: 24px; line-height: 1; cursor: pointer;
      }
      .lhc-step:hover { border-color: #3E4C61; }
      .lhc-step:focus-visible { outline: 2px solid #E0762E; outline-offset: 2px; }

      @media (prefers-reduced-motion: reduce) {
        .rotor, .bubble, .flowdots, .badge, .lhc-alert, #unit-glow, #sg-group {
          animation: none !important;
        }
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
    // Nur einmal aufbauen, sonst ueberschreibt der Abgleich die Eingabe.
    if (!this._built) this._render();
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
              ? `Heishamon by Lutarym erkannt. ${found.count} Entitäten gefunden, ${
                  Object.keys(found.entities).length
                } davon passen zu dieser Karte.`
              : "Keine Entitäten der Integration gefunden. Du kannst die Standardnamen eintragen und danach anpassen."
          }</p>
          <div class="ed-actions">
            <button type="button" id="btn-adopt" ${
              found.found ? "" : "disabled"
            }>Aus Integration übernehmen</button>
            <button type="button" id="btn-default">Standardnamen eintragen</button>
            <button type="button" id="btn-clear" class="is-quiet">Alle leeren</button>
          </div>
        </div>

        <div class="ed-group">
          <h3>Darstellung</h3>
          <label class="ed-row">
            <span>Anzahl Lüfter</span>
            <select id="opt-fans"><option value="1">1 Lüfter</option><option value="2">2 Lüfter</option></select>
          </label>
          <label class="ed-row">
            <span>Anzahl Heizkreise</span>
            <select id="opt-hk"><option value="1">1 Heizkreis</option><option value="2">2 Heizkreise</option></select>
          </label>
          <label class="ed-row">
            <span>Heizungsskala kalt<em>Grad, färbt Speicher und Leitungen</em></span>
            <input type="number" id="opt-min">
          </label>
          <label class="ed-row"><span>Heizungsskala heiß<em>Grad</em></span><input type="number" id="opt-max"></label>
          <label class="ed-row">
            <span>Außenskala kalt<em>Grad, färbt den Außenfühler</em></span>
            <input type="number" id="opt-omin">
          </label>
          <label class="ed-row"><span>Außenskala warm<em>Grad</em></span><input type="number" id="opt-omax"></label>
          <label class="ed-row">
            <span>Beschriftung Heizkreis 1<em>gilt für Schaubild und Regler</em></span>
            <input type="text" id="opt-lhk1">
          </label>
          <label class="ed-row">
            <span>Beschriftung Heizkreis 2<em>gilt für Schaubild und Regler</em></span>
            <input type="text" id="opt-lhk2">
          </label>
          <label class="ed-row">
            <span>Beschriftung Puffer<em>frei wählbar</em></span>
            <input type="text" id="opt-lbuf">
          </label>
          <label class="ed-row">
            <span>Beschriftung Warmwasser<em>frei wählbar</em></span>
            <input type="text" id="opt-ldhw">
          </label>
          <label class="ed-row">
            <span>Beschriftung Energie<em>je nach Sensor, etwa Heute oder Gesamt</em></span>
            <input type="text" id="opt-lenergy">
          </label>
          <label class="ed-row ed-check">
            <input type="checkbox" id="opt-eday">
            <span>Tagesverbrauch aus dem Zählerstand rechnen</span>
          </label>
          <label class="ed-row ed-check"><input type="checkbox" id="opt-animate"><span>Bewegung anzeigen</span></label>
          <label class="ed-row ed-check"><input type="checkbox" id="opt-switches"><span>Betriebsart und Schalter anzeigen</span></label>
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
          SG Ready liefert HeishaMon nicht. Trage die beiden Kontakte ein,
          K1 für Sperre und K2 für Anlauf. Den Betriebszustand 1 bis 4 leitet
          die Karte daraus selbst ab. Die Knöpfe oben führen zusammen und
          löschen eigene Einträge nicht.
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
    bind("opt-fans", (el) => put({ fan_count: parseInt(el.value, 10) }));
    bind("opt-hk", (el) => put({ hk_count: parseInt(el.value, 10) }));
    bind("opt-min", (el) => put({ scale_min: parseFloat(el.value) }));
    bind("opt-max", (el) => put({ scale_max: parseFloat(el.value) }));
    bind("opt-omin", (el) => put({ outdoor_min: parseFloat(el.value) }));
    bind("opt-omax", (el) => put({ outdoor_max: parseFloat(el.value) }));
    bind("opt-lhk1", (el) => put({ label_hk1: el.value }));
    bind("opt-lhk2", (el) => put({ label_hk2: el.value }));
    bind("opt-lbuf", (el) => put({ label_buffer: el.value }));
    bind("opt-ldhw", (el) => put({ label_dhw: el.value }));
    bind("opt-lenergy", (el) => put({ label_energy: el.value }));
    bind("opt-eday", (el) => put({ energy_daily: el.checked }));
    bind("opt-animate", (el) => put({ animate: el.checked }));
    bind("opt-switches", (el) => put({ show_switches: el.checked }));
    bind("opt-controls", (el) => put({ show_controls: el.checked }));

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
      if (el && el !== sr.activeElement) el.value = value;
    };
    const check = (id, value) => {
      const el = sr.getElementById(id);
      if (el) el.checked = value !== false;
    };
    put("opt-fans", String(this._config.fan_count));
    put("opt-hk", String(this._config.hk_count));
    put("opt-min", this._config.scale_min);
    put("opt-max", this._config.scale_max);
    put("opt-omin", this._config.outdoor_min);
    put("opt-omax", this._config.outdoor_max);
    put("opt-lhk1", this._config.label_hk1);
    put("opt-lhk2", this._config.label_hk2);
    put("opt-lbuf", this._config.label_buffer);
    put("opt-ldhw", this._config.label_dhw);
    put("opt-lenergy", this._config.label_energy);
    check("opt-eday", this._config.energy_daily);
    check("opt-animate", this._config.animate);
    check("opt-switches", this._config.show_switches);
    check("opt-controls", this._config.show_controls);

    const imFokus = sr.activeElement;
    sr.querySelectorAll("[data-entity]").forEach((input) => {
      const v = (this._config.entities || {})[input.dataset.entity] || "";
      if (input !== imFokus && input.value !== v) input.value = v;
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
  name: "Lutarym Wärmepumpe",
  description:
    "Anlagenschema mit zwei Heizkreisen, Pumpen, Speichern, SG Ready und Durchflussanimation.",
  preview: true,
  documentationURL: "https://github.com/Lutarym/lutarym-heatpump-card",
});

console.info(
  `%c LUTARYM-HEATPUMP-CARD %c ${CARD_VERSION} `,
  "background:#0D131B;color:#E0762E;font-weight:600;padding:2px 6px;border-radius:3px 0 0 3px",
  "background:#E0762E;color:#0D131B;font-weight:600;padding:2px 6px;border-radius:0 3px 3px 0"
);
