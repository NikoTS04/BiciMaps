import * as fs from 'fs';
import * as path from 'path';
import { DOMParser } from 'xmldom';
const togeojson = require('togeojson');

function parseKml() {
  const kmlPath = path.join(__dirname, '../Ciudad Bike Friendly.kml');
  if (!fs.existsSync(kmlPath)) {
    console.error(`KML file not found at ${kmlPath}`);
    process.exit(1);
  }

  console.log('Reading KML file...');
  const kmlContent = fs.readFileSync(kmlPath, 'utf8');
  
  console.log('Parsing XML...');
  const dom = new DOMParser().parseFromString(kmlContent, 'text/xml');

  console.log('Converting KML to GeoJSON...');
  const converted = togeojson.kml(dom);

  const assetsDir = path.join(__dirname, '../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Separate line strings (bike lanes / routes) and points (amenities / parking)
  const bikeLanes: any[] = [];
  const amenities: any[] = [];

  converted.features.forEach((feature: any) => {
    if (!feature.geometry) return;
    if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
      bikeLanes.push(feature);
    } else if (feature.geometry.type === 'Point') {
      amenities.push(feature);
    }
  });

  const bikeLanesGeoJSON = {
    type: 'FeatureCollection',
    features: bikeLanes
  };

  const amenitiesGeoJSON = {
    type: 'FeatureCollection',
    features: amenities
  };

  fs.writeFileSync(
    path.join(assetsDir, 'bikelanes.geojson'),
    JSON.stringify(bikeLanesGeoJSON, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(assetsDir, 'amenities.geojson'),
    JSON.stringify(amenitiesGeoJSON, null, 2),
    'utf8'
  );

  console.log(`Successfully parsed KML!`);
  console.log(`- Bike Lanes / LineStrings saved: ${bikeLanes.length}`);
  console.log(`- Amenities / Points saved: ${amenities.length}`);
}

parseKml();
