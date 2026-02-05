// eslint.config.js (ESM)
// If your package.json does NOT have "type": "module", use the CommonJS variant below.

import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

// TypeScript ESLint (flat config helper + presets)
import tseslint from "typescript-eslint";

// React (flat presets)
import react from "eslint-plugin-react";

// React Hooks
import reactHooks from "eslint-plugin-react-hooks";

// Prettier (flat plugin + config)
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig([
  // 1) Global ignores — replace .eslintignore
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      // Keep ESLint focused strictly on src:
      "**/*", // ignore everything...
      "!src/**", // ...except src/**
    ],
  },

  // 2) Base recommended JS rules (applies to anything we end up linting under src)
  js.configs.recommended,

  // 3) React flat presets
  //    - recommended rules
  //    - jsx-runtime to avoid requiring React in scope for JSX (like react/react-in-jsx-scope)
  {
    ...react.configs.flat.recommended,
    settings: { react: { version: "detect" } }, // mirrors your settings.react.version
  },
  react.configs.flat["jsx-runtime"],

  // 4) TypeScript ESLint flat presets (roughly replaces the two @typescript-eslint "extends")
  //    These bring in parser + rules in flat-config style.
  ...tseslint.configs.recommended,

  // 5) Project-specific tweaks: environment, globals, plugins, rules
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      // mirrors your env + globals:
      // - browser + node environments
      // - JSX global available
      globals: {
        ...globals.browser, // browser: true
        ...globals.node, // node: true
        JSX: true, // your "globals": { "JSX": true }
      },
      // If you need a specific tsconfig for type-aware rules, add:
      // parserOptions: { project: './tsconfig.json' },
    },
    plugins: {
      // plugin names here map to rule keys below
      "react-hooks": reactHooks,
      prettier: prettierPlugin,
    },
    rules: {
      // Your original rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // In jsx-runtime world, React in scope isn't required:
      "react/react-in-jsx-scope": "off",

      // Prettier: keep as "recommended" style (same intent as your extends)
      // If you want Prettier issues as warnings or errors, use:
      "prettier/prettier": "warn",
    },
  },
]);
