# Lutarym Wärmepumpen Card

Eine große Lovelace-Karte für Home Assistant, die eine Panasonic Aquarea Wärmepumpe als vollständiges Anlagenschema darstellt.

**Version 0.8.4**

Die Karte liest ausschließlich vorhandene Entitäten. Sie ist auf die Topics von [HeishaMon](https://github.com/IgorYbema/HeishaMon) zugeschnitten, funktioniert aber mit jeder Quelle, solange die Werte als Entitäten in Home Assistant vorliegen.

## Was die Karte zeigt

Das Schema ist im Breitformat angelegt, alle Baugruppen stehen in einer Reihe. Von links nach rechts: Außengerät, Puffer, Pumpe, Heizkreis 1, Heizkreis 2, Manometer, Dreiwegeventil, Warmwasserspeicher. Oben verläuft der Vorlauf, unten der Rücklauf.

Die Karte hat bewusst keine Überschrift. Alles steht in der Zeichnung.

**Außengerät** mit grüner Betriebs-LED, Außentemperatur und Verdichterdrehzahl, ein oder zwei Lüftern, SG-Ready-Anzeige und dem Hinweis bei laufender Abtauung. Alle Werte stehen ohne Rahmen direkt im Gehäuse.

**Vorlauf und Rücklauf** als Schilder auf den Leitungen, direkt am Ausgang und am Eingang der Wärmepumpe. Beide Werte sind thermisch eingefärbt, in derselben Farbe wie die Leitung, auf der sie liegen. Die Spreizung ist damit als Zahl und als Farbunterschied ablesbar.

**Primärpumpe** mit Drehzahl und Durchflussmenge, hinter dem Puffer auf der Rücklaufleitung.

**Heizungspuffer** als großer Speicher, eingefärbt nach seiner Temperatur, darunter die Zieltemperatur.

**Heizkreis 1 und 2**, jeder mit eigener Pumpe und eigenem Heizkörper. Auf dem Heizkörper liegt eine Tafel mit Wassertemperatur samt Sollwert und der Raumtemperatur.

**Wasserdruck** als Manometer. Es erscheint nur, wenn ein Wert vorliegt, sonst bleibt die Stelle leer.

**Dreiwegeventil** am Abzweig zum Warmwasserspeicher, in Klartext als Heizung oder Warmwasser.

**Warmwasserspeicher** mit Ist- und Zieltemperatur und einem Hinweis, wenn der Heizstab läuft.

**Störungsmeldung** als roter Balken über dem Schema, sobald ein Fehlercode anliegt.

Unter der Zeichnung stehen die **Betriebsart** als Auswahlliste in Klartext und die **Sollwertregler** für Heizkreis 1, Heizkreis 2 und Warmwasser.

## Betriebsart im Klartext

Die Wärmepumpe und die Integration liefern englische Kürzel oder reine Zahlen. Die Karte übersetzt sie. DHW steht für Domestic Hot Water, also Trinkwarmwasser.

| Wert | Anzeige |
|---|---|
| 0 oder Heat | Nur Heizen |
| 1 oder Cool | Nur Kühlen |
| 2 oder Auto(heat) | Automatik Heizen |
| 3 oder DHW | Nur Warmwasser |
| 4 oder Heat+DHW | Heizen und Warmwasser |
| 5 oder Cool+DHW | Kühlen und Warmwasser |
| 6 oder Auto(heat)+DHW | Automatik Heizen und Warmwasser |
| 7 oder Auto(cool) | Automatik Kühlen |
| 8 oder Auto(cool)+DHW | Automatik Kühlen und Warmwasser |

Beim Dreiwegeventil wird Room zu Heizung und DHW zu Warmwasser.

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
  power_state: switch.heishamon_setheatpump
  compressor: sensor.heishamon_top8
  fan1_rpm: sensor.heishamon_top62
  fan2_rpm: sensor.heishamon_top63
  defrost: sensor.heishamon_top26
  error: sensor.heishamon_top44
  # sg_k1: switch.sg_relais_k1   # eigene Entität, optional
  # sg_k2: switch.sg_relais_k2   # eigene Entität, optional
  flow_temp: sensor.heishamon_top6
  return_temp: sensor.heishamon_top5
  pump_speed: sensor.heishamon_top65
  pump_flow: sensor.heishamon_top1
  three_way_valve: sensor.heishamon_top20
  water_pressure: sensor.heishamon_top115
  buffer_temp: sensor.heishamon_top46
  buffer_target: sensor.heishamon_top7
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
  mode_select: select.heishamon_setoperationmode
  # heating_switch: switch.mein_eigener_helfer   # eigene Entität, optional
```

### Optionen

| Option | Standard | Bedeutung |
|---|---|---|
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

| Feld | Quelle | Bedeutung |
|---|---|---|
| `outside_temp` | TOP14 | Außentemperatur |
| `power_state` | SetHeatpump oder TOP0 | Wärmepumpe Status, grüne LED |
| `compressor` | TOP8 | Verdichterdrehzahl |
| `fan1_rpm` | TOP62 | Lüfter 1 Drehzahl |
| `fan2_rpm` | TOP63 | Lüfter 2 Drehzahl |
| `defrost` | TOP26 | Abtauung läuft |
| `error` | TOP44 | Fehlercode |
| `sg_k1` | eigene Entität | Kontakt K1 Sperre |
| `sg_k2` | eigene Entität | Kontakt K2 Anlauf |
| `flow_temp` | TOP6 | Vorlauftemperatur |
| `return_temp` | TOP5 | Rücklauftemperatur |
| `pump_speed` | TOP65 | Primärpumpe Drehzahl |
| `pump_flow` | TOP1 | Durchflussmenge |
| `three_way_valve` | TOP20 | Dreiwegeventil |
| `water_pressure` | TOP115 | Wasserdruck |
| `buffer_temp` | TOP46 | Puffertemperatur |
| `buffer_target` | TOP7 | Puffer Zieltemperatur |
| `room_heater` | TOP59 | Heizstab Heizung |
| `hk1_water` | TOP36 | HK1 Wassertemperatur |
| `hk1_water_target` | TOP42 | HK1 Wasser Sollwert |
| `hk1_room` | TOP56 | HK1 Raumtemperatur |
| `hk1_pump` | TOP124 | HK1 Pumpe läuft |
| `hk1_setpoint` | TOP27 | HK1 Sollwert einstellbar |
| `hk2_water` | TOP37 | HK2 Wassertemperatur |
| `hk2_water_target` | TOP43 | HK2 Wasser Sollwert |
| `hk2_room` | TOP57 | HK2 Raumtemperatur |
| `hk2_pump` | TOP123 | HK2 Pumpe läuft |
| `hk2_setpoint` | TOP34 | HK2 Sollwert einstellbar |
| `dhw_temp` | TOP10 | Warmwasser Isttemperatur |
| `dhw_setpoint` | TOP9 | Warmwasser Sollwert |
| `dhw_heater` | TOP58 | Heizstab Warmwasser |
| `mode_select` | SetOperationMode | Betriebsart umschalten |
| `heating_switch` | eigene Entität | Heizung ein und aus |

HeishaMon kennt keinen eigenen Puffer-Sollwert. `buffer_target` nutzt deshalb TOP7, die Soll-Vorlauftemperatur, auf die der Puffer geladen wird.

## Animation

Bewegung zeigt an, dass etwas tatsächlich arbeitet. Steht ein Bauteil still, steht auch seine Darstellung.

| Element | Bewegt sich, wenn |
|---|---|
| Lüfter 1 und 2 | Drehzahl größer null, Geschwindigkeit nach echter Drehzahl |
| Primärpumpe | Drehzahl größer null, feste ruhige Geschwindigkeit |
| Heizkreispumpen | Pumpenstatus an, feste ruhige Geschwindigkeit |
| Sammelleitungen oben und unten | Primärpumpe oder Durchfluss größer null |
| Stichleitung zum Puffer | zusätzlich das Dreiwegeventil auf Heizen |
| Stichleitung zum Speicher | zusätzlich das Dreiwegeventil auf Warmwasser |
| Heizkreisleitungen | die jeweilige Kreispumpe läuft |
| Gehäuserahmen außen | Verdichter läuft |
| Hinweise Heizstab und Abtauung | solange sie aktiv sind |
| SG Ready | in Zustand 1 Sperre und Zustand 4 Anlaufbefehl |
| Störungsbalken | solange ein Fehlercode anliegt |

Alle Pumpen drehen mit derselben ruhigen Geschwindigkeit, drei Sekunden pro Umdrehung. Sie sollen nur zeigen, dass gefördert wird, nicht wie schnell. Die tatsächliche Drehzahl der Primärpumpe steht als Zahl daneben. Nur die Lüfter drehen nach echter Drehzahl, dort ist der Unterschied zwischen leisem und vollem Betrieb gut sichtbar.

Die gesamte Bewegung lässt sich im Editor mit der Option **Bewegung anzeigen** abschalten. Ist im Betriebssystem reduzierte Bewegung eingestellt, schaltet sich die Animation ohnehin ab.

## SG Ready

**HeishaMon liefert SG Ready nicht.** Geprüft sind alle 144 Topics, die sechs Zusatzwerte und die sieben Werte der optionalen Platine. Der Zustand muss deshalb aus deiner eigenen Verkabelung kommen, üblicherweise aus zwei Relais, die die Kontakte der Wärmepumpe schalten.

Die Karte zeigt die vier Betriebszustände nach der Schnittstellenbeschreibung des Bundesverbands Wärmepumpe:

| Zustand | K1:K2 | Anzeige in der Karte | Offizieller Begriff | Farbe |
|---|---|---|---|---|
| 1 | 1:0 | Stopp | Sperre, höchstens zwei Stunden | rot |
| 2 | 0:0 | Normal | Energieeffizienter Normalbetrieb | grau |
| 3 | 0:1 | PV Überschuss 1 | Einschaltempfehlung | bernstein |
| 4 | 1:1 | PV Überschuss 2 | Anlaufbefehl | grün |

Die Anzeige ist bewusst nach dem praktischen Zweck benannt statt nach der Norm. Zustand 3 ist eine Empfehlung, die Wärmepumpe entscheidet selbst. Zustand 4 ist ein verbindlicher Anlaufbefehl mit verstärktem Betrieb. In einer Anlage mit Photovoltaik entspricht das zwei Stufen von Überschuss.

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
