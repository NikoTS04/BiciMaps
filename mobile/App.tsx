import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, TextInput, FlatList, Keyboard } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { findBikeRoute } from './utils/router';

// Import bundled JSON assets
import bikelanesData from './assets/bikelanes.json';
import amenitiesData from './assets/amenities.json';

// Initialize MapLibre GL
MapLibreGL.setAccessToken(null);

// OpenStreetMap standard tile style configuration
const osmStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export default function App() {
  const [bikeLanes, setBikeLanes] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<string>('Search for a destination to navigate...');
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Map camera states
  const [cameraCenter, setCameraCenter] = useState<number[]>([-77.0370, -12.0855]);
  const [cameraZoom, setCameraZoom] = useState<number>(12);

  // Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number; name: string } | null>(null);

  // Prevent stitching race conditions
  const routeRequestRef = useRef<number>(0);

  // Bounding box region for viewport-based layers optimization
  const [visibleRegion, setVisibleRegion] = useState<any>({
    latitude: -12.0855,
    longitude: -77.0370,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  });

  useEffect(() => {
    if (bikelanesData && bikelanesData.features) {
      setBikeLanes(bikelanesData.features);
    }
    if (amenitiesData && amenitiesData.features) {
      setAmenities(amenitiesData.features);
    }

    let subscription: { remove: () => void } | null = null;

    // Request location permissions safely
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);

          let location = await Location.getLastKnownPositionAsync({});
          if (!location) {
            location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
          }

          if (location && location.coords) {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            // Update camera to user location
            setCameraCenter([location.coords.longitude, location.coords.latitude]);
            setCameraZoom(14);
          }

          // Watch position for offline navigation tracking
          subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5 },
            (loc) => {
              if (loc && loc.coords) {
                setUserLocation({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                });
              }
            }
          );
        }
      } catch (error) {
        console.warn("Failed to request or fetch location:", error);
      }
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Map local and route data to GeoJSON for MapLibre ShapeSources
  const bikeLanesGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: bikeLanes,
  }), [bikeLanes]);

  const amenitiesGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: amenities.slice(0, 150),
  }), [amenities]);

  const routeGeoJSON = useMemo(() => {
    if (routeCoordinates.length === 0) return null;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: routeCoordinates,
      },
      properties: {},
    };
  }, [routeCoordinates]);

  // Synchronize manual user map panning/zooming back to component states
  const handleRegionChange = (feature: any) => {
    if (feature && feature.properties) {
      const zoom = feature.properties.zoomLevel;
      const coords = feature.geometry.coordinates; // [lng, lat]
      
      const bounds = feature.properties.visibleBounds; // [northEast, southWest]
      if (bounds) {
        const [ne, sw] = bounds;
        setVisibleRegion({
          latitude: coords[1],
          longitude: coords[0],
          latitudeDelta: Math.abs(ne[1] - sw[1]),
          longitudeDelta: Math.abs(ne[0] - sw[0]),
        });
      }

      // Avoid trigger loop: Only update camera state if panning was done directly by user
      if (feature.properties.isUserInteraction) {
        setCameraCenter(coords);
        setCameraZoom(zoom);
      }
    }
  };

  // Geocoding search handler (combines offline local search + OSM Nominatim API)
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text || text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const query = text.toLowerCase().trim();

    // 1. Local Offline Search: Filter amenities by name
    const localMatches = amenities
      .filter((feature) => {
        const name = feature?.properties?.name;
        return name && typeof name === 'string' && name.toLowerCase().includes(query);
      })
      .slice(0, 5)
      .map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        return {
          id: `local-${feature.id || Math.random().toString()}`,
          name: feature.properties.name,
          latitude: lat,
          longitude: lng,
          isOffline: true,
        };
      });

    setSearchResults(localMatches);

    // 2. Online Geocoding Search: Query OpenStreetMap Nominatim restricted to Lima & Callao
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=5&viewbox=-77.20,-11.90,-76.85,-12.25&bounded=1`,
        {
          headers: {
            'User-Agent': 'BiciMapsApp/1.0',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const onlineResults = data.map((item: any) => ({
          id: `online-${item.place_id}`,
          name: item.display_name.split(',')[0] + ' (' + (item.type || 'Location') + ')',
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          isOffline: false,
        }));

        setSearchResults((prev) => {
          const merged = [...prev];
          onlineResults.forEach((onlineItem: any) => {
            if (!merged.some((m) => m.name.toLowerCase() === onlineItem.name.toLowerCase())) {
              merged.push(onlineItem);
            }
          });
          return merged.slice(0, 8);
        });
      }
    } catch (error) {
      console.warn("Geocoding API fetch omitted/failed (offline mode):", error);
    }
  };

  // Asynchronously query OSRM to stitch street-aligned paths over straight-line transitions
  const fetchOSRMTransitions = async (
    baseCoords: number[][],
    transitions: any[],
    requestId: number
  ) => {
    let stitchedCoords = [...baseCoords];
    let offset = 0;

    for (let t of transitions) {
      // Abort if route has changed since task started
      if (requestId !== routeRequestRef.current) return;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${t.startCoord[0]},${t.startCoord[1]};${t.endCoord[0]},${t.endCoord[1]}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        
        if (requestId !== routeRequestRef.current) return;

        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes[0] && data.routes[0].geometry) {
            const streetCoords = data.routes[0].geometry.coordinates;
            if (Array.isArray(streetCoords) && streetCoords.length > 0) {
              const insertIdx = t.startIndex + offset;
              const deleteCount = 2; // replace straight start and end coordinate points
              
              stitchedCoords.splice(insertIdx, deleteCount, ...streetCoords);
              offset += streetCoords.length - deleteCount;
              
              setRouteCoordinates([...stitchedCoords]);
            }
          }
        }
      } catch (error) {
        console.warn("Failed to fetch OSRM road-aligned gap:", error);
      }
    }
  };

  // Triggered when user selects a destination from the list
  const selectDestination = (item: any) => {
    Keyboard.dismiss();
    setDestination(item);
    setSearchQuery(item.name);
    setSearchResults([]);

    const requestId = ++routeRequestRef.current;

    // Update map view to destination
    setCameraCenter([item.longitude, item.latitude]);
    setCameraZoom(15);

    // Calculate Dijkstra offline route
    try {
      const origin: [number, number] = userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number'
        ? [userLocation.longitude, userLocation.latitude] 
        : [-77.0311, -12.1111]; // Fallback to Miraflores

      const destCoords: [number, number] = [item.longitude, item.latitude];
      const route = findBikeRoute(origin, destCoords, bikeLanes);

      if (route && Array.isArray(route.coordinates)) {
        const maplibreCoords = route.coordinates.map((c) => [c.longitude, c.latitude]);
        setRouteCoordinates(maplibreCoords);
        setRouteInfo(
          `Navigating to ${item.name}! Distance: ~${(route.distanceKm * 1000).toFixed(0)}m (${route.distanceKm.toFixed(2)} km)`
        );

        // Fetch street-aligned routes for transitions if online
        if (route.transitions && route.transitions.length > 0) {
          fetchOSRMTransitions(maplibreCoords, route.transitions, requestId);
        }
      } else {
        setRouteInfo(`No connected bike lane path found to ${item.name}.`);
      }
    } catch (error) {
      console.error("Error calculating bike route:", error);
      setRouteInfo('Error calculating route.');
    }
  };

  // Resets search inputs, route lines, destination pins
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setDestination(null);
    setRouteCoordinates([]);
    setRouteInfo('Search for a destination to navigate...');
    if (userLocation) {
      setCameraCenter([userLocation.longitude, userLocation.latitude]);
      setCameraZoom(14);
    }
  };

  // Handle manual destination pinning via map long-press (great for offline usage)
  const handleLongPress = (feature: any) => {
    if (feature && feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
      const [lng, lat] = feature.geometry.coordinates;
      const customDest = {
        id: `custom-${Date.now()}`,
        name: `Custom Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        latitude: lat,
        longitude: lng,
        isOffline: true,
      };
      selectDestination(customDest);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBarRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search address or bike facility..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchResults.length > 0 && (
          <FlatList
            style={styles.resultsList}
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => selectDestination(item)}>
                <Text style={styles.resultText}>
                  {item.name}{' '}
                  {item.isOffline ? (
                    <Text style={styles.resultBadge}>[Offline]</Text>
                  ) : null}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* MapLibre Map View */}
      <View style={styles.mapContainer}>
        <MapLibreGL.MapView
          style={styles.map}
          mapStyle={osmStyle}
          logoEnabled={false}
          attributionEnabled={false}
          onRegionDidChange={handleRegionChange}
          onLongPress={handleLongPress}
        >
          <MapLibreGL.Camera
            zoomLevel={cameraZoom}
            centerCoordinate={cameraCenter}
            animationMode="flyTo"
            animationDuration={2000}
          />

          {/* Render GPS location dot natively */}
          {hasPermission && <MapLibreGL.UserLocation />}

          {/* Render Bike Lanes (LineStrings) */}
          <MapLibreGL.ShapeSource id="bikeLanesSource" shape={bikeLanesGeoJSON}>
            <MapLibreGL.LineLayer
              id="bikeLanesLayer"
              style={{
                lineColor: '#22c55e',
                lineWidth: 4,
                lineOpacity: 0.85,
              }}
            />
          </MapLibreGL.ShapeSource>

          {/* Render Amenities (Points / Parking / Parking spots) */}
          <MapLibreGL.ShapeSource id="amenitiesSource" shape={amenitiesGeoJSON}>
            <MapLibreGL.CircleLayer
              id="amenitiesLayer"
              style={{
                circleColor: '#f59e0b',
                circleRadius: 6,
                circleStrokeColor: '#ffffff',
                circleStrokeWidth: 1.5,
              }}
            />
          </MapLibreGL.ShapeSource>

          {/* Render Calculated Dijkstra Route */}
          {routeGeoJSON && (
            <MapLibreGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
              <MapLibreGL.LineLayer
                id="routeLayer"
                style={{
                  lineColor: '#3b82f6',
                  lineWidth: 6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Destination Pin Annotation */}
          {destination && (
            <MapLibreGL.PointAnnotation
              id="destinationAnnotation"
              coordinate={[destination.longitude, destination.latitude]}
            >
              <View style={styles.destMarker} />
            </MapLibreGL.PointAnnotation>
          )}
        </MapLibreGL.MapView>
      </View>

      {/* Floating Action Buttons (Zoom & GPS Re-center) */}
      <View style={styles.floatingButtonsContainer}>
        {/* Zoom In */}
        <TouchableOpacity style={styles.floatingButton} onPress={() => setCameraZoom((prev) => Math.min(prev + 1, 20))}>
          <Text style={styles.buttonIconText}>＋</Text>
        </TouchableOpacity>
        {/* Zoom Out */}
        <TouchableOpacity style={styles.floatingButton} onPress={() => setCameraZoom((prev) => Math.max(prev - 1, 1))}>
          <Text style={styles.buttonIconText}>－</Text>
        </TouchableOpacity>
        {/* Re-center GPS */}
        <TouchableOpacity style={styles.floatingButton} onPress={() => {
          if (userLocation) {
            setCameraCenter([userLocation.longitude, userLocation.latitude]);
            setCameraZoom(15);
          }
        }}>
          <Text style={styles.buttonIconText}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* Control Panel at the bottom */}
      <View style={styles.controlPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.infoScroll}>
          <Text style={styles.infoText}>{routeInfo}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  searchContainer: {
    position: 'absolute',
    top: 50, // Avoid status bar overlap
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    color: '#f8fafc',
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsList: {
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  resultItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  resultText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  resultBadge: {
    fontSize: 11,
    color: '#e2e8f0',
    backgroundColor: '#475569',
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  destMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 90, // Sits above the bottom control panel
    right: 16,
    zIndex: 10,
    flexDirection: 'column',
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonIconText: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  controlPanel: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  infoScroll: {
    marginBottom: 4,
  },
  infoText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
});
