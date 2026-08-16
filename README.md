# Lutarym Wärmepumpen Card

Eine große Lovelace-Karte für Home Assistant, die eine Panasonic Aquarea Wärmepumpe als vollständiges Anlagenschema darstellt.

**Version 1.9.0**

Die Karte liest ausschließlich vorhandene Entitäten. Sie ist auf die Topics von [HeishaMon](https://github.com/IgorYbema/HeishaMon) zugeschnitten, funktioniert aber mit jeder Quelle, solange die Werte als Entitäten in Home Assistant vorliegen.

## Was die Karte zeigt

Das Schema ist im Breitformat angelegt, alle Baugruppen stehen in einer Reihe. Von links nach rechts: Außengerät, Puffer, Pumpe, Heizkreis 1, Heizkreis 2, Manometer, Dreiwegeventil, Warmwasserspeicher. Oben verläuft der Vorlauf, unten der Rücklauf.

Die Karte hat bewusst keine Überschrift. Alles steht in der Zeichnung.

**Außengerät** mit grüner Betriebs-LED, Außentemperatur und Verdichterdrehzahl, ein oder zwei übereinander stehenden Lüftern und dem Hinweis bei laufender Abtauung. Alle Werte stehen ohne Rahmen direkt im Gehäuse.

**Vorlauf und Rücklauf** als Werte über den Leitungen, direkt am Ausgang und am Eingang der Wärmepumpe. Der Vorlauf steht rot über der oberen Leitung, der Rücklauf blau über der unteren. Die Farben sind fest und wechseln nicht mit der Temperatur, damit die Zuordnung immer eindeutig bleibt.

**Primärpumpe** mit Drehzahl und Durchflussmenge, auf der Rücklaufleitung zwischen Puffer und Wärmepumpe.

In Fließrichtung liegen auf dem Rücklauf nacheinander: Warmwasserspeicher, Heizkreis 2, Heizkreis 1, Puffer, dann die Pumpe und zuletzt die Wärmepumpe. Das Wasser aller Kreise läuft also zusammen, geht durch die Pumpe und von dort zurück in die Wärmepumpe. Der Puffer wird über dieselbe Pumpe geladen, sobald das Dreiwegeventil auf Heizen steht.

**Heizungspuffer** als großer Speicher, eingefärbt nach seiner Temperatur, darunter die Zieltemperatur. Im Wasser steigen Blasen auf, und zwar umso mehr, je wärmer der Speicher ist.

**Heizkreis 1 und 2**, jeder mit eigener Pumpe mittig auf seiner Stichleitung und eigenem Heizkörper. Auf dem Heizkörper liegt eine Tafel mit Wassertemperatur samt Sollwert und der Raumtemperatur.

**Wasserdruck** als Manometer. Es erscheint nur, wenn ein Wert vorliegt, sonst bleibt die Stelle leer.

**Dreiwegeventil** am Abzweig zum Warmwasserspeicher. Seine Stellung erkennst du an der Farbe des Punktes, die zur jeweils bedienten Seite passt.

**Warmwasserspeicher** mit Ist- und Zieltemperatur und einem Hinweis, wenn der Heizstab läuft. Im Wasser steigen Blasen auf, umso mehr je wärmer der Speicher ist.

**Hinweis** als gelber Balken, wenn gar keine Entität zugeordnet ist. Sonst zeigt die Karte nur Striche und man sucht an der falschen Stelle.

**Stromverbrauch** zwischen Außengerät und Puffer, mit der aktuellen Leistungsaufnahme in Watt und dem Verbrauch in Kilowattstunden.

Die Karte rechnet den **Tagesverbrauch** selbst aus. Sie holt einmal je Tag den Zählerstand von null Uhr aus der Historie von Home Assistant und zieht ihn vom aktuellen Stand ab. Ein eigener Zähler-Helfer ist dafür nicht nötig.

Die Beschriftung sagt selbst, was der Wert ist. Wird der Tageswert gerechnet, steht dort **Verbrauch heute**. Steht keine Historie zur Verfügung oder ist die Berechnung abgeschaltet, steht dort **Zählerstand gesamt**. Damit ist nie unklar, worauf sich die Zahl bezieht.

Im Editor lässt sich die Beschriftung überschreiben. Bleibt das Feld leer, entscheidet die Karte.

Die Berechnung lässt sich im Editor abschalten, dann steht dort der Zählerstand, wie ihn der Sensor liefert. Steht keine Historie zur Verfügung, etwa weil der Recorder den Sensor nicht aufzeichnet, fällt die Karte von selbst auf den Zählerstand zurück. Wird der Zähler zwischendurch zurückgesetzt, zeigt sie den aktuellen Stand statt einer negativen Zahl. Beide Werte kommen aus einem eigenen Messgerät, etwa einem Shelly PM. Der Block erscheint nur, wenn mindestens einer der beiden Werte vorliegt.

**Zirkulationspumpe** als Schleife rechts am Warmwasserspeicher, mit eigener Pumpe. Sie erscheint nur, wenn eine Entität dafür eingetragen ist, etwa ein Shelly. Läuft die Pumpe, dreht der Rotor und die Schleife wird durchströmt.

**Störungsmeldung** als roter Balken über dem Schema, sobald ein Fehlercode anliegt.

Unter der Zeichnung steht die **Betriebsart** als Auswahlliste in Klartext. Temperaturen werden über die Fenster im Schaubild eingestellt, nicht mehr über eine eigene Reglerzeile.

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
| `label_hk1` | Heizkreis 1 | Beschriftung des ersten Reglers |
| `label_hk2` | Heizkreis 2 | Beschriftung des zweiten Reglers |
| `label_dhw` | Warmwasser | Beschriftung des Warmwasserreglers |
| `label_buffer` | Puffer | Beschriftung des Pufferspeichers |
| `energy_daily` | true | Tagesverbrauch aus dem Zählerstand rechnen |
| `label_energy` | leer | Beschriftung des Energiewerts, leer bedeutet automatisch |
| `scale_min` | 20 | Untere Grenze der Heizungsfarbskala in Grad |
| `scale_max` | 60 | Obere Grenze der Heizungsfarbskala in Grad |
| `outdoor_min` | -15 | Untere Grenze der Außenskala in Grad |
| `outdoor_max` | 35 | Obere Grenze der Außenskala in Grad |
| `show_switches` | true | Schalter und Betriebsart anzeigen |
| `entities` | leer | Zuordnung der Entitäten, siehe unten |

### Entitäten

Alle Felder sind optional. Fehlt eines, zeigt die Karte an dieser Stelle zwei Striche oder blendet das Bauteil aus.

| Feld | Quelle | Bedeutung |
|---|---|---|
| `outside_temp` | TOP14 | Außentemperatur |
| `power_state` | SetHeatpump oder TOP0 | Wärmepumpe Status, grüne LED |
| `compressor` | TOP8 | Verdichterdrehzahl |
| `fan1_rpm` | TOP62 | Lüfter 1 Drehzahl |
| `fan2_rpm` | TOP63 | Lüfter 2 Drehzahl |
| `defrost` | TOP26 | Abtauung läuft |
| `error` | TOP44 | Fehlercode |
| `force_defrost` | SetForceDefrost | Abtauen erzwingen |
| `room_heater_switch` | SetRoomHeaterState | Heizstab Heizung schalten |
| `powerful_mode` | SetPowerfulMode | Turbomodus |
| `quiet_mode` | SetQuietMode | Leisemodus |
| `power_now` | eigene Entität | Aktuelle Leistungsaufnahme |
| `energy_today` | eigene Entität | Energiezähler |
| `sg_k1` | eigene Entität | Kontakt K1 Sperre |
| `sg_k2` | eigene Entität | Kontakt K2 Anlauf |
| `flow_temp` | TOP6 | Vorlauftemperatur |
| `return_temp` | TOP5 | Rücklauftemperatur |
| `pump_speed` | TOP65 | Primärpumpe Drehzahl |
| `pump_flow` | TOP1 | Durchflussmenge |
| `three_way_valve` | TOP20 | Dreiwegeventil |
| `water_pressure` | TOP115 | Wasserdruck |
| `buffer_temp` | TOP46 | Puffertemperatur |
| `buffer_installed` | TOP99 | Puffer vorhanden |
| `buffer_switch` | SetBuffer | Pufferbetrieb ein und aus |
| `buffer_target` | TOP7 | Puffer Zieltemperatur |
| `room_heater` | TOP59 | Heizstab Heizung |
| `zones_state` | TOP94 | Aktivierte Zonen |
| `hk1_water` | TOP36 | HK1 Wassertemperatur |
| `hk1_water_target` | TOP42 | HK1 Wasser Sollwert |
| `hk1_room` | TOP56 | HK1 Raumtemperatur |
| `hk1_pump` | TOP124 | HK1 Pumpe läuft |
| `hk1_setpoint` | TOP27 | HK1 Sollwert einstellbar |
| `hk1_switch` | eigene Entität | HK1 ein und aus |
| `hk2_water` | TOP37 | HK2 Wassertemperatur |
| `hk2_water_target` | TOP43 | HK2 Wasser Sollwert |
| `hk2_room` | TOP57 | HK2 Raumtemperatur |
| `hk2_pump` | TOP123 | HK2 Pumpe läuft |
| `hk2_setpoint` | TOP34 | HK2 Sollwert einstellbar |
| `hk2_switch` | eigene Entität | HK2 ein und aus |
| `dhw_installed` | TOP100 | Warmwasser vorhanden |
| `dhw_temp` | TOP10 | Warmwasser Isttemperatur |
| `dhw_setpoint` | TOP9 | Warmwasser Sollwert |
| `dhw_heater` | TOP58 | Heizstab Warmwasser |
| `dhw_force` | SetForceDHW | Einmalig aufheizen |
| `force_sterilization` | SetForceSterilization | Legionellenschutz starten |
| `dhw_heater_switch` | SetDHWHeaterState | Heizstab Warmwasser schalten |
| `circulation_pump` | eigene Entität | Zirkulationspumpe läuft |
| `mode_select` | SetOperationMode | Betriebsart umschalten |
| `heating_switch` | eigene Entität | Heizung ein und aus |

## Heizkreise schalten

Die Firmware kennt das Kommando `SetZones` mit drei Werten, passend zu TOP94:

| Wert | Wirkung |
|---|---|
| 0 | nur Zone 1 aktiv |
| 1 | nur Zone 2 aktiv |
| 2 | beide Zonen aktiv |

Beide Kreise gleichzeitig aus ist damit nicht vorgesehen. Die Integration legt für `SetZones` bisher keine Entität an, die Karte kann also nicht direkt darauf schreiben. Die Felder `hk1_switch` und `hk2_switch` sind deshalb für eine eigene Entität gedacht, etwa einen Schalter, der eine Automation auslöst.

## Aktivierte Kreise

Die Karte unterscheidet zwischen "läuft gerade" und "ist überhaupt vorhanden". Was in der Anlage nicht aktiviert ist, wird abgeblendet dargestellt statt ausgeblendet. So bleibt erkennbar, dass es den Kreis gibt.

| Topic | Steuert |
|---|---|
| TOP94 Zones_State | ob Zone 1, Zone 2 oder beide aktiv sind |
| TOP99 Buffer_Installed | ob ein Pufferspeicher vorhanden ist |
| TOP100 DHW_Installed | ob ein Warmwasserspeicher vorhanden ist |

TOP94 kennt drei Zustände: nur Zone 1, nur Zone 2, beide Zonen. Daraus leitet die Karte für jeden Heizkreis einzeln ab, ob er dargestellt oder abgeblendet wird.

Sind diese Entitäten nicht zugeordnet, blendet die Karte nichts ab.

## Blasen in den Speichern

In beiden Speichern steigen Blasen auf. Ihre Anzahl richtet sich nach der Temperatur, gemessen an derselben Skala, die auch die Färbung steuert.

| Temperatur bei Skala 20 bis 60 | Blasen |
|---|---|
| 20 °C und darunter | keine |
| 30 °C | 4 |
| 40 °C | 7 |
| 50 °C | 11 |
| 60 °C und darüber | 14 |

Jede Blase hat ihre eigene Steiggeschwindigkeit und Startverzögerung, damit kein Muster entsteht. Die Verteilung ist fest vorberechnet, sodass das Bild bei jedem Neuaufbau der Karte gleich aussieht.

## Animation

Bewegung zeigt an, dass etwas tatsächlich arbeitet. Steht ein Bauteil still, steht auch seine Darstellung.

| Element | Bewegt sich, wenn |
|---|---|
| Lüfter 1 und 2 | Drehzahl größer null, Geschwindigkeit nach echter Drehzahl |
| Primärpumpe | Drehzahl größer null, feste ruhige Geschwindigkeit |
| Heizkreispumpen | Pumpenstatus an, feste ruhige Geschwindigkeit |
| Gehäuserahmen außen | Verdichter läuft |
| Vorlauf und Rücklauf | Primärpumpe oder Durchfluss melden Förderung |
| Stichleitung zum Puffer | zusätzlich Dreiwegeventil auf Heizen |
| Stichleitung zum Speicher | zusätzlich Dreiwegeventil auf Warmwasser |

Steht kein Dreiwegeventil zur Verfügung, entscheidet die Betriebsart: Wert 3 bedeutet "Nur Warmwasser", alles andere gilt als Heizen. Ohne beides läuft nur die Stichleitung zum Puffer, damit nicht beide gleichzeitig strömen.
| Leitungen eines Heizkreises | nur dessen eigene Kreispumpe |
| Zirkulationsschleife | die Zirkulationspumpe läuft |
| Blasen in Puffer und Speicher | dauerhaft, Menge nach Temperatur |
| Hinweise Heizstab und Abtauung | solange sie aktiv sind |
| Störungsbalken | solange ein Fehlercode anliegt |

Jeder Leitungsabschnitt wird einzeln geschaltet. Läuft nur Heizkreis 1, bewegt sich auch nur dessen Leitung. Fehlen die Entitäten für Pumpendrehzahl und Durchfluss, bewegt sich nichts. Die Karte nimmt nichts an, was sie nicht messen kann.

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

Die Anzeige sitzt oben rechts neben dem Außengerät, ohne eigenen Rahmen. Nichts blinkt. Der Zustandstext steht groß in der Farbe seines Zustands und leuchtet leicht in derselben Farbe, damit er sich vom dunklen Gehäuse abhebt. Ist kein Kontakt eingetragen, blendet sich die Anzeige vollständig aus.

Die Karte zeigt SG Ready nur an, sie schaltet nicht. Wer umschalten will, steuert die Relais über eine Automation.

## Was der Regler anzeigt

Der Regler für einen Heizkreis zeigt den tatsächlichen Sollwert des Kreises aus `hk1_water_target` beziehungsweise `hk2_water_target`, also TOP42 und TOP43. Das ist die Temperatur, auf die der Kreis gerade geregelt wird.

Verstellst du den Regler, schreibt die Karte auf `hk1_setpoint` beziehungsweise `hk2_setpoint`, also TOP27 und TOP34. Das sind die stellbaren Entitäten, denn TOP42 und TOP43 sind reine Messwerte ohne Schreibzugriff.

Ist keine Anzeigequelle eingetragen, zeigt der Regler den Wert der stellbaren Entität, wie zuvor.

## Fenster im Schaubild

Ein Klick auf eine Baugruppe öffnet ein Fenster mit den passenden Bedienelementen.

| Klick auf | Fenster enthält |
|---|---|
| Wärmepumpe | Ein und aus, Abtauen erzwingen, beide Heizstäbe, Turbomodus, Leisemodus |
| Warmwasserspeicher | Temperatur, einmalig aufheizen, Legionellenschutz starten |
| Heizungspuffer | Pufferbetrieb ein und aus, Heizstab Heizung |
| Heizkreis 1 und 2 | Temperatur, sowie ein Schalter, falls eingetragen |

Der Puffer hat bewusst keinen Temperaturregler. HeishaMon kennt keinen einstellbaren Puffer-Sollwert. Der angezeigte Zielwert stammt aus TOP7, der Soll-Vorlauftemperatur, und ist ein reiner Messwert ohne Schreibzugriff. Einstellbar sind dort nur `SetBuffer` und der Heizstab der Heizung.

Jedes Bedienelement erscheint nur, wenn die zugehörige Entität eingetragen ist. Sind für eine Baugruppe weder Temperatur noch Bedienelement vorhanden, bleibt sie wie bisher unklickbar.

Turbomodus und Leisemodus stehen als Auswahlliste in Klartext, also Aus, 30, 60 und 90 Minuten beim Turbomodus und Aus bis Stufe 3 beim Leisemodus.

## Temperatur im Schaubild einstellen

Ein Klick auf den Warmwasserspeicher, auf Heizkreis 1 oder auf Heizkreis 2 öffnet ein Fenster, in dem sich die Temperatur einstellen lässt. Es zeigt den aktuellen Wert groß, darunter einen Schieberegler und je einen Knopf für einen Schritt nach oben und unten. Die Schrittweite kommt aus der Entität.

Verstellst du die Temperatur, bleibt dein Wert zwölf Sekunden stehen, bis die Anlage nachgezogen hat. Ohne das würde die nächste Aktualisierung die Eingabe sofort überschreiben und der Regler spränge zurück. Meldet die Anlage danach einen anderen Wert, folgt die Anzeige wieder ihr. Dasselbe gilt für die Schieberegler unter dem Schaubild.

Das Fenster zeigt denselben Wert wie der Schieberegler unter dem Schaubild. Bei den Heizkreisen ist das der tatsächliche Sollwert des Kreises aus TOP42 und TOP43, geschrieben wird auf TOP27 und TOP34.

Das Fenster schließt über das Kreuz oben rechts oder über einen Klick auf den Hintergrund. Solange es offen ist, folgt es Änderungen, die von anderer Seite kommen, außer während du selbst schiebst.

Im Fenster des Warmwasserspeichers steht zusätzlich ein Knopf für das **einmalige Aufheizen**. Er schaltet `SetForceDHW` und heißt "Einmalig aufheizen". Läuft es bereits, ist er hervorgehoben und heißt "Aufheizen läuft, abbrechen". Gemeint ist eine einmalige Ladung außerhalb des Zeitplans, kein Dauerbetrieb. Der Knopf erscheint nur, wenn die Entität dafür eingetragen ist, und nur beim Warmwasserspeicher.

In den Fenstern der beiden Heizkreise erscheint ein Knopf zum Ein- und Ausschalten, sobald unter `hk1_switch` beziehungsweise `hk2_switch` eine Entität eingetragen ist. Dafür kommt ein eigener Schalter oder ein Helfer infrage, siehe den Abschnitt weiter unten.

Ein verstellter Wert wird auch dann gesendet, wenn du das Fenster sofort danach schließt. Er geht spätestens beim Schließen raus, andernfalls nach kurzem Nachlauf.

Anklickbar sind nur Baugruppen, für die eine stellbare Entität eingetragen ist. Fehlt sie, bleibt die Baugruppe wie bisher.

## Eigene Beschriftungen

Im Editor unter Darstellung lassen sich vier Beschriftungen frei setzen. Die beiden für die Heizkreise gelten an zwei Stellen gleichzeitig: unter dem Heizkörper im Schaubild und über dem zugehörigen Schieberegler.

| Einstellung | Wirkt auf |
|---|---|
| `label_hk1` | Schaubild und Regler von Heizkreis 1 |
| `label_hk2` | Schaubild und Regler von Heizkreis 2 |
| `label_buffer` | Beschriftung des Pufferspeichers im Schaubild |
| `label_dhw` | Schaubild und Regler des Warmwasserspeichers |
| `label_energy` | Beschriftung des Energiezählers |

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

**Ein Update wirkt nicht, die Karte sieht unverändert aus.** Unten rechts in der Grafik steht die geladene Version. Bei einer Installation über HACS genügt es, die Seite neu zu laden. Steht dort weiterhin die alte Nummer, liegt vermutlich noch eine zweite, von Hand eingetragene Ressource auf dieselbe Karte. Unter Einstellungen, Dashboards, Ressourcen darf nur ein Eintrag für diese Karte stehen.

**Die Karte erscheint nicht in der Auswahl.** Ressource geprüft, Browser-Cache geleert? Die Karte meldet sich beim Laden in der Browser-Konsole mit ihrer Version.

**Alles zeigt zwei Striche.** Die Entitäten sind nicht zugeordnet oder existieren nicht. Im Editor sind fehlende Entitäten rot umrandet.

**Die Lüfter drehen nicht.** Die zugeordnete Entität liefert 0 oder keinen Zahlenwert. Bei stehender Wärmepumpe ist das korrekt.

**Der Schieberegler steht auf null statt auf dem eingestellten Wert.** Behoben in 0.9.5. Der Regler liest jetzt zuerst den Sollwert und richtet den Bereich danach aus. Liefert die Entität keinen Zahlenwert, steht dort "nicht verfügbar" statt einer irreführenden Null. Meldet die Wärmepumpe für TOP27 dauerhaft nichts, läuft die Anlage vermutlich auf Heizkurve statt auf festem Sollwert.

**Der Regler springt zurück.** Der gesendete Wert wurde von der Wärmepumpe nicht übernommen, etwa weil er außerhalb des zulässigen Bereichs liegt oder die Anlage im falschen Betriebsmodus ist.

## Lizenz

MIT, 2026 Lutarym
