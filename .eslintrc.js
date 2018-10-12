module.exports = {
    "extends": "eslint:recommended",
    "parser": "babel-eslint",
    "parserOptions": {
      "ecmaVersion": 2017,
      "sourceType": "module"
    },
    "env": {
      node: true
    },
    "rules": {
      "semi": ["warn", "always"],
      "quotes": ["warn", "double", {"allowTemplateLiterals": true}],
      "no-unused-vars": "warn",
      "brace-style": ["warn", "stroustrup", {"allowSingleLine": true}],
      "space-before-function-paren": ["warn", "never"],
      "no-trailing-spaces": "warn"
    }
}
