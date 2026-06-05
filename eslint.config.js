import js from "@eslint/js";

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
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "no-useless-escape": "off",
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
