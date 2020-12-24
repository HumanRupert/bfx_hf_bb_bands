const HFS = require("bfx-hf-strategy");
const lookForTrade = require("./look_for_trade");
const { getBBands, checkIfShouldClose } = require("./helpers");

module.exports = async (state = {}, update = {}) => {
  const { candle, mts: timestamp, price } = update;
  const { open, close } = candle;

  const orderParams = {
    mtsCreate: timestamp,
    amount: 1,
    price,
  };

  const bands = getBBands(state);

  const isCandleGreen = open <= close;
  if (isCandleGreen) return state;

  const isCloseAbove1Std = bands.plusOne < close;
  if (isCloseAbove1Std) return state;

  //  check if 75% of candle body is below 1 std
  const shouldClose = checkIfShouldClose(close, open, bands, "long");

  if (!shouldClose) return state;

  let newState = await HFS.closePositionMarket(state, orderParams);

  //  look if should open short
  newState = await lookForTrade(newState, update);

  return newState;
};
