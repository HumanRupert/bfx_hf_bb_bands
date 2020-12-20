const HFS = require("bfx-hf-strategy");

module.exports = async (state = {}, update = {}) => {
  const { price, mts: timestamp } = update;

  const orderParams = {
    mtsCreate: timestamp,
    amount: 1,
    price,
  };

  const indicatorValues = HFS.indicatorValues(state);
  const { bbands1, bbands2 } = indicatorValues;
  const { top: topBand1, bottom: bottomBand1 } = bbands1;
  const { top: topBand2, bottom: bottomBand2 } = bbands2;

  // between +1 SD and +2 SD from mean, the trend is up
  const isBuyZone = topBand2 >= price && price >= topBand1;
  // between -1 SD and -2 SD from mean, the trend is down
  const isSellZone = bottomBand2 <= price && price <= bottomBand1;

  if (isSellZone) {
    return HFS.openShortPositionMarket(state, orderParams);
  }

  if (isBuyZone) {
    return HFS.openLongPositionMarket(state, orderParams);
  }

  return state;
};
