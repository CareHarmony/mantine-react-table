/**
 * Visual regression tests for all Storybook stories.
 *
 * Workflow:
 *   1. Build Storybook:          pnpm storybook:build
 *   2. Generate baseline:        pnpm test:visual:update   (run on clean v2 branch)
 *   3. Compare after migration:  pnpm test:visual          (run on migrated branch)
 *
 * Screenshots are stored in tests/snapshots/ and should be committed so the
 * baseline is available for comparison on any branch.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Load the Storybook story index
// ---------------------------------------------------------------------------

const indexPath = join(__dirname, '..', 'storybook-static', 'index.json');

if (!existsSync(indexPath)) {
  throw new Error(
    `storybook-static/index.json not found.\n` +
      `Run "pnpm storybook:build" in packages/mantine-react-table first.`,
  );
}

interface StoryEntry {
  id: string;
  name: string;
  title: string;
  type: string;
}

const storyIndex: { entries: Record<string, StoryEntry> } = JSON.parse(
  readFileSync(indexPath, 'utf-8'),
);

const stories = Object.values(storyIndex.entries).filter(
  (entry) => entry.type === 'story',
);

// Group by title so we get tidy test.describe blocks
const groupedStories = stories.reduce<Record<string, StoryEntry[]>>(
  (acc, story) => {
    (acc[story.title] ??= []).push(story);
    return acc;
  },
  {},
);

// ---------------------------------------------------------------------------
// Shared helpers injected into each page
// ---------------------------------------------------------------------------

/** Seeded Math.random so faker generates the same data every run. */
function seedMathRandom() {
  let seed = 42;
  Math.random = () => {
    // Simple mulberry32 PRNG – fast and good enough for deterministic data
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** CSS that kills all animations/transitions for stable screenshots. */
const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay:    0s !important;
    transition-duration: 0s !important;
    transition-delay:   0s !important;
    caret-color: transparent !important;
  }
`;

// ---------------------------------------------------------------------------
// Generate one test per story
// ---------------------------------------------------------------------------

for (const [groupTitle, groupStories] of Object.entries(groupedStories)) {
  test.describe(groupTitle, () => {
    for (const story of groupStories) {
      test(story.name, async ({ page }) => {
        // 1. Inject seeded Math.random BEFORE the page scripts run so that
        //    faker produces identical data on every run.
        await page.addInitScript(seedMathRandom);

        // 2. Navigate to the story's standalone iframe view.
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);

        // 3. Wait for all network activity to settle (lazy data, fonts, etc.)
        await page.waitForLoadState('networkidle');

        // 4. Freeze animations so screenshots don't capture mid-transition frames.
        await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });

        // 5. Brief settle: lets the browser flush any rAF-driven renders.
        await page.waitForTimeout(300);

        // 6. Screenshot comparison.
        //    File is named by story ID so it's easy to find in tests/snapshots/.
        await expect(page).toHaveScreenshot(`${story.id}.png`);
      });
    }
  });
}
