const lookForTrade = require("./look_for_trade");

module.exports = async (state = {}, update = {}) => {
  newState = await lookForTrade(state, update);
  return newState;
};
