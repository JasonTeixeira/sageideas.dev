import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ESLint v9 uses flat config. Keep repo-level ignores here so lint only targets
// the Next.js app code and doesn't try to parse vendored/archived folders.
export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    "_repo-audits/**",
    ".design-review/**",
    "playwright-report/**",
    "test-results/**",
    "docs/design-reference/**",
    // Archived design-kit source snapshots are provenance inputs, not shipped
    // application modules. Lint the Sage-owned adapters in content-studio/library.
    "content-studio/library/source/**",
    "public/projects/**",
    "**/venv/**",
    "**/.venv/**",
    "**/node_modules/**",

    // Infra code may include Node/CommonJS files (lambda handlers, scripts)
    // that are not part of the Next.js runtime bundle.
    "infra/**",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    // Pragmatic relaxations:
    // - portal code talks to Supabase with dynamic row shapes — `any` is fine there.
    // - The newer react-hooks/purity + set-state-in-effect rules fire on legitimate
    //   older server/client patterns we don't want to refactor during marketing waves.
    // - A few portal/chrome surfaces intentionally use raw remote images.
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
