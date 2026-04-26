import {
  normalizePriceToEur,
  rankStations,
  resolveExchangeRateForStation,
  resolveStationDistanceKm,
} from "./calc.js";

const STORAGE_KEYS = {
  vehicles: "fuelSmartRoute.vehicles",
  stations: "fuelSmartRoute.stations",
  settings: "fuelSmartRoute.settings",
};

const state = {
  vehicles: normalizeVehicles(load(STORAGE_KEYS.vehicles)),
  stations: normalizeStations(load(STORAGE_KEYS.stations)),
  settings: loadSettings(),
  editingVehicleId: null,
  editingStationId: null,
};

const locationForm = document.querySelector("#location-form");
const locationFeedback = document.querySelector("#location-feedback");
const vehicleForm = document.querySelector("#vehicle-form");
const stationForm = document.querySelector("#station-form");
const calcForm = document.querySelector("#calc-form");
const vehicleList = document.querySelector("#vehicle-list");
const stationList = document.querySelector("#station-list");
const vehicleSelect = document.querySelector("#vehicle-select");
const referenceSelect = document.querySelector("#reference-select");
const referenceMode = document.querySelector("#reference-mode");
const result = document.querySelector("#result");
const vehicleSubmit = document.querySelector("#vehicle-submit");
const stationSubmit = document.querySelector("#station-submit");
const vehicleCancel = document.querySelector("#vehicle-cancel");
const stationCancel = document.querySelector("#station-cancel");
const vehicleFeedback = document.querySelector("#vehicle-feedback");
const stationFeedback = document.querySelector("#station-feedback");
const exportDataButton = document.querySelector("#export-data");
const importDataInput = document.querySelector("#import-data");
const dataFeedback = document.querySelector("#data-feedback");

locationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(locationForm);
  const lat = parseOptionalNumber(formData.get("locationLat"));
  const lng = parseOptionalNumber(formData.get("locationLng"));
  const exchangeRate = Number(formData.get("exchangeRate"));

  if ((lat === null && lng !== null) || (lat !== null && lng === null)) {
    locationFeedback.textContent = "Bitte Latitude und Longitude gemeinsam setzen oder beide leer lassen.";
    locationFeedback.className = "feedback bad";
    return;
  }

  if (lat !== null && (lat < -90 || lat > 90)) {
    locationFeedback.textContent = "Latitude muss zwischen -90 und 90 liegen.";
    locationFeedback.className = "feedback bad";
    return;
  }

  if (lng !== null && (lng < -180 || lng > 180)) {
    locationFeedback.textContent = "Longitude muss zwischen -180 und 180 liegen.";
    locationFeedback.className = "feedback bad";
    return;
  }

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    locationFeedback.textContent = "Wechselkurs muss größer als 0 sein.";
    locationFeedback.className = "feedback bad";
    return;
  }

  state.settings.currentLocation = lat === null ? null : { lat, lng };
  state.settings.exchangeRateCzkToEur = exchangeRate;
  persist(STORAGE_KEYS.settings, state.settings);
  locationFeedback.textContent = "Standort gespeichert.";
  locationFeedback.className = "feedback good";
  render();
});


exportDataButton.addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    vehicles: state.vehicles,
    stations: state.stations,
    settings: state.settings,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fuel-smart-route-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);

  dataFeedback.textContent = "Export erfolgreich erstellt.";
  dataFeedback.className = "feedback good";
});

importDataInput.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.files || !target.files[0]) {
    return;
  }

  const file = target.files[0];
  const text = await file.text();

  try {
    const parsed = JSON.parse(text);
    const validation = validateImportPayload(parsed);

    if (validation) {
      dataFeedback.textContent = validation;
      dataFeedback.className = "feedback bad";
      return;
    }

    state.vehicles = normalizeVehicles(parsed.vehicles);
    state.stations = normalizeStations(parsed.stations);
    state.settings = {
      currentLocation: parsed.settings?.currentLocation ?? null,
      exchangeRateCzkToEur: Number.isFinite(parsed.settings?.exchangeRateCzkToEur)
        ? parsed.settings.exchangeRateCzkToEur
        : 0.04,
    };

    persist(STORAGE_KEYS.vehicles, state.vehicles);
    persist(STORAGE_KEYS.stations, state.stations);
    persist(STORAGE_KEYS.settings, state.settings);

    dataFeedback.textContent = "Import erfolgreich. Daten wurden übernommen.";
    dataFeedback.className = "feedback good";
    render();
  } catch {
    dataFeedback.textContent = "Import fehlgeschlagen: Ungültiges JSON.";
    dataFeedback.className = "feedback bad";
  } finally {
    importDataInput.value = "";
  }
});

vehicleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  vehicleFeedback.textContent = "";

  const formData = new FormData(vehicleForm);
  const vehicle = {
    id: state.editingVehicleId || crypto.randomUUID(),
    name: formData.get("name")?.toString().trim(),
    energyType: formData.get("energyType")?.toString(),
    consumption: Number(formData.get("consumption")),
    capacity: Number(formData.get("capacity")),
  };

  const validationError = validateVehicle(vehicle);
  if (validationError) {
    vehicleFeedback.textContent = validationError;
    vehicleFeedback.className = "feedback bad";
    return;
  }

  const duplicate = state.vehicles.find(
    (item) =>
      item.id !== vehicle.id &&
      item.name.toLowerCase() === vehicle.name.toLowerCase() &&
      item.energyType === vehicle.energyType
  );

  if (duplicate) {
    vehicleFeedback.textContent = "Fahrzeug bereits vorhanden (Name + Energieträger).";
    vehicleFeedback.className = "feedback bad";
    return;
  }

  if (state.editingVehicleId) {
    state.vehicles = state.vehicles.map((item) => (item.id === vehicle.id ? vehicle : item));
  } else {
    state.vehicles.push(vehicle);
  }

  persist(STORAGE_KEYS.vehicles, state.vehicles);
  resetVehicleForm();
  vehicleFeedback.textContent = "Fahrzeug gespeichert.";
  vehicleFeedback.className = "feedback good";
  render();
});

stationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  stationFeedback.textContent = "";

  const formData = new FormData(stationForm);
  const station = {
    id: state.editingStationId || crypto.randomUUID(),
    name: formData.get("name")?.toString().trim(),
    region: formData.get("region")?.toString().trim(),
    currency: formData.get("currency")?.toString().toLowerCase() || "eur",
    exchangeRateMode: formData.get("exchangeRateMode")?.toString().toLowerCase() || "snapshot",
    exchangeRateSnapshot: null,
    distanceManual: parseOptionalNumber(formData.get("distanceManual")),
    lat: parseOptionalNumber(formData.get("stationLat")),
    lng: parseOptionalNumber(formData.get("stationLng")),
    prices: {
      benzin: parseOptionalNumber(formData.get("priceBenzin")),
      diesel: parseOptionalNumber(formData.get("priceDiesel")),
      strom: parseOptionalNumber(formData.get("priceStrom")),
    },
    priceUpdatedAt: new Date().toISOString(),
  };

  const validationError = validateStation(station);
  if (validationError) {
    stationFeedback.textContent = validationError;
    stationFeedback.className = "feedback bad";
    return;
  }

  if (station.currency === "czk") {
    station.exchangeRateSnapshot =
      station.exchangeRateMode === "snapshot" ? state.settings.exchangeRateCzkToEur : null;
  } else {
    station.exchangeRateSnapshot = null;
  }

  const duplicate = state.stations.find(
    (item) =>
      item.id !== station.id &&
      item.name.toLowerCase() === station.name.toLowerCase() &&
      item.region.toLowerCase() === station.region.toLowerCase()
  );

  if (duplicate) {
    stationFeedback.textContent = "Tankstelle bereits vorhanden (Name + Region).";
    stationFeedback.className = "feedback bad";
    return;
  }

  if (state.editingStationId) {
    state.stations = state.stations.map((item) => (item.id === station.id ? station : item));
  } else {
    state.stations.push(station);
  }

  persist(STORAGE_KEYS.stations, state.stations);
  resetStationForm();
  stationFeedback.textContent = "Tankstelle gespeichert.";
  stationFeedback.className = "feedback good";
  render();
});

