const { SYMBOLS, TIME_FRAMES } = require("bfx-hf-util");
const { BollingerBands } = require("bfx-hf-indicators");
const HFS = require("bfx-hf-strategy");

//  handlers
const on_enter = require("./on_enter");
const on_long = require("./on_long");
const on_short = require("./on_short");

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
    onUpdateLong: on_long,
    onUpdateShort: on_short,
  });
