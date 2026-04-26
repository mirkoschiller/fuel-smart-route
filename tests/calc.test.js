import test from "node:test";
import assert from "node:assert/strict";
import { calculateRealSavingsBreakdown, rankStations } from "../calc.js";

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
