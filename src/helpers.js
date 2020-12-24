const HFS = require("bfx-hf-strategy");

const getBBands = (state) => {
  const indicatorValues = HFS.indicatorValues(state);
  const { bbands1, bbands2 } = indicatorValues;
  const { top: plusOne, bottom: minusOne } = bbands1;
  const { top: plusTwo, bottom: minusTwo } = bbands2;

  return {
    plusOne,
    plusTwo,
    minusOne,
    minusTwo,
  };
};
const checkIfShouldClose = (close, open, bands, position) => {
  const candleBody = Math.abs(close - open);

  const closeToNoMansLandDist =
    position == "short" ? close - bands.minusOne : bands.plusOne - close;

  // check if 75% of candle body entered to the No Man's Land.
  // see: https://www.investopedia.com/thmb/AtmrjGx96Tbz8f1cfnGOGzpqHqU=/2378x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/dotdash_Final_Using_Bollinger_Bands_to_Gauge_Trends_Oct_2020-02-f76c639116734ccfb8493dce32ed149a.jpg
  const shouldClose = closeToNoMansLandDist / candleBody >= 0.75;
  return shouldClose;
};

module.exports = {
  getBBands,
  checkIfShouldClose,
};
