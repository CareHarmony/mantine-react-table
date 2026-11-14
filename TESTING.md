# ── Regenerating baselines ────────────────────────────────────────────────
cd packages/mantine-react-table
pnpm exec playwright install --with-deps chromium   # one-time
pnpm storybook:build                                # build static storybook
pnpm test:visual:update                             # capture 357 baseline PNGs
git add tests/snapshots && git commit -m "chore: add visual regression baselines"

# ── On the migrated branch ────────────────────────────────────────────────
pnpm storybook:build                                # build updated storybook
pnpm test:visual        
