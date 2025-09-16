/** Minimal config; we’ll set UA/viewport in code */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 120000,
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
  },
});


