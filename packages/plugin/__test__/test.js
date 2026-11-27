import {
  writeFileSync,
  statSync,
  readdirSync,
  emptyDirSync,
  ensureDirSync,
} from "fs-extra";
import { join, resolve } from "node:path";
import { transformFileAsync } from "@babel/core";
import syntaxDecorators from "@babel/plugin-syntax-decorators";
import syntaxJsx from "@babel/plugin-syntax-jsx";
import proposalDecorators from "@babel/plugin-proposal-decorators";
import presetEnv from "@babel/preset-env";
import presetFlow from "@babel/preset-flow";
import presetTypescript from "@babel/preset-typescript";
import polyfillCorejs3 from "babel-plugin-polyfill-corejs3";
import { get as getOpts, getBabelOpts } from "./options.js";
import plugin from "../src/index.js";
import { resetAllCaches } from "../src/classes/helpers/imports.js";

const testDirectory = import.meta.dirname;

// Clear all ancestry caches before this test file runs so that stale state from
// a previous test module (same Jest worker) cannot affect transitive detection results.
resetAllCaches();

const FIXTURE_DIR_NAME = "fixtures";
const OUT_DIR_NAME = "__output__";

emptyDirSync(join(testDirectory, OUT_DIR_NAME));

function processDirectory(dir) {
  const items = readdirSync(dir);
  // Process Files first
  items
    .filter(
      (item) =>
        item.endsWith(".js") ||
        item.endsWith(".ts") ||
        item.endsWith(".jsx") ||
        item.endsWith(".tsx")
    )
    .forEach((filename) => {
      test(filename, async () => {
        const filePath = join(dir, filename);
        let outputPath = filePath
          .replace(FIXTURE_DIR_NAME, OUT_DIR_NAME)
          .replace(/\.(ts|jsx|tsx)$/, ".js");

        try {
          const opts = getOpts(filePath);
          const presets = [];
          const plugins = [
            [plugin, opts], // we don't rely on the plugin order anymore!
            [syntaxDecorators, { version: "legacy" }],
          ];

          if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
            presets.push([presetTypescript, { onlyRemoveTypeImports: false }]);
          }

          if (filePath.endsWith(".jsx") || filePath.endsWith(".tsx")) {
            plugins.push(syntaxJsx);
          }

          if (filePath.includes("flow")) {
            presets.push(presetFlow);
          }

          if (filePath.includes("preset-env")) {
            presets.push([
              presetEnv,
              {
                modules: false,
              },
            ]);
            plugins.push([
              polyfillCorejs3,
              { method: "usage-global", version: "3.49.0" },
            ]);
          }

          if (filePath.includes("/decorators/")) {
            plugins.push([proposalDecorators, { version: "legacy" }]);
          }

          const result = (
            await transformFileAsync(filePath, {
              plugins,
              presets,
              sourceRoot: testDirectory,
              ...getBabelOpts(filePath),
              ...(filePath.includes("preset-env")
                ? { targets: { ie: "11" } }
                : {}),
              comments:
                filePath.includes("comments") ||
                filename.includes("copyright") ||
                filename.includes("controller-extension-usage"),
              babelrc: false,
              configFile: false,
            })
          ).code;

          ensureDirSync(dir.replace(FIXTURE_DIR_NAME, OUT_DIR_NAME)); // This is delayed for when we run with a filter.
          writeFileSync(outputPath, result); // For manual verification

          if (filePath.includes("-error-")) {
            throw new Error(`Expected ${filename} to throw error`);
          }
          // if (!opts.allowMixedExports && result.includes(`"__esModule"`)) {
          //   throw new Error(`Unexpected __esModule declaration in ${filename}`)
          // }
          if (!filePath.includes("_private_")) {
            expect(result).toMatchSnapshot();
          }
        } catch (error) {
          if (filename.includes("error-")) {
            const message = error.message
              .replace(filePath, "")
              .replace(": ", "");
            outputPath = outputPath.replace(".js", ".txt");
            expect(message).toMatchSnapshot();
            ensureDirSync(dir.replace(FIXTURE_DIR_NAME, OUT_DIR_NAME)); // This is delayed for when we run with a filter.
            writeFileSync(outputPath, message); // For manual verification
          } else {
            throw error;
          }
        }
      });
    });

  // Recurse into directories
  items
    .map((name) => ({ name, path: join(dir, name) }))
    .filter((item) => statSync(item.path).isDirectory())
    .forEach((item) => {
      describe(item.name, () => {
        processDirectory(item.path);
      });
    });
}

(() => {
  processDirectory(resolve(testDirectory, FIXTURE_DIR_NAME));
})();
