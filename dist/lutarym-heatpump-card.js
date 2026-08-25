/**
 * lutarym-heatpump-card
 *
 * Anlagenschema fuer Panasonic Aquarea via HeishaMon.
 * Breitformat, alle Baugruppen in einer Reihe.
 *
 * Autor: Lutarym
 */

const CARD_VERSION = "2.6.2";

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
  RAD_TOP: 400,
  RAD_BOTTOM: 580,
  SEC_FLOW: 320,
  SEC_RET: 620,
  UNIT_TOP: 120,
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

const QUIET_LABELS = {
  mode_0: "Aus", mode_1: "Stufe 1", mode_2: "Stufe 2", mode_3: "Stufe 3",
  0: "Aus", 1: "Stufe 1", 2: "Stufe 2", 3: "Stufe 3",
};

const POWERFUL_LABELS = {
  mode_0: "Aus", mode_1: "30 Minuten", mode_2: "60 Minuten", mode_3: "90 Minuten",
  0: "Aus", 1: "30 Minuten", 2: "60 Minuten", 3: "90 Minuten",
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

// Wie lange ein selbst gesetzter Wert stehen bleibt, bis die Anlage nachzieht.
const HOLD_MS = 12000;

// Vorrat an Blasen je Speicher. Sichtbar ist ein Anteil davon.
const BUBBLE_COUNT = 14;

// Im Demomodus gehoeren Schaltbefehl und Rueckmeldetopic zusammen.
// Wird das eine gesetzt, folgt das andere.
const DEMO_PAARE = {
  power_state: "heatpump_state",
  heatpump_state: "power_state",
  dhw_force: "dhw_force_state",
  dhw_force_state: "dhw_force",
  force_defrost: "defrost",
  defrost: "force_defrost",
  force_sterilization: "sterilization_state",
  sterilization_state: "force_sterilization",
  dhw_heater_switch: "dhw_heater",
  dhw_heater: "dhw_heater_switch",
  room_heater_switch: "room_heater",
  room_heater: "room_heater_switch",
  buffer_switch: "buffer_installed",
  buffer_installed: "buffer_switch",
};

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
  top0: "heatpump_state",
  top2: "dhw_force_state",
  top69: "sterilization_state",
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
  setforcedhw: "dhw_force",
  setforcesterilization: "force_sterilization",
  setforcedefrost: "force_defrost",
  setdhwheaterstate: "dhw_heater_switch",
  setroomheaterstate: "room_heater_switch",
  setpowerfulmode: "powerful_mode",
  setquietmode: "quiet_mode",
  setzones: "zones_select",
  setbuffer: "buffer_switch",
};

