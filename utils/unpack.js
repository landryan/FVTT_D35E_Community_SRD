"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const sortJson = require("sort-json");

let rawdata = fs.readFileSync("../V13/Data/systems/D35E/system.json");
let system = JSON.parse(rawdata);
let packdir = "export";
fs.rmSync(packdir, { recursive: true, force: true });
for (let i = 0; i < system["packs"].length; i++) {
  let packPath = system["packs"][i]["path"];
  let packNameFromPath = packPath.replace("packs/", "");
  console.log("Unpacking " + packPath);
  console.log("Unpacking " + packNameFromPath);
  if (fs.existsSync("../V13/Data/systems/D35E/packs/" + packNameFromPath)) {
    let fvttProcess = execSync(
      `fvtt package unpack ${packNameFromPath} --outputDirectory export/${packNameFromPath} --inputDirectory "../V13/Data/systems/D35E/packs/"`
    );
    const unpackedFiles = fs.readdirSync("export/" + packNameFromPath);
    let foundFiles = unpackedFiles.length;
    for (let j = 0; j < unpackedFiles.length; j++) {
      let filePath = "export/" + packNameFromPath + "/" + unpackedFiles[j];
      let fileData = fs.readFileSync(filePath);
      fileData = fileData.toString().replace(/\n/g, "\r\n");
      fs.writeFileSync(filePath, fileData);
    }

    console.log(`Unpacking ${packNameFromPath} done (${foundFiles} files found)`);
    console.log(`Sorting JSON files in ${packNameFromPath}...`);
    execSync(`node "utils/sortJsonDir.js" "export/${packNameFromPath}"`);

  } else {
    console.log("Pack " + packNameFromPath + " not found, skipping unpack");
  }
}
let numberOfPacked = fs.readdirSync(packdir).length;
console.log("Unpacked " + numberOfPacked + " packs");
