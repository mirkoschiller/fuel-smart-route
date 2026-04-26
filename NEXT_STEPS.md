# Nächste Schritte (re-priorisiert nach Nutzerfeedback)

## Zielbild nach Feedback

Fokus ist **nicht** mehr auf neue UI-Features, sondern auf:
1. **verlässliche Standortermittlung**,
2. **automatisches Hinzufügen von Tankstellen** (statt rein manuell),
3. **realistische Distanz/Fahrtkosten über Routing-Dienste**,
4. **klarere Logik für Referenz-Vergleich** (oder Entfernung dieses Konzepts).

---

## Sprint 1 – Stabilisierung der Kernlogik (1 Woche)

### Scope
- Standortabfrage im Browser sauber integrieren (`navigator.geolocation`)
- Explizite Zustände im UI:
  - Standort erlaubt
  - Standort verweigert
  - Standort nicht verfügbar
- Rechenpfad absichern:
  - ohne Standort => klarer Fallback (keine „Pseudo-Genauigkeit“)
  - mit Standort => Distanz aus Standort + Stationsdaten
- Referenzlogik klären:
  - Option A: Referenz entfernen, nur „bestes Ziel“ + Begründung
  - Option B: Referenz bleibt, aber wird fachlich strikt definiert (z. B. „nächste Station“)

### Deliverables
- Technische Spezifikation „Standort & Distanz“
- Akzeptanzkriterien für Berechnung mit/ohne Standort
- Überarbeitete Ergebnisdarstellung mit nachvollziehbarer Begründung

### TODOs
- [x] Geolocation-Flow inkl. Fehlercodes implementieren/überarbeiten
- [x] Berechnungsservice um explizite Fallback-Strategie erweitern
- [x] UI-Texte für Standortstatus und Berechnungsqualität ergänzen
- [x] Unit-Tests für Standort-Fallbacks ergänzen
- [x] Sprint-1-Konzeptdokument erstellt: `docs/SPRINT1_TECH_CONCEPT.md`

---

## Sprint 2 – Tankstellen-Erfassung automatisieren (1–2 Wochen)

### Scope
- Importweg statt reiner manueller Eingabe
- Primärziel: Tankstellen aus externer Quelle hinzufügen
  - Google Places API **oder** alternative Anbieter (OpenStreetMap/Overpass)
- Such-/Importfluss:
  - Suche nach Region/Koordinate
  - Vorschläge anzeigen
  - Mehrfachauswahl und Import in lokale Daten

### Deliverables
- Provider-Adapter-Schnittstelle (austauschbar)
- Erste integrierte Datenquelle (MVP: 1 Provider)
- Import-UI inkl. Duplikaterkennung

### TODOs
- [ ] Provider-Entscheidung dokumentieren (Kosten, Limits, Datenschutz)
- [ ] Adapter-Interface `StationSearchProvider` definieren
- [ ] Importmaske mit Ergebnisliste + „Übernehmen“-Aktion bauen
- [ ] Duplikatlogik (Name+Adresse+Koordinate) implementieren
- [ ] E2E-Testfall „Suche -> Import -> Berechnung“ definieren

---

## Sprint 3 – Realistische Entfernungen per Routing (1–2 Wochen)

### Scope
- Luftlinie/Hilfsdistanz ersetzen bzw. optional lassen
- Fahrdistanz/Fahrzeit über Routing API (z. B. Google Directions, OSRM, Here)
- Caching und Kostenkontrolle (API-Calls)

### Deliverables
- Routing-Service mit einheitlicher Schnittstelle
- Distanzquelle pro Ergebnis transparent anzeigen (Luftlinie vs. Route)
- API-Fehlerhandling + Fallback-Strategie

### TODOs
- [ ] `RoutingProvider`-Interface einführen
- [ ] Routing für „aktueller Standort -> Station“ implementieren
- [ ] Response-Caching (TTL) ergänzen
- [ ] Fehlerfälle (Timeout, Limit, kein Route-Result) testen
- [ ] Ergebnisansicht um „Distanzquelle“ und „Standzeit“ ergänzen

---

## Sprint 4 – Wirtschaftlichkeitsmodell präzisieren (1 Woche)

### Scope
- Fachlogik schärfen, damit Empfehlung in der Praxis plausibel ist
- Energieart-spezifische Regeln (Benzin/Diesel vs. Strom)
- Referenzmodell finalisieren

### Deliverables
- Fachdokument „Berechnungsregeln v2"
- Versioniertes Regelset für spätere API-/Backend-Nutzung

### TODOs
- [ ] Formelparameter als konfigurierte Policy auslagern
- [ ] „Lohnt sich“-Schwelle definieren (z. B. Mindestersparnis)
- [ ] Sensitivitäts-Tests (Preisänderung, Distanzänderung, Verbrauch) ergänzen
- [ ] Vergleich „mit Referenz“ vs. „ohne Referenz“ per UX-Test evaluieren

---

## Offene Entscheidungen (benötigen Product Input)

1. **Externe Datenquelle Tankstellen**: Google Places vs. OSM/Overpass?
2. **Routinganbieter**: kostenpflichtig/kommerziell vs. Open-Source?
3. **Referenzkonzept**: verpflichtend, optional oder vollständig entfernen?
4. **Datenschutz**: Standort nur lokal oder serverseitig verarbeiten?

---

## Definition of Done (für kommende Sprints)

- Berechnung liefert reproduzierbare Ergebnisse aus dokumentierter Distanzquelle.
- Standortstatus ist für Nutzende klar sichtbar.
- Tankstellen können ohne händische Vollpflege aus externer Quelle übernommen werden.
- Alle kritischen Rechenpfade sind mit Unit-/Integrationstests abgedeckt.
