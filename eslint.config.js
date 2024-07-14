import eslint from "@eslint/js";
import tsEslint from "typescript-eslint";
import globals from "globals";

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended.map((config) => ({
    ...config,
    files: ["*/**/*.{ts,js}"],
    ignores: [...(config.ignores ?? []), "**/generated/*"],
    languageOptions: {
      ...config.languageOptions,
      globals: {
        ...(config.languageOptions?.globals ?? {}),
        ...globals.node,
      },
    },
  })),
);
