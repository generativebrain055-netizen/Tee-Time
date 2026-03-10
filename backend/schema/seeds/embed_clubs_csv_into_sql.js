const fs = require('fs');
const path = require('path');

const dir = __dirname;
const sqlPath = path.join(dir, 'import_clubs_csv_to_golf_courses.sql');
const csvPath = path.join(dir, '..', '..', 'data', 'clubs.csv');
const outPath = path.join(dir, 'import_clubs_csv_to_golf_courses.sql');

const sql = fs.readFileSync(sqlPath, 'utf8');
const csv = fs.readFileSync(csvPath, 'utf8');

const copyEnd = sql.indexOf('WITH (FORMAT csv, HEADER true');
const copyLineEnd = sql.indexOf(');', copyEnd) + 2;
const part1 = sql.slice(0, copyLineEnd);
const part2 = sql.slice(sql.indexOf('\n-- Insert into golf_courses'));

const result = part1 + '\n' + csv + '\\.\n' + part2;
fs.writeFileSync(outPath, result, 'utf8');
console.log('Written', outPath, 'with', csv.split('\n').length, 'CSV lines embedded.');
process.exit(0);
