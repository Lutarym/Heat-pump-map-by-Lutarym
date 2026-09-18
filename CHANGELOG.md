# v2.24.1
- Auch die Regler unter dem Diagramm tragen die Farbe ihrer Achse:
  Außenwerte blau, Vorlaufwerte orange

# v2.24.0
- Heizkurve farblich zugeordnet: Vorlauf orange, Außentemperatur blau.
  Achsenlinie, Teilstriche, Beschriftung, Markierungslinie und der Wert
  daran tragen jeweils dieselbe Farbe

# v2.23.2
- "Vorlauf °C" steht senkrecht links neben dem Diagramm,
  "Außentemperatur °C" mittig darunter
- Beide Achsenbeschriftungen in größerer Schrift

# v2.23.1
- Heizkurvenfenster passt ohne Scrollen: Diagramm von 420 mal 300 auf
  420 mal 230 abgeflacht, Regler in zwei Spalten. Zusammen rund
  126 Pixel weniger Höhe

# v2.23.0
- Die Heizkurve wird nicht mehr über die Wärmepumpe aufgerufen, sondern
  im Popup des jeweiligen Heizkreises. Jeder zeigt nur seine eigene Kurve
- Der Titel nennt den konfigurierten Namen des Heizkreises
- Fenster entsprechend schmaler, da nur noch eine Spalte gezeigt wird

# v2.22.1
- Heizkurvenfenster schließt über ein Kreuz in der Kopfzeile statt über
  eine eigene Schaltfläche am Fuß, das spart rund 48 Pixel Höhe

# v2.22.0
- Regler im Heizkurvenfenster einzeilig, dadurch rund 112 Pixel weniger
  je Heizkreis
- Popup der Wärmepumpe verdichtet: die Auswahlfelder stehen nebeneinander,
  Abstände verringert, rund 72 Pixel weniger

# v2.21.2
- Heizkurve wird durchgehend gerade gezeichnet, über die ganze Skala,
  und dort abgeschnitten, wo sie den Rand verlässt
- Sollwert folgt derselben Geraden, auch außerhalb der Eckpunkte

# v2.21.1
- Heizkurve nutzt die ganze Skala: außerhalb der Eckwerte läuft die Linie
  waagerecht weiter, denn dort bleibt der Sollwert konstant
- Betriebspunkt sitzt bei der tatsächlichen Außentemperatur, auch auf den
  waagerechten Abschnitten

# v2.21.0
- Heizkurve ist nicht mehr auf der Karte, sondern in einem eigenen großen
  Fenster. Es wird über die Wärmepumpe aufgerufen und zeigt HK1 und HK2
  nebeneinander, jeweils mit vollständiger Skala, Betriebspunkt und den
  vier Stellern
- Das Fenster nimmt zwei Drittel der Kartenbreite ein
- Der Verbrauchsverlauf bekommt den frei gewordenen Platz

# v2.20.1
- Achsen der Heizkurve mit Teilstrichen auf runden Werten, die
  Schrittweite richtet sich nach dem Wertebereich
- Gestrichelte Linien markieren die aktuelle Außentemperatur und den
  daraus folgenden Vorlauf

# v2.20.0
- Heizkurve mit Skala: beide Achsen mit je drei Marken, feines Gitter,
  dadurch ist die Kurve ablesbar
- Kopfzeile nennt die aktuelle Außentemperatur und den daraus folgenden
  Sollwert
- Betriebspunkt als weißer Punkt mit dunklem Rand, bleibt auch außerhalb
  der Kurvenenden im Bild

# v2.19.0
- Heizkurve rückt auf den Platz des Verbrauchsdiagramms, wenn dieses
  ausgeblendet ist
- Neues Design der Heizkurve: die Eckwerte stehen in der Fußzeile statt
  in der Zeichenfläche, dort stießen sie an die Kurve
- Pufferziel wird während der Warmwasserladung nicht mehr angezeigt.
  TOP7 gilt in dieser Zeit dem Speicher und sprang auf dessen
  Ladetemperatur, was als Pufferziel irreführend war

# v2.18.0
- Verlaufsdiagramm und Heizkurve ohne Rahmen, stattdessen Trennlinien
  wie im Kennzahlenbereich
- Beide Diagramme lassen sich im Einstellungsdialog ein- und ausblenden
- Kurve nutzt die Fläche besser: 83 Prozent der Breite und 74 der Höhe
  statt vorher 74 und 42

# v2.17.1
- Heizkreise werden dargestellt wie Puffer und Warmwasser: große
  Temperatur, darunter das Ziel. Ohne Fachbegriffe

# v2.17.0
- Heizkreise zeigen statt "Wasser 29 / 35 °C" zwei benannte Zeilen:
  Vorlauf ist und Vorlauf soll, jeweils mit einer Nachkommastelle

