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
