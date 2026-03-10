const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const result = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === ',') {
      result.push('');
      i++;
      continue;
    }
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      result.push(field);
      if (line[i] === ',') i++;
    } else {
      let field = '';
      while (i < line.length && line[i] !== ',') {
        field += line[i];
        i++;
      }
      result.push(field);
      if (line[i] === ',') i++;
    }
  }
  return result;
}

function escapeSql(val) {
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const dir = __dirname;
const csvPath = path.join(dir, '..', '..', 'data', 'clubs.csv');
const outPath = path.join(dir, 'import_clubs_csv_to_golf_courses_supabase.sql');

const csvText = fs.readFileSync(csvPath, 'utf8');
const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0);
const header = parseCSVLine(lines[0]);
const dataRows = lines.slice(1).map((line) => parseCSVLine(line));

const CHUNK = 400;
const cols = 'club_id, club_name, address, city, postal_code, state, country, latitude, longitude, website, email, telephone, continent';

const headerSql = `-- ============================================================================
-- Import all courses into golf_courses (Supabase SQL Editor compatible)
-- ============================================================================
-- Paste and run this entire file in Supabase SQL Editor.
-- Uses INSERT instead of COPY so it works in the browser.
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS csv_clubs (
  club_id TEXT,
  club_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  state TEXT,
  country TEXT,
  latitude TEXT,
  longitude TEXT,
  website TEXT,
  email TEXT,
  telephone TEXT,
  continent TEXT
);

`;

const footerSql = `
INSERT INTO golf_courses (name, address, city, state, country, postal_code, latitude, longitude, phone, website, google_place_id)
SELECT
  TRIM(club_name),
  NULLIF(TRIM(address), ''),
  NULLIF(TRIM(city), ''),
  NULLIF(TRIM(state), ''),
  COALESCE(NULLIF(TRIM(country), ''), 'USA'),
  NULLIF(TRIM(postal_code), ''),
  CASE WHEN TRIM(latitude) ~ '^-?[0-9]*\\.?[0-9]+$' THEN (TRIM(latitude))::DECIMAL(10, 8) ELSE NULL END,
  CASE WHEN TRIM(longitude) ~ '^-?[0-9]*\\.?[0-9]+$' THEN (TRIM(longitude))::DECIMAL(11, 8) ELSE NULL END,
  NULLIF(LEFT(TRIM(telephone), 20), ''),
  NULLIF(TRIM(website), ''),
  NULLIF(TRIM(club_id), '')
FROM csv_clubs
WHERE TRIM(club_name) IS NOT NULL AND LENGTH(TRIM(club_name)) >= 2
ON CONFLICT (google_place_id) DO NOTHING;
`;

const inserts = [];
for (let i = 0; i < dataRows.length; i += CHUNK) {
  const chunk = dataRows.slice(i, i + CHUNK);
  const values = chunk
    .map((row) => {
      const vals = (row.length >= 12 ? row : row.concat(Array(13 - row.length).fill('')))
        .slice(0, 13)
        .map(escapeSql);
      return '(' + vals.join(', ') + ')';
    })
    .join(',\n  ');
  inserts.push('INSERT INTO csv_clubs (' + cols + ') VALUES\n  ' + values + ';\n');
}

const fullSql = headerSql + inserts.join('') + footerSql;
fs.writeFileSync(outPath, fullSql, 'utf8');
console.log('Written', outPath, 'with', dataRows.length, 'rows in', inserts.length, 'INSERT chunks.');
process.exit(0);