# v2.16.1
- Verstellte Werte erscheinen sofort und werden gehalten, bis die Anlage
  sie zurückmeldet. Mehrfaches Drücken zählt weiter, und das gesendete
  JSON enthält alle bisherigen Änderungen
- Beim Überfahren mit der Maus wird nichts mehr unscharf: der CSS-Filter
  zwang den Browser, die Vektorgrafik zu rastern
- Heizkurve füllt den Rahmen aus, die Skala ergibt sich aus den Eckwerten
  beider Heizkreise mit Rand

# v2.16.0
- Heizkurve auch für Heizkreis 2 über TOP82 bis TOP85, im Fenster
  zwischen HK1 und HK2 umschaltbar
- Kurve auf fester Skala von -20 bis 20 Grad außen und 20 bis 60 Grad
  Vorlauf, dadurch ist die Steigung ablesbar und beide Heizkreise
  lassen sich vergleichen
- Beschriftungen der Kurvenenden bleiben auch bei flacher Kurve getrennt

# v2.15.0
- Heizkurve und beide Hysteresewerte lassen sich auch dann verstellen,
  wenn nur lesbare Entitäten vorliegen. Die Karte schickt den Wert dann
  über den Befehlskanal von HeishaMon: SetCurves, SetBufferDelta und
  SetDHWHeatDelta
- Neue Einstellung MQTT Präfix, voreingestellt panasonic_heat_pump

# v2.14.3
- Nur lesbare Entitäten: Bedienelemente bleiben sichtbar, sind aber
  ausgegraut, und die Beschriftung nennt den Grund. Vorher verschwanden
  sie stillschweigend

# v2.14.2
- Nur lesbare Entitäten werden erkannt. Steller und Regler erscheinen nur
  bei number- und input_number-Entitäten, sonst meldete Home Assistant
  "sensor.set_value nicht gefunden"

# v2.14.1
- Heizkurve selbsterklärend: beide Kurvenenden sind direkt beschriftet,
  etwa "-10 °C außen → 45 °C"
- Fenster der Heizkurve nach den beiden Kurvenpunkten gegliedert, die
  zusammengehörenden Werte stehen jetzt beieinander

# v2.14.0
- Verlaufsdiagramm des Stromverbrauchs der letzten 24 Stunden, oben rechts
  in beiden Anordnungen. Die Daten kommen aus dem Verlauf von Home Assistant
- Diagramm der Heizkurve mit dem aktuellen Betriebspunkt. Ein Klick öffnet
  ein Fenster, in dem sich die vier Eckwerte verstellen lassen: TOP29 bis TOP32
- Vorlauf und Rücklauf wieder in Großbuchstaben, als einzige Beschriftungen

# v2.13.1
- Abzeichen und die Schilder Vorlauf und Rücklauf wachsen mit ihrem Text.
  Bei den deutschen Beschriftungen ändert sich nichts, längere Texte
  laufen aber nicht mehr über den Kasten hinaus

# v2.13.0
- Alle Beschriftungen in normaler Schreibweise statt Großbuchstaben,
  Sperrung entsprechend enger, Schriftgrade leicht angehoben
- Durchfluss bleibt bei 0 l/min neutral, stehende Pumpe ist kein Risiko

# v2.12.1
- Ladetemperatur liegt jetzt in jedem Fall unter dem Sollwert. Gerechnet
  wird mit dem Betrag der Hysterese, unabhängig vom gemeldeten Vorzeichen

# v2.12.0
- In den Popups von Puffer und Warmwasser lässt sich die Temperatur
  einstellen, ab der nachgeladen wird. Geschrieben wird dabei die
  Hysterese TOP113 beziehungsweise TOP22
- Plus erhöht in beiden Fällen die angezeigte Temperatur, die Grenzen
  der Hysterese werden eingehalten

# v2.11.1
- Beschriftung Umschaltventil in der Grafik ergänzt
- Feldbezeichnung auf 3-Wege-Umschaltventil geändert, so nennt Panasonic
  das Bauteil selbst

# v2.11.0
- Alle Zahlen mit deutschem Dezimalkomma statt Punkt
- Durchfluss wird eingefärbt, wenn der Rohrinnendurchmesser eingetragen ist:
  grün zwischen 0,2 und 0,8 m/s, gelb darüber oder darunter, rot ab 1 m/s,
  wo Strömungsgeräusche entstehen
- Neue Einstellung Rohrinnendurchmesser in Millimetern

# v2.10.0
- Puffer und Warmwasser zeigen die Temperatur, ab der nachgeladen wird
- Pufferhysterese über TOP113 Buffer_Tank_Delta statt der Spreizung TOP23
- PV Überschuss und Verbrauch immer in Kilowatt, die Einheit springt nicht mehr

# v2.9.1
- Warmwasser zeigt statt des rohen Deltas die Temperatur, ab der
  nachgeladen wird, also Sollwert plus dem negativen Delta
