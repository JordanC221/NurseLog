import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser-pwa',
  outputDir: process.env.NURSELOG_PWA_OUTPUT_DIR || './test-results/pwa-output',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3102',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'chromium-pwa', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node test/start-pwa-server.js',
    url: 'http://localhost:3102/api/health',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      NODE_ENV: 'production',
      PORT: '3102',
      DATA_DIR: process.env.PWA_TEST_DATA_DIR || './test-results/pwa-data',
      STORAGE_DIR: process.env.PWA_TEST_STORAGE_DIR || './test-results/pwa-storage',
    },
  },
});
