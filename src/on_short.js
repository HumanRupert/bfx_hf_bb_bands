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
  const { bottom: bottomBand1 } = bbands1;

  const isCandleRed = open >= close;
  if (isCandleRed) return state;

  const isCloseBelowStd = bottomBand1 > close;
  if (isCloseBelowStd) return state;

  //  check if 75% of candle body is below 1 std
  const candleBody = close - open;
  const closeStdDist = close - bottomBand1;
  const isCandleThreeQuartsBelowStd = closeStdDist / candleBody >= 0.75;

  if (!isCandleThreeQuartsBelowStd) return state;

  return HFS.closePositionMarket(state, orderParams);
};