vehicleList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const { action, id } = target.dataset;
  if (!id || !action) {
    return;
  }

  if (action === "edit") {
    startEditVehicle(id);
    return;
  }

  if (action === "delete") {
    state.vehicles = state.vehicles.filter((item) => item.id !== id);
    persist(STORAGE_KEYS.vehicles, state.vehicles);
    if (state.editingVehicleId === id) {
      resetVehicleForm();
    }
    render();
  }
});

stationList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const { action, id } = target.dataset;
  if (!id || !action) {
    return;
  }

  if (action === "edit") {
    startEditStation(id);
    return;
  }

  if (action === "delete") {
    state.stations = state.stations.filter((item) => item.id !== id);
    persist(STORAGE_KEYS.stations, state.stations);
    if (state.editingStationId === id) {
      resetStationForm();
    }
    render();
  }
});

vehicleCancel.addEventListener("click", () => {
  resetVehicleForm();
  render();
});

stationCancel.addEventListener("click", () => {
  resetStationForm();
  render();
});

calcForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const vehicle = state.vehicles.find((item) => item.id === vehicleSelect.value);
  const liters = Number(document.querySelector("#desired-liters").value);

  if (!vehicle || !liters || liters <= 0) {
    result.innerHTML =
      '<div class="result-item bad">Bitte Fahrzeug und Tank-/Lademenge prüfen.</div>';
    return;
  }

  const stationsWithEnergyPrice = state.stations
    .map((station) => {
      const rawPrice = station.prices?.[vehicle.energyType] ?? null;
      const exchangeRateUsed = resolveExchangeRateForStation(
        station,
        state.settings.exchangeRateCzkToEur
      );
      const price = normalizePriceToEur(rawPrice, station.currency || "eur", exchangeRateUsed);
      const distance = resolveStationDistanceKm(station, state.settings.currentLocation);
      return Number.isFinite(price) && Number.isFinite(distance)
        ? { ...station, price, rawPrice, exchangeRateUsed }
        : null;
    })
    .filter(Boolean);

  if (!stationsWithEnergyPrice.length) {
    result.innerHTML = `<div class="result-item bad">Keine passenden Preise/Entfernungen für Energieträger <strong>${escapeHtml(
      vehicle.energyType
    )}</strong> vorhanden.</div>`;
    return;
  }

  const reference = pickReferenceStation({
    stations: stationsWithEnergyPrice,
    mode: referenceMode.value,
    manualId: referenceSelect.value,
  });

  const rows = rankStations({
    stations: stationsWithEnergyPrice,
    reference,
    liters,
    consumptionPer100: vehicle.consumption,
  });

  const referenceInfo = `<div class="result-item"><strong>Referenz:</strong> ${escapeHtml(reference.name)} (${referenceMode.value})</div>`;

  result.innerHTML =
    referenceInfo +
    rows
      .map(({ station, breakdown }) => {
      const unit = vehicle.energyType === "strom" ? "€/kWh" : "€/L";
      return `
      <div class="result-item">
        <strong>${escapeHtml(station.name)}</strong> (${escapeHtml(station.region)})<br />
        Preis (${escapeHtml(vehicle.energyType)}): ${station.rawPrice.toFixed(3)} ${station.currency === "czk" ? "CZK" : "EUR"}${unit === "€/kWh" ? "/kWh" : "/L"} (=${station.price.toFixed(3)} EUR) · Distanz: ${station.distance.toFixed(1)} km<br />
        ${station.currency === "czk" ? `Kurs: ${station.exchangeRateUsed.toFixed(4)} (${station.exchangeRateMode === "snapshot" ? "Snapshot" : "Live"})<br />` : ""}
        Preisvorteil: ${breakdown.priceAdvantage.toFixed(2)} € · Mehrfahrtkosten: ${breakdown.extraTripCost.toFixed(2)} €<br />
        Reale Ersparnis ggü. Referenz: <strong>${breakdown.netSavings.toFixed(2)} €</strong><br />
        Empfehlung: <span class="${breakdown.worthwhile ? "good" : "bad"}">${
        breakdown.worthwhile ? "lohnt sich" : "lohnt sich nicht"
      }</span>
      </div>`;
    })
    .join("");
});


