import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      TURSO_DATABASE_URL: "file:test-e2e.db",
      TURSO_AUTH_TOKEN: "",
      JWT_SECRET: "playwright-e2e-secret-minimal-32-karakter-panjang",
      SEED_CUSTODIAN_CODE: "CUST-001",
      SEED_CUSTODIAN_NAME: "System Custodian",
      TELEGRAM_BOT_TOKEN: "",
      TELEGRAM_CHANNEL_ID: "",
    },
  },
});
