const EARTH_RADIUS_KM = 6371;

export function haversineKm(from, to) {
  const lat1 = degToRad(from.lat);
  const lat2 = degToRad(to.lat);
  const dLat = degToRad(to.lat - from.lat);
  const dLng = degToRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolveStationDistanceInfo(station, currentLocation) {
  if (
    currentLocation &&
    Number.isFinite(station.lat) &&
    Number.isFinite(station.lng) &&
    Number.isFinite(currentLocation.lat) &&
    Number.isFinite(currentLocation.lng)
  ) {
    return {
      km: haversineKm(
        { lat: currentLocation.lat, lng: currentLocation.lng },
        { lat: station.lat, lng: station.lng }
      ),
      source: "geo_haversine",
      quality: "high",
      reason: "Standort + Stationskoordinaten vorhanden",
    };
  }

  if (Number.isFinite(station.distanceManual)) {
    return {
      km: station.distanceManual,
      source: "manual",
      quality: "fallback",
      reason: "Manuelle Distanz als Fallback",
    };
  }

  if (Number.isFinite(station.distance)) {
    return {
      km: station.distance,
      source: "legacy_manual",
      quality: "fallback",
      reason: "Legacy-Distanzwert",
    };
  }

  return {
    km: NaN,
    source: "missing",
    quality: "unavailable",
    reason: "Keine Distanzdaten verfügbar",
  };
}

export function resolveStationDistanceKm(station, currentLocation) {
  return resolveStationDistanceInfo(station, currentLocation).km;
}

export function resolveExchangeRateForStation(station, currentExchangeRate) {
  if (station.currency !== "czk") {
    return null;
  }

  if (station.exchangeRateMode === "snapshot") {
    if (Number.isFinite(station.exchangeRateSnapshot) && station.exchangeRateSnapshot > 0) {
      return station.exchangeRateSnapshot;
    }
  }

  return currentExchangeRate;
}

export function normalizePriceToEur(price, currency, exchangeRateCzkToEur) {
  if (!Number.isFinite(price) || price <= 0) {
    return NaN;
  }

  if (currency === "czk") {
    if (!Number.isFinite(exchangeRateCzkToEur) || exchangeRateCzkToEur <= 0) {
      return NaN;
    }

    return price * exchangeRateCzkToEur;
  }

  return price;
}

export function calculateRealSavingsBreakdown({ station, reference, liters, consumptionPer100 }) {
  const priceAdvantage = (reference.price - station.price) * liters;
  const extraDistance = Math.max(0, station.distance - reference.distance);
  const extraTripCost = extraDistance * 2 * (consumptionPer100 / 100) * reference.price;
  const netSavings = priceAdvantage - extraTripCost;

  return {
    priceAdvantage,
    extraTripCost,
    netSavings,
    worthwhile: netSavings > 0,
  };
}

export function rankStations({ stations, reference, liters, consumptionPer100 }) {
  return stations
    .filter((station) => station.price > 0)
    .map((station) => ({
      station,
      breakdown: calculateRealSavingsBreakdown({
        station,
        reference,
        liters,
        consumptionPer100,
      }),
    }))
    .sort((a, b) => b.breakdown.netSavings - a.breakdown.netSavings);
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}
