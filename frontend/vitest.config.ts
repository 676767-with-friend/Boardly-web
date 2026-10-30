import { defineConfig } from "vitest/config"

import path from "node:path"

import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    environment: "jsdom",

    setupFiles: ["./src/test/setup.ts"],

    include: ["src/**/*.test.{ts,tsx}"],

    clearMocks: true,

    restoreMocks: true,

    reporters: process.env.CI ? ["default", "junit"] : ["default"],

    outputFile: process.env.CI
      ? { junit: "reports/vitest-junit.xml" }
      : undefined,

    coverage: {
      provider: "v8",

      reporter: ["text", "json-summary", "html", "lcov"],

      reportsDirectory: "coverage",

      include: ["src/**/*.{ts,tsx}"],

      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/vite-env.d.ts"],
    },
  },
})
