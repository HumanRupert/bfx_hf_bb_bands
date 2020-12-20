"use strict";

process.env.DEBUG = "*";

const { Candle } = require("bfx-api-node-models");
const { SYMBOLS, TIME_FRAMES } = require("bfx-hf-util");
const logTrades = require("bfx-hf-strategy/lib/debug/log_trades");
const HFS = require("bfx-hf-strategy");

const BBandsStrategy = require("./strategy");
const rawCandleData = require("../data/btc_candle.json");

const market = {
  symbol: SYMBOLS.BTC_USD,
  tf: TIME_FRAMES.ONE_HOUR,
};

const candles = rawCandleData
  .sort((a, b) => a[0] - b[0])
  .map((c) => ({
    ...new Candle(c).toJS(),
    ...market, // attach market data
  }));

const run = async () => {
  let strategyState = BBandsStrategy(market);

  for (let i = 0; i < candles.length; i += 1) {
    strategyState = await HFS.onCandle(strategyState, candles[i]);
  }

  logTrades(strategyState);
};

try {
  run();
} catch (e) {
  console.error(e);
}
