import { transformSync } from "@babel/core";
import { join } from "path";
import { runInNewContext } from "vm";
import plugin from "../src";

function transform(input, options = {}, babelOptions = {}) {
  return transformSync(input, {
    filename: join(__dirname, "reexport-runtime.js"),
    plugins: [[plugin, options]],
    babelrc: false,
    configFile: false,
    ...babelOptions,
  }).code;
}

// Execute the generated factories, not just their snapshots: a syntactically
// valid `.default` read can still silently export undefined.
function load(code, modules = {}) {
  let exports;
  let dependencies;
  runInNewContext(code, {
    sap: {
      ui: {
        define(sources, factory) {
          dependencies = Array.from(sources);
          exports = factory(
            ...sources.map((source) => {
              if (!Object.prototype.hasOwnProperty.call(modules, source)) {
                throw new Error(`Unexpected dependency: ${source}`);
              }
              return modules[source];
            })
          );
        },
      },
    },
  });
  return { exports, dependencies };
}

const consumerForms = [
  ["named", 'export { default as Value } from "./Mod";', "Value"],
  ["default", 'export { default } from "./Mod";', "default"],
  [
    "string-literal named",
    'export { "default" as Value } from "./Mod";',
    "Value",
  ],
  [
    "string-literal default",
    'export { "default" as default } from "./Mod";',
    "default",
  ],
];

const producers = [
  ["object", "export default { currency(v) { return v.toFixed(2); } };", {}],
  [
    "function",
    "export default function format(v) { return v.toFixed(2); }",
    {},
  ],
  ["class", "export default class Formatter {}", {}],
  ["number", "export default 42;", {}],
  ["null", "export default null;", {}],
  ["undefined", "export default undefined;", {}],
  [
    "collapsed class with named exports",
    'export const helper = () => "ok"; export default class Formatter {}',
    {},
  ],
  [
    "uncollapsed module with named exports",
    'export const helper = () => "ok"; export default class Formatter {}',
    { noExportCollapse: true },
  ],
  [
    "default-only module with collapse disabled",
    "export default { currency(v) { return v.toFixed(2); } };",
    { noExportCollapse: true },
  ],
];

