import js from "@eslint/js";
import globals from "globals";
import babelParser from "@babel/eslint-parser";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/__test__/fixtures/**",
      "**/__test__/__output__/**",
    ],
  },
  js.configs.recommended,
  prettierRecommended,
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        sourceType: "module",
        requireConfigFile: false,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "prettier/prettier": "warn",
      "no-unused-vars": "warn",
    },
  },
];
