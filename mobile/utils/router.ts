import * as turf from '@turf/turf';

interface Graph {
  [nodeKey: string]: {
    [neighborKey: string]: number; // weight (distance in km)
  };
}

let routingGraph: Graph | null = null;
let graphNodes: [number, number][] = [];

// Helper to stringify a coordinate to use as a graph node key
function getCoordKey(coord: [number, number]): string {
  return `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
}

// Convert key back to coordinate [lng, lat]
function parseCoordKey(key: string): [number, number] {
  const [lng, lat] = key.split(',').map(Number);
  return [lng, lat];
}

// Build the graph dynamically from LineString features
function buildGraph(features: any[]): { graph: Graph; nodes: [number, number][] } {
  const graph: Graph = {};
  const nodesMap = new Map<string, [number, number]>();

  features.forEach((feature) => {
    if (feature && feature.geometry && feature.geometry.type === 'LineString' && Array.isArray(feature.geometry.coordinates)) {
      const coords = feature.geometry.coordinates;
      for (let i = 0; i < coords.length; i++) {
        const currentCoord = coords[i];
        if (!Array.isArray(currentCoord) || currentCoord.length < 2) continue;
        
        const currentKey = getCoordKey(currentCoord as [number, number]);
        nodesMap.set(currentKey, currentCoord as [number, number]);

        if (!graph[currentKey]) {
          graph[currentKey] = {};
        }

        // Connect bi-directionally to the previous coordinate in the LineString
        if (i > 0) {
          const prevCoord = coords[i - 1];
          if (Array.isArray(prevCoord) && prevCoord.length >= 2) {
            const prevKey = getCoordKey(prevCoord as [number, number]);
            const dist = turf.distance(turf.point(currentCoord), turf.point(prevCoord));
            
            graph[currentKey][prevKey] = dist;
            
            if (!graph[prevKey]) {
              graph[prevKey] = {};
            }
            graph[prevKey][currentKey] = dist;
          }
        }
      }
    }
  });

  return { graph, nodes: Array.from(nodesMap.values()) };
}

// Dijkstra shortest path implementation
function dijkstra(
  graph: Graph,
  startKey: string,
  endKey: string
): { path: [number, number][]; distance: number } | null {
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const pq: [string, number][] = []; // Simple priority queue elements: [nodeKey, distance]

  // Initialize nodes
  Object.keys(graph).forEach((node) => {
    distances[node] = Infinity;
    previous[node] = null;
  });
  distances[startKey] = 0;
  pq.push([startKey, 0]);

  while (pq.length > 0) {
    // Sort queue by distance
    pq.sort((a, b) => a[1] - b[1]);
    const [currNode, currDist] = pq.shift()!;

    if (currNode === endKey) {
      const pathKeys: string[] = [];
      let temp: string | null = endKey;
      while (temp !== null) {
        pathKeys.push(temp);
        temp = previous[temp];
      }
      pathKeys.reverse();
      const path = pathKeys.map(parseCoordKey);
      return { path, distance: distances[endKey] };
    }

    if (currDist > distances[currNode]) continue;

    const neighbors = graph[currNode];
    for (const neighbor in neighbors) {
      const weight = neighbors[neighbor];
      const alt = distances[currNode] + weight;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = currNode;
        pq.push([neighbor, alt]);
      }
    }
  }

  return null;
}

export function findBikeRoute(
  origin: [number, number], // [lng, lat]
  destination: [number, number], // [lng, lat]
  features: any[]
): { coordinates: { latitude: number; longitude: number }[]; distanceKm: number } {
  // Lazy build graph once in memory
  if (!routingGraph || graphNodes.length === 0) {
    const built = buildGraph(features);
    routingGraph = built.graph;
    graphNodes = built.nodes;
  }

  if (graphNodes.length === 0) {
    return {
      coordinates: [
        { latitude: origin[1], longitude: origin[0] },
        { latitude: destination[1], longitude: destination[0] },
      ],
      distanceKm: turf.distance(turf.point(origin), turf.point(destination)),
    };
  }

  // Find nearest graph node to origin
  let startNodeKey = '';
  let minStartDist = Infinity;
  const originPt = turf.point(origin);

  // Find nearest graph node to destination
  let endNodeKey = '';
  let minEndDist = Infinity;
  const destPt = turf.point(destination);

  graphNodes.forEach((node) => {
    const nodePt = turf.point(node);
    
    const dStart = turf.distance(originPt, nodePt);
    if (dStart < minStartDist) {
      minStartDist = dStart;
      startNodeKey = getCoordKey(node);
    }

    const dEnd = turf.distance(destPt, nodePt);
    if (dEnd < minEndDist) {
      minEndDist = dEnd;
      endNodeKey = getCoordKey(node);
    }
  });

  // Run Dijkstra pathfinding
  if (routingGraph && startNodeKey && endNodeKey) {
    const result = dijkstra(routingGraph, startNodeKey, endNodeKey);
    if (result) {
      // Return full coordinate path including start/end offsets
      const fullPath: [number, number][] = [origin, ...result.path, destination];
      const formattedCoords = fullPath.map((coord) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));

      return {
        coordinates: formattedCoords,
        distanceKm: result.distance + minStartDist + minEndDist,
      };
    }
  }

  // Fallback to straight line connection
  return {
    coordinates: [
      { latitude: origin[1], longitude: origin[0] },
      { latitude: destination[1], longitude: destination[0] },
    ],
    distanceKm: turf.distance(originPt, destPt),
  };
}
