const { FlatCompat } = require("@eslint/eslintrc");
const globals = require("globals");
const js = require("@eslint/js");
const ts = require("typescript-eslint");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: ["lib/", "eslint.config.js"],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...compat.extends("google"),
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "quotes": ["error", "double"],
      "import/no-unresolved": "off",
      "indent": ["error", 2],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error"],
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { "allowShortCircuit": true, "allowTernary": true }
      ],
      "object-curly-spacing": ["error", "always"],
      "max-len": "off",
    }
  }
];
