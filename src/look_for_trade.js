const HFS = require("bfx-hf-strategy");
const { getBBands, checkIfIsUptrend } = require("./helpers");

module.exports = async (state = {}, update = {}) => {
  const { price, mts: timestamp } = update;
  const orderParams = {
    mtsCreate: timestamp,
    amount: 1,
    price,
  };

  const bands = getBBands(state);

  // between +1 SD and +2 SD from mean, the trend is up
  const isBuyZone = bands.plusTwo >= price && price >= bands.plusOne;
  // between -1 SD and -2 SD from mean, the trend is down
  const isSellZone = bands.minusTwo <= price && price <= bands.minusOne;

  const isUptrend = checkIfIsUptrend(state);

  if (isSellZone && !isUptrend) {
    return HFS.openShortPositionMarket(state, orderParams);
  }

  if (isBuyZone && isUptrend) {
    return HFS.openLongPositionMarket(state, orderParams);
  }

  return state;
};