function normalizeVehicles(vehicles) {
  if (!Array.isArray(vehicles)) {
    return [];
  }

  return vehicles
    .filter((vehicle) => vehicle && typeof vehicle === "object")
    .map((vehicle) => ({
      id: vehicle.id || crypto.randomUUID(),
      name: String(vehicle.name ?? "").trim(),
      energyType: String(vehicle.energyType ?? "").toLowerCase(),
      consumption: Number(vehicle.consumption),
      capacity: Number(vehicle.capacity),
    }))
    .filter(
      (vehicle) =>
        vehicle.name &&
        ["benzin", "diesel", "strom"].includes(vehicle.energyType) &&
        Number.isFinite(vehicle.consumption) &&
        vehicle.consumption > 0 &&
        Number.isFinite(vehicle.capacity) &&
        vehicle.capacity > 0
    );
}

function normalizeStations(stations) {
  if (!Array.isArray(stations)) {
    return [];
  }

  return stations
    .filter((station) => station && typeof station === "object")
    .map((station) => ({
      id: station.id || crypto.randomUUID(),
      name: String(station.name ?? "").trim(),
      region: String(station.region ?? "").trim(),
      currency: ["eur", "czk"].includes(station.currency) ? station.currency : "eur",
      exchangeRateMode: ["snapshot", "live"].includes(station.exchangeRateMode)
        ? station.exchangeRateMode
        : "snapshot",
      exchangeRateSnapshot: Number.isFinite(station.exchangeRateSnapshot)
        ? station.exchangeRateSnapshot
        : null,
      distanceManual: Number.isFinite(station.distanceManual)
        ? station.distanceManual
        : Number.isFinite(station.distance)
          ? station.distance
          : null,
      lat: Number.isFinite(station.lat) ? station.lat : null,
      lng: Number.isFinite(station.lng) ? station.lng : null,
      prices: {
        benzin: Number.isFinite(station.prices?.benzin) ? station.prices.benzin : null,
        diesel: Number.isFinite(station.prices?.diesel) ? station.prices.diesel : null,
        strom: Number.isFinite(station.prices?.strom) ? station.prices.strom : null,
      },
      priceUpdatedAt: station.priceUpdatedAt || null,
    }))
    .filter((station) => station.name && station.region);
}

function parseOptionalNumber(value) {
  if (value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateVehicle(vehicle) {
  if (!vehicle.name) {
    return "Bitte Fahrzeugname eingeben.";
  }
  if (!vehicle.energyType) {
    return "Bitte Energieträger wählen.";
  }
  if (!Number.isFinite(vehicle.consumption) || vehicle.consumption <= 0) {
    return "Verbrauch muss größer als 0 sein.";
  }
  if (!Number.isFinite(vehicle.capacity) || vehicle.capacity <= 0) {
    return "Tank-/Akkukapazität muss größer als 0 sein.";
  }

  return null;
}

function validateStation(station) {
  if (!station.name) {
    return "Bitte Stationsnamen eingeben.";
  }
  if (!station.region) {
    return "Bitte Region eingeben.";
  }
  if (!["eur", "czk"].includes(station.currency)) {
    return "Währung muss EUR oder CZK sein.";
  }
  if (!["snapshot", "live"].includes(station.exchangeRateMode)) {
    return "Wechselkurs-Modus muss snapshot oder live sein.";
  }

  const hasManualDistance = Number.isFinite(station.distanceManual) && station.distanceManual >= 0;
  const hasCoordinates = Number.isFinite(station.lat) && Number.isFinite(station.lng);

  if (!hasManualDistance && !hasCoordinates) {
    return "Bitte Distanz (manuell) oder Koordinaten (Lat/Lng) erfassen.";
  }

  if ((station.lat === null) !== (station.lng === null)) {
    return "Bitte Stations-Latitude und -Longitude gemeinsam setzen.";
  }

  if (station.lat !== null && (station.lat < -90 || station.lat > 90)) {
    return "Stations-Latitude muss zwischen -90 und 90 liegen.";
  }

  if (station.lng !== null && (station.lng < -180 || station.lng > 180)) {
    return "Stations-Longitude muss zwischen -180 und 180 liegen.";
  }

  const prices = Object.values(station.prices);
  const hasPrice = prices.some((value) => Number.isFinite(value) && value > 0);

  if (!hasPrice) {
    return "Bitte mindestens einen gültigen Preis (Benzin/Diesel/Strom) erfassen.";
  }

  if (prices.some((value) => value !== null && (!Number.isFinite(value) || value <= 0))) {
    return "Preise müssen größer als 0 sein.";
  }

  return null;
}


function validateImportPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Import-Datei hat kein gültiges Objektformat.";
  }

  if (!Array.isArray(payload.vehicles) || !Array.isArray(payload.stations)) {
    return "Import-Datei benötigt Arrays für vehicles und stations.";
  }

  if (payload.vehicles.length === 0 && payload.stations.length === 0) {
    return "Import-Datei enthält keine Fahrzeug- oder Tankstellen-Daten.";
  }

  return null;
}

