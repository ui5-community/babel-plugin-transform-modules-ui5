/* global test, expect, describe */
import {
  writeFileSync,
  statSync,
  readdirSync,
  emptyDirSync,
  ensureDirSync,
} from "fs-extra";
import { join, resolve } from "path";
import { transformFileSync } from "@babel/core";
import { get as getOptions } from "./options";
import plugin from "../src";

const FIXTURE_DIR_NAME = "fixtures";
const OUT_DIR_NAME = "__output__";

const IGNORED = [
  "preset-env-usage.js", // Failing in new babel version due to change in order of plugin processing
];

emptyDirSync(join(__dirname, OUT_DIR_NAME));

function processDirectory(directory) {
  const items = readdirSync(directory);
  const files = items.filter(
    (item) => item.endsWith(".js") || item.endsWith(".ts")
  );
  const directories = items
    .map((name) => ({ name, path: join(directory, name) }))
    .filter((item) => statSync(item.path).isDirectory());

  // Process Files first
  files.forEach((filename) => {
    test(filename, () => {
      runSingleTest(directory, filename);
    });
  });

  // Recurse into directories
  directories.forEach((item) => {
    describe(item.name, () => {
      processDirectory(item.path);
    });
  });
}

function runSingleTest(directory, filename) {
  if (IGNORED.includes(filename)) {
    return;
  }
  const filePath = join(directory, filename);
  let outputPath = filePath
    .replace(FIXTURE_DIR_NAME, OUT_DIR_NAME)
    .replace(/.ts$/, ".js");

  try {
    const opts = getOptions(filePath);
    const presets = [];

    if (filePath.endsWith(".ts")) {
      presets.push(["@babel/preset-typescript"]);
    }

    if (filePath.includes("flow")) {
      presets.push(["@babel/preset-flow"]);
    }

    if (filePath.includes("preset-env")) {
      presets.push([
        "@babel/preset-env",
        {
          targets: undefined, // default targets for preset-env is ES5
          modules: false,
          useBuiltIns: "usage",
          corejs: 2,
        },
      ]);
    }

    const transformResult = transformFileSync(filePath, {
      plugins: [
        "@babel/plugin-syntax-dynamic-import",
        "@babel/plugin-syntax-object-rest-spread",
        ["@babel/plugin-syntax-decorators", { legacy: true }],
        ["@babel/plugin-syntax-class-properties", { useBuiltIns: true }],
        [plugin, opts],
      ],
      presets,
      sourceRoot: __dirname,
      comments: false,
      babelrc: false,
    });
    const transformOutput = transformResult.code;

    ensureDirSync(directory.replace(FIXTURE_DIR_NAME, OUT_DIR_NAME)); // This is delayed for when we run with a filter.
    writeFileSync(outputPath, transformOutput); // For manual verification

    if (filePath.includes("_private_")) {
      // no snapshots for private client code
      return;
    }

    if (filePath.includes("-error-")) {
      throw new Error(`Expected ${filename} to throw error`);
    }

    expect(transformOutput).toMatchSnapshot();
  } catch (error) {
    if (filename.includes("error-")) {
      const message = error.message.replace(filePath, "").replace(": ", "");
      outputPath = outputPath.replace(".js", ".txt");
      expect(message).toMatchSnapshot();
      ensureDirSync(directory.replace(FIXTURE_DIR_NAME, OUT_DIR_NAME)); // This is delayed for when we run with a filter.
      writeFileSync(outputPath, message); // For manual verification
    } else {
      throw error;
    }
  }
}

(() => {
  processDirectory(resolve(__dirname, FIXTURE_DIR_NAME));
})();
