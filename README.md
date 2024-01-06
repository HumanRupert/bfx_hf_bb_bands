Bitfinex, one of the largest cryptocurrency digital exchanges, has more than 180 open-source repositories in GitHub–from a Tezos JS library to UI goodies. The most sophisticated trading toolkit developed by Bitfinex, though, is Honey Framework with many useful packages such as bfx-hf-ui, bfx-hf-strategy, bfx-hf-indicators, and bfx-hf-strategy-exec.

In this tutorial, we'll use the Honey Framework ecosystem to define and backtest a trend trading strategy on historic data for the past 500 days.

## Requirements
Let's install the libraries we're going to use. First, run the following command to install Honey Framework libraries.
```
npm install bfx-hf-strategy bfx-api-node-models bfx-hf-util bfx-hf-indicators
```
We'll also need the following packages to display the trades on the command line.
```
npm install cli-table colors
```
Eventually, install node-fetch library as well to retrieve the data from Bitfinex API.
```
npm install node-fetch
```
## Strategy
We use a simple trend trading strategy based on the following logic:

Open short position if the price is between -1 SD and -2 SD Bollinger Bands® and short SMA is below the long SMA.

Close short position if the candle is green and more than 75% of its body crossed above the -1 SD band.

Open long position if the price is between +1 SD and +2 SD bands and the short simple moving average is above the long simple moving average.

Close long position if the candle is red and more than 75% of its body crossed below +1 SD band.

