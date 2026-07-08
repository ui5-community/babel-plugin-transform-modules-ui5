const js = require("@eslint/js");
const globals = require("globals");
const babelParser = require("@babel/eslint-parser");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = [
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
