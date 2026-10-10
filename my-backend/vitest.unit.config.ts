import { defineConfig } from "vitest/config";

// Unit tests need no database and no .env: tests/unit/setup.ts supplies dummy settings.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/unit/setup.ts"],
  },
});
