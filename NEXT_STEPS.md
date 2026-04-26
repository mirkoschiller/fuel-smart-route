# Nächste Schritte (Roadmap nach MVP)

## 1) Fachliche Präzisierung

1. **Referenzmodell festlegen**
   - Standard: „nächste Tankstelle“ vs. „vom Nutzer gewählte Referenz“.
   - Klar definieren, ob Distanz **einfach** oder **Hin- und Rückweg** ist.
2. **Energieträger-spezifische Logik**
   - Benzin/Diesel in `€/L`, Strom in `€/kWh`.
   - Nur passende Tankstellen/Ladesäulen pro Fahrzeugtyp anzeigen.
3. **Grenznahe Preislogik (CZ)**
   - Währungsumrechnung (`CZK -> EUR`) mit Zeitstempel.
   - Optional: Grenz-/Maut-/Vignettenkosten berücksichtigen.

## 2) Datenmodell verbessern

1. **Tankstellenpreise normalisieren**
   - Eine Tankstelle hat mehrere Preisfelder (z. B. `e5`, `diesel`, `strom_ac`, `strom_dc`) statt nur einem Preis.
2. **Geodaten statt manuelle Distanz**
   - `lat/lng` für Standort und Stationen speichern.
   - Distanz/Fahrzeit über Routing-API berechnen.
3. **Versions-/Zeitbezug für Preise**
   - Jeder Preis mit `updatedAt`.
   - Alte Preise als „veraltet“ markieren.

## 3) UX und Produktreife

1. **CRUD komplett machen**
   - Bearbeiten/Löschen für Fahrzeuge und Tankstellen.
2. **Validierungen & Guardrails**
   - Wertebereiche, Pflichtfelder, Dublettencheck.
   - Deutliche Fehlermeldungen im UI.
3. **Erklärbare Empfehlung**
   - Ergebnis-Card mit Aufschlüsselung:
     - Preisvorteil
     - Mehrfahrtkosten
     - Netto-Ersparnis

## 4) Qualität & Technik

1. **Testbarkeit erhöhen**
   - Rechenlogik in separates Modul extrahieren.
   - Unit-Tests für Grenzfälle (0 km, negative Ersparnis, gleiche Preise).
2. **TypeScript einführen**
   - Klarere Domänenmodelle (`Vehicle`, `Station`, `PriceSnapshot`, `Recommendation`).
3. **Build-Setup**
   - Vite + ESLint + Prettier + Vitest.

## 5) Externe Datenquellen (nach MVP)

1. **Preisimport-Strategie**
   - Manuell (bestehender Fallback)
   - Halbautomatisch (CSV/JSON Import)
   - Vollautomatisch (API Polling)
2. **Scheduler + Caching**
   - Periodisches Aktualisieren, Rate-Limits, Retry-Strategie.
3. **Observability**
   - Logging für fehlgeschlagene Preisupdates.

## 6) Vorschlag für die nächsten 2 Sprints

### Sprint 1 (stabilisieren)
- CRUD vervollständigen
- Validierungen verbessern
- Rechenlogik modularisieren + Unit-Tests
- Ergebnisansicht mit transparenter Kostenaufschlüsselung

### Sprint 2 (datengetrieben)
- Datenmodell für mehrere Energieträgerpreise
- Geodaten + Distanzberechnung über Routing-API
- Erste API-Anbindung für Kraftstoffpreise (mit Zeitstempel)
