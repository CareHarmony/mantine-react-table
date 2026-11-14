import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      // Allow 2% of pixels to differ (handles minor anti-aliasing differences)
      maxDiffPixelRatio: 0.02,
      // Per-pixel color threshold (0–1 scale)
      threshold: 0.2,
    },
  },
  outputDir: './tests/test-results',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  snapshotDir: './tests/snapshots',

  // Flatten snapshot paths: tests/snapshots/<story-id>-<browser>-<platform>.png
  snapshotPathTemplate: '{snapshotDir}/{arg}-{projectName}-{platform}{ext}',

  testDir: './tests',

  // Per-story timeout (some tables with virtualization or heavy data may take longer)
  timeout: 45_000,

  use: {
    baseURL: 'http://localhost:6008',
    viewport: { height: 800, width: 1280 },
  },

  // Serve the pre-built storybook static directory
  webServer: {
    command: 'npx serve storybook-static --listen 6008 --no-clipboard',
    // Reuse an already-running server during local development
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    url: 'http://localhost:6008',
  },

  // Parallelise across workers; use fewer on CI to keep memory usage stable
  workers: process.env.CI ? 2 : 4,
});
