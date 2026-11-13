import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
    js.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: { jsx: true },
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            import: importPlugin,
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        settings: {
            react: { version: "detect" },
            "import/resolver": {
                typescript: true,
                node: true,
            },
        },
        rules: {
            // === Базовые ===
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-undef": "off",
            "no-unused-vars": "off",
            "no-var": "error",
            "prefer-const": "error",
            eqeqeq: ["error", "always"],
            "no-implicit-coercion": "warn",
            "no-duplicate-imports": "error",

            // === TypeScript ===
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-non-null-assertion": "warn",

            // === Импорты ===
            "import/order": [
                "error",
                {
                    groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
                    "newlines-between": "always",
                    alphabetize: { order: "asc", caseInsensitive: true },
                    pathGroups: [
                        {
                            pattern: "@gm-table/**",
                            group: "internal",
                            position: "before",
                        },
                    ],
                    pathGroupsExcludedImportTypes: ["builtin"],
                },
            ],
            "import/no-duplicates": "error",

            // === React ===
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
    },
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "**/build/**",
            "**/.next/**",
            "**/.vite/**",
            "**/coverage/**",
            "**/prisma/migrations/**",
            "**/uploads/**",
        ],
    },
];
