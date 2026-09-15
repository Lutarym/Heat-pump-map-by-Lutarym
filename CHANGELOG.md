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
- Hochformat als eigene Anordnung: Wärmepumpe und Kennzahlen oben
  nebeneinander, darunter senkrecht Vorlauf rechts und Rücklauf links,
  liegende Speicher, Heizkörper mit senkrechten Rippen, eigener
  Sekundärkreis. Umschaltung im Einstellungsdialog unter Anordnung
- Trennlinie im Gehäuse zwischen Symbolreihe und den Werten
- Schilder Vorlauf und Rücklauf in der Farbe des zugehörigen Wertes
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
