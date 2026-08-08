#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  validateOperatingModelImport,
} from "../lib/operating-model-import.mjs";

const input = process.argv[2];
if (!input) {
  console.error("Usage: npm run snapshot:validate -- /absolute/path/to/snapshot.json");
  process.exitCode = 2;
} else {
  try {
    const document = JSON.parse(await readFile(resolve(input), "utf8"));
    const result = validateOperatingModelImport(document);

    console.log(
      result.valid
        ? "VALID STRUCTURE — HUMAN REVIEW STILL REQUIRED"
        : "INVALID SNAPSHOT STRUCTURE",
    );
    if (result.summary) {
      console.log(`Knowledge state: ${result.summary.knowledgeState}`);
      console.log(
        `Record counts: ${Object.entries(result.summary.counts)
          .map(([name, count]) => `${name}=${count}`)
          .join(", ")}`,
      );
    }
    for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
    for (const error of result.errors) console.error(`Error: ${error}`);
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    const message = error instanceof SyntaxError
      ? "The snapshot is not valid JSON."
      : "The snapshot could not be read.";
    console.error(message);
    process.exitCode = 1;
  }
}
