const { spawn } = require("child_process");
const { docker } = require("@kaholo/plugin-library");
const { promisify } = require("util");
const path = require("path");

const {
  pathExists,
  isJSON,
  logToActivityLog,
} = require("./helpers");
const {
  IMAGE_NAME,
} = require("./consts.json");

async function runCypressTests(params) {
  const {
    workingDirectory,
    reportsResultInJson,
  } = params;

  const absoluteWorkingDirectory = path.resolve(workingDirectory);
  if (!await pathExists(absoluteWorkingDirectory)) {
    throw new Error(`Path ${absoluteWorkingDirectory} does not exist on agent`);
  }

  const cypressConfigPath = path.resolve(absoluteWorkingDirectory, "cypress.config.js");
  if (!await pathExists(cypressConfigPath)) {
    throw new Error("Cypress config file (cypress.config.js) file is not present in the working directory");
  }

  const command = reportsResultInJson ? "-q -r json" : "run";
  const projectDirVolumeDefinition = docker.createVolumeDefinition(absoluteWorkingDirectory);
  const environmentVariables = mapEnvironmentVariablesFromVolumeDefinitions([
    projectDirVolumeDefinition,
  ]);
  const dockerCommand = docker.buildDockerCommand({
    command,
    image: IMAGE_NAME,
    volumeDefinitionsArray: [projectDirVolumeDefinition],
    workingDirectory: `$${projectDirVolumeDefinition.mountPoint.name}`,
  });

  const dockerProcess = spawn("bash", ["-c", dockerCommand], {
    env: environmentVariables,
  });

  const stdoutChunks = [];
  const stderrChunks = [];
  dockerProcess.stdout.on("data", (dataChunk) => {
    const stringData = String(dataChunk);

    if (!reportsResultInJson) {
      stdoutChunks.push(stringData);
    } else if (isJSON(stringData)) {
      stdoutChunks.push(JSON.parse(stringData));
    } else {
      logToActivityLog(stringData);
    }
  });
  dockerProcess.stderr.on("data", (dataChunk) => {
    const stringData = String(dataChunk);
    stderrChunks.push(stringData);
  });

  try {
    await promisify(dockerProcess.on.bind(dockerProcess))("exit");
  } catch (error) {
    logToActivityLog("Child process exit code:", error);
  }

  if (reportsResultInJson) {
    return stdoutChunks;
  }

  const stdout = stdoutChunks.join("\n");
  const stderr = stderrChunks.join("\n");
  if (!stdout && stderr) {
    throw new Error(stderr);
  } else if (stderr) {
    console.error(stderr);
  }
  return stdout;
}

function mapEnvironmentVariablesFromVolumeDefinitions(volumeDefinitions) {
  return volumeDefinitions.reduce((acc, cur) => ({
    ...acc,
    [cur.mountPoint.name]: cur.mountPoint.value,
    [cur.path.name]: cur.path.value,
  }), {});
}

module.exports = {
  runCypressTests,
};
