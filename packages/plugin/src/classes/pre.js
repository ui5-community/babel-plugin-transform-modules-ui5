import { saveImports } from "./helpers/imports";

export const ClassPre = (file) => {
  // save all import declarations before "unneeded" ones are removed by the TypeScript plugin
  saveImports(file);
};
