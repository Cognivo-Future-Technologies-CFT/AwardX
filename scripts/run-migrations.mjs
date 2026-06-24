#!/usr/bin/env node
/**
 * Apply pending Supabase migrations (035, 036) to the remote database.
 *
 * Requires one of:
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@...
 *   SUPABASE_DB_PASSWORD=your_database_password
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });

const MIGRATIONS = [
  '035_submission_processing.sql',
  '036_submission_processing_summary.sql',
];

function getConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const ref = match?.[1];
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!ref || !password) {
    throw new Error(
      'Missing database credentials. Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env\n' +
        'Find your database password in Supabase Dashboard → Project Settings → Database',
    );
  }

  const host = process.env.SUPABASE_DB_HOST || `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT || '5432';
  const user = process.env.SUPABASE_DB_USER || 'postgres';
  const database = process.env.SUPABASE_DB_NAME || 'postgres';

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function main() {
  const connectionString = getConnectionString();
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to database');

  try {
    await client.query('BEGIN');

    for (const file of MIGRATIONS) {
      const filePath = path.join(rootDir, 'supabase', 'migrations', file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${filePath}`);
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    }

    await client.query('COMMIT');
    console.log('\nAll migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
