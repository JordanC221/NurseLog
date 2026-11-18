import { defineConfig, devices } from '@playwright/test';

const browserData = process.env.NURSELOG_BROWSER_DATA_DIR || './test-results/browser-data';
const browserStorage = process.env.NURSELOG_BROWSER_STORAGE_DIR || './test-results/browser-storage';

export default defineConfig({
  testDir: './test/browser',
  outputDir: process.env.NURSELOG_BROWSER_OUTPUT_DIR || './test-results/browser-output',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node server/index.js',
      url: 'http://127.0.0.1:3101/api/health',
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        PORT: '3101',
        DATA_DIR: browserData,
        STORAGE_DIR: browserStorage,
      },
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5174',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        API_PROXY_TARGET: 'http://127.0.0.1:3101',
      },
    },
  ],
});
