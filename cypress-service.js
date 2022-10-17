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
    browser,
    specFile,
    environmentVariables: customEnvironmentVariables,
    customCommand,
  } = params;

  const absoluteWorkingDirectory = path.resolve(workingDirectory);
  if (!await pathExists(absoluteWorkingDirectory)) {
    throw new Error(`Path ${absoluteWorkingDirectory} does not exist on agent`);
  }

  const cypressConfigPath = path.resolve(absoluteWorkingDirectory, "cypress.config.js");
  if (!await pathExists(cypressConfigPath)) {
    throw new Error("Cypress config file (cypress.config.js) file is not present in the working directory");
  }

  const projectDirVolumeDefinition = docker.createVolumeDefinition(absoluteWorkingDirectory);
  const environmentVariables = {
    ...mapEnvironmentVariablesFromVolumeDefinitions([
      projectDirVolumeDefinition,
    ]),
    ...customEnvironmentVariables,
  };

  const command = buildCypressCommand({
    reportsResultInJson,
    browser,
    specFile,
    customCommand,
    environmentVariables: customEnvironmentVariables,
  });
  const dockerCommand = docker.buildDockerCommand({
    command,
    image: IMAGE_NAME,
    volumeDefinitionsArray: [projectDirVolumeDefinition],
    workingDirectory: `$${projectDirVolumeDefinition.mountPoint.name}`,
    environmentVariables,
  });

  return runCypressCommand({
    command: dockerCommand,
    environmentVariables,
  });
}

async function runCypressCommand(params) {
  const {
    command,
    environmentVariables,
  } = params;

  const reportsResultInJson = /(-r|--report)[ =]["']?json["']?/g.test(command);
  const dockerProcess = spawn("bash", ["-c", command], {
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

function buildCypressCommand(params) {
  const {
    reportsResultInJson,
    browser,
    specFile,
    customCommand,
    environmentVariables = {},
  } = params;

  let constructedCommand = customCommand.replace(/^(cypress)? run/, "") || "";

  if (reportsResultInJson && !/(-r|--report)[ =]['"]?json['"]?/g.test(constructedCommand)) {
    constructedCommand += " -q -r json";
  }
  if (browser && !/(-b|--browser)/g.test(constructedCommand)) {
    constructedCommand += ` -b ${browser}`;
  }
  if (specFile && !/(-s|--spec)/g.test(constructedCommand)) {
    constructedCommand += ` -s ${JSON.stringify(specFile)}`;
  }
  if (Object.keys(environmentVariables).length > 0 && !/(-e|--env)/g.test(constructedCommand)) {
    const envVarString = Object
      .entries(environmentVariables)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(",");
    constructedCommand += ` -e ${envVarString}`;
  }

  return constructedCommand.trim();
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
