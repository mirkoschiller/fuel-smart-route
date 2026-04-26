import { rankStations } from "./calc.js";

const STORAGE_KEYS = {
  vehicles: "fuelSmartRoute.vehicles",
  stations: "fuelSmartRoute.stations",
};

const state = {
  vehicles: load(STORAGE_KEYS.vehicles),
  stations: load(STORAGE_KEYS.stations),
  editingVehicleId: null,
  editingStationId: null,
};

const vehicleForm = document.querySelector("#vehicle-form");
const stationForm = document.querySelector("#station-form");
const calcForm = document.querySelector("#calc-form");
const vehicleList = document.querySelector("#vehicle-list");
const stationList = document.querySelector("#station-list");
const vehicleSelect = document.querySelector("#vehicle-select");
const referenceSelect = document.querySelector("#reference-select");
const result = document.querySelector("#result");
const vehicleSubmit = document.querySelector("#vehicle-submit");
const stationSubmit = document.querySelector("#station-submit");
const vehicleCancel = document.querySelector("#vehicle-cancel");
const stationCancel = document.querySelector("#station-cancel");
const vehicleFeedback = document.querySelector("#vehicle-feedback");
const stationFeedback = document.querySelector("#station-feedback");

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
    distance: Number(formData.get("distance")),
    prices: {
      benzin: parseOptionalNumber(formData.get("priceBenzin")),
      diesel: parseOptionalNumber(formData.get("priceDiesel")),
      strom: parseOptionalNumber(formData.get("priceStrom")),
    },
  };

  const validationError = validateStation(station);
  if (validationError) {
    stationFeedback.textContent = validationError;
    stationFeedback.className = "feedback bad";
    return;
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
      const price = station.prices?.[vehicle.energyType] ?? null;
      return price && price > 0 ? { ...station, price } : null;
    })
    .filter(Boolean);

  if (!stationsWithEnergyPrice.length) {
    result.innerHTML = `<div class="result-item bad">Keine passenden Preise für Energieträger <strong>${escapeHtml(
      vehicle.energyType
    )}</strong> vorhanden.</div>`;
    return;
  }

  const reference =
    stationsWithEnergyPrice.find((item) => item.id === referenceSelect.value) ||
    nearestStation(stationsWithEnergyPrice);

  const rows = rankStations({
    stations: stationsWithEnergyPrice,
    reference,
    liters,
    consumptionPer100: vehicle.consumption,
  });

  result.innerHTML = rows
    .map(({ station, breakdown }) => {
      const unit = vehicle.energyType === "strom" ? "€/kWh" : "€/L";
      return `
      <div class="result-item">
        <strong>${escapeHtml(station.name)}</strong> (${escapeHtml(station.region)})<br />
        Preis (${escapeHtml(vehicle.energyType)}): ${station.price.toFixed(3)} ${unit} · Distanz: ${station.distance.toFixed(1)} km<br />
        Preisvorteil: ${breakdown.priceAdvantage.toFixed(2)} € · Mehrfahrtkosten: ${breakdown.extraTripCost.toFixed(2)} €<br />
        Reale Ersparnis ggü. Referenz: <strong>${breakdown.netSavings.toFixed(2)} €</strong><br />
        Empfehlung: <span class="${breakdown.worthwhile ? "good" : "bad"}">${
        breakdown.worthwhile ? "lohnt sich" : "lohnt sich nicht"
      }</span>
      </div>`;
    })
    .join("");
});

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
  if (!Number.isFinite(station.distance) || station.distance < 0) {
    return "Distanz muss 0 oder größer sein.";
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
  stationForm.elements.namedItem("distance").value = station.distance;
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

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatStationPrices(prices) {
  const entries = [
    ["Benzin", prices?.benzin],
    ["Diesel", prices?.diesel],
    ["Strom", prices?.strom],
  ]
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([label, value]) => `${label}: ${value.toFixed(3)}`);

  return entries.length ? entries.join(" · ") : "Keine Preise";
}

function render() {
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
    .map(
      (station) =>
        `<li class="list-row">
          <span>${escapeHtml(station.name)} (${escapeHtml(station.region)}) · ${station.distance.toFixed(
          1
        )} km · ${escapeHtml(formatStationPrices(station.prices))}</span>
          <span class="row-actions">
            <button type="button" class="mini secondary" data-action="edit" data-id="${station.id}">Bearbeiten</button>
            <button type="button" class="mini danger" data-action="delete" data-id="${station.id}">Löschen</button>
          </span>
        </li>`
    )
    .join("");

  const vehicleOptions = state.vehicles
    .map((vehicle) => `<option value="${vehicle.id}">${escapeHtml(vehicle.name)}</option>`)
    .join("");

  vehicleSelect.innerHTML = vehicleOptions || "<option value=''>Keine Fahrzeuge</option>";

  const selectedVehicle = state.vehicles.find((item) => item.id === vehicleSelect.value) || state.vehicles[0];
  const energyType = selectedVehicle?.energyType;

  const eligibleStations = state.stations.filter((station) => {
    const price = station.prices?.[energyType];
    return Number.isFinite(price) && price > 0;
  });

  const referenceOptions = eligibleStations
    .map((station) => `<option value="${station.id}">${escapeHtml(station.name)}</option>`)
    .join("");

  referenceSelect.innerHTML = referenceOptions || "<option value=''>Keine passenden Tankstellen</option>";
}

vehicleSelect.addEventListener("change", render);

render();