function startEditVehicle(id) {
  const vehicle = state.vehicles.find((item) => item.id === id);
  if (!vehicle) {
    return;
  }

  vehicleForm.elements.namedItem("name").value = vehicle.name;
  vehicleForm.elements.namedItem("energyType").value = vehicle.energyType;
  vehicleForm.elements.namedItem("consumption").value = vehicle.consumption;
  vehicleForm.elements.namedItem("capacity").value = vehicle.capacity;
  state.editingVehicleId = id;
  vehicleSubmit.textContent = "Fahrzeug aktualisieren";
  vehicleCancel.hidden = false;
}

function startEditStation(id) {
  const station = state.stations.find((item) => item.id === id);
  if (!station) {
    return;
  }

  stationForm.elements.namedItem("name").value = station.name;
  stationForm.elements.namedItem("region").value = station.region;
  stationForm.elements.namedItem("currency").value = station.currency ?? "eur";
  stationForm.elements.namedItem("exchangeRateMode").value = station.exchangeRateMode ?? "snapshot";
  stationForm.elements.namedItem("distanceManual").value = station.distanceManual ?? "";
  stationForm.elements.namedItem("stationLat").value = station.lat ?? "";
  stationForm.elements.namedItem("stationLng").value = station.lng ?? "";
  stationForm.elements.namedItem("priceBenzin").value = station.prices?.benzin ?? "";
  stationForm.elements.namedItem("priceDiesel").value = station.prices?.diesel ?? "";
  stationForm.elements.namedItem("priceStrom").value = station.prices?.strom ?? "";
  state.editingStationId = id;
  stationSubmit.textContent = "Tankstelle aktualisieren";
  stationCancel.hidden = false;
}

function resetVehicleForm() {
  vehicleForm.reset();
  state.editingVehicleId = null;
  vehicleSubmit.textContent = "Fahrzeug speichern";
  vehicleCancel.hidden = true;
}

function resetStationForm() {
  stationForm.reset();
  state.editingStationId = null;
  stationSubmit.textContent = "Tankstelle speichern";
  stationCancel.hidden = true;
}


function pickReferenceStation({ stations, mode, manualId }) {
  if (!stations.length) {
    return null;
  }

  if (mode === "manual") {
    return stations.find((item) => item.id === manualId) || nearestStation(stations);
  }

  if (mode === "cheapest") {
    return [...stations].sort((a, b) => a.price - b.price || a.distance - b.distance)[0];
  }

  return nearestStation(stations);
}

function nearestStation(stations) {
  if (!stations.length) {
    return null;
  }

  return [...stations].sort((a, b) => a.distance - b.distance)[0];
}

