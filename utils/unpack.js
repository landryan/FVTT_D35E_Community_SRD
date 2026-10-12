"use strict";
const fs = require("fs");
const { execSync } = require("child_process");
const {
  assertPackAccessible,
  normalizePackName,
  readSystemPacks,
  unpackPackToSource
} = require("./pack-db");
const { createLogger } = require("./cli-log");

const log = createLogger("unpack");

async function run() {
  const packs = readSystemPacks();
  const packdir = "export";

  // Fail before deleting source data if any pack DB is currently locked.
  for (let i = 0; i < packs.length; i++) {
    const packNameFromPath = normalizePackName(packs[i].path);
    const dbPath = `../V14/Data/systems/D35E/packs/${packNameFromPath}`;
    log.info(`DBPath = ${dbPath}`);

    if (fs.existsSync(dbPath)) {
      await assertPackAccessible(dbPath, `source pack "${packNameFromPath}"`);
    }
  }

  fs.rmSync(packdir, { recursive: true, force: true });

  for (let i = 0; i < packs.length; i++) {
    const packPath = packs[i].path;
    const packNameFromPath = normalizePackName(packPath);
    const sourcePath = `export/${packNameFromPath}`;
    const dbPath = `../V14/Data/systems/D35E/packs/${packNameFromPath}`;
    log.info(`DBPath ${dbPath}`);
    log.info(`Unpacking ${packNameFromPath}`);

    if (!fs.existsSync(dbPath)) {
      log.warn(`Pack ${packNameFromPath} not found; skipping`);
      continue;
    }

    const result = await unpackPackToSource(dbPath, sourcePath);
    log.success(`Unpacked ${packNameFromPath} (${result.files} files)`);
    log.info(`Sorting JSON files in ${packNameFromPath}`);
    execSync(`node "utils/sort-json-dir.js" "${sourcePath}"`);
  }

  const numberOfPacked = fs.existsSync(packdir) ? fs.readdirSync(packdir).length : 0;
  log.success(`Finished unpacking ${numberOfPacked} packs`);
}

run().catch((err) => {
  log.error(err.message || String(err));
  process.exitCode = 1;
});
