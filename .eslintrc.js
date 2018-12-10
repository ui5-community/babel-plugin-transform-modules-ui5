module.exports = {
  extends: ["plugin:prettier/recommended", "eslint:recommended"],
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  env: {
    node: true,
  },
  rules: {
    "prettier/prettier": "warn",
    "no-unused-vars": "warn",
  },
};
