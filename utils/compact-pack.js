"use strict";

const path = require("path");
const fs = require("fs");
const { ClassicLevel } = require("classic-level");
const { createLogger } = require("./cli-log");

const log = createLogger("compact-pack");

function printHelp() {
  console.log(`Usage:
  node utils/compact-pack.js --pack <pack-path-or-name>

Options:
  --pack <value>   Pack path, pack name, or ./packs/* path from system.json (required)
  --help           Show this help message

Examples:
  node utils/compact-pack.js --pack feats
  node utils/compact-pack.js --pack ./packs/spells

Flushes the LevelDB write-ahead log (*.log) into compacted SST files (*.ldb),
making the pack readable by query-pack.js and other tools.

IMPORTANT: Stop Foundry before running — the LOCK file must not be held.
`);
}

function resolvePackPath(packArg) {
  const cwd = process.cwd();

  if (packArg.includes("/") || packArg.includes("\\")) {
    const explicitPath = path.resolve(cwd, packArg);
    if (fs.existsSync(explicitPath)) return explicitPath;
  }

  const directPackDir = path.resolve(cwd, "packs", packArg);
  if (fs.existsSync(directPackDir)) return directPackDir;

  const systemPath = path.resolve(cwd, "system.json");
  if (fs.existsSync(systemPath)) {
    const system = JSON.parse(fs.readFileSync(systemPath, "utf8"));
    const byName = (system.packs || []).find((p) => p.name === packArg);
    if (byName?.path) {
      const normalized = byName.path.replace(/^\.\//, "");
      const candidate = path.resolve(cwd, normalized);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  throw new Error(`Could not resolve pack "${packArg}"`);
}

/**
 * Compact a single LevelDB pack directory.
 * Flushes the WAL log into SST files so the pack can be read by query-pack.js.
 *
 * @param {string} packPath - Absolute path to the pack directory.
 * @returns {Promise<void>}
 */
async function compactPack(packPath) {
  const db = new ClassicLevel(packPath, { valueEncoding: "utf8" });
  try {
    await db.open();
    await db.compactRange("!", "~");
  } finally {
    await db.close();
  }
}

async function run() {
  const argv = process.argv.slice(2);
  let packArg = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--help" || argv[i] === "-h") {
      printHelp();
      return;
    } else if (argv[i] === "--pack") {
      packArg = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }

  if (!packArg) {
    printHelp();
    throw new Error("Missing required --pack argument");
  }

  const packPath = resolvePackPath(packArg);
  log.info(`Compacting ${packPath}`);
  await compactPack(packPath);
  log.success("Compaction complete");
}

module.exports = { compactPack, resolvePackPath };

if (require.main === module) {
  run().catch((err) => {
    log.error(err.message || String(err));
    process.exitCode = 1;
  });
}
