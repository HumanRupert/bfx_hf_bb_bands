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

  const isCandleRed = open >= close;
  if (isCandleRed) return state;

  const isCloseBelowStd = bands.minusOne > close;
  if (isCloseBelowStd) return state;

  //  check if 75% of candle body is below 1 std
  const shouldClose = checkIfShouldClose(close, open, bands, "short");

  if (!shouldClose) return state;

  let newState = await HFS.closePositionMarket(state, orderParams);

  //  look if should open long
  newState = await lookForTrade(newState, update);

  return newState;
};
