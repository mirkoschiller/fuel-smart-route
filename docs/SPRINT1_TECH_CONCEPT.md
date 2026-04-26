# Sprint 1 – Technisches Konzept (Standort & Distanz)

## Ziel
Sprint 1 schafft eine **verlässliche Grundlage** für die Wirtschaftlichkeitsberechnung:
- reproduzierbare Distanzquelle,
- klare Standort-Statuslogik,
- nachvollziehbare Ergebnisqualität mit/ohne Standort.

## Nicht-Ziele
- Keine externe Tankstellen-Quelle (kommt in Sprint 2).
- Kein Routing-Provider-Integrationscode (kommt in Sprint 3).

---

## 1) Standort-Flow (Browser)

### Statusmodell
`locationState`:
- `unknown` – noch nicht angefragt
- `requesting` – Browser-Dialog aktiv
- `granted` – Koordinaten verfügbar
- `denied` – Nutzer hat verweigert
- `unavailable` – Browser/Device liefert keine Position
- `error` – technischer Fehler (Timeout etc.)

### Datenmodell (Vorschlag)
```ts
LocationContext {
  state: 'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error'
  coords?: { lat: number; lng: number; accuracyM?: number }
  timestamp?: string
  message?: string
}
```

### UX-Verhalten
- Bei `granted`: Distanz wird aus Standort + Stationskoordinaten berechnet.
- Bei `denied`/`unavailable`/`error`: Distanzquelle fällt auf manuell gespeicherte Distanz zurück.
- Ergebnis zeigt immer eine **Qualitätskennzeichnung** (siehe Abschnitt 3).

---

## 2) Distanzauflösung (fachlich)

### Prioritätsreihenfolge
1. **Geodistanz** (wenn `locationState=granted` und Station Lat/Lng vorhanden)
2. **Manuelle Distanz** (Fallback)
3. **Nicht berechenbar** (Station wird für aktuelle Berechnung ausgeschlossen)

### Ergebnisobjekt (Vorschlag)
```ts
ResolvedDistance {
  km: number
  source: 'geo_haversine' | 'manual'
  quality: 'high' | 'fallback'
}
```

---

## 3) Ergebnisqualität / Transparenz

Jedes Berechnungsergebnis enthält:
- Distanzquelle (`geo_haversine` oder `manual`)
- Qualitätslabel:
  - `high` bei Geo-Quelle
  - `fallback` bei manueller Distanz
- Standortstatus beim Rechnen (granted/denied/...)

UI-Textbeispiel:
- „Distanzquelle: Geo (Haversine), Qualität: hoch“
- „Distanzquelle: manuell, Qualität: Fallback (Standort nicht verfügbar)“

---

## 4) Referenzkonzept – Entscheidungsrahmen

Da das Referenzkonzept laut Feedback unklar ist, wird in Sprint 1 **kein endgültiger Produktentscheid erzwungen**, sondern vorbereitet:

### Option A (empfohlen)
- Keine Pflicht-Referenz.
- Primärer Output: „Bestes Ziel für aktuellen Kontext“.
- Sekundär: Vergleich zu optional gewählter Referenz.

### Option B
- Referenz bleibt verpflichtend.
- Muss fachlich fixiert werden (z. B. „nächste Station“).

**Entscheidungspunkt für Product Ende Sprint 1.**

---

## 5) Akzeptanzkriterien Sprint 1

1. Standortstatus ist im UI zu jedem Zeitpunkt sichtbar.
2. Berechnung läuft stabil in allen Statuszuständen (`granted`, `denied`, `error` ...).
3. Distanzquelle ist pro Ergebnis transparent ausgewiesen.
4. Keine stillen Berechnungen mit unbekannter Distanzqualität.
5. Rechenpfad ist mit Unit-/Integrationsfällen abgedeckt.

---

## 6) Testmatrix (Sprint 1)

### A) Standort-Status
- `unknown -> requesting -> granted`
- `unknown -> requesting -> denied`
- `unknown -> requesting -> error`

### B) Distanzauflösung
- granted + station lat/lng => `geo_haversine`
- denied + manual distance => `manual`
- denied + no manual distance => Station ausgeschlossen

### C) Ergebniskonsistenz
- gleiche Inputs => gleiche Empfehlung
- Wechsel von `granted` zu `denied` ändert Distanzquelle sichtbar

### D) Regression
- vorhandene Berechnungs-/Währungs-Tests bleiben grün

---

## 7) Technische TODOs für Implementierung

- [ ] `locationState` als expliziten App-State einführen
- [ ] Distanzauflösung liefert strukturiertes `ResolvedDistance`
- [ ] Ergebnisdarstellung um Distanzquelle + Qualitätslabel erweitern
- [ ] Referenzpfad intern entkoppeln (optional vorbereiten)
- [ ] Unit-Tests für Statusmaschine und Distanz-Fallbacks ergänzen
