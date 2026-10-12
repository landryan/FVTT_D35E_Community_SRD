#!/usr/bin/env node
/**
 * Sort all JSON files in a given directory using sort-json.
 * Usage: node sort-json-dir.js /path/to/json/files
 */

const fs = require("fs");
const path = require("path");
const sortJson = require("sort-json");
const { createLogger } = require("./cli-log");

const log = createLogger("sort-json-dir");

// Validate CLI argument
if (process.argv.length < 3) {
  log.error("Please provide a directory path");
  process.exit(1);
}

const dirPath = path.resolve(process.argv[2]);

// Check if directory exists
if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
  log.error(`The path "${dirPath}" is not a valid directory`);
  process.exit(1);
}

try {
  // Read all files in directory
  const files = fs.readdirSync(dirPath);

  // Filter only .json files
  const jsonFiles = files.filter((file) => file.toLowerCase().endsWith(".json"));

  if (jsonFiles.length === 0) {
    log.info("No JSON files found in the directory");
    process.exit(0);
  }

  jsonFiles.forEach((file) => {
    const filePath = path.join(dirPath, file);

    try {
      // Read and parse JSON
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // Sort JSON keys
      const sortedData = sortJson(data, { ignoreCase: true, depth: 100 });

      // Write back to file (pretty-printed)
      fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + "\n", "utf8");

      log.info(`Sorted ${file}`);
    } catch (err) {
      log.warn(`Error processing "${file}": ${err.message}`);
    }
  });

  log.success("All JSON files processed");
} catch (err) {
  log.error(`Failed to read directory: ${err.message}`);
  process.exit(1);
}
