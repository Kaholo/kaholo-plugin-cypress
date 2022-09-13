const { spawn } = require("child_process");
const { docker } = require("@kaholo/plugin-library");
const { promisify } = require("util");

const {
  assertPathExistence,
  isJSON,
  logToActivityLog,
} = require("./helpers");
const {
  IMAGE_NAME,
} = require("./consts.json");

const NPM_INSTALL_LOG_FILEPATH = "/tmp/npm-install.log";
const CYPRESS_INSTALL_LOG_FILEPATH = "/tmp/cypress-install.log";
const CYPRESS_ERROR_LOG_FILEPATH = "/tmp/cypress-error.log";

async function runCypressTests(params) {
  const {
    workingDirectory,
    reportsResultInJson,
  } = params;

  const projectDirectoryExists = await assertPathExistence(workingDirectory);
  if (!projectDirectoryExists) {
    throw new Error(`Path ${workingDirectory} does not exist on agent`);
  }

  const command = createCypressRunCommand({ reportsResultInJson });
  const projectDirVolumeDefinition = docker.createVolumeDefinition(workingDirectory);
  const environmentVariables = mapEnvironmentVariablesFromVolumeDefinitions([
    projectDirVolumeDefinition,
  ]);

  const dockerCommand = docker.buildDockerCommand({
    image: IMAGE_NAME,
    command: sanitizeCommand(command),
    volumeDefinitionsArray: [projectDirVolumeDefinition],
    workingDirectory: `$${projectDirVolumeDefinition.mountPoint.name}`,
  });

  const dockerProcess = spawn("bash", ["-c", dockerCommand], { env: environmentVariables });

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

  return promisify(dockerProcess.on.bind(dockerProcess))("exit").then(() => {
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
  });
}

function createCypressRunCommand({ reportsResultInJson }) {
  const installationCommand = `npm install &>${NPM_INSTALL_LOG_FILEPATH} && npx cypress install &>${CYPRESS_INSTALL_LOG_FILEPATH}`;
  const cypressRunCommand = (
    reportsResultInJson
      ? `npx cypress run -q -r json 2>${CYPRESS_ERROR_LOG_FILEPATH}`
      : "npx cypress run"
  );

  return `${installationCommand} && ${cypressRunCommand}`;
}

function mapEnvironmentVariablesFromVolumeDefinitions(volumeDefinitions) {
  return volumeDefinitions.reduce((acc, cur) => ({
    ...acc,
    [cur.mountPoint.name]: cur.mountPoint.value,
    [cur.path.name]: cur.path.value,
  }), {});
}

function sanitizeCommand(command) {
  return `bash -c ${JSON.stringify(command)}`;
}

module.exports = {
  runCypressTests,
};
