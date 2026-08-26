const { findBikeRoute } = require('./utils/router');
const bikelanesData = require('./assets/bikelanes.json');
const { performance } = require('perf_hooks');

const origin = [-77.0311, -12.1225]; // Parque Kennedy, Miraflores (Centric Point)
const destination = [-77.0315, -12.0975]; // San Isidro

console.log('--- ROUTING TEST ---');
console.log(`Origin: ${origin}`);
console.log(`Destination: ${destination}`);
console.log(`Total features: ${bikelanesData.features.length}`);

// Measure graph build & first route search
const t0 = performance.now();
const route = findBikeRoute(origin, destination, bikelanesData.features);
const t1 = performance.now();

console.log(`Time taken: ${(t1 - t0).toFixed(2)} ms`);
console.log(`Coordinates found: ${route.coordinates.length}`);
console.log(`Distance: ${route.distanceKm.toFixed(2)} km`);

// Measure second search (graph is already cached in memory)
const t2 = performance.now();
const route2 = findBikeRoute(origin, [-77.0211, -12.1425], bikelanesData.features); // To Barranco
const t3 = performance.now();

console.log('\n--- SECOND SEARCH (CACHED GRAPH) ---');
console.log(`Time taken: ${(t3 - t2).toFixed(2)} ms`);
console.log(`Coordinates found: ${route2.coordinates.length}`);
console.log(`Distance: ${route2.distanceKm.toFixed(2)} km`);