describe("default re-export runtime", () => {
  describe.each(producers)("%s producer", (name, input, options) => {
    test.each(consumerForms)("%s consumer", (form, consumer, key) => {
      const dependency = load(transform(input, options)).exports;
      const modules = { "./Mod": dependency };
      const expected = load(
        transform('import Value from "./Mod"; export default Value;'),
        modules
      ).exports;
      const result = load(transform(consumer), modules);
      expect(result.dependencies).toEqual(["./Mod"]);
      expect(result.exports[key]).toBe(expected);
    });
  });

  test.each([
    ["wrapped ES module", { __esModule: true, default: { value: 42 } }],
    ["unmarked default property", { default: { value: 42 } }],
    ["false ES module marker", { __esModule: false, default: 42 }],
    ["undefined wrapped default", { __esModule: true, default: undefined }],
    ["null wrapped default", { __esModule: true, default: null }],
  ])("matches default imports for %s", (name, dependency) => {
    const modules = { "./Mod": dependency };
    const expected = load(
      transform('import Value from "./Mod"; export default Value;'),
      modules
    ).exports;
    const result = load(
      transform('export { default as Value } from "./Mod";'),
      modules
    );
    expect(result.exports.Value).toBe(expected);
  });

  test.each([
    ["sap/m/Button", {}],
    ["my/app/Module", { noImportInteropPrefixes: ["my/app/"] }],
    ["./Mod", { noImportInteropPrefixes: ["./"] }],
  ])("respects interop opt-out for %s", (source, options) => {
    const dependency = { __esModule: true, default: { value: 42 } };
    const code = transform(
      `export { default as Value } from "${source}";`,
      options
    );
    const result = load(code, { [source]: dependency });
    expect(result.exports.Value).toBe(dependency);
    expect(code).not.toContain("_interopRequireDefault");
  });

  test("a named re-export as default still reads the named property", () => {
    const dependency = { helper: () => "ok" };
    const code = transform('export { helper as default } from "./Mod";');
    expect(load(code, { "./Mod": dependency }).exports.default).toBe(
      dependency.helper
    );
    expect(code).not.toContain("_interopRequireDefault");
  });

  test("can re-export the default more than once alongside named exports", () => {
    const dependency = load(
      transform('export const helper = () => "ok"; export default class Mod {}')
    ).exports;
    const result = load(
      transform(`
        export { default as First, helper } from "./Mod";
        export { default as Second, default } from "./Mod";
      `),
      { "./Mod": dependency }
    );
    expect(result.dependencies).toEqual(["./Mod"]);
    expect(result.exports.First).toBe(dependency);
    expect(result.exports.Second).toBe(dependency);
    expect(result.exports.default).toBe(dependency);
    expect(result.exports.helper).toBe(dependency.helper);
  });

  describe.each([
    ["default", 'import Local from "./Mod";', "Local", "default"],
    ["namespace", 'import * as Local from "./Mod";', "Local", "namespace"],
    ["named", 'import { helper as Local } from "./Mod";', "Local", "named"],
    ["side-effect", 'import "./Mod";', null, "side-effect"],
  ])("mixed %s import", (name, importCode, local, kind) => {
    test.each(["before", "after"])("%s re-export", (order) => {
      const dependency = load(
        transform(
          'export const helper = () => "ok"; export default class Mod {}'
        )
      ).exports;
      const reexport = 'export { default as Value, helper } from "./Mod";';
      const input =
        order === "before"
          ? `${importCode} ${reexport}`
          : `${reexport} ${importCode}`;
      const result = load(
        transform(
          `${input} ${local ? `export const imported = ${local};` : ""}`
        ),
        { "./Mod": dependency }
      );
      expect(result.dependencies).toEqual(["./Mod"]);
      expect(result.exports.Value).toBe(dependency);
      expect(result.exports.helper).toBe(dependency.helper);
      if (local) {
        expect(result.exports.imported).toBe(
          kind === "named" ? dependency.helper : dependency
        );
      }
    });
  });

  test.each(["before", "after"])(
    "wildcard re-export %s default re-export and import",
    (order) => {
      const dependency = load(
        transform(
          'export const helper = () => "ok"; export default class Mod {}'
        )
      ).exports;
      const wildcard = 'export * from "./Mod";';
      const explicit = `
        export { default as Value } from "./Mod";
        import Local from "./Mod";
        export const imported = Local;
      `;
      const result = load(
        transform(
          order === "before"
            ? `${wildcard} ${explicit}`
            : `${explicit} ${wildcard}`
        ),
        { "./Mod": dependency }
      );
      expect(result.dependencies).toEqual(["./Mod"]);
      expect(result.exports.Value).toBe(dependency);
      expect(result.exports.imported).toBe(dependency);
      expect(result.exports.helper).toBe(dependency.helper);
    }
  );

  test.each(["before", "after"])(
    "opted-out default imports %s a re-export retain all local aliases",
    (order) => {
      const dependency = { __esModule: true, default: { value: 42 } };
      const imports = `
        import First from "sap/m/Button";
        import Second from "sap/m/Button";
        export { First, Second };
      `;
      const reexport = 'export { default as Value } from "sap/m/Button";';
      const result = load(
        transform(
          order === "before"
            ? `${imports} ${reexport}`
            : `${reexport} ${imports}`
        ),
        { "sap/m/Button": dependency }
      );
      expect(result.dependencies).toEqual(["sap/m/Button"]);
      expect(result.exports.Value).toBe(dependency);
      expect(result.exports.First).toBe(dependency);
      expect(result.exports.Second).toBe(dependency);
    }
  );

  test.each(["named", "wildcard"])(
    "a %s re-export locks a previously registered side-effect import",
    (kind) => {
      const dependency = { helper: () => "ok" };
      const reexport =
        kind === "named"
          ? 'export { helper } from "./Mod";'
          : 'export * from "./Mod";';
      const result = load(
        transform(`
          import "./Mod";
          ${reexport}
          import Local from "./Mod";
          export const imported = Local;
        `),
        { "./Mod": dependency }
      );
      expect(result.dependencies).toEqual(["./Mod"]);
      expect(result.exports.helper).toBe(dependency.helper);
      expect(result.exports.imported).toBe(dependency);
    }
  );

  test("supports string-literal named properties in a mixed re-export", () => {
    const dependency = { "format-currency": () => "ok" };
    const result = load(
      transform(
        'export { default as Value, "format-currency" as format } from "./Mod";'
      ),
      { "./Mod": dependency }
    );
    expect(result.exports.Value).toBe(dependency);
    expect(result.exports.format).toBe(dependency["format-currency"]);
  });

  test("a named consumer works through a chain of default re-exports", () => {
    const dependency = load(
      transform("export default { currency(v) { return v.toFixed(2); } };")
    ).exports;
    const first = load(transform('export { default } from "./Mod";'), {
      "./Mod": dependency,
    }).exports;
    const second = load(
      transform('export { default as Value } from "./Mod";'),
      {
        "./Mod": first,
      }
    ).exports;
    const consumer = load(
      transform(
        'import { Value } from "./Mod"; export default Value.currency(1);'
      ),
      { "./Mod": second }
    );
    expect(consumer.exports).toBe("1.00");
  });

  test("TypeScript type-only specifiers are removed before runtime re-exports", () => {
    const dependency = { value: 42 };
    const code = transform(
      'export { type Formatter, default as Value } from "./Mod";',
      {},
      {
        filename: join(__dirname, "reexport-runtime.ts"),
        presets: ["@babel/preset-typescript"],
      }
    );
    const result = load(code, { "./Mod": dependency });
    expect(result.exports.Value).toBe(dependency);
    expect(Object.keys(result.exports)).toEqual(["__esModule", "Value"]);
  });

  test("no-wrap pragma leaves re-exports unchanged", () => {
    const code = transform(
      '/* @ui5-no-wrap */ export { default as Value } from "./Mod";'
    );
    expect(code).toContain('export { default as Value } from "./Mod";');
    expect(code).not.toContain("sap.ui.define");
    expect(code).not.toContain("_interopRequireDefault");
  });
});
