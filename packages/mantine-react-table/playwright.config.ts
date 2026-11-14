import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './tests/test-results',
  snapshotDir: './tests/snapshots',

  // Flatten snapshot paths: tests/snapshots/<story-id>-<browser>-<platform>.png
  snapshotPathTemplate: '{snapshotDir}/{arg}-{projectName}-{platform}{ext}',

  // Per-story timeout (some tables with virtualization or heavy data may take longer)
  timeout: 45_000,

  expect: {
    toHaveScreenshot: {
      // Allow 2% of pixels to differ (handles minor anti-aliasing differences)
      maxDiffPixelRatio: 0.02,
      // Per-pixel color threshold (0–1 scale)
      threshold: 0.2,
    },
  },

  use: {
    baseURL: 'http://localhost:6008',
    viewport: { width: 1280, height: 800 },
  },

  // Parallelise across workers; use fewer on CI to keep memory usage stable
  workers: process.env.CI ? 2 : 4,

  // Serve the pre-built storybook static directory
  webServer: {
    command: 'npx serve storybook-static --listen 6008 --no-clipboard',
    url: 'http://localhost:6008',
    // Reuse an already-running server during local development
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
