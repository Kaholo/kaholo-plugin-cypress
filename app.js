const kaholoPluginLibrary = require("@kaholo/plugin-library");

const cypressService = require("./cypress-service");
const autocomplete = require("./autocomplete");

module.exports = kaholoPluginLibrary.bootstrap({
  runCypressTests: cypressService.runCypressTests,
}, autocomplete);
