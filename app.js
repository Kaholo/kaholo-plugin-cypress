const kaholoPluginLibrary = require("@kaholo/plugin-library");

const cypressService = require("./cypress-service");

module.exports = kaholoPluginLibrary.bootstrap({
  runCypressTests: cypressService.runCypressTests,
});