- Heizungswert richtig benannt: TOP23 ist die Spreizung zur
  Pumpensteuerung, nicht die Nachladeschwelle

# v2.9.0
- Delta für Puffer und Warmwasser: ab welcher Abweichung nachgeheizt wird.
  Heizung über TOP23 Heat_Delta, Warmwasser über TOP22 DHW_Heat_Delta
- Hochformat: Vorlauf und Rücklauf sind unten nicht mehr direkt verbunden,
  der Kreis schließt sich über die Speicher
- Hochformat: Zirkulationskreis vergrößert
- Hochformat: Warmwasserspeicher höher, Heizstab im Puffer nach oben

# v2.8.1
- Hochformat: Fließrichtung der Animation korrigiert, Rückläufe liefen
  verkehrt herum
- Hochformat: Pumpe der Heizkreise und Zirkulationskreis versetzt, ihre
  Beschriftungen lagen auf Leitungen
- Hochformat: Symbolreihe, Trennlinie, Werte und Lüfter auf dieselben
  Abstände wie im Querformat gebracht
- Hochformat: Pumpen- und Druckbeschriftung ragte aus der Karte

# v2.8.0
- Hochformat als eigene Anordnung: Wärmepumpe und Kennzahlen oben
  nebeneinander, darunter senkrecht Vorlauf rechts und Rücklauf links,
  liegende Speicher, Heizkörper mit senkrechten Rippen, eigener
  Sekundärkreis
- Umschaltung Quer- und Hochformat im Einstellungsdialog
- Breite und Höhe der Karte im Einstellungsdialog einstellbar
- Trennlinie im Gehäuse zwischen Symbolreihe und den Werten
- Schilder Vorlauf und Rücklauf in der Farbe des zugehörigen Wertes

# v2.7.0
- Zirkulationsleitung: Ecken wie bei den übrigen Leitungen
- Zirkulationsleitung liegt hinter dem Warmwasserspeicher
- Namen der Einheiten in die Behälter verschoben, mit Kontrastbox
- Glow der Wärmepumpe grün, pulsierend, hinter dem Gehäuse
- Glow rot bei Störung
- Abzeichen für Aufheizen und Legionellenschutz im Warmwasserspeicher
- Beschriftung PV Überschuss statt PV Leistung, in der Farbe des SG-Zustands
- SG Ready: PV Überschuss Low und High statt 1 und 2
- Verdichterwert farbig nach Last, grün bei 16 Hz bis rot bei 90 Hz
- Trennlinien deutlicher sichtbar
- Lüfteranimation zuckt nicht mehr bei Drehzahlwechsel
- Heizungsschalter entfernt
- Demomodus: Knopf Bereitschaft, Knopf Zirkulation Schalter entfernt
- Demomodus: Schieberegler zeigen wieder ihren Wert
- Animationsschleife entlastet, toter Code entfernt
- Zustandssymbole im Gehäuse: Betrieb, Abtauen, Automatik, Heizen,
  Warmwasser, Kühlen. Blass, leuchtend oder blinkend je nach Zustand
- Kopfbereich der Wärmepumpe neu aufgeteilt, Betriebsanzeige entfällt
- Vorlauf und Rücklauf beschriftet, als Schild auf der Leitung
- Pumpe und Druck neu angeordnet, Werte darunter
- Pumpenräder in der Farbe des geförderten Wassers
- Wasserdruck grün von 0,5 bis 3 bar, darunter rot blinkend mit Warndreieck
- Werte in der Grafik und im Popup öffnen den Verlauf von Home Assistant
- Popups entlastet, nur noch Werte der jeweiligen Einheit
- Zeile Raum in den Heizkreisen entfernt, TOP56 und TOP57 waren doppelt
- Ohne zweiten Heizkreis rücken die Baugruppen rechts davon auf
- Namensfelder wachsen mit der Textlänge
- Animation läuft nach dem Wiederanhängen der Karte weiter
- Ventilbeschriftung ergänzt, sie hatte kein Ziel im SVG
- Waagerechte Ankerpunkte in benannte Konstanten überführt
  dadurch passen Kasten und Text wieder zusammen
  waagerecht. Wärmepumpe und Kennzahlen stehen aufrecht nebeneinander
  am Kopf, alles Weitere rückt darunter nach. Umschaltung im
  Einstellungsdialog unter Anordnung

# v2.6.4
- RL-Rohr Korrektur
- Version aus Hauptkarte in Einstellungen verschoben

# v2.6.3
- Betriebsart ins Wärmepumpen-Popup verschoben

# v2.6.2
- Demo-Modus Buttons leuchten grün nach Klick

# v2.6.1
- Demo-Buttons Button-IDs Bugfix

# v2.6.0
- Demo-Modus Buttons neu aufgebaut

# v2.5.0
- Animation Engine auf requestAnimationFrame umgestellt
- GData-Virenschutz kompatibel
