# Lutarym Wärmepumpen Card

Eine große Lovelace-Karte für Home Assistant, die eine Panasonic Aquarea Wärmepumpe als vollständiges Anlagenschema darstellt.

**Version 0.1.0**

Die Karte liest ausschließlich vorhandene Entitäten. Sie ist auf die Topics von [HeishaMon](https://github.com/IgorYbema/HeishaMon) zugeschnitten, funktioniert aber mit jeder Quelle, solange die Werte als Entitäten in Home Assistant vorliegen.

## Was die Karte zeigt

**Außengerät** mit ein oder zwei Lüftern. Die Lüfter drehen sich einzeln und mit der tatsächlichen Drehzahl ihrer jeweiligen Entität. Bei 0 U/min stehen sie still und werden dunkler. Läuft eine Abtauung, erscheint ein Hinweis am Gerät.

**Außenfühler** als Thermometer mit steigender Säule und eigener Farbskala.

**Heizungspuffer** als großer Speicher, eingefärbt nach seiner Temperatur.

**Heizkreis** als Heizkörper, oben nach Vorlauf und unten nach Rücklauf eingefärbt, mit beiden Werten als Schild.

**Warmwasserspeicher** mit Isttemperatur, Zieltemperatur und einem Hinweis, wenn der Heizstab läuft.

**Leitungen** zwischen den Baugruppen, die sich nach Vorlauf- und Rücklauftemperatur färben. Die Spreizung ist damit direkt in der Zeichnung ablesbar.

**Kennzahlenleiste** mit Verdichterdrehzahl, Wasserdurchfluss, Wärmeleistung, Stromaufnahme und der daraus berechneten momentanen Arbeitszahl.

**Sollwertregler** für Heizung und Warmwasser. Minimum, Maximum und Schrittweite liest die Karte aus der Entität selbst.

## Installation

### Über HACS

1. HACS öffnen, oben rechts auf die drei Punkte, **Benutzerdefinierte Repositories**
2. URL dieses Repositories eintragen, Kategorie **Dashboard**
3. Karte suchen, installieren
4. Browser-Cache leeren

### Manuell

1. `dist/lutarym-heatpump-card.js` nach `<config>/www/` kopieren
2. Einstellungen, Dashboards, oben rechts drei Punkte, **Ressourcen**
3. Ressource hinzufügen: URL `/local/lutarym-heatpump-card.js`, Typ **JavaScript-Modul**
4. Browser-Cache leeren

Danach erscheint beim Hinzufügen einer Karte der Eintrag **Lutarym Waermepumpe** mit Vorschau.

## Einrichtung

Die Karte hat einen vollständigen grafischen Editor. Alle Felder sind nach Baugruppen sortiert und haben eine Vorschlagsliste der passenden Entitäten. Ein Feld mit einer Entität, die es nicht gibt, wird rot umrandet.

### Automatische Erkennung

Ganz oben im Editor steht, ob die Integration [heishamon-homeassistant-lutarym](https://github.com/Lutarym/heishamon-homeassistant-lutarym) gefunden wurde, und wie viele ihrer Entitäten zu dieser Karte passen.

Die Erkennung läuft über zwei Wege. Zuerst durchsucht die Karte das Entitätsregister nach Entitäten der Integration und liest deren `translation_key`, also `top5`, `top14` und so weiter. Dieser Weg funktioniert auch dann, wenn du Entitäten umbenannt hast. Findet sie dort nichts, sucht sie nach dem Namensschema `sensor.heishamon_topNN`.

Drei Schaltflächen stehen zur Verfügung:

| Schaltfläche | Wirkung |
|---|---|
| Aus Integration übernehmen | Trägt alle erkannten Entitäten ein. Nur aktiv, wenn die Integration gefunden wurde |
| Standardnamen eintragen | Trägt das Namensschema `sensor.heishamon_topNN` ein, auch wenn die Entitäten gerade nicht existieren |
| Alle leeren | Setzt alle Felder zurück |

Sollwerte werden nur übernommen, wenn dahinter eine Number-Entität steht. Läuft die Integration im Modus **Nur lesen**, bleiben die beiden Sollwertfelder deshalb absichtlich leer.

Wird die Karte über den Kartenauswahl-Dialog hinzugefügt, läuft die Erkennung automatisch und die Felder sind bereits gefüllt.

Ist in der Konfiguration gar keine Entität eingetragen, greift die Karte auch zur Laufzeit auf die Erkennung zurück. Sie funktioniert damit ohne jede Zuordnung, solange die Integration vorhanden ist.

### Konfiguration in YAML

```yaml
type: custom:lutarym-heatpump-card
title: Wärmepumpe
fan_count: 2
scale_min: 20
scale_max: 60
outdoor_min: -15
outdoor_max: 35
show_controls: true
entities:
  outside_temp: sensor.heishamon_top14
  operating_mode: sensor.heishamon_top4
  compressor: sensor.heishamon_top8
  pump_flow: sensor.heishamon_top1
  heat_output: sensor.heishamon_top15
  power_input: sensor.heishamon_top16
  fan1_rpm: sensor.heishamon_top62
  fan2_rpm: sensor.heishamon_top63
  defrost: sensor.heishamon_top26
  flow_temp: sensor.heishamon_top6
  return_temp: sensor.heishamon_top5
  heating_setpoint: number.heishamon_top27
  buffer_temp: sensor.heishamon_top46
  dhw_temp: sensor.heishamon_top10
  dhw_setpoint: number.heishamon_top9
  dhw_heater: sensor.heishamon_top58
```

### Optionen

| Option | Standard | Bedeutung |
|---|---|---|
| `title` | Waermepumpe | Überschrift der Karte |
| `fan_count` | 2 | Anzahl der dargestellten Lüfter, 1 oder 2 |
| `scale_min` | 20 | Untere Grenze der Heizungsfarbskala in Grad |
| `scale_max` | 60 | Obere Grenze der Heizungsfarbskala in Grad |
| `outdoor_min` | -15 | Untere Grenze der Außenskala in Grad |
| `outdoor_max` | 35 | Obere Grenze der Außenskala in Grad |
| `show_controls` | true | Sollwertregler anzeigen |
| `entities` | leer | Zuordnung der Entitäten, siehe unten |

### Entitäten

Alle Felder sind optional. Fehlt eines, zeigt die Karte an dieser Stelle zwei Striche.

| Feld | HeishaMon | Bedeutung |
|---|---|---|
| `outside_temp` | TOP14 | Außentemperatur, färbt das Thermometer |
| `operating_mode` | TOP4 | Betriebsart, wird als Klartext oben rechts angezeigt |
| `compressor` | TOP8 | Verdichterdrehzahl |
| `pump_flow` | TOP1 | Wasserdurchfluss |
| `heat_output` | TOP15 | Abgegebene Heizleistung, Zähler der Arbeitszahl |
| `power_input` | TOP16 | Stromaufnahme, Nenner der Arbeitszahl |
| `fan1_rpm` | TOP62 | Drehzahl Lüfter 1 |
| `fan2_rpm` | TOP63 | Drehzahl Lüfter 2 |
| `defrost` | TOP26 | Abtauung, blendet den Hinweis ein |
| `flow_temp` | TOP6 | Vorlauftemperatur |
| `return_temp` | TOP5 | Rücklauftemperatur |
| `heating_setpoint` | TOP27 | Sollwert Heizung, muss eine Number-Entität sein |
| `buffer_temp` | TOP46 | Puffertemperatur |
| `dhw_temp` | TOP10 | Warmwasser Isttemperatur |
| `dhw_setpoint` | TOP9 | Sollwert Warmwasser, muss eine Number-Entität sein |
| `dhw_heater` | TOP58 | Heizstab Warmwasser, blendet den Hinweis ein |

## Farbskalen

Die Karte verwendet zwei getrennte Skalen, weil Heizungs- und Außentemperaturen in völlig verschiedenen Bereichen liegen.

Die Skala läuft von Tiefblau über Cyan und Bernstein bis Rot. Werte unterhalb des Minimums bleiben blau, Werte oberhalb des Maximums bleiben rot.

Bei einer Fußbodenheizung lohnt es sich, `scale_max` auf etwa 40 zu senken. Sonst bleibt fast alles im blauen Bereich, und Unterschiede sind kaum sichtbar.

## Hinweise

Die Sollwertregler brauchen Number-Entitäten. Sind keine konfiguriert, zeigt die Karte an dieser Stelle einen Hinweis statt der Regler. Bei der Integration [heishamon-homeassistant-lutarym](https://github.com/Lutarym/heishamon-homeassistant-lutarym) entstehen diese Entitäten nur, wenn bei der Einrichtung die Option **Nur lesen** deaktiviert ist.

Die Betriebsart wird bevorzugt aus dem Attribut `beschreibung` gelesen, das die genannte Integration mitliefert. Fehlt das Attribut, zeigt die Karte den rohen Zustand der Entität.

Die Lüfteranimation wird bei aktivierter Systemeinstellung für reduzierte Bewegung automatisch abgeschaltet.

Ob die Wärmepumpe auf den Sollwert TOP27 reagiert, hängt davon ab, ob sie auf feste Vorlauftemperatur oder auf Heizkurve läuft. Das entscheidet die Wärmepumpe, nicht die Karte.

## Fehlersuche

**Die Karte erscheint nicht in der Auswahl.** Ressource geprüft, Browser-Cache geleert? Die Karte meldet sich beim Laden in der Browser-Konsole mit ihrer Version.

**Alles zeigt zwei Striche.** Die Entitäten sind nicht zugeordnet oder existieren nicht. Im Editor sind fehlende Entitäten rot umrandet.

**Die Lüfter drehen nicht.** Die zugeordnete Entität liefert 0 oder keinen Zahlenwert. Bei stehender Wärmepumpe ist das korrekt.

**Der Regler springt zurück.** Der gesendete Wert wurde von der Wärmepumpe nicht übernommen, etwa weil er außerhalb des zulässigen Bereichs liegt oder die Anlage im falschen Betriebsmodus ist.

## Lizenz

MIT, 2026 Lutarym
