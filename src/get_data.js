"use strict";

const fetch = require("node-fetch");
const url = "https://api-pub.bitfinex.com/v2/";

const pathParams = "candles/trade:1D:tBTCUSD/hist";
const queryParams = "start=1565481600000&end=1608595200000&limit=500";

module.exports = async function getData() {
  try {
    const req = await fetch(`${url}/${pathParams}?${queryParams}`);
    const response = await req.json();
    return response;
  } catch (err) {
    console.log(err);
  }
};
