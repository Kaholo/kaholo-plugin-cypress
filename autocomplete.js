const path = require("path");

const { exec } = require("./helpers");

async function listSpecFiles(query, params) {
  const { workingDirectory } = params;

  if (!workingDirectory) {
    throw new Error("Working Directory parameter must be provided");
  }

  const absoluteWorkingDirectoryPath = path.resolve(workingDirectory);
  const { stdout } = await exec("find ./ -regex '.*\\.cy\\.js'", {
    cwd: absoluteWorkingDirectoryPath,
  });

  const foundFiles = stdout.trim().split("\n");
  const autocompleteItems = foundFiles.map((value) => ({
    value,
    id: value,
  }));

  if (!query) {
    return autocompleteItems;
  }

  const lowerCaseQuery = query.toLowerCase();
  return autocompleteItems.filter(({ value }) => value.toLowerCase().includes(lowerCaseQuery));
}

module.exports = {
  listSpecFiles,
};