const FIELD_DOMAIN = {
  hk1_setpoint: ["number", "input_number"],
  hk2_setpoint: ["number", "input_number"],
  dhw_setpoint: ["number", "input_number"],
  power_state: ["switch", "input_boolean", "binary_sensor", "sensor"],
  heating_switch: ["switch", "input_boolean"],
  mode_select: ["select", "input_select"],
  dhw_force: ["switch", "input_boolean"],
  hk1_switch: ["switch", "input_boolean"],
  hk2_switch: ["switch", "input_boolean"],
  force_sterilization: ["switch", "input_boolean"],
  force_defrost: ["switch", "input_boolean"],
  dhw_heater_switch: ["switch", "input_boolean"],
  room_heater_switch: ["switch", "input_boolean"],
  powerful_mode: ["select", "input_select"],
  quiet_mode: ["select", "input_select"],
  zones_select: ["select", "input_select"],
  buffer_switch: ["switch", "input_boolean"],
  circulation_pump: ["switch", "input_boolean", "binary_sensor", "sensor"],
  circ_switch: ["switch", "input_boolean"],
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
  { key: "heatpump_state", label: "Betriebszustand", group: "Außengerät", hint: "TOP0" },
  { key: "force_defrost", label: "Abtauen erzwingen", group: "Außengerät", hint: "SetForceDefrost, switch" },
  { key: "powerful_mode", label: "Turbomodus", group: "Außengerät", hint: "SetPowerfulMode, select" },
  { key: "quiet_mode", label: "Leisemodus", group: "Außengerät", hint: "SetQuietMode, select" },
  { key: "power_now", label: "Aktuelle Leistungsaufnahme", group: "Außengerät", hint: "Shelly PM, Watt" },
  { key: "energy_today", label: "Energiezähler", group: "Außengerät", hint: "Shelly PM, kWh" },

  { key: "pv_power", label: "PV Leistung aktuell", group: "SG Ready", hint: "eigene Entität, Watt" },
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
  { key: "buffer_switch", label: "Pufferbetrieb ein und aus", group: "Heizungspuffer", hint: "SetBuffer, switch" },
  { key: "buffer_target", label: "Puffer Zieltemperatur", group: "Heizungspuffer", hint: "TOP7, Soll Vorlauf" },
  { key: "room_heater", label: "Heizstab Heizung", group: "Heizungspuffer", hint: "TOP59" },
  { key: "room_heater_switch", label: "Heizstab Heizung schalten", group: "Heizungspuffer", hint: "SetRoomHeaterState, switch" },

  { key: "zones_state", label: "Aktivierte Zonen", group: "Heizkreis 1", hint: "TOP94, gilt für beide" },
  { key: "zones_select", label: "Zonen umschalten", group: "Heizkreis 1", hint: "SetZones, gilt für beide" },
  { key: "hk1_water", label: "HK1 Wassertemperatur", group: "Heizkreis 1", hint: "TOP36" },
  { key: "hk1_water_target", label: "HK1 Wasser Sollwert", group: "Heizkreis 1", hint: "TOP42" },
  { key: "hk1_room", label: "HK1 Raumtemperatur", group: "Heizkreis 1", hint: "TOP56" },
  { key: "hk1_pump", label: "HK1 Pumpe läuft", group: "Heizkreis 1", hint: "TOP124" },
  { key: "hk1_setpoint", label: "HK1 Sollwert einstellbar", group: "Heizkreis 1", hint: "TOP27, number" },
  { key: "hk1_switch", label: "HK1 ein und aus", group: "Heizkreis 1", hint: "eigener Schalter, optional" },

  { key: "hk2_water", label: "HK2 Wassertemperatur", group: "Heizkreis 2", hint: "TOP37" },
  { key: "hk2_water_target", label: "HK2 Wasser Sollwert", group: "Heizkreis 2", hint: "TOP43" },
  { key: "hk2_room", label: "HK2 Raumtemperatur", group: "Heizkreis 2", hint: "TOP57" },
  { key: "hk2_pump", label: "HK2 Pumpe läuft", group: "Heizkreis 2", hint: "TOP123" },
  { key: "hk2_setpoint", label: "HK2 Sollwert einstellbar", group: "Heizkreis 2", hint: "TOP34, number" },
  { key: "hk2_switch", label: "HK2 ein und aus", group: "Heizkreis 2", hint: "eigener Schalter, optional" },

  { key: "dhw_installed", label: "Warmwasser vorhanden", group: "Warmwasser", hint: "TOP100" },
  { key: "dhw_temp", label: "Warmwasser Isttemperatur", group: "Warmwasser", hint: "TOP10" },
  { key: "dhw_setpoint", label: "Warmwasser Sollwert", group: "Warmwasser", hint: "TOP9, number" },
  { key: "dhw_heater", label: "Heizstab Warmwasser", group: "Warmwasser", hint: "TOP58" },
  { key: "dhw_force", label: "Einmalig aufheizen", group: "Warmwasser", hint: "SetForceDHW, switch" },
  { key: "dhw_force_state", label: "Aufheizen läuft", group: "Warmwasser", hint: "TOP2" },
  { key: "force_sterilization", label: "Legionellenschutz starten", group: "Warmwasser", hint: "SetForceSterilization, switch" },
  { key: "sterilization_state", label: "Legionellenschutz läuft", group: "Warmwasser", hint: "TOP69" },
  { key: "dhw_heater_switch", label: "Heizstab Warmwasser schalten", group: "Warmwasser", hint: "SetDHWHeaterState, switch" },
  { key: "circulation_pump", label: "Zirkulationspumpe läuft", group: "Warmwasser", hint: "Shelly oder eigener Schalter" },
  { key: "circ_switch", label: "Zirkulation Schalter (klickbar)", group: "Warmwasser", hint: "Switch zum Ein/Ausschalten der Zirkulation" },

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
  show_switches: true,
  label_hk1: "Heizkreis 1",
  label_hk2: "Heizkreis 2",
  label_dhw: "Warmwasser",
  label_energy: "",
  label_buffer: "Puffer",
  energy_daily: true,
  demo: false,
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
    
    // Animation Engine (GData-kompatibel)
    this._animLoop = null;
    this._animTime = 0;
    this._animState = new Map();
  }

  disconnectedCallback() {
    if (this._animLoop) cancelAnimationFrame(this._animLoop);
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
    if (this._config.demo) this._demoAufbauen();
    else this._demo = null;
    this._tagStart = undefined;
    this._tagStartTag = undefined;
    this._tagVersuch = 0;
    if (this.shadowRoot) this.shadowRoot.innerHTML = "";
    if (this._quelle) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._render();
  }

  getCardSize() {
    return 18;
  }

  /** Liefert die gerade gueltige Datenquelle. */
  get _quelle() {
    return this._config && this._config.demo ? this._demo : this._hass;
  }

  /**
   * Baut einen vollstaendigen Satz erfundener Werte auf.
   * Im Demomodus ersetzt er die echten Entitaeten restlos. Es wird
   * nichts an die Waermepumpe gesendet, alle Bedienschritte aendern
   * nur diese Nachbildung.
   */
  _demoAufbauen() {
    const werte = {
      outside_temp: 8.5, heatpump_state: 1, compressor: 42,
      fan1_rpm: 640, fan2_rpm: 620,
      power_now: 1240, energy_today: 8.4,
      flow_temp: 39.2, return_temp: 33.1, pump_speed: 2400, pump_flow: 18.6,
      three_way_valve: 0, water_pressure: 1.8, defrost: 0, error: "0",
      buffer_temp: 38.4, buffer_target: 42, room_heater: 0, buffer_installed: 1,
      hk1_water: 34.2, hk1_water_target: 36, hk1_room: 21.5, hk1_pump: 1,
      hk1_setpoint: 36, hk2_water: 30.1, hk2_water_target: 32, hk2_room: 20.8,
      hk2_pump: 0, hk2_setpoint: 32, zones_state: 2,
      dhw_temp: 48.3, dhw_setpoint: 50, dhw_heater: 0, dhw_installed: 1,
      dhw_force_state: 0, sterilization_state: 0, circulation_pump: 0, circ_switch: "off", pv_power: 3400,
      sg_k1: "off", sg_k2: "off",
      dhw_force: "off", force_sterilization: "off", force_defrost: "off",
      dhw_heater_switch: "off", room_heater_switch: "off", buffer_switch: "on",
      power_state: "on", hk1_switch: "on", hk2_switch: "off",
      operating_mode: 4,
    };
    const states = {};
    Object.keys(werte).forEach((feld) => {
      const attrs = {};
      if (feld.endsWith("_setpoint")) {
        Object.assign(attrs, { min: 15, max: 65, step: 0.5 });
      }
      states[`demo.${feld}`] = { state: String(werte[feld]), attributes: attrs };
    });
    states["demo.mode_select"] = {
      state: "mode_4",
      attributes: { options: ["mode_0", "mode_1", "mode_2", "mode_3", "mode_4", "mode_5", "mode_6"] },
    };
    states["demo.powerful_mode"] = {
      state: "mode_0",
      attributes: { options: ["mode_0", "mode_1", "mode_2", "mode_3"] },
    };
    states["demo.quiet_mode"] = {
      state: "mode_2",
      attributes: { options: ["mode_0", "mode_1", "mode_2", "mode_3"] },
    };

    const karte = this;
    this._demo = {
      states,
      entities: {},
      // Nimmt Befehle entgegen und aendert nur die Nachbildung.
      callService(bereich, dienst, daten) {
        const id = daten.entity_id;
        if (!states[id]) return;
        if (dienst === "set_value") states[id].state = String(daten.value);
        else if (dienst === "select_option") states[id].state = daten.option;
        else if (dienst === "turn_on") states[id].state = "on";
        else if (dienst === "turn_off") states[id].state = "off";
        else if (dienst === "toggle") {
          states[id].state = states[id].state === "on" ? "off" : "on";
        }
        // Auch ein Befehl aus einem Fenster zieht die Rueckmeldung nach.
        const feld = id.slice(5);
        const paar = DEMO_PAARE[feld];
        if (paar && states[`demo.${paar}`]) {
          const an = states[id].state === "on" || parseFloat(states[id].state) > 0;
          const zielIstSchalter =
            paar.endsWith("_switch") || paar.startsWith("force_") ||
            paar === "power_state" || paar === "dhw_force" || paar === "buffer_switch";
          states[`demo.${paar}`].state = zielIstSchalter
            ? an ? "on" : "off"
            : an ? "1" : "0";
        }
        karte._render();
      },
    };
  }

  /**
   * Setzt einen Wert der Nachbildung.
   * Schaltbefehl und Rueckmeldetopic gehoeren zusammen und werden
   * gemeinsam gesetzt. Sonst schaltet man im Demomodus etwas um,
   * ohne dass die zugehoerige Rueckmeldung folgt.
   */
  _demoSetze(feld, wert) {
    if (!this._demo) return;
    const setze = (name, w) => {
      const eintrag = this._demo.states[`demo.${name}`];
      if (eintrag) eintrag.state = String(w);
    };
    setze(feld, wert);

    const an = wert === "on" || parseFloat(wert) > 0;
    const paar = DEMO_PAARE[feld];
    if (paar) {
      const zielIstSchalter = paar.endsWith("_switch") || paar.startsWith("force_") ||
        paar === "power_state" || paar === "dhw_force" || paar === "buffer_switch";
      setze(paar, zielIstSchalter ? (an ? "on" : "off") : an ? 1 : 0);
    }
    this._render();
  }

  /** Liest einen Wert der Nachbildung. */
  _demoLies(feld) {
    if (!this._demo) return null;
    const eintrag = this._demo.states[`demo.${feld}`];
    return eintrag ? eintrag.state : null;
  }

  _e(key) {
    // Im Demomodus zeigen alle Felder auf die Nachbildung.
    if (this._config && this._config.demo) return `demo.${key}`;
    const eintraege = this._config.entities || {};
    // Frueherer Feldname bleibt gueltig, damit bestehende Karten weiterlaufen.
    const alias = { power_state: "power_switch", buffer_temp: "buffer_top" };
    const configured = eintraege[key] || eintraege[alias[key]];
    if (configured) return configured;
    if (!this._auto) this._auto = detectIntegration(this._quelle).entities;
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
    if (!id || !this._quelle || !this._quelle.callWS) return;

    const jetzt = new Date();
    const mitternacht = new Date(
      jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()
    ).getTime();

    // Einmal je Tag, danach hoechstens alle fuenf Minuten erneut versuchen.
    if (this._tagStartTag === mitternacht && this._tagStart !== undefined) return;
    if (this._tagVersuch && jetzt.getTime() - this._tagVersuch < 300000) return;
    this._tagVersuch = jetzt.getTime();

    try {
      const antwort = await this._quelle.callWS({
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

  /**
   * Merkt einen gerade gesetzten Wert kurz vor.
   * Ohne das ueberschreibt die naechste Aktualisierung die Eingabe,
   * bevor die Waermepumpe nachgezogen hat, und der Regler springt zurueck.
   */
  _halte(id, wert) {
    if (!this._gehalten) this._gehalten = {};
    this._gehalten[id] = { wert, bis: Date.now() + HOLD_MS };
  }

  /** Liefert den vorgemerkten Wert, solange er gilt. */
  _gehaltenerWert(id, istWert) {
    const eintrag = this._gehalten && this._gehalten[id];
    if (!eintrag) return null;
    if (Date.now() > eintrag.bis || istWert === eintrag.wert) {
      delete this._gehalten[id];
      return null;
    }
    return eintrag.wert;
  }

  /**
   * Schaltet einen Heizkreis zu oder ab.
   * SetZones kennt nur drei Werte: 0 nur Zone 1, 1 nur Zone 2,
   * 2 beide Zonen. Beide gleichzeitig aus ist nicht vorgesehen,
   * ein solcher Versuch wird deshalb nicht ausgefuehrt.
   */
  _zoneSchalten(nummer) {
    const id = this._e("zones_select");
    if (!id) return;
    const jetzt = numState(this._quelle, this._e("zones_state"));
    const zone1 = jetzt === null ? true : jetzt === 0 || jetzt === 2;
    const zone2 = jetzt === null ? true : jetzt === 1 || jetzt === 2;
    const neu1 = nummer === 1 ? !zone1 : zone1;
    const neu2 = nummer === 2 ? !zone2 : zone2;
    if (!neu1 && !neu2) return;
    const wert = neu1 && neu2 ? 2 : neu1 ? 0 : 1;
    this._quelle.callService("select", "select_option", {
      entity_id: id,
      option: `mode_${wert}`,
    });
  }

  /** Ist der genannte Heizkreis aktiv? Rueckgabe null bei Unkenntnis. */
  _zoneAktiv(nummer) {
    if (!this._e("zones_state")) return null;
    const jetzt = numState(this._quelle, this._e("zones_state"));
    if (jetzt === null) return null;
    return nummer === 1 ? jetzt === 0 || jetzt === 2 : jetzt === 1 || jetzt === 2;
  }

  _sgMode() {
    const k1 = this._e("sg_k1");
    const k2 = this._e("sg_k2");
    if (!k1 || !k2) return null;
    const unklar = [null, "unknown", "unavailable", ""];
    if (unklar.includes(rawState(this._quelle, k1))) return null;
    if (unklar.includes(rawState(this._quelle, k2))) return null;
    const a = isOn(this._quelle, k1);
    const b = isOn(this._quelle, k2);
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
    if (this._animLoop) cancelAnimationFrame(this._animLoop);
    this._animTime = 0;
    this._animState.clear();
    
    const root = document.createElement("div");
    root.innerHTML = `
      <style>${this._css()}</style>
      <ha-card class="lhc">
        <div class="lhc-alert" id="alert" hidden></div>
        <div class="lhc-hint" id="hinweis" hidden></div>
        <div class="lhc-demo" id="demo-leiste" hidden></div>
        <div class="lhc-scene">${this._svg()}</div>
        <section class="lhc-switches" id="switches"></section>

        <div class="lhc-dialog" id="dialog" hidden>
          <div class="lhc-dialog-box" role="dialog" aria-modal="true">
            <div class="lhc-dialog-head">
              <span class="lhc-dialog-title" id="dlg-title">--</span>
              <button type="button" class="lhc-dialog-close" id="dlg-close"
                      aria-label="Schließen">&times;</button>
            </div>
            <div id="dlg-temp">
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
            <div id="dlg-actions"></div>
          </div>
        </div>
      </ha-card>
    `;
    this.shadowRoot.appendChild(root);
    this._buildDemo();
    this._buildDialog();
    this._buildKlicks();
    this._buildSwitches();
    this._startAnimationLoop();
  }

  _startAnimationLoop() {
    let lastTime = performance.now();
    
    const tick = (time) => {
      if (!this.isConnected) return;
      
      const deltaTime = (time - lastTime) / 1000; // in Sekunden
      lastTime = time;
      this._animTime += deltaTime;
      
      const sr = this.shadowRoot;
      if (!sr) {
        this._animLoop = requestAnimationFrame(tick);
        return;
      }

      // Flowdots animieren (stroke-dashoffset)
      this._animState.forEach((state, id) => {
        if (!state || state.type !== "flow") return;
        const el = sr.getElementById(id);
        if (!el) return;
        const cycle = this._animTime % 1.2;
        const progress = cycle / 1.2;
        const offset = state.reverse ? 44 * progress : -44 * progress;
        el.setAttribute("stroke-dashoffset", offset.toFixed(1));
      });

      // Bubbles animieren - neu vereinfacht
      const bubbleGroups = ["buf-bubbles", "dhw-bubbles"];
      bubbleGroups.forEach(groupId => {
        const group = sr.getElementById(groupId);
        if (!group) return;
        const bubbles = group.querySelectorAll("circle");
        bubbles.forEach((bubble, idx) => {
          // Blasen-Parametern berechnen (immer gleich basierend auf Index)
          let seed = idx + 42;
          const rnd = () => {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed / 2147483648;
          };
          const dur = 4 + rnd() * 4;
          const delay = idx * 0.3; // einfacher Delay basierend auf Index
          
          // Animation: Zeit seit Start
          const time = (this._animTime + delay) % dur;
          const prog = time / dur;
          
          // translateY: oben nach unten (-330px)
          const moveY = -330 * prog;
          
          // opacity: Kurve (sichtbar von 15% bis 85%)
          let op = 0;
          if (prog < 0.15) op = (prog / 0.15) * 0.4;
          else if (prog < 0.85) op = 0.4;
          else op = 0.4 * (1 - (prog - 0.85) / 0.15);
          
          bubble.setAttribute("transform", `translate(0,${moveY.toFixed(1)})`);
          bubble.setAttribute("opacity", op.toFixed(3));
        });
      });

      // Pulse/Glow animieren (opacity)
      this._animState.forEach((state, id) => {
        if (!state || state.type !== "pulse") return;
        const el = sr.getElementById(id);
        if (!el) return;
        const cycle = (this._animTime % state.duration) / state.duration;
        const opacity = cycle < 0.5 ? 1 - (cycle / 0.5) * 0.6 : 0.4 + ((cycle - 0.5) / 0.5) * 0.6;
        el.setAttribute("opacity", opacity.toFixed(2));
      });

      // Spin animieren (rotate)
      this._animState.forEach((state, id) => {
        if (!state || state.type !== "spin") return;
        const el = sr.getElementById(id);
        if (!el) return;
        const elapsed = this._animTime % state.duration;
        const progress = (elapsed / state.duration) * 360;
        el.setAttribute("transform", `rotate(${progress.toFixed(2)} 0 0)`);
      });

      this._animLoop = requestAnimationFrame(tick);
    };
    this._animLoop = requestAnimationFrame(tick);
  }

  /** Verdrahtet das Einstellfenster. */
  /** Baut die Bedienleiste des Demomodus. */
  _buildDemo() {
    const host = this.shadowRoot.getElementById("demo-leiste");
    if (!this._config.demo) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    host.hidden = false;

    const schalter = [
      ["power_state", "Wärmepumpe"],
      ["hk1_pump", "Pumpe HK1"],
      ["hk2_pump", "Pumpe HK2"],
      ["room_heater", "Heizstab Heizung"],
      ["dhw_heater", "Heizstab Warmwasser"],
      ["defrost", "Abtauung"],
      ["circulation_pump", "Zirkulation Status"],
      ["circ_switch", "Zirkulation Schalter"],
      ["dhw_force_state", "Aufheizen"],
      ["sterilization_state", "Legionellenschutz"],
    ];
    const regler = [
      ["pv_power", "PV Leistung", 0, 12000],
      ["outside_temp", "Außen", -20, 40],
      ["flow_temp", "Vorlauf", 15, 70],
      ["return_temp", "Rücklauf", 15, 70],
      ["buffer_temp", "Puffer", 15, 70],
      ["dhw_temp", "Warmwasser", 15, 70],
      ["hk1_water", "HK1 Wasser", 15, 60],
      ["hk2_water", "HK2 Wasser", 15, 60],
      ["compressor", "Verdichter", 0, 90],
      ["pump_flow", "Durchfluss", 0, 40],
    ];

    host.innerHTML = `
      <div class="lhc-demo-kopf">
        <span class="lhc-field-label">Demomodus</span>
        <span class="lhc-demo-hinweis">Erfundene Werte, die Anlage bleibt unberührt</span>
      </div>
      <div class="lhc-demo-reihe">
        ${schalter.map(([feld, text], i) => `<button type="button" class="lhc-demo-knopf" id="demo-s${i}" data-feld="${feld}">${escapeHtml(text)}</button>`).join("")}
        <button type="button" class="lhc-demo-knopf" id="demo-ventil">Ventil</button>
        <button type="button" class="lhc-demo-knopf" id="demo-sg">SG Ready</button>
        <button type="button" class="lhc-demo-knopf" id="demo-stoerung">Störung</button>
        <button type="button" class="lhc-demo-knopf" id="demo-zurueck">Zurücksetzen</button>
      </div>
      <div class="lhc-demo-regler">
        ${regler.map(([feld, text, lo, hi], i) => `
          <label class="lhc-demo-schieber">
            <span>${escapeHtml(text)} <b data-regler="${feld}">--</b></span>
            <input type="range" data-feld="${feld}" min="${lo}" max="${hi}" step="0.5">
          </label>`).join("")}
      </div>`;

    // Schalter: einfache Delegation
    host.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-feld]");
      if (!btn) return;
      const feld = btn.getAttribute("data-feld");
      const jetzt = this._demoLies(feld);
      const istAn = jetzt === "on" || parseFloat(jetzt) > 0;
      this._demoSetze(feld, istAn ? "off" : "on");
      this._syncDemo();
    });

    // Regler: einfach Input-Events
    host.addEventListener("input", (e) => {
      const inp = e.target.closest("input[data-feld]");
      if (!inp) return;
      const feld = inp.getAttribute("data-feld");
      this._demoSetze(feld, inp.value);
      this._syncDemo();
    });

    // Spezielle Buttons (Ventil, SG, etc.)
    this.shadowRoot.getElementById("demo-ventil").addEventListener("click", () => {
      this._demoSetze("three_way_valve", this._demoLies("three_way_valve") === "1" ? 0 : 1);
      this._syncDemo();
    });
    
    this.shadowRoot.getElementById("demo-sg").addEventListener("click", () => {
      const k1 = this._demoLies("sg_k1") === "on";
      const k2 = this._demoLies("sg_k2") === "on";
      const folge = [[false, false], [true, false], [false, true], [true, true]];
      const jetzt = folge.findIndex((f) => f[0] === k1 && f[1] === k2);
      const naechste = folge[(jetzt + 1) % folge.length];
      this._demoSetze("sg_k1", naechste[0] ? "on" : "off");
      this._demoSetze("sg_k2", naechste[1] ? "on" : "off");
      this._syncDemo();
    });
    
    this.shadowRoot.getElementById("demo-stoerung").addEventListener("click", () => {
      this._demoSetze("error", this._demoLies("error") === "0" ? "H76" : "0");
      this._syncDemo();
    });
    
    this.shadowRoot.getElementById("demo-zurueck").addEventListener("click", () => {
      this._demoAufbauen();
      this._buildDemo();
      this._render();
    });

    this._syncDemo();
  }


  _setupDemoHandlers() {
    if (!this._config.demo || !this._demo) return;
    const sr = this.shadowRoot;
    const demoLeiste = sr.getElementById("demo-leiste");
    if (!demoLeiste) return;
    
    demoLeiste.onclick = (e) => {
      const btn = e.target.closest("button[id^='demo-s']");
      if (!btn) return;
      
      const idx = parseInt(btn.id.replace("demo-s", ""));
      const schalter = [
        ["power_state"],
        ["hk1_pump"],
        ["hk2_pump"],
        ["room_heater"],
        ["dhw_heater"],
        ["defrost"],
        ["circulation_pump"],
        ["circ_switch"],
        ["dhw_force_state"],
        ["sterilization_state"],
      ];
      
      const feld = schalter[idx]?.[0];
      if (!feld) return;
      
      const aktuell = this._demoLies(feld);
      const aktuellistAn = aktuell === "on" || parseFloat(aktuell) > 0;
      const neu = aktuellistAn ? "off" : "on";
      this._demoSetze(feld, neu);
      // Warte kurz, bis _render() fertig ist, dann update die Klasse
      setTimeout(() => {
        const w = this._demoLies(feld);
        const istAn = w === "on" || parseFloat(w) > 0;
        btn.classList.toggle("is-on", istAn);
      }, 10);
    };
  }

  /** Haelt die Bedienleiste des Demomodus auf Stand. */
  _syncDemo() {
    if (!this._config.demo || !this._demo) return;
    const felder = ["pv_power","outside_temp","flow_temp","return_temp","buffer_temp","dhw_temp",
                    "hk1_water","hk2_water","compressor","pump_flow"];
    felder.forEach((feld, i) => {
      const el = this.shadowRoot.getElementById(`demo-r${i}`);
      const anzeige = this.shadowRoot.getElementById(`demo-r${i}-wert`);
      const wert = this._demoLies(feld);
      if (el && el.value !== wert) el.value = wert;
      if (anzeige) anzeige.textContent = wert;
    });
    const schalter = ["power_state","hk1_pump","hk2_pump","room_heater","dhw_heater",
                      "defrost","circulation_pump","circ_switch","dhw_force_state","sterilization_state"];
    schalter.forEach((feld, i) => {
      const el = this.shadowRoot.getElementById(`demo-s${i}`);
      if (!el) return;
      const w = this._demoLies(feld);
      el.classList.toggle("is-on", w === "on" || parseFloat(w) > 0);
    });
  }

  _buildDialog() {
    const sr = this.shadowRoot;
    // Ausdruecklich schliessen, nicht nur auf das Attribut im Markup vertrauen.
    sr.getElementById("dialog").hidden = true;
    this._dialogKey = null;
    const range = sr.getElementById("dlg-range");
    const out = sr.getElementById("dlg-value");

    // Die Entitaet wird beim Aufruf festgehalten. Sonst geht der Wert
    // verloren, wenn das Fenster vor dem Absenden geschlossen wird.
    const schreiben = (wert, entitaet) => {
      const id = entitaet || this._e(this._dialogKey);
      if (!id) return;
      this._offen = null;
      if (this._offenTimer) {
        clearTimeout(this._offenTimer);
        this._offenTimer = null;
      }
      this._halte("dialog", wert);
      this._quelle.callService(id.split(".")[0], "set_value", {
        entity_id: id,
        value: wert,
      });
    };
    this._schreibeDialog = schreiben;
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
      // Offener Wert, damit er auch ohne Aenderungsereignis ankommt.
      this._offen = {
        wert: parseFloat(range.value),
        entitaet: this._e(this._dialogKey),
      };
      if (this._offenTimer) clearTimeout(this._offenTimer);
      this._offenTimer = setTimeout(() => {
        if (this._offen) schreiben(this._offen.wert, this._offen.entitaet);
      }, 600);
    });
    range.addEventListener("change", () => {
      this._dialogZieht = false;
      schreiben(parseFloat(range.value), this._e(this._dialogKey));
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
    const fenster = [
      {
        gruppe: "unit-group",
        titel: "Wärmepumpe",
        aktionen: [
          { feld: "power_state", status: "heatpump_state", typ: "schalter", an: "Läuft, ausschalten", aus: "Einschalten" },
          { feld: "force_defrost", status: "defrost", typ: "schalter", an: "Abtauen läuft, beenden", aus: "Abtauen erzwingen" },
          { feld: "powerful_mode", typ: "auswahl", titel: "Turbomodus", texte: POWERFUL_LABELS },
          { feld: "quiet_mode", typ: "auswahl", titel: "Leisemodus", texte: QUIET_LABELS },
          { feld: "mode_select", typ: "auswahl", titel: "Betriebsart", texte: MODE_LABELS },
        ],
      },
      {
        gruppe: "buffer-group",
        beschriftung: "label_buffer",
        aktionen: [
          { feld: "buffer_switch", status: "buffer_installed", typ: "schalter", an: "Pufferbetrieb ist an, ausschalten", aus: "Pufferbetrieb einschalten" },
          { feld: "room_heater_switch", status: "room_heater", typ: "schalter", an: "Heizstab Heizung an, ausschalten", aus: "Heizstab Heizung einschalten" },
        ],
      },
      {
        gruppe: "dhw-group",
        feld: "dhw_setpoint",
        beschriftung: "label_dhw",
        aktionen: [
          { feld: "dhw_force", status: "dhw_force_state", typ: "schalter", an: "Aufheizen läuft, beenden", aus: "Einmalig aufheizen" },
          { feld: "force_sterilization", status: "sterilization_state", typ: "schalter", an: "Legionellenschutz läuft, beenden", aus: "Legionellenschutz starten" },
          { feld: "dhw_heater_switch", status: "dhw_heater", typ: "schalter", an: "Heizstab ist an, ausschalten", aus: "Heizstab einschalten" },
        ],
      },
      {
        gruppe: "hk1-group",
        feld: "hk1_setpoint",
        beschriftung: "label_hk1",
        anzeige: "hk1_water_target",
        aktionen: [
          { feld: "zones_select", typ: "zone", nummer: 1 },
          { feld: "hk1_switch", typ: "schalter", an: "Heizkreis ist an, ausschalten", aus: "Heizkreis einschalten" },
        ],
      },
      {
        gruppe: "hk2-group",
        feld: "hk2_setpoint",
        beschriftung: "label_hk2",
        anzeige: "hk2_water_target",
        aktionen: [
          { feld: "zones_select", typ: "zone", nummer: 2 },
          { feld: "hk2_switch", typ: "schalter", an: "Heizkreis ist an, ausschalten", aus: "Heizkreis einschalten" },
        ],
      },
    ];

    fenster.forEach((f) => {
      const el = sr.getElementById(f.gruppe);
      if (!el) return;
      // Anklickbar, sobald es dort etwas zu bedienen gibt.
      const hatTemperatur = Boolean(f.feld && this._e(f.feld));
      const hatAktion = (f.aktionen || []).some((a) => this._e(a.feld));
      if (!hatTemperatur && !hatAktion) return;
      el.classList.add("klickbar");
      el.addEventListener("click", () => this._oeffneDialog(f));
    });

    // Zirkulations-Pumpe: Direkter Schalter ohne Dialog
    const zirkEl = sr.getElementById("zirkulation-group");
    if (zirkEl && this._e("circ_switch")) {
      zirkEl.classList.add("klickbar");
      zirkEl.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._schaltCircSwitch();
      });
    }
  }

  _schaltCircSwitch() {
    const switchId = this._e("circ_switch");
    if (!switchId) return;
    
    const state = this._hass.states[switchId];
    const currentState = state ? state.state : "off";
    const newState = currentState === "on" ? "off" : "on";
    
    this._hass.callService("homeassistant", "turn_" + newState, {
      entity_id: switchId,
    });
  }

  _oeffneDialog(f) {
    const sr = this.shadowRoot;
    const tempId = f.feld ? this._e(f.feld) : "";
    this._dialogKey = tempId && this._quelle.states[tempId] ? f.feld : null;
    this._dialogAnzeige = f.anzeige || null;
    this._dialogAktionen = (f.aktionen || []).filter((a) => this._e(a.feld));
    if (this._gehalten) delete this._gehalten["dialog"];

    sr.getElementById("dlg-title").textContent =
      f.titel || this._config[f.beschriftung] || "Einstellen";
    sr.getElementById("dlg-temp").hidden = !this._dialogKey;
    this._baueAktionen();
    sr.getElementById("dialog").hidden = false;
    this._syncDialog();
    this._syncDemo();
  }

  /**
   * Ermittelt den Zustand eines Bedienelements.
   * Die Statusquelle hat Vorrang, denn ein Schaltbefehl meldet seinen
   * Zustand nicht immer zurueck. Liefert sie nichts, gilt der Schalter.
   * Rueckgabe null, wenn beides unbekannt ist.
   */
  _zustand(a) {
    const pruefe = (feld) => {
      if (!feld) return null;
      const id = this._e(feld);
      if (!id) return null;
      const roh = rawState(this._quelle, id);
      if (roh === null || roh === "unknown" || roh === "unavailable") return null;
      return isOn(this._quelle, id);
    };
    // Nur gelesene Werte, nichts wird angenommen.
    // Zuerst das Rueckmeldetopic, danach die Schaltentitaet.
    const ausStatus = pruefe(a.status);
    if (ausStatus !== null) return ausStatus;
    return pruefe(a.feld);
  }

  /** Baut die Bedienelemente des offenen Fensters auf. */
  _baueAktionen() {
    const host = this.shadowRoot.getElementById("dlg-actions");
    const liste = this._dialogAktionen || [];
    host.innerHTML = liste
      .map((a, i) =>
        a.typ === "auswahl"
          ? `<label class="lhc-dialog-select">
               <span class="lhc-field-label">${escapeHtml(a.titel)}</span>
               <select id="dlg-a${i}"></select>
             </label>`

          : `<button type="button" class="lhc-dialog-action" id="dlg-a${i}">--</button>`
      )
      .join("");

    liste.forEach((a, i) => {
      const el = this.shadowRoot.getElementById(`dlg-a${i}`);
      if (!el) return;
      if (a.typ === "auswahl") {
        el.addEventListener("change", () => {
          const id = this._e(a.feld);
          this._quelle.callService("select", "select_option", {
            entity_id: id,
            option: el.value,
          });
        });
      } else if (a.typ === "zone") {
        el.addEventListener("click", () => this._zoneSchalten(a.nummer));
      } else {
        el.addEventListener("click", () => {
          const id = this._e(a.feld);
          const an = this._zustand(a);
          this._quelle.callService("homeassistant", an === true ? "turn_off" : "turn_on", {
            entity_id: id,
          });
        });
      }
    });
  }

  /** Haelt die Bedienelemente auf dem aktuellen Stand. */
  _syncAktionen() {
    const liste = this._dialogAktionen || [];
    // Gruen bedeutet eingeschaltet, rot ausgeschaltet, grau unbekannt.
    const farbeSetzen = (el, zustand) => {
      el.classList.toggle("is-an", zustand === true);
      el.classList.toggle("is-aus", zustand === false);
    };
    liste.forEach((a, i) => {
      const el = this.shadowRoot.getElementById(`dlg-a${i}`);
      const st = this._quelle.states[this._e(a.feld)];
      if (!el) return;
      if (a.typ !== "zone" && !st) return;
      if (a.typ === "auswahl") {
        const optionen = st.attributes.options || [];
        const kennung = optionen.join("|");
        if (el.dataset.kennung !== kennung) {
          el.innerHTML = optionen
            .map(
              (o) =>
                `<option value="${escapeHtml(o)}">${escapeHtml(
                  a.texte[o] !== undefined ? a.texte[o] : o
                )}</option>`
            )
            .join("");
          el.dataset.kennung = kennung;
        }
        if (el.value !== st.state) el.value = st.state;
      } else if (a.typ === "zone") {
        const aktiv = this._zoneAktiv(a.nummer);
        const andere = this._zoneAktiv(a.nummer === 1 ? 2 : 1);
        el.textContent =
          aktiv === null
            ? "Zonen unbekannt"
            : aktiv
            ? "Heizkreis abschalten"
            : "Heizkreis zuschalten";
        // Der letzte verbleibende Kreis laesst sich nicht abschalten.
        el.disabled = aktiv === true && andere !== true;
        if (el.disabled) el.textContent = "Einziger aktiver Heizkreis";
        farbeSetzen(el, el.disabled ? null : aktiv);
      } else {
        const an = this._zustand(a);
        el.textContent = an === null ? `${a.aus} (Zustand unbekannt)` : an ? a.an : a.aus;
        farbeSetzen(el, an);
      }
    });
  }

  _schliesseDialog() {
    // Noch nicht abgesendeten Wert vor dem Schliessen nachreichen.
    if (this._offen && this._schreibeDialog) {
      this._schreibeDialog(this._offen.wert, this._offen.entitaet);
    }
    this._offen = null;
    if (this._offenTimer) {
      clearTimeout(this._offenTimer);
      this._offenTimer = null;
    }
    this._dialogKey = null;
    this._dialogAnzeige = null;
    this._dialogAktionen = null;
    this._dialogZieht = false;
    this.shadowRoot.getElementById("dialog").hidden = true;
  }

  /** Haelt das offene Fenster auf dem aktuellen Stand. */
  _syncDialog() {
    if (this.shadowRoot.getElementById("dialog").hidden) return;
    this._syncAktionen();
    if (!this._dialogKey) return;
    const sr = this.shadowRoot;
    const st = this._quelle.states[this._e(this._dialogKey)];
    if (!st) return this._schliesseDialog();
    const range = sr.getElementById("dlg-range");

    // Angezeigt wird der tatsaechliche Sollwert des Kreises, geschrieben
    // wird weiterhin auf die stellbare Entitaet. Gleiche Trennung wie
    // bei den Schiebereglern unter dem Schaubild.
    const anzeigeId = this._dialogAnzeige ? this._e(this._dialogAnzeige) : "";
    const stAnzeige = anzeigeId ? this._quelle.states[anzeigeId] : null;
    const quelle =
      stAnzeige && !Number.isNaN(parseFloat(stAnzeige.state)) ? stAnzeige : st;
    const wert = parseFloat(quelle.state);
    if (Number.isNaN(wert)) return;
    let lo = Number(st.attributes.min !== undefined ? st.attributes.min : 15);
    let hi = Number(st.attributes.max !== undefined ? st.attributes.max : 65);
    if (quelle !== st) {
      lo = Math.min(lo, Math.floor(wert) - 10);
      hi = Math.max(hi, Math.ceil(wert) + 10);
    }
    if (wert < lo) lo = Math.floor(wert);
    if (wert > hi) hi = Math.ceil(wert);
    range.min = lo;
    range.max = hi;
    range.step = Number(st.attributes.step !== undefined ? st.attributes.step : 1);
    sr.getElementById("dlg-min").textContent = `${lo} °C`;
    sr.getElementById("dlg-max").textContent = `${hi} °C`;
    if (this._dialogZieht) return;
    const gehalten = this._gehaltenerWert("dialog", wert);
    const zeigen = gehalten !== null ? gehalten : wert;
    if (zeigen < Number(range.min)) range.min = Math.floor(zeigen);
    if (zeigen > Number(range.max)) range.max = Math.ceil(zeigen);
    range.value = zeigen;
    sr.getElementById("dlg-value").textContent = `${zeigen} °C`;
  }

  _buildSwitches() {
    const host = this.shadowRoot.getElementById("switches");
    if (this._config.show_switches === false) {
      host.hidden = true;
      return;
    }
    const hatHeizung = Boolean(this._e("heating_switch"));
    if (!hatHeizung) {
      host.hidden = true;
      return;
    }

    host.innerHTML = `
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
        const on = isOn(this._quelle, entityId);
        this._quelle.callService("homeassistant", on ? "turn_off" : "turn_on", {
          entity_id: entityId,
        });
      });
    }
  }

  /* -------------------- Szene -------------------- */

  _svg() {
    const two = this._config.fan_count === 2;
    // Luefter uebereinander, wie beim echten Aussengeraet.
    const fans = two
      ? `${this._fan("fan1", 190, 360, 96)}${this._fan("fan2", 190, 608, 96)}`
      : this._fan("fan1", 190, 480, 120);

    const F = L.FLOW_Y;
    const R = L.RET_Y;
    const SF = L.SEC_FLOW;
    const SR = L.SEC_RET;
    // Jede Sekundaerleitung endet an ihrem letzten Anschluss:
    // der Vorlauf am letzten Abgang, der Ruecklauf am letzten Zulauf.
    const SEC_VL_ENDE = this._config.hk_count === 2 ? 1160 : 870;
    const SEC_RL_ENDE = this._config.hk_count === 2 ? 1280 : 990;
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
      <!-- Zwei Abschnitte je Leitung: bis zum Ventil und dahinter.
           Der Teil hinter dem Ventil fuehrt nur zum Warmwasserspeicher. -->
      <path class="flowdots" id="dots-vl-a" d="M340 ${F} H 630"/>
      <path class="flowdots" id="dots-vl-b" d="M630 ${F} H 1525"/>
      <path class="flowdots rev" id="dots-rl-a" d="M630 ${R} H 340"/>
      <path class="flowdots rev" id="dots-rl-b" d="M1525 ${R} H 630"/>

      <path class="pipe-shell" d="M630 ${F} V ${T} M630 ${B} V ${R}"/>
      <path class="pipe" id="pipe-buf-in" d="M630 ${F} V ${T}"/>
      <path class="pipe" id="pipe-buf-out" d="M630 ${B} V ${R}"/>
      <path class="flowdots" id="dots-buf" d="M630 ${F} V ${T}"/>
      <path class="flowdots" id="dots-buf2" d="M630 ${B} V ${R}"/>

      <!-- Sekundaerkreis: vom Puffer zu den Heizkreisen und zurueck -->
      <path class="pipe-shell" d="M730 ${SF} H ${SEC_VL_ENDE} M730 ${SR} H ${SEC_RL_ENDE}"/>
      <path class="pipe" id="pipe-sec-flow" d="M730 ${SF} H ${SEC_VL_ENDE}"/>
      <path class="pipe" id="pipe-sec-ret" d="M730 ${SR} H ${SEC_RL_ENDE}"/>
      <!-- Auch hier abschnittsweise: der Weg zum zweiten Heizkreis
           fuehrt nur Wasser, wenn dessen Pumpe laeuft. -->
      <path class="flowdots" id="dots-sf-a" d="M730 ${SF} H 870"/>
      <path class="flowdots rev" id="dots-sr-a" d="M730 ${SR} H 990"/>
      ${
        hk2
          ? `<path class="flowdots" id="dots-sf-b" d="M870 ${SF} H 1160"/>
             <path class="flowdots rev" id="dots-sr-b" d="M990 ${SR} H 1280"/>`
          : ""
      }

      <path class="pipe-shell" d="M1525 ${F} V ${T} M1525 ${B} V ${R}"/>
      <path class="pipe" id="pipe-dhw-in" d="M1525 ${F} V ${T}"/>
      <path class="pipe" id="pipe-dhw-out" d="M1525 ${B} V ${R}"/>
      <path class="flowdots" id="dots-dhw" d="M1525 ${F} V ${T}"/>
      <path class="flowdots" id="dots-dhw2" d="M1525 ${B} V ${R}"/>

      <!-- Außengerät -->
      <g class="unit" id="unit-group">
        <rect x="40" y="${L.UNIT_TOP}" width="300" height="640" rx="16"
              fill="url(#casing)" stroke="#33415A" stroke-width="2"/>
        <rect id="unit-glow" x="40" y="${L.UNIT_TOP}" width="300" height="640" rx="16"
              fill="none" stroke="#E0762E" stroke-width="2" opacity="0"/>
        <rect x="40" y="${L.UNIT_TOP}" width="300" height="640" rx="16" fill="url(#glass)"/>

        <circle cx="66" cy="156" r="9" id="power-led" fill="#2C3646"/>
        <text class="unit-label" x="86" y="161">Betrieb</text>
        <g id="defrost-badge" class="badge" transform="translate(250 96)">
          <rect x="-62" y="-16" width="124" height="32" rx="16"
                fill="#0E2A4A" stroke="#3E9BE0" stroke-width="1.5"/>
          <text class="badge-t" x="0" y="5" text-anchor="middle">Abtauung</text>
        </g>

        <text class="unit-label" x="115" y="200" text-anchor="middle">Außen</text>
        <text class="unit-value" id="outside-v" x="115" y="228"
              text-anchor="middle">--</text>
        <text class="unit-label" x="265" y="200" text-anchor="middle">Verdichter</text>
        <text class="unit-value" id="comp-v" x="265" y="228" text-anchor="middle">--</text>

        ${fans}

      </g>

      <!-- SG Ready, PV Leistung, Leistung, Verbrauch - zentriert zwischen VL und RL -->
      <g id="sg-group" opacity="0">
        <text class="sg-label" x="445" y="${F + 60}" text-anchor="middle">SG Ready</text>
        <g transform="translate(445 ${F + 90})">
          <rect x="-68" y="0" width="32" height="11" rx="5.5" id="sg-seg-1" fill="#3A4658"/>
          <rect x="-34" y="0" width="32" height="11" rx="5.5" id="sg-seg-2" fill="#3A4658"/>
          <rect x="2" y="0" width="32" height="11" rx="5.5" id="sg-seg-3" fill="#3A4658"/>
          <rect x="36" y="0" width="32" height="11" rx="5.5" id="sg-seg-4" fill="#3A4658"/>
        </g>
        <text class="sg-value" id="sg-text" x="445" y="${F + 130}"
              text-anchor="middle">--</text>
        <line x1="380" y1="${F + 150}" x2="510" y2="${F + 150}" stroke="#33415A" stroke-width="0.5"/>
      </g>

      <!-- PV Leistung -->
      <g id="pv-group" opacity="0">
        <text class="sg-label" x="445" y="${F + 190}" text-anchor="middle">PV Leistung</text>
        <text class="pv-value" id="pv-v" x="445" y="${F + 228}"
              text-anchor="middle">--</text>
        <line x1="380" y1="${F + 245}" x2="510" y2="${F + 245}" stroke="#33415A" stroke-width="0.5"/>
      </g>

      <!-- Vorlauf am Ausgang, Rücklauf am Eingang -->
      <text class="vl-value" id="unit-flow-v" x="410" y="${F - 20}"
            text-anchor="middle">--</text>
      <text class="rl-value" id="unit-ret-v" x="410" y="${R + 40}"
            text-anchor="middle">--</text>

      <!-- Stromverbrauch der Wärmepumpe, aus dem Shelly PM -->
      <g id="verbrauch-group" opacity="0">
        <text class="sg-label" x="445" y="${F + 285}" text-anchor="middle">Leistung</text>
        <text class="verbrauch-v" id="power-now-v" x="445" y="${F + 323}"
              text-anchor="middle">--</text>
        <line x1="380" y1="${F + 340}" x2="510" y2="${F + 340}" stroke="#33415A" stroke-width="0.5"/>
        <text class="sg-label" id="energy-label" x="445" y="${F + 380}"
              text-anchor="middle">--</text>
        <text class="unit-value" id="energy-today-v" x="445" y="${F + 420}"
              text-anchor="middle">--</text>
      </g>

      <!-- Primärpumpe -->
      <g>
        <text class="value-s" id="pump-v" x="640" y="722" text-anchor="start">--</text>
        <text class="value-s" id="flow-v" x="640" y="744" text-anchor="start">--</text>
        <g transform="translate(580 ${R})">
          <circle r="26" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
          <g class="rotor" id="pump-rotor">
            <path d="M0 -15 L5 -4 L16 0 L5 4 L0 15 L-5 4 L-16 0 L-5 -4 Z" fill="#55637A"/>
            <circle r="4" fill="#0D1219"/>
          </g>
        </g>
        <text class="cap-s" x="580" y="${R + 40}" text-anchor="middle">Pumpe</text>
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
        <text class="cap" x="635" y="${F - 60}" text-anchor="middle">${escapeHtml(
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
        <text class="cap-s" x="1390" y="${R + 40}" text-anchor="middle">Druck</text>
      </g>

      ${this._circuit(1, 820, 1040, 870, 990)}
      ${hk2 ? this._circuit(2, 1110, 1330, 1160, 1280) : ""}

      <!-- Dreiwegeventil an der Abzweigung: hier teilt sich der Vorlauf
           nach unten in den Puffer oder weiter nach rechts zum Speicher. -->
      <g>
        <circle cx="630" cy="${F}" r="22" fill="#0D1219"
                stroke="#33415A" stroke-width="2"/>
        <!-- Der Pfeil zeigt, wohin das Ventil geoeffnet ist. -->
        <g id="valve-arrow-down" opacity="0">
          <path id="valve-down-line" d="M630 ${F - 12} V ${F + 4}"
                stroke="${NEUTRAL}" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path id="valve-down-head" d="M622 ${F + 2} L 630 ${F + 14} L 638 ${F + 2} Z"
                fill="${NEUTRAL}"/>
        </g>
        <g id="valve-arrow-right" opacity="0">
          <path id="valve-right-line" d="M${630 - 12} ${F} H ${630 + 4}"
                stroke="${NEUTRAL}" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path id="valve-right-head" d="M${630 + 2} ${F - 8} L ${630 + 14} ${F} L ${630 + 2} ${F + 8} Z"
                fill="${NEUTRAL}"/>
        </g>
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
        <text class="cap" x="1525" y="${F - 60}" text-anchor="middle">${escapeHtml(
          this._config.label_dhw
        )}</text>
      </g>

      <!-- Zirkulationskreis am Warmwasserspeicher -->
      <g id="zirkulation-group" opacity="0">
        <path class="pipe-shell" fill="none" d="M1440 320 H 1370 V 560 H 1440"/>
        <path class="pipe" id="pipe-zirk" fill="none" d="M1440 320 H 1370 V 560 H 1440"/>
        <path class="flowdots" id="dots-zirk" fill="none" d="M1440 320 H 1370 V 560 H 1440"/>
        <g transform="translate(1370 360)">
          <circle r="24" fill="#0D1219" stroke="#33415A" stroke-width="2"/>
          <g class="rotor" id="zirk-rotor">
            <path d="M0 -13 L4 -3 L14 0 L4 3 L0 13 L-4 3 L-14 0 L-4 -3 Z" fill="#55637A"/>
            <circle r="4" fill="#0D1219"/>
          </g>
        </g>
        <text class="cap-s" x="1370" y="310" text-anchor="middle">Zirkulation</text>
        <text class="value-s" id="zirk-v" x="1370" y="330" text-anchor="middle">--</text>
      </g>


    </svg>`;
  }

  _circuit(n, x1, x2, dropX, backX) {
    const F = L.FLOW_Y;
    const R = L.RET_Y;
    const RT = L.RAD_TOP;
    const RB = L.RAD_BOTTOM;
    const mid = (x1 + x2) / 2;
    // Die Heizkreise haengen am Puffer, nicht an der Waermepumpe.
    const drop = `M${dropX} ${L.SEC_FLOW} V ${RT}`;
    // Die Pumpe sitzt in der Mitte der Stichleitung, rechnerisch aus
    // Vorlauf und Heizkoerper. So verrutscht sie bei Rasteraenderungen nicht.
    const pumpY = Math.round((L.SEC_FLOW + RT) / 2);
    const back = `M${backX} ${RB} V ${L.SEC_RET}`;

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
        <path class="flowdots" id="dots-hk${n}b" d="${back}"/>

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

        <text class="cap" x="${mid}" y="${F - 60}" text-anchor="middle">${escapeHtml(
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
    let zufall = 1;
    const naechste = () => {
      zufall = (zufall * 1103515245 + 12345) % 2147483648;
      return zufall / 2147483648;
    };
    let kreise = "";
    for (let i = 0; i < n; i++) {
      const cx = Math.round(x + 10 + naechste() * (w - 20));
      const r = (1.6 + naechste() * 2.4).toFixed(1);
      naechste(); // dauer (wird in loop berechnet)
      naechste(); // start (wird in loop berechnet)
      const bubbleId = `${id}-bubble-${i}`;
      kreise += `<circle class="bubble" id="${bubbleId}" cx="${cx}" cy="${y + h - 4}" r="${r}"/>`;
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
    const hass = this._quelle;
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
    const zeige = (id, sichtbar) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("opacity", sichtbar ? "1" : "0");
    };
    const abzeichen = (id, aktiv) => {
      const el = sr.getElementById(id);
      if (!el) return;
      el.classList.toggle("is-on", aktiv);
      el.classList.toggle("is-pulsing", aktiv && animate);
      if (aktiv && animate) {
        this._animState.set(id, { type: "pulse", duration: 2.2 });
      } else {
        this._animState.delete(id);
      }
    };
    // Schaltet die Laufstriche eines Leitungsabschnitts.
    // Die laufenden Striche tragen die Temperatur des Wassers, das
    // dort gerade fliesst. Animation läuft via requestAnimationFrame.
    const stroemt = (ids, an, farbe) => {
      ids.forEach((id) => {
        const el = sr.getElementById(id);
        if (!el) return;
        const aktiv = animate && laeuft && an === true;
        el.classList.toggle("is-on", aktiv);
        if (farbe) el.style.stroke = farbe;
        if (aktiv) {
          const isRev = el.classList.contains("rev");
          this._animState.set(id, { type: "flow", reverse: isRev });
        } else {
          this._animState.delete(id);
          el.setAttribute("stroke-dashoffset", "0");
        }
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
      hinweis.hidden = gefunden > 0 || this._config.demo === true;
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

    // Meldet die Waermepumpe ausdruecklich aus, steht alles still.
    // Bei unbekanntem Zustand wird nichts gesperrt, sonst waere die
    // Karte tot, nur weil ein Topic fehlt.
    const anAus = (() => {
      const ausStatus = (feld) => {
        const id = this._e(feld);
        if (!id) return null;
        const roh = rawState(hass, id);
        if (roh === null || roh === "unknown" || roh === "unavailable") return null;
        return isOn(hass, id);
      };
      const ausTopic = ausStatus("heatpump_state");
      return ausTopic !== null ? ausTopic : ausStatus("power_state");
    })();
    const laeuft = anAus !== false;
    const led = sr.getElementById("power-led");
    if (led) {
      led.setAttribute("fill", anAus === true ? "#46C07A" : "#2C3646");
      led.classList.toggle("is-on", anAus === true);
    }

    this._spin("fan1", numState(hass, this._e("fan1_rpm")), "fan1-rpm", "U/min", 0, laeuft);
    if (this._config.fan_count === 2) {
      this._spin("fan2", numState(hass, this._e("fan2_rpm")), "fan2-rpm", "U/min", 0, laeuft);
    }
    abzeichen("defrost-badge", isOn(hass, this._e("defrost")) === true);
    const glow = sr.getElementById("unit-glow");
    if (glow) {
      const glowAn = animate && laeuft && comp !== null && comp > 0;
      glow.classList.toggle("is-on", glowAn);
      if (glowAn) {
        this._animState.set("unit-glow", { type: "pulse", duration: 2.6 });
      } else {
        this._animState.delete("unit-glow");
        glow.setAttribute("opacity", "0.12");
      }
    }

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
          // Das zutreffende Segment wird hoeher und leuchtet, die
          // uebrigen bleiben flach und gedaempft.
          seg.setAttribute("fill", aktiv ? farbe : "#3A4658");
          seg.setAttribute("height", aktiv ? "17" : "11");
          seg.setAttribute("y", aktiv ? "-3" : "0");
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
    // Die Beschriftung sagt, was der Wert wirklich ist. Eigene Angabe
    // hat Vorrang, sonst entscheidet der tatsaechliche Rechenweg.
    const tagesWert = energieAnzeige !== null && energieAnzeige !== energie;
    set(
      "energy-label",
      this._config.label_energy
        ? this._config.label_energy
        : tagesWert
        ? "Verbrauch heute"
        : "Zählerstand gesamt"
    );

    /* Zirkulationspumpe */
    const zirkId = this._e("circulation_pump");
    const zirkAn = isOn(hass, zirkId) === true;
    zeige("zirkulation-group", Boolean(zirkId) && hass.states[zirkId] !== undefined);
    set("zirk-v", !zirkId ? "--" : zirkAn ? "läuft" : "aus");
    const zirkRotor = sr.getElementById("zirk-rotor");
    if (zirkRotor) {
      zirkRotor.classList.toggle("is-still", !zirkAn);
      if (zirkAn && animate && laeuft) {
        this._animState.set("zirk-rotor", { type: "spin", duration: PUMP_SECONDS });
      } else {
        this._animState.delete("zirk-rotor");
      }
    }

    /* Leistung der Photovoltaik */
    const pv = numState(hass, this._e("pv_power"));
    zeige("pv-group", pv !== null);
    set(
      "pv-v",
      pv === null
        ? "--"
        : Math.abs(pv) >= 1000
        ? `${fmt(pv / 1000, 2)} kW`
        : `${fmt(pv, 0)} W`
    );

    /* Temperaturen und Leitungsfarben */
    const flow = numState(hass, this._e("flow_temp"));
    const ret = numState(hass, this._e("return_temp"));
    const buf = numState(hass, this._e("buffer_temp"));
    const dhw = numState(hass, this._e("dhw_temp"));

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
    this._spin("pump-rotor", pumpRpm, "pump-v", "U/min", PUMP_SECONDS, laeuft);
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
    // Wohin gerade geladen wird. Das Dreiwegeventil ist die verlaessliche
    // Quelle. Fehlt es, hilft die Betriebsart weiter: Wert 3 heisst
    // "Nur Warmwasser". Ohne beides gilt Heizen, sonst laufen beide
    // Stichleitungen gleichzeitig.
    let zuWarmwasser;
    if (valveNum !== null) {
      zuWarmwasser = valveNum > 0;
    } else {
      const betriebsart = numState(hass, this._e("operating_mode"));
      zuWarmwasser = betriebsart === 3;
    }
    let valveText = "--";
    if (valveRoh !== null && VALVE_LABELS[valveRoh] !== undefined) {
      valveText = VALVE_LABELS[valveRoh];
    } else if (valveNum !== null) {
      valveText = zuWarmwasser ? "Warmwasser" : "Heizung";
    }
    set("valve-v", valveText);
    // Sichtbar ist nur der Pfeil in die geoeffnete Richtung.
    const bekannt = valveNum !== null;
    zeige("valve-arrow-down", bekannt && !zuWarmwasser);
    zeige("valve-arrow-right", bekannt && zuWarmwasser);
    const pfeilfarbe = col(flow);
    ["valve-down-line", "valve-right-line"].forEach((id) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("stroke", pfeilfarbe);
    });
    ["valve-down-head", "valve-right-head"].forEach((id) => {
      const el = sr.getElementById(id);
      if (el) el.setAttribute("fill", pfeilfarbe);
    });

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
    // Der gesamte Sekundaerkreis fuehrt Pufferwasser. Damit die Farbe
    // an den Verbindungsstellen nicht springt, tragen Fallrohr,
    // Steigrohr und die waagerechten Leitungen denselben Wert.
    const hk1Laeuft = this._circuitUpdate(1, col, animate, buf, laeuft);
    const hk2Laeuft =
      this._config.hk_count === 2
        ? this._circuitUpdate(2, col, animate, buf, laeuft)
        : false;

    // Der Sekundaerkreis wird bewegt, sobald eine Kreispumpe foerdert.
    // Seine Waerme kommt aus dem Puffer, nicht aus der Waermepumpe.
    const sekundaer = hk1Laeuft || hk2Laeuft;
    // Der Abschnitt zum zweiten Heizkreis nur, wenn dessen Pumpe laeuft.
    stroemt(["dots-sf-a"], sekundaer, col(buf));
    stroemt(["dots-sr-a"], sekundaer, col(buf));
    stroemt(["dots-sf-b"], hk2Laeuft, col(buf));
    stroemt(["dots-sr-b"], hk2Laeuft, col(buf));

    /* Durchflussanimation */
    // Der Primaerkreis foerdert, wenn Pumpe oder Durchfluss das melden.
    // Ohne diese Werte bewegt sich nichts, es wird nichts angenommen.
    const primaer =
      (pumpRpm !== null && pumpRpm > 0) || (flowRate !== null && flowRate > 0);
    // Jeder Abschnitt einzeln, abhaengig nur vom eigenen Kreis.
    // Vor dem Ventil fliesst immer, dahinter nur bei Warmwasserladung.
    stroemt(["dots-vl-a"], primaer, col(flow));
    stroemt(["dots-vl-b"], primaer && zuWarmwasser, col(flow));
    stroemt(["dots-rl-a"], primaer, col(ret));
    stroemt(["dots-rl-b"], primaer && zuWarmwasser, col(ret));
    stroemt(["dots-buf"], primaer && !zuWarmwasser, col(flow));
    stroemt(["dots-buf2"], primaer && !zuWarmwasser, col(ret));
    stroemt(["dots-dhw"], primaer && zuWarmwasser, col(flow));
    stroemt(["dots-dhw2"], primaer && zuWarmwasser, col(ret));
    stroemt(["dots-zirk"], zirkAn, col(dhw));

    // Blasen: je waermer der Speicher, desto mehr steigen auf.
    const blasen = (id, wert) => {
      const g = sr.getElementById(id);
      if (!g || !g.children) return;
      const anteil =
        wert === null ? 0 : clamp((wert - min) / ((max - min) || 1), 0, 1);
      const sichtbar = animate && laeuft ? Math.round(anteil * BUBBLE_COUNT) : 0;
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
    this._syncDialog();
  }

  _circuitUpdate(n, col, animate, buf, laeuft) {
    const hass = this._quelle;
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
      const rotorId = `hk${n}-rotor`;
      if (pumpOn && animate && laeuft) {
        this._animState.set(rotorId, { type: "spin", duration: PUMP_SECONDS });
      } else {
        this._animState.delete(rotorId);
      }
    }
    set(`hk${n}-pump-v`, pumpOn ? "läuft" : "aus");

    // Die beiden Leitungen dieses Heizkreises laufen nur mit seiner Pumpe.
    [`dots-hk${n}`, `dots-hk${n}b`].forEach((id, i) => {
      const el = sr.getElementById(id);
      if (!el) return;
      const aktiv = animate && laeuft && pumpOn;
      el.classList.toggle("is-on", aktiv);
      // Beide Richtungen tragen die Puffertemperatur, wie die
      // waagerechten Leitungen, an die sie anschliessen.
      el.style.stroke = col(buf);
      if (aktiv) {
        this._animState.set(id, { type: "flow", reverse: false });
      } else {
        this._animState.delete(id);
        el.setAttribute("stroke-dashoffset", "0");
      }
    });


    return pumpOn;
  }

  /**
   * Dreht einen Rotor.
   * Ohne festeDauer richtet sich das Tempo nach der Drehzahl, das
   * passt zu den Lueftern. Pumpen bekommen eine feste, ruhige Dauer,
   * denn dort soll nur erkennbar sein, dass sie ueberhaupt foerdern.
   */
  _spin(rotorId, rpm, labelId, unit, festeDauer, erlaubt) {
    const label = this.shadowRoot.getElementById(labelId);
    if (label) label.textContent = rpm === null ? "--" : `${fmt(rpm, 0)} ${unit}`;
    const el = this.shadowRoot.getElementById(rotorId);
    if (!el) return;
    const animate = this._config.animate !== false;
    if (rpm === null || rpm <= 0 || !animate || erlaubt === false) {
      el.classList.toggle("is-still", rpm === null || rpm <= 0);
      this._animState.delete(rotorId);
      return;
    }
    el.classList.remove("is-still");
    const duration = festeDauer ? festeDauer : clamp(900 / rpm, 0.25, 6);
    this._animState.set(rotorId, { type: "spin", duration });
  }

  _syncToggle(id, key) {
    const btn = this.shadowRoot.getElementById(id);
    if (!btn) return;
    const entityId = this._e(key);
    const known = this._quelle.states[entityId] !== undefined;
    const on = isOn(this._quelle, entityId);
    btn.disabled = !known;
    btn.classList.toggle("is-on", on === true);
    btn.setAttribute("aria-pressed", on === true ? "true" : "false");
    const state = this.shadowRoot.getElementById(`${id}-state`);
    if (state) state.textContent = !known ? "nicht gefunden" : on ? "an" : "aus";
  }

  _syncModeSelect() {
    const sel = this.shadowRoot.getElementById("mode-select");
    if (!sel) return;
    const st = this._quelle.states[this._e("mode_select")];
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
      .lhc-alert.is-pulsing { }
      .lhc-hint {
        margin-bottom: 14px; padding: 12px 16px; border-radius: 10px;
        background: #2A2313; border: 1px solid #B07B2E; color: #F2DFB0;
        font-size: 14px;
      }
      .lhc-hint[hidden] { display: none; }

      /* Bedienleiste des Demomodus. */
      .lhc-demo {
        margin-bottom: 14px; padding: 12px 14px; border-radius: 10px;
        background: #16233A; border: 1px solid #3E6EA8;
      }
      .lhc-demo[hidden] { display: none; }
      .lhc-demo-kopf {
        display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .lhc-demo-hinweis { font-size: 12px; color: #8FA8C8; }
      .lhc-demo-reihe { display: flex; flex-wrap: wrap; gap: 8px; }
      .lhc-demo-knopf {
        padding: 7px 12px; border-radius: 8px; cursor: pointer; font: inherit;
        font-size: 13px; background: #0F1826; color: var(--ink);
        border: 1px solid #2E4661;
      }
      .lhc-demo-knopf.is-on {
        background: #1E3A5C; border-color: #5A9BD8; color: #DDEBFA;
      }
      .lhc-demo-knopf:hover { border-color: #5A9BD8; }
      .lhc-demo-regler {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px 18px; margin-top: 12px;
      }
      .lhc-demo-schieber { display: flex; flex-direction: column; gap: 4px; }
      .lhc-demo-schieber span { font-size: 12px; color: #8FA8C8; }
      .lhc-demo-schieber b { color: var(--ink); font-weight: 700; }
      .lhc-demo-schieber input {
        -webkit-appearance: none; appearance: none; width: 100%; height: 5px;
        border-radius: 3px; background: #2A3B52; outline: none;
      }
      .lhc-demo-schieber input::-webkit-slider-thumb {
        -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
        background: #5A9BD8; border: 2px solid #0F1826; cursor: pointer;
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
        opacity: 0;
      }
      .flowdots.is-on { opacity: 0.9; }

      .unit-label {
        fill: #7E8CA0; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
      }
      .verbrauch-v {
        fill: #E0762E; font-size: 26px; font-weight: 700;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      #verbrauch-group, #zirkulation-group { transition: opacity 300ms ease; }
      .unit-value {
        fill: #E8EDF4; font-size: 26px; font-weight: 700;
        transition: fill 600ms ease;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .sensor-value {
        fill: ${NEUTRAL}; font-size: 30px; font-weight: 700;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums; transition: fill 600ms ease;
      }
      /* Nicht aktivierte Kreise werden abgeblendet, nicht ausgeblendet.
         So bleibt erkennbar, dass es sie gibt. */
      .is-inaktiv { opacity: 0.28; transition: opacity 600ms ease; }
      #valve-arrow-down, #valve-arrow-right { transition: opacity 400ms ease; }
      .cap { fill: #98A6BA; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; }
      .cap-s { fill: #7E8CA0; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; }
      .value-l {
        fill: #FFFFFF; font-size: 30px; font-weight: 700;
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
        fill: #FFFFFF;
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
        fill: #FFFFFF; font-size: 19px; font-weight: 700;
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
      .badge.is-on.is-pulsing { }

      .pv-value {
        fill: #7BD88F; font-size: 26px; font-weight: 700;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      #pv-group { transition: opacity 300ms ease; }
      .sg-label {
        fill: #C3D0E0; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
      }
      .sg-value {
        fill: ${NEUTRAL}; font-size: 26px; font-weight: 700;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums; transition: fill 400ms ease;
      }
      /* Der Zustandstext leuchtet leicht in seiner eigenen Farbe,
         damit er sich vom dunklen Gehaeuse abhebt. */
      .sg-value.is-active { }
      #sg-group { transition: opacity 300ms ease; }
      #sg-group rect { transition: all 400ms ease; }
      /* Der aktive Balken leuchtet, damit er sich klar abhebt. */
      #sg-group rect.is-active { filter: drop-shadow(0 0 5px currentColor); }
      #power-led { transition: fill 400ms ease; }
      #power-led.is-on { filter: drop-shadow(0 0 6px rgba(70,192,122,0.9)); }
      #unit-glow { transition: opacity 600ms ease; }
      #unit-glow.is-on { }
      #press-group { transition: opacity 300ms ease; }
      #press-needle { transition: all 900ms ease; }

      /* Die Rotoren tragen selbst kein transform-Attribut, sonst wuerde
         die Animation es ueberschreiben und sie an den Nullpunkt werfen. */
      .rotor {
        transform-origin: 0 0;
      }
      .rotor .blades path { fill: #55637A; }
      .rotor.is-still .blades path, .rotor.is-still > path { fill: #3A4557; }

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
        font-size: 40px; font-weight: 700; font-variant-numeric: tabular-nums;
      }
      .lhc-dialog-row { display: flex; align-items: center; gap: 14px; }
      .lhc-step {
        width: 44px; height: 44px; flex: 0 0 auto; border-radius: 12px;
        background: #1B2431; border: 1px solid var(--line); color: var(--ink);
        font-size: 24px; line-height: 1; cursor: pointer;
      }
      .lhc-step:hover { border-color: #3E4C61; }
      .lhc-step:focus-visible { outline: 2px solid #E0762E; outline-offset: 2px; }
      .lhc-dialog-action {
        width: 100%; margin-top: 18px; padding: 13px 16px; border-radius: 12px;
        font: inherit; font-size: 15px; font-weight: 500; cursor: pointer;
        background: #1B2431; border: 1px solid var(--line); color: var(--ink);
      }
      .lhc-dialog-action[hidden] { display: none; }
      .lhc-dialog-action:hover { border-color: #3E4C61; }
      .lhc-dialog-action.is-an {
        background: #0E2E1C; border-color: #46C07A; color: #BFEFD2;
      }
      .lhc-dialog-action.is-aus {
        background: #2E1112; border-color: #D6534A; color: #F3C6C3;
      }
      .lhc-dialog-action:disabled {
        opacity: 0.45; cursor: not-allowed;
        background: #1B2431; border-color: var(--line); color: var(--muted);
      }
      .lhc-dialog-action:focus-visible { outline: 2px solid #E0762E; outline-offset: 2px; }
      #dlg-temp[hidden] { display: none; }
      #dlg-actions { display: flex; flex-direction: column; }
      .lhc-dialog-select {
        display: flex; flex-direction: column; gap: 6px; margin-top: 18px;
      }
      .lhc-dialog-select select {
        background: #0D131B; color: var(--ink); font: inherit; font-size: 15px;
        border: 1px solid var(--line); border-radius: 12px; padding: 12px 10px; width: 100%;
      }

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
            <span>Beschriftung Energie<em>leer lassen, dann wählt die Karte selbst</em></span>
            <input type="text" id="opt-lenergy">
          </label>
          <label class="ed-row ed-check">
            <input type="checkbox" id="opt-eday">
            <span>Tagesverbrauch aus dem Zählerstand rechnen</span>
          </label>
          <label class="ed-row ed-check"><input type="checkbox" id="opt-animate"><span>Bewegung anzeigen</span></label>
          <label class="ed-row ed-check">
            <input type="checkbox" id="opt-demo">
            <span>Demomodus<em>erfundene Werte zum Ausprobieren, die Anlage bleibt unberührt</em></span>
          </label>
          <label class="ed-row ed-check"><input type="checkbox" id="opt-switches"><span>Betriebsart und Schalter anzeigen</span></label>
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

        <p class="ed-info">
          <strong>Lutarym Heatpump Card v${CARD_VERSION}</strong>
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
    bind("opt-demo", (el) => put({ demo: el.checked }));
    bind("opt-switches", (el) => put({ show_switches: el.checked }));

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
    check("opt-demo", this._config.demo === true);
    check("opt-switches", this._config.show_switches);

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
      .ed-info {
        margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--divider-color, #E0E0E0);
        font-size: 12px; color: var(--secondary-text-color, #8A94A6);
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
