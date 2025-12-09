import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        warnOnUnsupportedTypeScriptVersion: false,
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
        React: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importPlugin,
      prettier: prettier,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "error",
      "react-refresh/only-export-components": "warn",
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-redeclare": "off",

      // TODO: Remove these workarounds and follow the recommended rules for react-hooks
      "react-hooks/set-state-in-effect": "off",

      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",

      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "nanoid",
              message: 'This module should be used via "src/utils/random.ts".',
            },
            {
              name: "fractional-indexing-jittered",
              message: 'This module should be used via "src/utils/findex.ts".',
            },
          ],
        },
      ],

      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "src/utils/",
              from: "src/shapes/",
              message: '"src/utils/" should be independent from "src/shapes/".',
            },
            {
              target: "src/utils/",
              from: "src/composables/",
              message: '"src/utils/" should be independent from "src/composables/".',
            },
            {
              target: "src/utils/",
              from: "src/stores/",
              message: '"src/utils/" should be independent from "src/stores/".',
            },
          ],
        },
      ],
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.json"],
        },
        node: true,
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },
  },
];
