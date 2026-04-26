import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRealSavingsBreakdown,
  haversineKm,
  rankStations,
  resolveStationDistanceKm,
  normalizePriceToEur,
  resolveExchangeRateForStation,
  resolveStationDistanceInfo,
} from "../calc.js";

test("calculateRealSavingsBreakdown computes savings and marks worthwhile", () => {
  const breakdown = calculateRealSavingsBreakdown({
    station: { distance: 8, price: 1.69 },
    reference: { distance: 4, price: 1.79 },
    liters: 40,
    consumptionPer100: 6.5,
  });

  assert.equal(breakdown.priceAdvantage.toFixed(2), "4.00");
  assert.equal(breakdown.extraTripCost.toFixed(2), "0.93");
  assert.equal(breakdown.netSavings.toFixed(2), "3.07");
  assert.equal(breakdown.worthwhile, true);
});

test("rankStations sorts descending by net savings", () => {
  const ranked = rankStations({
    stations: [
      { id: "a", distance: 8, price: 1.69 },
      { id: "b", distance: 2, price: 1.82 },
      { id: "c", distance: 6, price: 1.75 },
    ],
    reference: { distance: 2, price: 1.82 },
    liters: 30,
    consumptionPer100: 7,
  });

  assert.equal(ranked[0].station.id, "a");
  assert.equal(ranked.at(-1).station.id, "b");
});

test("haversineKm returns near-zero for same location", () => {
  const distance = haversineKm({ lat: 50.0, lng: 12.0 }, { lat: 50.0, lng: 12.0 });
  assert.ok(distance < 0.001);
});

test("resolveStationDistanceKm prefers geo distance when current location is available", () => {
  const station = { lat: 50.41, lng: 12.17, distanceManual: 99 };
  const current = { lat: 50.40, lng: 12.15 };

  const distance = resolveStationDistanceKm(station, current);

  assert.ok(distance > 0);
  assert.ok(distance < 10);
});


test("normalizePriceToEur converts CZK prices and keeps EUR prices", () => {
  assert.equal(normalizePriceToEur(40, "czk", 0.04).toFixed(2), "1.60");
  assert.equal(normalizePriceToEur(1.73, "eur", 0.04).toFixed(2), "1.73");
});


test("resolveExchangeRateForStation respects snapshot mode for CZK", () => {
  const snapshotRate = resolveExchangeRateForStation(
    { currency: "czk", exchangeRateMode: "snapshot", exchangeRateSnapshot: 0.0391 },
    0.0412
  );
  const liveRate = resolveExchangeRateForStation(
    { currency: "czk", exchangeRateMode: "live", exchangeRateSnapshot: 0.0391 },
    0.0412
  );

  assert.equal(snapshotRate, 0.0391);
  assert.equal(liveRate, 0.0412);
});


test("resolveStationDistanceInfo returns manual fallback metadata", () => {
  const info = resolveStationDistanceInfo({ distanceManual: 7.5 }, null);
  assert.equal(info.km, 7.5);
  assert.equal(info.source, "manual");
  assert.equal(info.quality, "fallback");
});


test("resolveStationDistanceInfo returns geo source with high quality when coords exist", () => {
  const info = resolveStationDistanceInfo(
    { lat: 50.41, lng: 12.17, distanceManual: 10 },
    { lat: 50.40, lng: 12.15 }
  );

  assert.ok(info.km > 0);
  assert.equal(info.source, "geo_haversine");
  assert.equal(info.quality, "high");
});

test("resolveStationDistanceInfo returns legacy manual fallback", () => {
  const info = resolveStationDistanceInfo({ distance: 11.2 }, null);
  assert.equal(info.km, 11.2);
  assert.equal(info.source, "legacy_manual");
  assert.equal(info.quality, "fallback");
});

test("resolveStationDistanceInfo returns unavailable when no distance data exists", () => {
  const info = resolveStationDistanceInfo({}, null);
  assert.equal(Number.isNaN(info.km), true);
  assert.equal(info.source, "missing");
  assert.equal(info.quality, "unavailable");
});
