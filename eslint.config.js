import js from "@eslint/js";
import react from "eslint-plugin-react";

export default [
  {
    ignores: [
      "mcp-server/build/**",
      "mcp-server/node_modules/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "AGENT.md",
      "AGENTS.md",
      "CLAUDE.md",
      "GEMINI.md",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
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
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        navigator: "readonly",
        performance: "readonly",
        process: "readonly",
        require: "readonly",
        Response: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        window: "readonly",
        IntersectionObserver: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "no-useless-escape": "off",
      "react/jsx-uses-vars": "error",
    },
  },
];
