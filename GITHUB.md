# GitHub-Anleitung

Diese Anleitung bringt das Projekt von der ZIP-Datei zu einem veröffentlichten Repository mit Release, das über HACS installierbar ist.

## 1. Repository auf GitHub anlegen

Auf https://github.com/new folgende Werte eintragen:

| Feld | Wert |
|---|---|
| Repository name | `lutarym-heatpump-card` |
| Description | Lovelace-Karte mit Anlagenschema für Panasonic Aquarea über HeishaMon |
| Sichtbarkeit | Public |
| Add a README file | **nicht** ankreuzen |
| Add .gitignore | **nicht** ankreuzen |
| Choose a license | **nicht** ankreuzen |

Der Repository-Name muss genau `lutarym-heatpump-card` lauten. HACS sucht die Datei anhand dieses Namens.

Die drei Häkchen bleiben leer, weil README, Lizenz und .gitignore bereits im Projekt enthalten sind. Sonst kommt es beim ersten Push zu einem Konflikt.

## 2. Lokal hochladen

Im entpackten Projektordner, dort wo die `README.md` liegt:

```bash
git init
git branch -M main
git add .
git commit -m "Version 0.1.0"
git remote add origin https://github.com/Lutarym/lutarym-heatpump-card.git
git push -u origin main
```

Fragt Git nach Zugangsdaten, ist das Passwort nicht dein GitHub-Passwort, sondern ein Personal Access Token. Zu finden unter Settings, Developer settings, Personal access tokens, Tokens (classic). Der Token braucht den Bereich `repo`.

## 3. Repository einrichten

Auf der Repository-Seite rechts neben **About** auf das Zahnrad, dann unter **Topics** eintragen:

```
home-assistant  lovelace  lovelace-card  hacs  heishamon  panasonic-aquarea  heatpump
```

Die Topics `home-assistant` und `lovelace` sind Voraussetzung, falls du das Repository später in den offiziellen HACS-Katalog aufnehmen lassen willst.

## 4. Release erstellen

Ein Release ist nötig, weil HACS Versionen darüber erkennt.

```bash
git tag v2.0.0
git push origin v2.0.0
```

Danach auf GitHub unter **Releases**, **Draft a new release**:

| Feld | Wert |
|---|---|
| Choose a tag | `v2.0.0` |
| Release title | `v2.0.0` |
| Beschreibung | siehe Vorlage unten |

Vorlage für die Beschreibung:

```markdown
Erste Veröffentlichung.

- Anlagenschema mit Außengerät, Außenfühler, Heizungspuffer, Heizkreis und Warmwasserspeicher
- Ein oder zwei Lüfter, die sich einzeln mit ihrer tatsächlichen Drehzahl drehen
- Thermische Einfärbung von Tanks, Heizkörper und Leitungen, mit getrennter Skala für außen
- Sollwertregler für Heizung und Warmwasser
- Grafischer Karteneditor mit automatischer Erkennung der Integration Heishamon by Lutarym
- Schaltflächen zum Übernehmen der erkannten Entitäten oder der Standardnamen
```

Auf **Publish release** klicken.

## 5. In HACS einbinden

In Home Assistant:

1. HACS öffnen
2. Oben rechts auf die drei Punkte, **Benutzerdefinierte Repositories**
3. Repository: `https://github.com/Lutarym/lutarym-heatpump-card`
4. Kategorie: **Dashboard**
5. Hinzufügen, dann die Karte suchen und installieren

HACS legt die Ressource selbst an. Danach Browser-Cache leeren.

## 6. Aufnahme in den offiziellen HACS-Katalog

Optional, damit andere die Karte ohne den Umweg über ein benutzerdefiniertes Repository finden.

Voraussetzungen:

- Repository ist öffentlich
- Beschreibung und Topics sind gesetzt
- Es gibt mindestens ein Release
- `hacs.json` liegt im Hauptverzeichnis
- Die JavaScript-Datei heißt genauso wie das Repository und liegt in `dist/` oder im Hauptverzeichnis

Ist das erfüllt, kann das Repository unter https://github.com/hacs/default per Pull Request eingereicht werden. Die Prüfung läuft automatisiert und meldet Beanstandungen direkt im Pull Request.

## Spätere Aktualisierungen

```bash
git add .
git commit -m "Beschreibung der Änderung"
git push
git tag v2.0.0
git push origin v2.0.0
```

Anschließend auf GitHub ein neues Release zu diesem Tag anlegen. Ohne Release sieht HACS die neue Version nicht.

Die Versionsnummer steht an zwei Stellen und sollte zusammenpassen:

- `dist/lutarym-heatpump-card.js`, Konstante `CARD_VERSION` ganz oben
- der Git-Tag

## Projektstruktur

```
lutarym-heatpump-card/
├── dist/
│   └── lutarym-heatpump-card.js   die Karte
├── hacs.json                       Angaben für HACS
├── README.md                       Dokumentation, wird in HACS angezeigt
├── GITHUB.md                       diese Anleitung
├── LICENSE                         MIT
└── .gitignore
```
