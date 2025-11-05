import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/integration-pending/**",
      "**/*.d.ts",
    ],
    pool: "forks", // Required for convex-test
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "convex/_generated/",
        "**/*.config.ts",
        "**/*.d.ts",
      ],
    },
  },
});
