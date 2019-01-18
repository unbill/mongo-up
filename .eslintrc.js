module.exports = {
  "extends": "eslint:recommended",
  "rules": {
      // disable rules from base configurations
      "no-console": "off",
      "linebreak-style": "off"
  },
    "parserOptions": {
      "ecmaVersion": 2017
  },

  "env": {
    "node" : true,
    "es6": true
  }
}