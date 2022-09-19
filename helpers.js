const { stat } = require("fs/promises");
const fs = require("fs");

async function pathExists(path) {
  try {
    await stat(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isJSON(value) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function logToActivityLog(message) {
  console.error(message);
}

module.exports = {
  pathExists,
  isJSON,
  logToActivityLog,
};
