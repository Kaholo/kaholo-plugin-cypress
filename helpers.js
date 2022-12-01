const { stat } = require("fs/promises");
const fs = require("fs");
const { exec: execWithCallback } = require("child_process");
const { promisify } = require("util");

const exec = promisify(execWithCallback);

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

function logToActivityLog(...messageChunks) {
  console.error(messageChunks.join(" "));
}

module.exports = {
  pathExists,
  isJSON,
  logToActivityLog,
  exec,
};