function load(key) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function loadSettings() {
  const settings = load(STORAGE_KEYS.settings);
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    currentLocation:
      Number.isFinite(source.currentLocation?.lat) && Number.isFinite(source.currentLocation?.lng)
        ? { lat: source.currentLocation.lat, lng: source.currentLocation.lng }
        : null,
    exchangeRateCzkToEur: Number.isFinite(source.exchangeRateCzkToEur)
      ? source.exchangeRateCzkToEur
      : 0.04,
  };
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatStationPrices(prices, currency, exchangeRateMode, exchangeRateSnapshot) {
  const entries = [
    ["Benzin", prices?.benzin],
    ["Diesel", prices?.diesel],
    ["Strom", prices?.strom],
  ]
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([label, value]) => `${label}: ${value.toFixed(3)}`);

  const suffix = currency === "czk" ? "CZK" : "EUR";
  const rateInfo =
    currency === "czk"
      ? exchangeRateMode === "snapshot"
        ? `, Kurs-Snapshot: ${Number.isFinite(exchangeRateSnapshot) ? exchangeRateSnapshot.toFixed(4) : "-"}`
        : ", Kurs: live"
      : "";
  return entries.length ? `${entries.join(" · ")} (${suffix}${rateInfo})` : "Keine Preise";
}

function render() {
  locationForm.elements.namedItem("locationLat").value = state.settings.currentLocation?.lat ?? "";
  locationForm.elements.namedItem("locationLng").value = state.settings.currentLocation?.lng ?? "";
  locationForm.elements.namedItem("exchangeRate").value = state.settings.exchangeRateCzkToEur;

  vehicleList.innerHTML = state.vehicles
    .map(
      (vehicle) =>
        `<li class="list-row">
          <span>${escapeHtml(vehicle.name)} · ${vehicle.energyType} · ${vehicle.consumption.toFixed(
          1
        )}/100 · Kapazität ${vehicle.capacity.toFixed(1)}</span>
          <span class="row-actions">
            <button type="button" class="mini secondary" data-action="edit" data-id="${vehicle.id}">Bearbeiten</button>
            <button type="button" class="mini danger" data-action="delete" data-id="${vehicle.id}">Löschen</button>
          </span>
        </li>`
    )
    .join("");

  stationList.innerHTML = state.stations
    .map((station) => {
      const distance = resolveStationDistanceKm(station, state.settings.currentLocation);
      const distanceLabel = Number.isFinite(distance) ? `${distance.toFixed(1)} km` : "keine Distanz";

      return `<li class="list-row">
          <span>${escapeHtml(station.name)} (${escapeHtml(station.region)}) · ${distanceLabel} · ${escapeHtml(
        formatStationPrices(
          station.prices,
          station.currency || "eur",
          station.exchangeRateMode || "snapshot",
          station.exchangeRateSnapshot
        )
      )}</span>
          <span class="row-actions">
            <button type="button" class="mini secondary" data-action="edit" data-id="${station.id}">Bearbeiten</button>
            <button type="button" class="mini danger" data-action="delete" data-id="${station.id}">Löschen</button>
          </span>
        </li>`;
    })
    .join("");

  const vehicleOptions = state.vehicles
    .map((vehicle) => `<option value="${vehicle.id}">${escapeHtml(vehicle.name)}</option>`)
    .join("");

  vehicleSelect.innerHTML = vehicleOptions || "<option value=''>Keine Fahrzeuge</option>";

  const selectedVehicle =
    state.vehicles.find((item) => item.id === vehicleSelect.value) || state.vehicles[0];
  const energyType = selectedVehicle?.energyType;

  const eligibleStations = state.stations.filter((station) => {
    const rawPrice = station.prices?.[energyType];
    const exchangeRateUsed = resolveExchangeRateForStation(
      station,
      state.settings.exchangeRateCzkToEur
    );
    const price = normalizePriceToEur(rawPrice, station.currency || "eur", exchangeRateUsed);
    const distance = resolveStationDistanceKm(station, state.settings.currentLocation);
    return Number.isFinite(price) && Number.isFinite(distance);
  });

  const referenceOptions = eligibleStations
    .map((station) => `<option value="${station.id}">${escapeHtml(station.name)}</option>`)
    .join("");

  referenceSelect.innerHTML =
    referenceOptions || "<option value=''>Keine passenden Tankstellen</option>";
  referenceSelect.disabled = referenceMode.value !== "manual";
}

vehicleSelect.addEventListener("change", render);
referenceMode.addEventListener("change", render);

render();
