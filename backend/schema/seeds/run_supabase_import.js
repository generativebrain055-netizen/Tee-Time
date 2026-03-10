/**
 * Run import_clubs_csv_to_golf_courses_supabase.sql against Supabase.
 *
 * Option A - Full URI (recommended; avoids "Tenant or user not found"):
 *   In .env set SUPABASE_DATABASE_URL to the URI from Dashboard → Settings → Database (Connection string → URI).
 *
 * Option B - Build from pieces:
 *   SUPABASE_URL, SUPABASE_DB_PASSWORD, and optionally SUPABASE_DB_REGION (e.g. eu-west-1).
 *
 * Windows: cd backend && node schema\seeds\run_supabase_import.js
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Client } = require('pg');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL;

const REGIONS = ['eu-central-2', 'us-east-1', 'ap-southeast-1', 'eu-west-1', 'ap-northeast-1', 'eu-central-1', 'us-west-1', 'ap-south-1', 'ap-northeast-2', 'ap-southeast-2', 'eu-west-2', 'sa-east-1'];
// Some regions use aws-1- instead of aws-0- (e.g. Zurich / eu-central-2)
const POOLER_PREFIX = { 'eu-central-2': 'aws-1' };

function poolerHost(region) {
  const prefix = POOLER_PREFIX[region] || 'aws-0';
  return `${prefix}-${region}.pooler.supabase.com`;
}

let connectionString;
let poolerFallback = null;
if (SUPABASE_DATABASE_URL && SUPABASE_DATABASE_URL.startsWith('postgresql://')) {
  connectionString = SUPABASE_DATABASE_URL;
  const directMatch = connectionString.match(/postgresql:\/\/postgres:([^@]+)@db\.([^.]+)\.supabase\.co:5432\/postgres/);
  if (directMatch) {
    const password = directMatch[1];
    const projectRef = directMatch[2];
    const region = process.env.SUPABASE_DB_REGION || 'eu-central-2';
    connectionString = `postgresql://postgres.${projectRef}:${password}@${poolerHost(region)}:6543/postgres`;
    poolerFallback = { projectRef, password };
  }
  if (!connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  }
} else {
  if (!SUPABASE_URL || !SUPABASE_DB_PASSWORD) {
    console.error('Missing SUPABASE_URL and SUPABASE_DB_PASSWORD in .env');
    console.error('Or set SUPABASE_DATABASE_URL to the full URI from Supabase Dashboard → Settings → Database (Connection string → URI).');
    process.exit(1);
  }
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const region = process.env.SUPABASE_DB_REGION || 'eu-central-2';
  connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@${poolerHost(region)}:6543/postgres?sslmode=require`;
}

const sqlPath = path.join(__dirname, 'import_clubs_csv_to_golf_courses_supabase.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

function makeClient(connStr) {
  return new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
}

async function run() {
  const explicitRegion = process.env.SUPABASE_DB_REGION;
  const toTry = [connectionString];
  if (poolerFallback && !explicitRegion) {
    const usedHost = (connectionString.match(/@([^:]+):6543\/postgres/) || [])[1];
    for (const r of REGIONS) {
      if (poolerHost(r) !== usedHost) {
        toTry.push(`postgresql://postgres.${poolerFallback.projectRef}:${poolerFallback.password}@${poolerHost(r)}:6543/postgres?sslmode=require`);
      }
    }
  }

  let lastErr;
  for (let i = 0; i < toTry.length; i++) {
    const client = makeClient(toTry[i]);
    try {
      await client.connect();
      const region = (toTry[i].match(/aws-0-([^.]+)\.pooler/) || [])[1] || '?';
      console.log('Connected (region: ' + region + '). Running import...');
      await client.query(sql);
      console.log('Import completed successfully.');
      await client.end();
      return;
    } catch (err) {
      lastErr = err;
      await client.end().catch(() => {});
      if (/tenant|user not found/i.test(err.message) && i < toTry.length - 1) {
        console.log('Trying next region...');
      }
    }
  }

  console.error('Import failed:', lastErr.message);
  if (/tenant|user not found/i.test(lastErr.message)) {
    console.error('\n--- Easiest option: run the SQL in the browser ---');
    console.error('1. Open: Supabase Dashboard → SQL Editor');
    console.error('2. Open this file in your editor: backend\\schema\\seeds\\import_clubs_csv_to_golf_courses_supabase.sql');
    console.error('3. Copy all (Ctrl+A, Ctrl+C), paste into the SQL Editor, click Run.');
    console.error('   No connection string needed; it uses your logged-in project.');
    console.error('');
    console.error('--- Or fix the script connection ---');
    console.error('Dashboard → Settings → Database → Connection string → choose "Session" or "Transaction".');
    console.error('Copy that full URI (with aws-0-...pooler.supabase.com), replace [YOUR-PASSWORD], set as SUPABASE_DATABASE_URL in .env.');
  }
  process.exit(1);
}

run();
