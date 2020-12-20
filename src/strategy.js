const { SYMBOLS, TIME_FRAMES } = require("bfx-hf-util");
const { BollingerBands } = require("bfx-hf-indicators");
const HFS = require("bfx-hf-strategy");
const on_enter = require("./on_enter");

module.exports = ({
  symbol = SYMBOLS.BTC_USD,
  tf = TIME_FRAMES.ONE_DAY,
} = {}) =>
  HFS.define({
    id: "bbands",
    name: "bbands",
    symbol,
    tf,

    indicators: {
      bbands2: new BollingerBands([20, 2]),
      bbands1: new BollingerBands([20, 1]),
    },

    onEnter: on_enter,
  });
