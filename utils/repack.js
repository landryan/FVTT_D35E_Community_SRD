"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const { compactPack } = require("./compact-pack");
const {
  assertPackAccessible,
  normalizePackName,
  readSystemPacks,
  repackSourceToPack,
  verifySourceAndPackSync
} = require("./pack-db");
const { createLogger } = require("./cli-log");

const log = createLogger("repack");

async function run() {
  const packs = readSystemPacks();
  const packdir = "../V14/Data/systems/D35E/packs";

  // Fail fast before deleting packs if the existing DBs are locked.
  for (let i = 0; i < packs.length; i++) {
    const packNameFromPath = normalizePackName(packs[i].path);
    const dbPath = `${packdir}/${packNameFromPath}`;
    if (fs.existsSync(dbPath)) {
      await assertPackAccessible(dbPath, `target pack "${packNameFromPath}"`);
    }
  }

  fs.rmSync(packdir, { recursive: true, force: true });

  for (let i = 0; i < packs.length; i++) {
    const packPath = packs[i].path;
    const packNameFromPath = normalizePackName(packPath);
    const sourcePath = `SRD/${packNameFromPath}`;
    const outputPath = `${packdir}/${packNameFromPath}`;

    if (!fs.existsSync(sourcePath)) {
      log.warn(`Pack ${packNameFromPath} not found; skipping`);
      continue;
    }

    const foundFiles = fs
      .readdirSync(sourcePath)
      .filter((file) => file.toLowerCase().endsWith(".json") && file !== ".index.json").length;
    log.info(`Sorting JSON files in ${packNameFromPath} (${foundFiles} files)`);
    execSync(`node "utils/sort-json-dir.js" "${sourcePath}"`);

    log.info(`Repacking ${packNameFromPath} (${foundFiles} files)`);
    await repackSourceToPack(sourcePath, outputPath);
    await compactPack(outputPath);

    const verification = await verifySourceAndPackSync(sourcePath, outputPath);
    if (!verification.ok) {
      const details = verification.mismatches.slice(0, 20).join("\n");
      throw new Error(
        `Sync verification failed for ${packNameFromPath}.\n` +
        `Source: ${verification.sourceCount}, Repacked: ${verification.packCount}\n${details}`
      );
    }

    log.success(`Repacked ${packNameFromPath} (verified ${verification.packCount} docs)`);
  }

  const numberOfPacked = fs.existsSync(packdir) ? fs.readdirSync(packdir).length : 0;
  log.success(`Finished repacking ${numberOfPacked} packs`);
}

run().catch((err) => {
  log.error(err.message || String(err));
  process.exitCode = 1;
});
