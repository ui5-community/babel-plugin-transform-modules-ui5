import Button from "sap/m/Button";

async function load() {
  /* @ui5-ignore-import */
  const mod = await import("./lazy-module");

  /* @ui5-ignore-import */
  foo = await import("./other-module");

  const normal = await import("./transformed-module");
}

export default Button;
