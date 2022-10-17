const path = require("path");
const { promisify } = require("util");
const glob = promisify(require("glob"));

async function listSpecFiles(query, params) {
  const { workingDirectory } = params;

  if (!workingDirectory) {
    throw new Error("Working Directory parameter must be provided");
  }

  const absoluteWorkingDirectoryPath = path.resolve(workingDirectory);
  const cypressFiles = await glob("./**/*.cy.js", {
    cwd: absoluteWorkingDirectoryPath,
  });

  const autocompleteItems = cypressFiles.map((value) => ({
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
