#!/usr/bin/env node
/**
 * Copy backend sources from the monorepo into this standalone Railway package.
 * Run from repo root: node railway/scripts/sync-from-monorepo.mjs
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const railwayRoot = resolve(scriptDir, '..');
const monorepoRoot = resolve(railwayRoot, '..');

const copies = [
  { from: join(monorepoRoot, 'server/src'), to: join(railwayRoot, 'src') },
  { from: join(monorepoRoot, 'api'), to: join(railwayRoot, 'api') },
];

const libFiles = [
  'orgAccess.ts',
  'programIntegrations.ts',
  'notificationNavigation.ts',
  'judgingType.ts',
  'dashboardRoutes.ts',
];

const deadSrcFiles = [
  'check_programs.ts',
  'check_annual_awards.ts',
  'debug_perm.ts',
  'lib/orgAccess.ts',
];

function deleteJsArtifacts(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      deleteJsArtifacts(fullPath);
      continue;
    }
    if (entry.endsWith('.js')) {
      rmSync(fullPath);
      console.log(`Removed stale ${fullPath.replace(railwayRoot + '/', '')}`);
    }
  }
}

for (const { from, to } of copies) {
  cpSync(from, to, { recursive: true, force: true });
  console.log(`Synced ${from} -> ${to}`);
}

const libDest = join(railwayRoot, 'lib');
for (const file of libFiles) {
  const from = join(monorepoRoot, 'lib', file);
  if (!existsSync(from)) {
    console.warn(`Skipping missing lib file: ${file}`);
    continue;
  }
  cpSync(from, join(libDest, file), { force: true });
  console.log(`Synced lib/${file}`);
}

for (const file of deadSrcFiles) {
  const path = join(railwayRoot, 'src', file);
  if (existsSync(path)) {
    rmSync(path);
    console.log(`Removed dev-only src/${file}`);
  }
}

for (const path of [
  join(railwayRoot, 'api/[...path].ts'),
  join(railwayRoot, 'api/tsconfig.json'),
]) {
  if (existsSync(path)) {
    rmSync(path);
    console.log(`Removed ${path.replace(railwayRoot + '/', '')}`);
  }
}

deleteJsArtifacts(join(railwayRoot, 'api'));
deleteJsArtifacts(join(railwayRoot, 'lib'));

const indexPath = join(railwayRoot, 'src/index.ts');
if (existsSync(indexPath)) {
  let indexSource = readFileSync(indexPath, 'utf8');
  indexSource = indexSource
    .replace(
      "import { resolveHandler } from '../../api/_handlers/registry.js';",
      "import { resolveHandler } from '../api/_handlers/registry.js';",
    )
    .replace(
      "const rootDir = path.resolve(__dirname, '../../');",
      "const rootDir = path.resolve(__dirname, '../');",
    )
    .replace(
      '// Resolve __dirname in ESM and load .env from the project root (two levels up from server/src/)',
      '// Resolve __dirname in ESM and load .env from the railway package root.',
    )
    .replace(
      '// Load .env first, then .env.local as override (mirrors Vite\'s behaviour)',
      '',
    )
    .replace(
      "console.log(`Invite server listening on port ${port}`);",
      "console.log(`AwardX API listening on port ${port}`);",
    );

  if (!indexSource.includes("app.get('/',")) {
    indexSource = indexSource.replace(
      "app.get('/api/health', (_req, res) => {",
      "app.get('/', (_req, res) => {\n\tres.json({ ok: true, service: 'awardx-api' });\n});\n\napp.get('/api/health', (_req, res) => {",
    );
  }

  writeFileSync(indexPath, indexSource);
  console.log('Patched src/index.ts for Railway standalone layout');
}

console.log('Done. Review changes, then test with: cd railway && npm install && npm run dev');
