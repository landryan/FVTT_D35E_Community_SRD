"use strict";

const fs = require("fs");
const path = require("path");
const { ClassicLevel } = require("classic-level");
const sortJson = require("sort-json");

const INDEX_FILE_NAME = ".index.json";

function toCrLf(text) {
  return String(text).replace(/\r?\n/g, "\r\n");
}

function readSystemPacks() {
  const system = JSON.parse(fs.readFileSync("../V14/Data/systems/D35E/system.json", "utf8"));
  return Array.isArray(system.packs) ? system.packs : [];
}

function normalizePackName(packPath) {
  const { createLogger } = require("./cli-log");
  const log = createLogger("normalizePackName");
  log.info(`packPath = ${packPath}`);
  const normalisedpath = String(packPath || "").replace(/^packs\//, "");
  log.info(`normalisedpath = ${normalisedpath}`);
  return normalisedpath;
}

function parseDoc(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch (_err) {
    return null;
  }
}

function slugFilenamePart(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");
}

function jsonFilenameForEntry(key, doc) {
  const namePart = slugFilenamePart(doc?.name || "unknown");
  const idPart = slugFilenamePart(String(doc?._id || doc?.id || key));
  const preferred = namePart && idPart ? `${namePart}-${idPart}` : namePart || idPart || "unknown";
  return `${preferred}.json`;
}

function parsePackKey(rawKey) {
  const match = /^!([^!]+)!([^!]+)$/.exec(String(rawKey || ""));
  if (!match) return null;

  const collectionPath = match[1];
  const idPath = match[2];
  const collectionParts = collectionPath.split(".");
  const idParts = idPath.split(".");

  if (collectionParts.length === 1 && idParts.length === 1) {
    return {
      kind: "top",
      rawKey: String(rawKey),
      collection: collectionParts[0],
      id: idParts[0]
    };
  }

  if (collectionParts.length === 2 && idParts.length === 2) {
    return {
      kind: "embedded",
      rawKey: String(rawKey),
      parentCollection: collectionParts[0],
      embeddedCollection: collectionParts[1],
      parentId: idParts[0],
      embeddedId: idParts[1]
    };
  }

  return null;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonFile(filePath, doc) {
  const sorted = sortJson(doc, { ignoreCase: true, depth: 100 });
  const content = `${JSON.stringify(sorted, null, 2)}\n`;
  fs.writeFileSync(filePath, toCrLf(content), "utf8");
}

async function readPackEntries(packPath) {
  const db = new ClassicLevel(packPath, { valueEncoding: "utf8" });
  const entries = [];
  await db.open();
  try {
    for await (const [key, value] of db.iterator()) {
      entries.push({
        key: String(key),
        value: String(value),
        doc: parseDoc(value)
      });
    }
  } finally {
    await db.close();
  }
  entries.sort((a, b) => a.key.localeCompare(b.key));
  return entries;
}

async function assertPackAccessible(packPath, contextLabel = "pack") {
  const db = new ClassicLevel(packPath, { valueEncoding: "utf8" });
  try {
    await db.open();
  } catch (err) {
    const message = (err && err.message) || String(err);
    throw new Error(
      `Could not open ${contextLabel} at "${packPath}". ` +
        `Foundry may still be running and holding a DB lock. Stop Foundry and retry. ` +
        `Original error: ${message}`
    );
  } finally {
    try {
      await db.close();
    } catch (_closeErr) {
      // Ignore close failures from partially opened DB handles.
    }
  }
}

function readSourceIndex(sourcePackPath) {
  const indexPath = path.join(sourcePackPath, INDEX_FILE_NAME);
  if (!fs.existsSync(indexPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

function readSourceDocs(sourcePackPath) {
  const files = fs
    .readdirSync(sourcePackPath)
    .filter((file) => file.toLowerCase().endsWith(".json") && file !== INDEX_FILE_NAME)
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const fullPath = path.join(sourcePackPath, file);
    const doc = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    return { file, doc };
  });
}

function buildMergedEntries(entries) {
  const topByComposite = new Map();
  const embeddedByParent = new Map();
  const passthrough = [];

  for (const entry of entries) {
    const parsed = parsePackKey(entry.key);
    if (!parsed) {
      passthrough.push(entry);
      continue;
    }

    if (parsed.kind === "top") {
      const composite = `${parsed.collection}|${parsed.id}`;
      topByComposite.set(composite, { entry, parsed });
      continue;
    }

    const parentComposite = `${parsed.parentCollection}|${parsed.parentId}`;
    if (!embeddedByParent.has(parentComposite)) embeddedByParent.set(parentComposite, []);
    embeddedByParent.get(parentComposite).push({ entry, parsed });
  }

  const docsToWrite = [];
  const indexRows = [];

  for (const top of topByComposite.values()) {
    const parentComposite = `${top.parsed.collection}|${top.parsed.id}`;
    const embeddedRows = embeddedByParent.get(parentComposite) || [];
    const mergedDoc = JSON.parse(JSON.stringify(top.entry.doc ?? {}));
    if (!mergedDoc._embedded || typeof mergedDoc._embedded !== "object") {
      mergedDoc._embedded = {};
    }
    const embeddedCollections = new Set();
    const childKeyByCollection = {};

    for (const row of embeddedRows) {
      const collection = row.parsed.embeddedCollection;
      if (!Array.isArray(mergedDoc._embedded[collection])) mergedDoc._embedded[collection] = [];
      mergedDoc._embedded[collection].push(row.entry.doc ?? {});
      embeddedCollections.add(collection);
      if (!childKeyByCollection[collection]) childKeyByCollection[collection] = {};
      childKeyByCollection[collection][row.parsed.embeddedId] = row.entry.key;
    }

    const file = jsonFilenameForEntry(top.entry.key, mergedDoc);
    docsToWrite.push({ key: top.entry.key, file, doc: mergedDoc });
    indexRows.push({
      key: top.entry.key,
      file,
      embeddedCollections: Array.from(embeddedCollections).sort((a, b) => a.localeCompare(b)),
      childKeyByCollection
    });
  }

  for (const orphan of passthrough) {
    const file = jsonFilenameForEntry(orphan.key, orphan.doc);
    docsToWrite.push({ key: orphan.key, file, doc: orphan.doc ?? {} });
    indexRows.push({ key: orphan.key, file, embeddedCollections: [], childKeyByCollection: {} });
  }

  return { docsToWrite, indexRows };
}

async function unpackPackToSource(packPath, sourcePackPath) {
  const entries = await readPackEntries(packPath);
  ensureDir(sourcePackPath);

  const { docsToWrite, indexRows } = buildMergedEntries(entries);
  const usedFiles = new Set();
  const index = [];

  for (const docRow of docsToWrite) {
    const baseFile = docRow.file;
    let file = baseFile;
    let counter = 2;
    while (usedFiles.has(file)) {
      file = `${baseFile.replace(/\.json$/i, "")}-${counter}.json`;
      counter += 1;
    }
    usedFiles.add(file);

    const filePath = path.join(sourcePackPath, file);
    const docToWrite = docRow.doc ?? { _id: docRow.key };
    writeJsonFile(filePath, docToWrite);

    const row = indexRows.find((r) => r.key === docRow.key && r.file === docRow.file);
    index.push({
      ...(row || { key: docRow.key, embeddedCollections: [], childKeyByCollection: {} }),
      file
    });
  }

  fs.writeFileSync(
    path.join(sourcePackPath, INDEX_FILE_NAME),
    toCrLf(`${JSON.stringify(index, null, 2)}\n`),
    "utf8"
  );

  return { dbEntries: entries.length, files: index.length };
}

function keyForSourceDoc(file, doc, indexRow) {
  if (indexRow?.key) return indexRow.key;
  return String(doc?._key || doc?._id || doc?.id || file.replace(/\.json$/i, ""));
}

function cloneWithoutEmbeddedCollections(doc, embeddedCollections) {
  const cloned = JSON.parse(JSON.stringify(doc || {}));
  delete cloned._embedded;
  return cloned;
}

function buildEmbeddedKey(parentKey, embeddedCollection, embeddedId, childKeyByCollection) {
  const mapped = childKeyByCollection?.[embeddedCollection]?.[embeddedId];
  if (mapped) return mapped;

  const parsedParent = parsePackKey(parentKey);
  if (!parsedParent || parsedParent.kind !== "top") return null;

  return `!${parsedParent.collection}.${embeddedCollection}!${parsedParent.id}.${embeddedId}`;
}

async function repackSourceToPack(sourcePackPath, packPath) {
  const docs = readSourceDocs(sourcePackPath);
  const index = readSourceIndex(sourcePackPath);
  const fileToIndex = new Map(index.map((row) => [row.file, row]));

  fs.rmSync(packPath, { recursive: true, force: true });
  ensureDir(packPath);

  const db = new ClassicLevel(packPath, { valueEncoding: "utf8" });
  await db.open();
  try {
    for (const { file, doc } of docs) {
      const indexRow = fileToIndex.get(file);
      const key = keyForSourceDoc(file, doc, indexRow);
      const embeddedCollections = indexRow?.embeddedCollections || [];

      const topDoc = cloneWithoutEmbeddedCollections(doc, embeddedCollections);
      await db.put(key, JSON.stringify(topDoc));

      for (const collection of embeddedCollections) {
        const fromEmbedded =
          Array.isArray(doc?._embedded?.[collection]) ? doc._embedded[collection] : [];
        const fromLegacy =
          fromEmbedded.length === 0 && Array.isArray(doc?.[collection]) ? doc[collection] : [];
        const children = fromEmbedded.length > 0 ? fromEmbedded : fromLegacy;
        for (const child of children) {
          const childId = String(child?._id || child?.id || "");
          if (!childId) continue;
          const embeddedKey = buildEmbeddedKey(
            key,
            collection,
            childId,
            indexRow?.childKeyByCollection || {}
          );
          if (!embeddedKey) continue;
          await db.put(embeddedKey, JSON.stringify(child));
        }
      }
    }
  } finally {
    await db.close();
  }

  return { docs: docs.length };
}

function mapSourceCanonicalByKey(sourcePackPath) {
  const docs = readSourceDocs(sourcePackPath);
  const index = readSourceIndex(sourcePackPath);
  const fileToIndex = new Map(index.map((row) => [row.file, row]));
  const output = new Map();

  for (const { file, doc } of docs) {
    const indexRow = fileToIndex.get(file);
    const key = keyForSourceDoc(file, doc, indexRow);
    const embeddedCollections = indexRow?.embeddedCollections || [];

    const topDoc = cloneWithoutEmbeddedCollections(doc, embeddedCollections);
    output.set(key, stableStringify(topDoc));

    for (const collection of embeddedCollections) {
      const fromEmbedded =
        Array.isArray(doc?._embedded?.[collection]) ? doc._embedded[collection] : [];
      const fromLegacy =
        fromEmbedded.length === 0 && Array.isArray(doc?.[collection]) ? doc[collection] : [];
      const children = fromEmbedded.length > 0 ? fromEmbedded : fromLegacy;
      for (const child of children) {
        const childId = String(child?._id || child?.id || "");
        if (!childId) continue;
        const embeddedKey = buildEmbeddedKey(
          key,
          collection,
          childId,
          indexRow?.childKeyByCollection || {}
        );
        if (!embeddedKey) continue;
        output.set(embeddedKey, stableStringify(child));
      }
    }
  }

  return output;
}

async function mapPackCanonicalByKey(packPath) {
  const entries = await readPackEntries(packPath);
  const output = new Map();
  for (const entry of entries) {
    output.set(entry.key, stableStringify(entry.doc ?? entry.value));
  }
  return output;
}

async function verifySourceAndPackSync(sourcePackPath, packPath) {
  const sourceMap = mapSourceCanonicalByKey(sourcePackPath);
  const packMap = await mapPackCanonicalByKey(packPath);
  const mismatches = [];

  for (const [key, sourceValue] of sourceMap.entries()) {
    if (!packMap.has(key)) {
      mismatches.push(`Missing key in repacked DB: ${key}`);
      continue;
    }
    const packValue = packMap.get(key);
    if (packValue !== sourceValue) {
      mismatches.push(`Content mismatch for key: ${key}`);
    }
  }

  for (const key of packMap.keys()) {
    if (!sourceMap.has(key)) mismatches.push(`Unexpected key in repacked DB: ${key}`);
  }

  return {
    ok: mismatches.length === 0,
    sourceCount: sourceMap.size,
    packCount: packMap.size,
    mismatches
  };
}

module.exports = {
  INDEX_FILE_NAME,
  assertPackAccessible,
  normalizePackName,
  readSystemPacks,
  unpackPackToSource,
  repackSourceToPack,
  verifySourceAndPackSync
};
