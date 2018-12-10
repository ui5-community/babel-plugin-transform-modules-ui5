module.exports = {
  extends: ["plugin:prettier/recommended"],
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  env: {
    node: true,
  },
  rules: {
    "no-unused-vars": "warn",
  },
};
