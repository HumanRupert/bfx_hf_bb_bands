const HFS = require("bfx-hf-strategy");

module.exports = async (state = {}, update = {}) => {
  const { candle, mts: timestamp, price } = update;
  const { open, high, low, close } = candle;

  const orderParams = {
    mtsCreate: timestamp,
    amount: 1,
    price,
  };

  const indicatorValues = HFS.indicatorValues(state);
  const { bbands1 } = indicatorValues;
  const { top: topBand1 } = bbands1;

  const isCandleGreen = open <= close;
  if (isCandleGreen) return state;

  const isCloseAboveStd = topBand1 < close;
  if (isCloseAboveStd) return state;

  //  check if 75% of candle body is below 1 std
  const candleBody = open - close;
  const closeStdDist = topBand1 - close;
  const isCandleThreeQuartsBelowStd = closeStdDist / candleBody >= 0.75;

  if (!isCandleThreeQuartsBelowStd) return state;

  return HFS.closePositionMarket(state, orderParams);
};
