# Lutarym Wärmepumpen Card

Eine große Lovelace-Karte für Home Assistant, die eine Panasonic Aquarea Wärmepumpe als vollständiges Anlagenschema darstellt.

**Version 0.7.0**

Die Karte liest ausschließlich vorhandene Entitäten. Sie ist auf die Topics von [HeishaMon](https://github.com/IgorYbema/HeishaMon) zugeschnitten, funktioniert aber mit jeder Quelle, solange die Werte als Entitäten in Home Assistant vorliegen.

## Was die Karte zeigt

**Außengerät** mit ein oder zwei Lüftern. Die Lüfter drehen sich einzeln und mit der tatsächlichen Drehzahl ihrer jeweiligen Entität. Bei 0 U/min stehen sie still und werden dunkler. Läuft eine Abtauung, erscheint ein Hinweis am Gerät.

Das Schema ist im Breitformat angelegt, alle Baugruppen stehen in einer Reihe nebeneinander. Von links nach rechts: Außengerät, Pumpe, Puffer, Manometer, Heizkreis 1, Heizkreis 2, Dreiwegeventil, Warmwasserspeicher. Oben verläuft der Vorlauf, unten der Rücklauf, jede Baugruppe hängt mit einer Stichleitung dazwischen.

Das Seitenverhältnis beträgt etwa 2,7 zu 1. Bei 900 Pixeln Kartenbreite ist die Karte rund 330 Pixel hoch.

**Heizungspuffer** als großer Speicher, eingefärbt nach seiner Temperatur.

**Heizkreis 1 und 2**, jeder mit eigener Pumpe, eigenem Heizkörper, eigener Wasser- und Raumtemperatur und eigenem Sollwertregler. Die Anzahl ist im Editor auf einen Heizkreis umstellbar.

**Primärpumpe** auf der Rücklaufleitung, deren Rotor sich mit der tatsächlichen Drehzahl dreht.

**Dreiwegeventil** am Abzweig zum Warmwasserspeicher, das anzeigt, ob gerade geheizt oder Warmwasser bereitet wird.

**Wasserdruck** als Manometer mit Zeiger. Der Zeiger wird rot, wenn der Druck unter 0,8 oder über 2,8 bar liegt.

**Heizkreis** als Heizkörper, oben nach Vorlauf und unten nach Rücklauf eingefärbt, mit beiden Werten als Schild.

**Warmwasserspeicher** mit Isttemperatur, Zieltemperatur und einem Hinweis, wenn der Heizstab läuft. Am Puffer erscheint derselbe Hinweis für den Heizstab der Heizung.

**Störungsmeldung** als roter Balken über dem Schema, sobald die Wärmepumpe einen Fehlercode meldet.

**Leitungen** zwischen den Baugruppen, die sich nach Vorlauf- und Rücklauftemperatur färben. Die Spreizung ist damit direkt in der Zeichnung ablesbar.

Die **Verdichterdrehzahl** steht oben im Außengerät, die **Durchflussmenge** an der Primärpumpe. Beides steht damit dort, wo es hingehört, statt in einer eigenen Leiste.

**Schalter** für Wärmepumpe und Warmwasser-Zwangsladung, dazu die Betriebsart als Auswahlliste.

**Sollwertregler** für Heizkreis 1, Heizkreis 2 und Warmwasser. Minimum, Maximum und Schrittweite liest die Karte aus der Entität selbst.

**SG Ready** direkt im Außengerät, ohne Rahmen. Der Betriebszustand wird aus zwei Kontakten abgeleitet, darunter zeigt ein Balken aus vier Segmenten, wo die Anlage gerade steht. Bei zwei Lüftern sitzt die Anzeige zwischen ihnen, bei einem darunter.

Die **Außentemperatur** steht bewusst im Kopfbereich der Karte und nicht im Anlagenschema. Im Schema stünde sie in einer Flucht mit den Leitungen und ließe sich mit einer Temperatur im Heizungssystem verwechseln.

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

Die drei Schaltflächen führen zusammen und löschen eigene Einträge wie SG Ready oder den Heizungshelfer nicht. Nur **Alle leeren** setzt wirklich alles zurück.

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
hk_count: 2
scale_min: 20
scale_max: 60
outdoor_min: -15
outdoor_max: 35
animate: true
show_switches: true
show_controls: true
entities:
  outside_temp: sensor.heishamon_top14
  operating_mode: sensor.heishamon_top4
  compressor: sensor.heishamon_top8
  pump_flow: sensor.heishamon_top1
  error: sensor.heishamon_top44
  water_pressure: sensor.heishamon_top115
  fan1_rpm: sensor.heishamon_top62
  fan2_rpm: sensor.heishamon_top63
  defrost: sensor.heishamon_top26
  flow_temp: sensor.heishamon_top6
  return_temp: sensor.heishamon_top5
  pump_speed: sensor.heishamon_top65
  three_way_valve: sensor.heishamon_top20
  buffer_temp: sensor.heishamon_top46
  room_heater: sensor.heishamon_top59
  hk1_water: sensor.heishamon_top36
  hk1_water_target: sensor.heishamon_top42
  hk1_room: sensor.heishamon_top56
  hk1_pump: sensor.heishamon_top124
  hk1_setpoint: number.heishamon_top27
  hk2_water: sensor.heishamon_top37
  hk2_water_target: sensor.heishamon_top43
  hk2_room: sensor.heishamon_top57
  hk2_pump: sensor.heishamon_top123
  hk2_setpoint: number.heishamon_top34
  dhw_temp: sensor.heishamon_top10
  dhw_setpoint: number.heishamon_top9
  dhw_heater: sensor.heishamon_top58
  # sg_k1: switch.sg_relais_k1   # eigene Entitaet, optional
  # sg_k2: switch.sg_relais_k2   # eigene Entitaet, optional
  power_switch: switch.heishamon_setheatpump
  mode_select: select.heishamon_setoperationmode
  dhw_switch: switch.heishamon_setforcedhw
  # heating_switch: switch.mein_eigener_helfer   # eigene Entitaet, optional
```

### Optionen

| Option | Standard | Bedeutung |
|---|---|---|
| `title` | Waermepumpe | Überschrift der Karte |
| `fan_count` | 2 | Anzahl der dargestellten Lüfter, 1 oder 2 |
| `hk_count` | 2 | Anzahl der dargestellten Heizkreise, 1 oder 2 |
| `animate` | true | Bewegung anzeigen |
| `scale_min` | 20 | Untere Grenze der Heizungsfarbskala in Grad |
| `scale_max` | 60 | Obere Grenze der Heizungsfarbskala in Grad |
| `outdoor_min` | -15 | Untere Grenze der Außenskala in Grad |
| `outdoor_max` | 35 | Obere Grenze der Außenskala in Grad |
| `show_switches` | true | Schalter und Betriebsart anzeigen |
| `show_controls` | true | Sollwertregler anzeigen |
| `entities` | leer | Zuordnung der Entitäten, siehe unten |

### Entitäten

Alle Felder sind optional. Fehlt eines, zeigt die Karte an dieser Stelle zwei Striche.

| Feld | HeishaMon | Bedeutung |
|---|---|---|
| `outside_temp` | TOP14 | Außentemperatur, im Kopfbereich der Karte |
| `operating_mode` | TOP4 | Betriebsart, wird als Klartext oben rechts angezeigt |
| `compressor` | TOP8 | Verdichterdrehzahl, oben im Außengerät |
| `pump_flow` | TOP1 | Durchflussmenge, an der Primärpumpe |
| `fan1_rpm` | TOP62 | Drehzahl Lüfter 1 |
| `fan2_rpm` | TOP63 | Drehzahl Lüfter 2 |
| `defrost` | TOP26 | Abtauung, blendet den Hinweis ein |
| `flow_temp` | TOP6 | Vorlauftemperatur |
| `return_temp` | TOP5 | Rücklauftemperatur |
| `buffer_temp` | TOP46 | Puffertemperatur |
| `dhw_temp` | TOP10 | Warmwasser Isttemperatur |
| `dhw_setpoint` | TOP9 | Sollwert Warmwasser, muss eine Number-Entität sein |
| `dhw_heater` | TOP58 | Heizstab Warmwasser, blendet den Hinweis ein |
| `error` | TOP44 | Fehlercode, blendet die Störungsmeldung ein |
| `water_pressure` | TOP115 | Wasserdruck, Zeiger des Manometers |
| `pump_speed` | TOP65 | Drehzahl der Primärpumpe |
| `hk1_water` | TOP36 | Heizkreis 1 Wassertemperatur |
| `hk1_water_target` | TOP42 | Heizkreis 1 Wasser Sollwert |
| `hk1_room` | TOP56 | Heizkreis 1 Raumtemperatur |
| `hk1_pump` | TOP124 | Heizkreis 1 Pumpe, treibt die Animation |
| `hk1_setpoint` | TOP27 | Heizkreis 1 Sollwert, muss eine Number sein |
| `hk2_water` | TOP37 | Heizkreis 2 Wassertemperatur |
| `hk2_water_target` | TOP43 | Heizkreis 2 Wasser Sollwert |
| `hk2_room` | TOP57 | Heizkreis 2 Raumtemperatur |
| `hk2_pump` | TOP123 | Heizkreis 2 Pumpe, treibt die Animation |
| `hk2_setpoint` | TOP34 | Heizkreis 2 Sollwert, muss eine Number sein |
| `three_way_valve` | TOP20 | Dreiwegeventil, Heizen oder Warmwasser |
| `room_heater` | TOP59 | Heizstab Heizung, blendet den Hinweis am Puffer ein |
| `power_switch` | SetHeatpump | Wärmepumpe ein und aus, muss ein Switch sein |
| `dhw_switch` | SetForceDHW | Warmwasser sofort laden, muss ein Switch sein |
| `mode_select` | SetOperationMode | Betriebsart, muss ein Select sein |
| `heating_switch` | keines | Optional, für einen eigenen Helfer |
| `sg_k1` | keines | SG-Kontakt K1 Sperre, eigener Shelly oder Relais |
| `sg_k2` | keines | SG-Kontakt K2 Anlauf, eigener Shelly oder Relais |

## Farbskalen

Die Karte verwendet zwei getrennte Skalen, weil Heizungs- und Außentemperaturen in völlig verschiedenen Bereichen liegen.

Die Skala läuft von Tiefblau über Cyan und Bernstein bis Rot. Werte unterhalb des Minimums bleiben blau, Werte oberhalb des Maximums bleiben rot.

Bei einer Fußbodenheizung lohnt es sich, `scale_max` auf etwa 40 zu senken. Sonst bleibt fast alles im blauen Bereich, und Unterschiede sind kaum sichtbar.

## Animation

Bewegung zeigt an, dass etwas tatsächlich arbeitet. Steht ein Bauteil still, steht auch seine Darstellung.

| Element | Bewegt sich, wenn |
|---|---|
| Lüfter 1 und 2 | Drehzahl größer null, Geschwindigkeit nach echter Drehzahl |
| Primärpumpe | Drehzahl größer null, Geschwindigkeit nach echter Drehzahl |
| Heizkreispumpen | Pumpenstatus an, feste Geschwindigkeit |
| Sammelleitungen oben und unten | Primärpumpe oder Durchfluss größer null |
| Stichleitung zum Puffer | zusätzlich das Dreiwegeventil auf Heizen |
| Stichleitung zum Speicher | zusätzlich das Dreiwegeventil auf Warmwasser |
| Heizkreisleitungen | die jeweilige Kreispumpe läuft |
| Gehäuserahmen außen | Verdichter läuft |
| Hinweise Heizstab und Abtauung | solange sie aktiv sind |
| SG Ready | in Zustand 1 Sperre und Zustand 4 Anlaufbefehl |
| Störungsbalken | solange ein Fehlercode anliegt |

Die Heizkreispumpen melden bei HeishaMon nur an oder aus, keine Drehzahl. Sie drehen sich daher mit fester Geschwindigkeit, im Gegensatz zu Lüftern und Primärpumpe.

Die gesamte Bewegung lässt sich im Editor mit der Option **Bewegung anzeigen** abschalten. Ist im Betriebssystem reduzierte Bewegung eingestellt, schaltet sich die Animation ohnehin ab.

## SG Ready

**HeishaMon liefert SG Ready nicht.** Geprüft sind alle 144 Topics, die sechs Zusatzwerte und die sieben Werte der optionalen Platine. Der Zustand muss deshalb aus deiner eigenen Verkabelung kommen, üblicherweise aus zwei Relais, die die Kontakte der Wärmepumpe schalten.

Die Karte zeigt die vier Betriebszustände nach der Schnittstellenbeschreibung des Bundesverbands Wärmepumpe:

| Zustand | Kontakte K1:K2 | Bedeutung | Farbe |
|---|---|---|---|
| 1 | 1:0 | Sperre, höchstens zwei Stunden | rot |
| 2 | 0:0 | Energieeffizienter Normalbetrieb | grau |
| 3 | 0:1 | Einschaltempfehlung, verstärkter Betrieb | bernstein |
| 4 | 1:1 | Anlaufbefehl | grün |

K1 ist der Sperrkontakt, K2 der Anlaufkontakt.

Du trägst nur die beiden Kontakte ein, `sg_k1` für Sperre und `sg_k2` für Anlauf, zum Beispiel zwei Shellys. Den Betriebszustand 1 bis 4 leitet die Karte daraus nach obiger Tabelle selbst ab.

Erlaubt sind die Domänen `switch`, `input_boolean`, `binary_sensor` und `sensor`. Damit passt sowohl ein Shelly, der schaltet, als auch einer, der nur einen Eingang misst.

Fehlt einer der beiden Kontakte, blendet sich die Anzeige aus. Ist einer nicht erreichbar, zeigt die Karte "unbekannt", statt einen Zustand zu raten. Ein ausgefallener Shelly darf nicht als offener Kontakt gelten, sonst stünde dort Normalbetrieb, obwohl niemand weiß, was tatsächlich anliegt.

Die Anzeige sitzt im Gehäuse des Außengeräts, ohne eigenen Rahmen. Zustand 1 und Zustand 4 sind Ausnahmezustände und blinken, damit sie auffallen. Zustand 2 und 3 stehen ruhig. Ist kein Kontakt eingetragen, blendet sich die Anzeige vollständig aus.

Die Karte zeigt SG Ready nur an, sie schaltet nicht. Wer umschalten will, steuert die Relais über eine Automation.

## Heizung und Warmwasser schalten

HeishaMon kennt keine getrennten Schalter für "Heizung ein" und "Warmwasser ein". Was die Anlage wirklich umschaltet, ist die Betriebsart. Die Karte bildet deshalb ab, was es tatsächlich gibt:

| Bedienelement | Wirkung |
|---|---|
| Wärmepumpe | Schaltet die gesamte Anlage ein und aus |
| Betriebsart | Nur Heizen, Nur Warmwasser, Heizen und Warmwasser, und weitere |
| Warmwasser | Löst eine Zwangsladung des Speichers aus |

Wer eine echte Schaltfläche "Heizung ein und aus" möchte, legt sich einen eigenen Helfer an, etwa einen Schalter, der eine Automation auslöst, und trägt ihn im Feld `heating_switch` ein.

Alle Schaltflächen brauchen die Steuerentitäten der Integration. Die entstehen nur, wenn bei der Einrichtung die Option **Nur lesen** deaktiviert ist.

## Hinweise

Die Sollwertregler brauchen Number-Entitäten. Sind keine konfiguriert, zeigt die Karte an dieser Stelle einen Hinweis statt der Regler. Bei der Integration [heishamon-homeassistant-lutarym](https://github.com/Lutarym/heishamon-homeassistant-lutarym) entstehen diese Entitäten nur, wenn bei der Einrichtung die Option **Nur lesen** deaktiviert ist.

Die Betriebsart wird bevorzugt aus dem Attribut `beschreibung` gelesen, das die genannte Integration mitliefert. Fehlt das Attribut, zeigt die Karte den rohen Zustand der Entität.

Die Lüfteranimation wird bei aktivierter Systemeinstellung für reduzierte Bewegung automatisch abgeschaltet.

Ob die Wärmepumpe auf den Sollwert TOP27 reagiert, hängt davon ab, ob sie auf feste Vorlauftemperatur oder auf Heizkurve läuft. Das entscheidet die Wärmepumpe, nicht die Karte.

## Fehlersuche

**Im Editor springen die Eingabefelder zurück, sobald ich tippe.** Behoben in 0.5.2. Ältere Fassungen glichen die Felder bei jeder Zustandsänderung in Home Assistant ab und überschrieben dabei die Eingabe. Prüfe die Version in der Browser-Konsole und leere den Cache.

**Die Karte erscheint nicht in der Auswahl.** Ressource geprüft, Browser-Cache geleert? Die Karte meldet sich beim Laden in der Browser-Konsole mit ihrer Version.

**Alles zeigt zwei Striche.** Die Entitäten sind nicht zugeordnet oder existieren nicht. Im Editor sind fehlende Entitäten rot umrandet.

**Die Lüfter drehen nicht.** Die zugeordnete Entität liefert 0 oder keinen Zahlenwert. Bei stehender Wärmepumpe ist das korrekt.

**Der Regler springt zurück.** Der gesendete Wert wurde von der Wärmepumpe nicht übernommen, etwa weil er außerhalb des zulässigen Bereichs liegt oder die Anlage im falschen Betriebsmodus ist.

## Lizenz

MIT, 2026 Lutarym
