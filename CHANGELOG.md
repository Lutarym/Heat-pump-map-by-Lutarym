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
