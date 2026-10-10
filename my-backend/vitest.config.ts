import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests share one real database, so files run one after another.
    fileParallelism: false,
    // All tests share one IP, so the production login limit would block them.
    env: { AUTH_RATE_LIMIT: "1000" },
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
