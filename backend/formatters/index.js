/**
 * Response Formatters Index
 * Centralizes all response transformation logic
 * @module formatters
 */

const rosterFormatter = require("./rosterFormatter");
const teeTimeFormatter = require("./teeTimeFormatter");

module.exports = {
  roster: rosterFormatter,
  teeTime: teeTimeFormatter,
};