The logic behind the strategy is fairly straightforward: if the price is between -1 SD and +1 SD bands (No Man's Land), we close our position. If the price is in the sell-zone (between the lower bands) and the market trend is bearish (short SMA is below long SMA), we open a short position. On the other hand, if the price is between upper bands and the market is bullish, we open a long position (in other words, we only trade in direction of the overall trend). Check this article from Investopedia to find more information about trend trading based on Bollinger Bands®.
![image info](https://hackernoon.imgix.net/images/c4H5dJO11HMcVyXTq7bAl2kz88I2-pz7w31bg.jpeg)
## Code
Let's get our hands dirty. First, create strategy.js that defines a dummy strategy.
```
// strategy.js

const { SYMBOLS, TIME_FRAMES } = require("bfx-hf-util");
const { BollingerBands, SMA } = require("bfx-hf-indicators");
const HFS = require("bfx-hf-strategy");

module.exports = ({ symbol = SYMBOLS.BTC_USD, tf = TIME_FRAMES.ONE_DAY }) =>
  HFS.define({
    id: "bbands",
    name: "bbands",
    symbol,
    tf,

    indicators: {
      bbands2: new BollingerBands([20, 2]),
      bbands1: new BollingerBands([20, 1]),
      smaShort: new SMA([25]),
      smaLong: new SMA([100]),
    },
  });
```
Let's break it down. We define the default symbol (BTCUSD) and timeframe (one day). Then, we define the indicators we're going to use. We need two Bollinger Band® bands, both in the period of 20 days. We give a multiplier of 2 to the first (±2 standard deviations) and a multiplier of 1 to the second one (±1 standard deviations). In the end, we add two SMAs, one in a 25-day period (short SMA) and the other in a 100-day period (long SMA). Check this to find a list of all indicators available in Bitfinex Honey Framework.

We can enter the market now. The strategy we defined accepts five handler methods to update positions and make trades on each event:

- onEnter - called when no position is open
- onUpdateLong - called when a long position is open
- onUpdateShort - called when a short position is open
- onUpdate - called when any position is open
- onPriceUpdate - called on every tick
Event handlers receive two parameters, state (the strategy context) and update (point-in-time data), they look for trade opportunities and update state if there's a trade to be made.
## Entries
Let's define the strategy to enter the market. First, add helper.js to encapsulate the reusable logic. Define getBBands in it to extract Bollinger Band® bands values from the state.
```
// helpers.js

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

module.exports = {
  getBBands
}
```
indicatorValues returns a map of all indicators defined in the strategy. We then extract the Bollinger Bands objects from them, which include three values: top, bottom, and middle. Eventually, the method returns ±1 and ±2 SD bands.

Define another method to extract uptrend/downtrend data from the state.

```
// helpers.js

/*
getBBands here
*/

const checkIfIsUptrend = (state) => {
  const indicatorValues = HFS.indicatorValues(state);
  const { smaShort, smaLong } = indicatorValues;
  const isUpTrend = smaShort > smaLong;
  return isUpTrend;
};

module.exports = {
  getBBands,
  checkIfIsUptrend,
}
```
The method simply checks if short SMA is above long SMA and infers the trend from it.

Add look_for_trade.js. We'll use it to find trade opportunities.
```
// look_for_trade.js

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
```
The method checks if the price is in the trade zone (between +1 and +2 SD or -1 SD and -2 SD bands). If the price is in the sell zone and the trend is bullish, it opens a short position, and if the price is in the sell zone and the trend is bearish, it opens a long position. If none is true, it simply returns the previous state.

Notice that we use Honey Framework helper functions to open positions. You can find the list of all helper functions here. Add on_enter.js to use the function we just defined to handle onEnter events.
```
// on_enter.js

const lookForTrade = require("./look_for_trade");

module.exports = async (state = {}, update = {}) => {
  newState = await lookForTrade(state, update);
  return newState;
};
```
Now add the handler to the strategy.
```
// strategy.js

/* other imports */

//  handlers
const on_enter = require("./on_enter");

module.exports = ({ symbol = SYMBOLS.BTC_USD, tf = TIME_FRAMES.ONE_DAY }) =>
  HFS.define({

    /*
    other strategy properties
    */

    onEnter: on_enter,
  });
```
## Update Positions
Well done! We've just exposed ourselves to the market. But we should add other handlers to react to market updates while we have an open position. Define another method in helpers.js to check if 75% or more of the candle body crossed the inner bands.
```
// helpers.js

const HFS = require("bfx-hf-strategy");


/*
 Other methods
*/

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
  checkIfIsUptrend,
  checkIfShouldClose,
};
```
checkIfShouldClose calculates the candle body height by finding the distance between open and close values. Then, it checks how much of the candle entered the No Man's Land. If more than 75% of the candle body is in between two inner bands, it closes the position.

It's time to create on_long.js
```
// on_long.js

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
```
The method we just defined checks if:

The candle is green.
The candle is above the No Man's Land (i.e., the closing value is above the +1 SD band).
Less than 75% of the candle is in the No Man's Land.
And if any of these are correct, it doesn't touch the position. Otherwise, it closes the long position using closePositionMarket helper method and then calls lookForTrade to check if a short position should be opened. Now, let's define our strategy while shorting.
```
// on_short.js

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
```
on_short.js checks if:

The candle is red.
The candle is below the No Man's Land (i.e., the closing value is below the -1 SD band).
Less than 75% of the candle is in the No Man's Land.
And if all above are false, it closes the short position and looks for new trade opportunities.

That's it. We've finished defining the strategy. Add the new event handlers to strategy.js. Then we can start testing the algorithm.
```
// strategy.js

/* other imports */

//  handlers
const on_enter = require("./on_enter");
const on_long = require("./on_long");
const on_short = require("./on_short");

module.exports = ({ symbol = SYMBOLS.BTC_USD, tf = TIME_FRAMES.ONE_DAY }) =>
  HFS.define({
    /* 
      Other strategy properties
    */

    onEnter: on_enter,
    onUpdateLong: on_long,
    onUpdateShort: on_short,
  });
```
## Test on Historical Data
Add get_data.js to retrieve historic data from Bitfinex API.
```
// get_data.js

"use strict";

const fetch = require("node-fetch");
const url = "https://api-pub.bitfinex.com/v2/";

const get_500_days = () => {
  let date = new Date();

  const end = date.getTime();

  date.setDate(date.getDate() - 500);
  const start = date.getTime();

  return { start, end };
};

module.exports = async function getData({ symbol, tf }) {
  try {
    const { start, end } = get_500_days();

    const pathParams = `candles/trade:${tf}:${symbol}/hist`;
    const queryParams = `start=${start}&end=${end}&limit=500`;

    const req = await fetch(`${url}/${pathParams}?${queryParams}`);
    const response = await req.json();
    return response;
  } catch (err) {
    console.log(err);
  }
};
```
getData fetches OHLC data of the past 500 days, given a symbol and a timeframe. You can modify the parameters to meet your needs. Find more information about Bitfinex API's public endpoint for candle data here.

Add exec.js to define the execution logic.
```
// exec.js

process.env.DEBUG = "*";

const { Candle } = require("bfx-api-node-models");
const { SYMBOLS, TIME_FRAMES } = require("bfx-hf-util");
const logTrades = require("bfx-hf-strategy/lib/debug/log_trades");
const HFS = require("bfx-hf-strategy");
const getData = require("./get_data");
const BBandsStrategy = require("./strategy");

const market = {
  symbol: SYMBOLS.BTC_USD,
  tf: TIME_FRAMES.ONE_DAY,
};

const getCandles = async () => {
  const rawCandleData = await getData(market);

  // attach market data
  const candles = rawCandleData
    .sort((a, b) => a[0] - b[0])
    .map((candle) => ({
      ...new Candle(candle).toJS(),
      ...market,
    }));

  return candles;
};

const run = async () => {
  const candles = await getCandles();

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
```
getCandles method retrieves the data and attaches market information to them. During live execution, we may receive data from multiple sources for different symbols and different timeframes, thus, it's necessary to attach this information to raw data.

Then, run gets candle data and the strategy and passes them to onCandle helper method that orchestrates relevant strategy event handlers for the new price action data. Eventually, run logs the results using logTrades function.

Let's test the algorithm. Open the command line in the project's directory and run the following command.
```
node exec
```
The result will be something like this:
![image info](https://hackernoon.imgix.net/images/c4H5dJO11HMcVyXTq7bAl2kz88I2-z48y31we.jpeg)

You can find a list of all positions along with the amount, price, fee, and profit/loss figure of each one. At the bottom, general information about the strategy is logged. The bot has made 37 trades, opened 19 positions, and gained 3960.91$. You can modify log_trades.js helper function and change how it displays the results.

That's it! We've defined and backtested a simple trading strategy using Bitfinex Honey Framework toolkit. The example pieces of code in the article are available here.





