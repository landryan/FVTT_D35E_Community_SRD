"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const sortJson = require("sort-json");

let rawdata = fs.readFileSync("../V13/Data/systems/D35E/system.json");
let system = JSON.parse(rawdata);
let packdir = "../V13/Data/systems/D35E/packs";
fs.rmSync(packdir, { recursive: true, force: true });
for (let i = 0; i < system["packs"].length; i++) {
  let packPath = system["packs"][i]["path"];
  let packNameFromPath = packPath.replace("packs/", "");
  if (fs.existsSync("SRD/" + packNameFromPath)) {
    let foundFiles = fs.readdirSync("SRD/" + packNameFromPath).length;

    /* DISABLED SORT ON IMPORT AS IT TOUCHES FILES AND CREATES UNNECESSARY GIT CHANGES
    console.log(`Sorting JSON files in ${packNameFromPath}... (${foundFiles} files found)`);
    execSync(`node "utils/sortJsonDir.js" "SRD/${packNameFromPath}"`);
    */

    console.log(`Repacking ${packNameFromPath}... (${foundFiles} files found)`);
    let fvttProcess = execSync(
      `fvtt package pack ${packNameFromPath} --inputDirectory SRD/${packNameFromPath} --outputDirectory ${packdir}/`,
    );
    console.log("Repacking " + packNameFromPath + " done");
  } else {
    console.log("Pack " + packNameFromPath + " not found, skipping repack");
  }
}
let numberOfPacked = fs.readdirSync(packdir).length;
console.log("Recreated " + numberOfPacked + " packs");
