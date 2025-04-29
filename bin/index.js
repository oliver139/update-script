#!/usr/bin/env node

// src/index.ts
import fs from "node:fs";
import { join as pathJoin } from "node:path";
import { env, exit } from "node:process";
import { Command } from "@commander-js/extra-typings";
import c2 from "ansis";
import logUpdate from "log-update";
import yesno from "yesno";

// package.json
var version = "0.1.1";

// src/utils.ts
import { exec } from "node:child_process";
import c from "ansis";
import { sync as commandExists } from "command-exists";
function execZsh(cmd) {
  return new Promise((resolve, reject) => {
    exec(`zsh -ic "${cmd}"`, { shell: "/bin/zsh" }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
async function isCmdExists(cmd) {
  if (commandExists(cmd)) {
    return true;
  }
  try {
    await execZsh(cmd);
    return true;
  } catch {
    return false;
  }
}
function newSection(name, lineSpace = ["BEFORE"]) {
  if (lineSpace.includes("BEFORE")) {
    console.log("");
  }
  console.log(c.bold.cyan("-----------------------------------------"));
  console.log(c.bold.cyan(name));
  console.log(c.bold.cyan("-----------------------------------------"));
  if (lineSpace.includes("AFTER")) {
    console.log();
  }
}

// src/updates/homebrew.ts
async function homebrewUpdate() {
  await execZsh("brew update");
}

// src/updates/omz.ts
async function omzUpdate() {
  await execZsh("omz update");
}

// src/updates/pnpm.ts
async function pnpmUpdate() {
  const output = JSON.parse(await execZsh(`pnpm list -g --json`));
  const deps = Object.keys(output[0].dependencies);
  await execZsh(`pnpm self-update && pnpm add -g ${deps.join(" ")}`);
}

// src/index.ts
var program = new Command().name("my-update").option("-y, --yes", "Skip confirmation").option("-l, --log [dir]", "Log the update result to a file inside <dir>").option("-p, --prefix <string>", "The prefix of the file name", "update_").version(version, "-v, --version", "Show version").helpOption("-h, --help", "Show help").showHelpAfterError().parse();
var options = program.opts();
console.log(c2.bold.blueBright(`
update-script v${version}`));
console.log(c2.bold.blueBright("========================================="));
newSection("Check for commands availability");
var cmds = {
  "oh-my-zsh": { check: "omz version", update: omzUpdate },
  "homebrew": { check: "brew", update: homebrewUpdate },
  "pnpm": { check: "pnpm", update: pnpmUpdate }
};
var cmdsCount = Object.keys(cmds).length;
var maxCmdLength = Object.keys(cmds).reduce((result, cmd) => Math.max(result, cmd.length), 0);
var checkResult = await Promise.allSettled(Object.values(cmds).map(({ check }) => isCmdExists(check)));
var availableCmds = [];
checkResult.forEach((result, index2) => {
  const cmd = Object.keys(cmds)[index2];
  if (result.status === "fulfilled" && result.value) {
    console.log(`${cmd.padStart(maxCmdLength)}: ${c2.green`Available`} \u2705`);
    availableCmds.push(cmd);
  } else {
    console.log(`${cmd.padStart(maxCmdLength)}: ${c2.red`Not available`} \u274C`);
  }
});
newSection("Update Confirmation");
console.log("The following command(s) will be updated:");
availableCmds.forEach((cmd) => {
  console.log(`${c2.yellow`-`} ${cmd}`);
});
if (!options.yes) {
  await yesno({
    question: `${c2.bold.yellow(`
Is that OK?`)} (${c2.underline`Y`}/n)`,
    yesValues: ["yes", "y"],
    noValues: [],
    defaultValue: true,
    invalid: () => {
      newSection("Aborted");
      exit();
    }
  });
}
newSection("Start Update");
var frames = ["-", "\\", "|", "/"];
var index = 0;
var logResult = [];
function updatingMsg() {
  const frame = frames[index = ++index % frames.length];
  logUpdate(Object.entries(cmds).map(([cmdName, { state }]) => {
    return `Updating ${cmdName.padEnd(maxCmdLength + 3, ".")} ${state === void 0 ? frame : state ? c2.green`Done ✅` : c2.red`Fail ❌`}`;
  }).join("\n"));
}
var updateLogId = setInterval(updatingMsg, 250);
var successResCount = 0;
updatingMsg();
await Promise.allSettled(Object.entries(cmds).map(([cmdName, { update: updateCmd }], index2) => updateCmd().then(() => {
  successResCount++;
  Object.values(cmds)[index2].state = true;
  logResult.push(`Update ${cmdName} - OK`);
}).catch(() => {
  Object.values(cmds)[index2].state = false;
  logResult.push(`Update ${cmdName} - Fail`);
})));
clearInterval(updateLogId);
updatingMsg();
logUpdate.done();
if (options.log) {
  const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replaceAll("-", "");
  const dir = options.log === true ? `${env.HOME}/my-update-log/` : options.log;
  const fileName = `${options.prefix}${date}.txt`;
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(pathJoin(dir, fileName), logResult.join("\n"));
}
if (successResCount === 0) {
  console.log(c2.bold.red("\n-----------------------------------------"));
  console.log(c2.bold.red`Update Fail`);
  console.log(c2.bold.red("-----------------------------------------"));
} else if (successResCount === cmdsCount) {
  console.log(c2.bold.green("\n-----------------------------------------"));
  console.log(c2.bold.green`Update Success`);
  console.log(c2.bold.green("-----------------------------------------"));
} else {
  console.log(c2.bold.yellow("\n-----------------------------------------"));
  console.log(c2.bold.yellow`Update Partly Success`);
  console.log(c2.bold.yellow("-----------------------------------------"));
}
exit(0);
