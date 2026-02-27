# Visual Regression Tests

Playwright screenshot tests that cover every Storybook story (357 stories across 55 groups).

## Prerequisites

```bash
# Install Playwright browsers (one-time setup)
pnpm exec playwright install --with-deps chromium
```

## Workflow

### 1. Generate baseline (clean branch)

Run this on the **original `v2` branch** before the React 19 / Mantine 9 migration:

```bash
# In packages/mantine-react-table
pnpm storybook:build          # produces storybook-static/
pnpm test:visual:update       # takes screenshots → tests/snapshots/
```

Commit the generated snapshots in `tests/snapshots/` so they travel with the branch.

### 2. Compare after migration

On the **migrated branch** (React 19 / Mantine 9):

```bash
pnpm storybook:build          # build new storybook
pnpm test:visual              # compare against committed snapshots
```

Playwright will exit non-zero if any story's screenshot differs beyond the configured threshold (2% of pixels, color threshold 0.2).

Diff images are written to `tests/test-results/` for inspection.

### 3. Selectively update snapshots

If a visual change is intentional, update only those stories:

```bash
# Update a single story by name pattern
pnpm test:visual:update --grep "Aggregation"

# Update everything
pnpm test:visual:update
```

## Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| `maxDiffPixelRatio` | 0.02 | ≤2% of pixels may differ (anti-aliasing) |
| `threshold` | 0.2 | Per-pixel color distance tolerance |
| `workers` | 4 (local) / 2 (CI) | Parallel screenshot capture |
| Viewport | 1280×800 | Desktop Chrome default |

## Deterministic faker data

All stories use `@faker-js/faker` without a fixed seed.  The test suite injects a seeded `Math.random` replacement (mulberry32 PRNG, seed 42) via `page.addInitScript` **before** any page scripts run, making faker output identical across runs.

## Platform notes

Playwright snapshot filenames include the platform suffix (e.g. `-chromium-linux.png`).  Baselines generated on Windows will not match Linux screenshots and vice-versa.  For cross-platform CI, either:

- Generate baselines **on the same OS** as CI (recommended), or
- Use `--update-snapshots` on the CI platform to create platform-specific baselines.

## Snapshot storage

`tests/snapshots/` is committed to the repository.  Each PNG is typically 100–400 KB; the full suite is roughly 60–120 MB.  Consider [Git LFS](https://git-lfs.github.com/) if repository size becomes a concern:

```bash
git lfs track "tests/snapshots/*.png"
```
