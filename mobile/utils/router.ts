import * as turf from '@turf/turf';

interface Point {
  lat: number;
  lng: number;
  key: string;
}

export function findBikeRoute(
  origin: [number, number], // [lng, lat]
  destination: [number, number], // [lng, lat]
  features: any[]
): { coordinates: { latitude: number; longitude: number }[]; distanceKm: number } {
  // Find nearest starting and ending line features
  const originPoint = turf.point(origin);
  const destPoint = turf.point(destination);

  let bestStartFeature: any = null;
  let bestStartCoord: [number, number] | null = null;
  let minStartDist = Infinity;

  let bestEndFeature: any = null;
  let bestEndCoord: [number, number] | null = null;
  let minEndDist = Infinity;

  features.forEach((feature) => {
    if (feature.geometry && feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      coords.forEach((coord: [number, number]) => {
        const pt = turf.point(coord);
        const dStart = turf.distance(originPoint, pt);
        if (dStart < minStartDist) {
          minStartDist = dStart;
          bestStartFeature = feature;
          bestStartCoord = coord;
        }

        const dEnd = turf.distance(destPoint, pt);
        if (dEnd < minEndDist) {
          minEndDist = dEnd;
          bestEndFeature = feature;
          bestEndCoord = coord;
        }
      });
    }
  });

  // If we found matching segments, extract route coordinates
  let pathCoords: [number, number][] = [];
  if (bestStartFeature) {
    pathCoords = bestStartFeature.geometry.coordinates;
  } else {
    pathCoords = [origin, destination];
  }

  const formattedCoords = pathCoords.map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }));

  let totalDist = 0;
  for (let i = 0; i < pathCoords.length - 1; i++) {
    totalDist += turf.distance(turf.point(pathCoords[i]), turf.point(pathCoords[i + 1]));
  }

  return {
    coordinates: formattedCoords,
    distanceKm: totalDist,
  };
}
