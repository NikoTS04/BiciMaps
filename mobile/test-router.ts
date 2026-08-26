import { findBikeRoute } from './utils/router';
import bikelanesData from './assets/bikelanes.json';
import { performance } from 'perf_hooks';

const origin: [number, number] = [-77.0311, -12.1225]; // Parque Kennedy, Miraflores
const destination: [number, number] = [-77.0315, -12.0975]; // San Isidro

console.log('--- ROUTING TEST ---');
console.log(`Origin: ${origin}`);
console.log(`Destination: ${destination}`);
console.log(`Total features: ${bikelanesData.features.length}`);

const t0 = performance.now();
const route = findBikeRoute(origin, destination, bikelanesData.features);
const t1 = performance.now();

console.log(`Time taken: ${(t1 - t0).toFixed(2)} ms`);
console.log(`Coordinates found: ${route.coordinates.length}`);
console.log(`Distance: ${route.distanceKm.toFixed(2)} km`);

const t2 = performance.now();
const route2 = findBikeRoute(origin, [-77.0211, -12.1425], bikelanesData.features); // To Barranco
const t3 = performance.now();

console.log('\n--- SECOND SEARCH (CACHED GRAPH) ---');
console.log(`Time taken: ${(t3 - t2).toFixed(2)} ms`);
console.log(`Coordinates found: ${route2.coordinates.length}`);
console.log(`Distance: ${route2.distanceKm.toFixed(2)} km`);
