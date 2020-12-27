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
