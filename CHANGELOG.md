# Changelog

## v2.5.0 (2026-08-25)

### 🔧 Technische Änderungen
- **Animationen von CSS auf requestAnimationFrame umgestellt** - GData-Virenschutz blockierte `animation-play-state` Steuerung
- Alle CSS `@keyframes` entfernt: `lhc-flow`, `lhc-flow-rev`, `lhc-bubble`, `lhc-pulse`, `lhc-glow`, `lhc-spin`
- Neue Animation Engine mit `requestAnimationFrame` für:
  - Flowdots (stroke-dashoffset)
  - Bubbles (translateY + opacity)
  - Pulse/Glow (opacity)
  - Spin (rotate)

### ✅ Kompatibilität
- **GData-kompatibel** - Läuft jetzt auf PCs mit GData Virenschutz
- Funktioniert weiterhin auf allen anderen Systemen ohne Einschränkung
- Browser-Performance unverändert oder besser (native requestAnimationFrame ist optimiert)

### 📋 Behobene Probleme
- Animationen liefen nicht auf PCs mit aktivem GData Virenschutz
- Alle Animation-Typen funktionieren nun mit derselben Engine

### ⚠️ Anmerkungen
- Animationen können immer noch per config deaktiviert werden (`animate: false`)
- Demo-Modus funktioniert wie vorher
- Keine Änderungen an der Integration oder den Entitäten
