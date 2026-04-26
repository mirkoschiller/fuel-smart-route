# Sprint Changelog (versioniert)

## v0.1.0 — Sprint 1 (aktuell)

### Ziel
- Verlässliche Standort-/Distanzbasis für wirtschaftliche Empfehlung.

### Umgesetzt
- Browser-Geolocation mit explizitem Statusmodell (unknown/requesting/granted/denied/unavailable/error).
- Distanzauflösung mit klarer Fallback-Strategie:
  - Geo (Haversine)
  - manuelle Distanz
  - legacy manuelle Distanz
  - unavailable
- Ergebnisdarstellung mit Distanzquelle und Qualitätslabel.
- Unit-Tests für Distanz-/Preis-/Ranking-Logik inkl. Standort-Fallbacks.

### Offener Rest in Sprint 1
- Kein offener Sprint-1 TODO mehr (nach aktuellem Backlog-Stand).

---

## v0.2.0 — Sprint 2 (geplant)

### Fokus
- Automatisierte Tankstellen-Erfassung über externe Quellen (Google Places/OSM).

### Geplante Deliverables
- Provider-Adapter-Schnittstelle
- Import-Workflow mit Duplikaterkennung
- E2E-Testfall Suche -> Import -> Berechnung

---

## v0.3.0 — Sprint 3 (geplant)

### Fokus
- Realistische Fahrdistanz/Fahrzeit via Routing APIs.

### Geplante Deliverables
- Routing-Provider-Interface
- Routing-Integration + Caching
- Transparente Distanzquellenanzeige (Route vs. Fallback)

---

## v0.4.0 — Sprint 4 (geplant)

### Fokus
- Fachliche Präzisierung des Wirtschaftlichkeitsmodells.

### Geplante Deliverables
- Berechnungsregeln v2
- Schwellwert-/Sensitivitätsregeln
- Finaler Referenzmodell-Entscheid
