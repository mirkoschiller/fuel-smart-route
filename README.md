# Fuel Smart Route (MVP)

Fuel Smart Route ist eine einfache Web-App zur wirtschaftlichen Tankentscheidung.

## Was der MVP kann

- Fahrzeugprofile anlegen (Energieträger, Verbrauch, Tank-/Akkudaten)
- Tankstellen speichern (inkl. Entfernung)
- Kraftstoffpreise je Tankstelle erfassen (Benzin, Diesel, Strom)
- Reale Ersparnis berechnen (inkl. zusätzlichem Fahrtaufwand)
- Ergebnis mit Kostenaufschlüsselung (Preisvorteil, Mehrfahrtkosten, Netto)
- Empfehlung ausgeben: **"lohnt sich"** oder **"lohnt sich nicht"**
- Fahrzeugprofile und Tankstellen **bearbeiten/löschen** (CRUD-Basis)
- Energieträger-spezifische Empfehlung (nur passende Preise/Stationen werden verglichen)
- Optionaler aktueller Standort (Lat/Lng) für automatische Distanzberechnung über Geo-Koordinaten
- Daten als JSON exportieren/importieren (Backup & Transfer)
- CZK-Preise mit manuell gepflegtem Wechselkurs (CZK → EUR) berücksichtigen (Live oder Snapshot je Station)
- Referenz-Strategie wählbar: nächste, günstigste oder manuell

## Berechnungslogik (MVP)

Die App vergleicht jede Tankstelle mit einer Referenz-Tankstelle (standardmäßig die nächstgelegene):

- **Preisvorteil** = `(Referenzpreis - Stationspreis) * gewünschte Liter`
- **Mehrfahrtkosten** = `max(0, Stationsdistanz - Referenzdistanz) * 2 * (Verbrauch/100) * Referenzpreis`
- **Reale Ersparnis** = `Preisvorteil - Mehrfahrtkosten`

Wenn die reale Ersparnis > 0 ist, lautet die Empfehlung **"lohnt sich"**.

## Lokaler Start

Da es ein statischer MVP ist, reicht ein einfacher Webserver:

```bash
python -m http.server 8080
```

Dann im Browser öffnen:

- http://localhost:8080

## Hinweis zu Datenquellen

Preisquellen sind im MVP zunächst manuell. API-Integrationen (z. B. Benzinpreis-Feeds oder Stromtarife) können später ergänzt werden.

## Nächste Schritte

Eine konkrete Roadmap findest du in [NEXT_STEPS.md](./NEXT_STEPS.md).


## Tests

```bash
npm test
```

