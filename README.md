# Kaholo Cypress Plugin
This plugin extends Kaholo to run [Cypress](https://www.cypress.io/) tests. Cypress is a next generation front end testing tool built for the modern web. Cypress tests anything that runs in a web browser. All of the architecture surrounding Cypress is built to handle modern JavaScript frameworks especially well. We have hundreds of projects using the latest React, Angular, Vue, Elm, etc. frameworks. Cypress also works equally well on older server rendered pages or applications.

## Prerequisites
Cypress test projects are written in JavaScript, easily identified by the `cypress.config.js` file in the root of the project. Cypress tests are developed outside of Kaholo, and typically stored in a source code repository such as git. To run the tests in Kaholo, they must first be retrieved by the Kaholo agent, for example by cloning the repo using the [Kaholo Git plugin](https://github.com/Kaholo/kaholo-plugin-git/releases/).

The Kaholo Cypress Plugin makes use of docker to run the tests, using image `cypress/included:10.7.0`. The first time the plugin is run on a Kaholo agent, this image is automatically downloaded, which may require a minute or so depending on the speed of the internet connection. Subsequent runs on the same agent then happen without delay.

## <a name="envvars"></a>Environment Variables
A common approach to generalizing tests for reuse is by using variables. These may be managed using standard Cypress variables stored in a file, or by means of operating system environment variables, e.g. using command `export CYPRESS_APPLICATION_URL=http://35.228.139.250:8080`. These cannot be set on the Kaholo Agent but must be passed into the docker image using the plugin's `Environment Variables` parameter, i.e. `CYPRESS_APPLICATION_URL=http://35.228.139.250:8080`. Cypress access only environment variables that begin with `CYPRESS_` or `cypress_`, but in the JavaScript code they are provided with the leading string stripped off. In the example variable `CYPRESS_APPLICATION_URL`, then, the code using that variable would look something like this:

    cy.visit(Cypress.env('APPLICATION_URL'))

The requirement that variables must have the leading string and that the string must be stripped off inside the test are unique to Cypress. Be careful not to let this confuse, and be certain to include the leading string when using the plugin parameter.

## Plugin Installation
For download, installation, upgrade, downgrade and troubleshooting of plugins in general, see [INSTALL.md](./INSTALL.md).

## Plugin Settings
Plugin settings act as default parameter values. The Cypress plugin has none. If the Working Directory is left unconfigured, it will evaluate to `/twiddlebug/workspace` (Kaholo v5.x) like most Kaholo plugins. It is recommended to clone cypress tests into this location to simplify the configuration of your pipelines. The Git plugin clones here already, into a subdirectory named after the repository, e.g. `/twiddlebug/workspace/myrepo`, unless specifically configured to do otherwise.

## Method: Run Cypress Tests
This method does the equivalent of `cypress run`. If your Cypress test project happens to be in the default working directory just selecting the method and executing the pipeline could succeed.

### Parameter: Working Directory
This parameter locates the test project you wish to run. For example if your tests are in a repository named `cypress-tests` in a subdirectory named `authentication`, and you've cloned the repo with the Git plugin using default configuration, your working directory will be `cypress-tests/authentication` or if you prefer `/twiddlebug/workspace/cypress-tests/authentication`. Working Directory must be a directory containing file `cypress.config.js`. The actual tests will be in deeper subdirectories. To select a specific test use parameter `Spec File` instead.

### Parameter: Browser
This parameter allows for easy selection of a specific browser, equivalent to using `-b` or `--browser` at the command line. If either of these arguments appear in parameter `Custom Command` the selection here is ignored.

### Parameter: Spec File
This parameter is used to select a specific test, or Cypress "spec file" to run. This is the equivalent to using `-s` or `--spec` at the command line. If either of these arguments appear in parameter `Custom Command` the selection here is ignored. This parameter uses an autocomplete to help you quickly select any file matching `*.cy.js` in a subdirectory of Working Directory.

### Parameter: Environment Variables
This parameter is used to pass environment variables for Cypress to use in code. See section [Environment Variables](#envvars) above for more details. Only environment variables beginning with `CYPRESS_` or `cypress_` are used by Cypress. Enter them in one-per-line CYPRESS_KEY=VALUE format. For example:

    CYPRESS_APPURL=https://dev-01.markles.int:8080
    CYPRESS_USERNAME=testuser01
    CYPRESS_PASSWORD=testpass01

These will be set as actual OS-level environment variables for Cypress to find. If you prefer to instead use [Cypress environment variables](https://docs.cypress.io/guides/guides/command-line#cypress-run-env-lt-env-gt), you may use `-e` or `--env` in the Custom Command parameter.

### Parameter: Report Result in JSON
This parameter is a convenient toggle to report in JSON for the Kaholo Final Result. JSON Final Results are much easier to access by actions downstream in your pipeline using the Kaholo code layer. For example:

    function count() {
        return `Test duration was ${kaholo.actions.cypress1.result[0].passes[0].duration} milliseconds.`
    }

This is the equivalent of using `-q -r json` or `--quiet --reporter json` in the command. If either of these arguments appear in parameter `Custom Command` the selection here is ignored.

### Parameter: Custom Command
Here any command line arguments that can follow `cypress run` may be used. For a full list of options please see the [Cypress documentation](https://docs.cypress.io/guides/guides/command-line#cypress-run). Any arguments used here that conflict with selections made in the other parameters effectively override the other parameters. Those not in conflict have an additive effect, so a combination of custom arguments and selections in the other parameters is a valid configuration.

