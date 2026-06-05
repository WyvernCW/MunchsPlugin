import js from "@eslint/js";
import react from "eslint-plugin-react";

export default [
  {
    ignores: [
      "mcp-server/build/**",
      "mcp-server/node_modules/**",
      "node_modules/**",
      "AGENT.md",
      "AGENTS.md",
      "CLAUDE.md",
      "GEMINI.md",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      react,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        Buffer: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        navigator: "readonly",
        process: "readonly",
        Response: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "no-useless-escape": "off",
      "react/jsx-uses-vars": "error",
    },
  },
  {
    files: ["skill/munch/scripts/powershell_redirect.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        process: "readonly",
        require: "readonly",
      },
    },
  },
];
