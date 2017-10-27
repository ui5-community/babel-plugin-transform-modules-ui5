module.exports = {
    "extends": "eslint:recommended",
    "parserOptions": {
      "ecmaVersion": 7
    },
    "env": {
      node: true
    },
    "rules": {
      "semi": ["warn", "never"],
      "quotes": ["warn", "single"],
      "no-unused-vars": "warn",
      "brace-style": ["warn", "stroustrup", {"allowSingleLine": true}],
      "space-before-function-paren": ["warn", "never"],
      "no-trailing-spaces": "warn"
    }
}
