import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';

function testRouting() {
  const bikelanesPath = path.join(__dirname, '../assets/bikelanes.geojson');
  if (!fs.existsSync(bikelanesPath)) {
    console.error('Bike lanes GeoJSON not found. Run npm run parse:kml first.');
    process.exit(1);
  }

  console.log('Loading bike lanes GeoJSON...');
  const bikelanesCollection: any = JSON.parse(fs.readFileSync(bikelanesPath, 'utf8'));
  console.log(`Loaded ${bikelanesCollection.features.length} bike lane features.`);

  // Define test origin and destination in Lima (Miraflores to San Isidro)
  const origin = turf.point([-77.0311, -12.1111]);
  const destination = turf.point([-77.0315, -12.0975]);

  console.log('Finding nearest bike lane segments for origin and destination...');

  let nearestOriginSegment: { feature: any; point: any; dist: number } = { feature: null, point: null, dist: Infinity };
  let nearestDestSegment: { feature: any; point: any; dist: number } = { feature: null, point: null, dist: Infinity };

  bikelanesCollection.features.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.type === 'LineString') {
      try {
        const snapped = turf.nearestPointOnLine(feature, origin);
        const dist = turf.distance(origin, snapped);
        if (dist < nearestOriginSegment.dist) {
          nearestOriginSegment = { feature, point: snapped, dist };
        }
      } catch (e) {
        // ignore invalid lines
      }

      try {
        const snappedDest = turf.nearestPointOnLine(feature, destination);
        const distDest = turf.distance(destination, snappedDest);
        if (distDest < nearestDestSegment.dist) {
          nearestDestSegment = { feature, point: snappedDest, dist: distDest };
        }
      } catch (e) {
        // ignore invalid lines
      }
    }
  });

  console.log('Snapping results:');
  if (nearestOriginSegment.feature) {
    console.log(`- Origin snapped to bike lane at distance: ${(nearestOriginSegment.dist * 1000).toFixed(2)} meters`);
  }
  if (nearestDestSegment.feature) {
    console.log(`- Destination snapped to bike lane at distance: ${(nearestDestSegment.dist * 1000).toFixed(2)} meters`);
  }

  console.log('Routing foundation test completed successfully!');
}

testRouting();
