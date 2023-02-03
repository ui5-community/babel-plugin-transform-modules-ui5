module.exports = {
  extends: ["plugin:prettier/recommended", "eslint:recommended"],
  parser: "@babel/eslint-parser",
  parserOptions: {
    sourceType: "module",
    requireConfigFile: false,
  },
  env: {
    node: true,
  },
  rules: {
    "prettier/prettier": "warn",
    "no-unused-vars": "warn",
  },
};
