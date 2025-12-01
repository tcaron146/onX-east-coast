// scripts/gpx_to_geojson.js
// Usage: node gpx_to_geojson.js path/to/file.gpx
const fs = require('fs');
const tj = require('@tmcw/togeojson');
const { DOMParser } = require('xmldom');

if (process.argv.length < 3) {
  console.error('Usage: node gpx_to_geojson.js <file.gpx>');
  process.exit(1);
}

const file = process.argv[2];
const xml = fs.readFileSync(file, 'utf8');
const doc = new DOMParser().parseFromString(xml, 'text/xml');
const geojson = tj.gpx(doc);

// write to same filename with .geojson
const out = file.replace(/\.gpx$/i, '.geojson');
fs.writeFileSync(out, JSON.stringify(geojson, null, 2));
console.log('Wrote:', out);
