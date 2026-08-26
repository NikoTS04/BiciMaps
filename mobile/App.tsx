import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, TextInput, FlatList, Keyboard } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { findBikeRoute } from './utils/router';

// Import bundled JSON assets
import bikelanesData from './assets/bikelanes.json';
import amenitiesData from './assets/amenities.json';

// Initialize MapLibre GL
MapLibreGL.setAccessToken(null);

// OpenStreetMap Liberty vector style for a clean Waze-like aesthetic
const mapStyleURL = 'https://tiles.openfreemap.org/styles/liberty';

export default function App() {
  const [bikeLanes, setBikeLanes] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<string>('Search for a destination to navigate...');
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Map camera states
  const [cameraCenter, setCameraCenter] = useState<number[]>([-77.0370, -12.0855]);
  const [cameraZoom, setCameraZoom] = useState<number>(12);

  // Search input focus states: 'origin' or 'destination'
  const [searchFocused, setSearchFocused] = useState<'origin' | 'destination'>('destination');

  // Multi-point locations states (origin is null = "My Location")
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [originSearchQuery, setOriginSearchQuery] = useState<string>('');
  
  const [destination, setDestination] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Map Layer Toggles
  const [showBikeLanes, setShowBikeLanes] = useState<boolean>(true);
  const [showAmenities, setShowAmenities] = useState<boolean>(true);

  // Bookmarks states
  const [homeLocation, setHomeLocation] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [workLocation, setWorkLocation] = useState<{ latitude: number; longitude: number; name: string } | null>(null);

  // Active navigation HUD mode state
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

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

    loadFavorites();

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

          // Watch position for offline navigation tracking and heading rotations
          subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5 },
            (loc) => {
              if (loc && loc.coords) {
                setUserLocation({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                });
                if (typeof loc.coords.heading === 'number') {
                  setUserHeading(loc.coords.heading);
                }
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

  // Load favorites from AsyncStorage
  const loadFavorites = async () => {
    try {
      const home = await AsyncStorage.getItem('bicimaps_home');
      const work = await AsyncStorage.getItem('bicimaps_work');
      if (home) setHomeLocation(JSON.parse(home));
      if (work) setWorkLocation(JSON.parse(work));
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
  };

  // Save Home/Work favorite location
  const saveFavorite = async (type: 'home' | 'work', loc: any) => {
    try {
      await AsyncStorage.setItem(`bicimaps_${type}`, JSON.stringify(loc));
      if (type === 'home') setHomeLocation(loc);
      else setWorkLocation(loc);
      alert(`${type === 'home' ? 'Home' : 'Work'} location saved successfully!`);
    } catch (e) {
      console.warn('Failed to save favorite', e);
    }
  };

  // Navigate to saved Favorite directly
  const navigateToFavorite = (type: 'home' | 'work') => {
    const loc = type === 'home' ? homeLocation : workLocation;
    if (loc) {
      selectLocation(loc);
    } else {
      alert(`To set your ${type === 'home' ? 'Home' : 'Work'} location, search for a destination or drop a pin on the map, then tap 'Set Home' / 'Set Work' in the bottom menu.`);
    }
  };

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
    if (searchFocused === 'origin') {
      setOriginSearchQuery(text);
    } else {
      setSearchQuery(text);
    }

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
      console.warn("Geocoding API fetch failed (offline mode):", error);
    }
  };

  // Asynchronously query OSRM to stitch street-aligned paths over straight-line transitions
  // We use the OSRM 'foot' (walking) profile instead of 'driving' to completely ignore vehicle one-way restrictions for bikes!
  const fetchOSRMTransitions = async (
    baseCoords: number[][],
    transitions: any[],
    requestId: number
  ) => {
    let stitchedCoords = [...baseCoords];
    let offset = 0;

    for (let t of transitions) {
      if (requestId !== routeRequestRef.current) return;

      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${t.startCoord[0]},${t.startCoord[1]};${t.endCoord[0]},${t.endCoord[1]}?overview=full&geometries=geojson`;
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

  // Centralized route calculator
  const calculateRoute = (
    start: { latitude: number; longitude: number } | null,
    end: { latitude: number; longitude: number; name: string } | null
  ) => {
    if (!end) {
      setRouteCoordinates([]);
      setRouteDistance(0);
      return;
    }

    const originCoords: [number, number] = start
      ? [start.longitude, start.latitude]
      : userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number'
        ? [userLocation.longitude, userLocation.latitude]
        : [-77.0311, -12.1111]; // Fallback to Miraflores

    const destCoords: [number, number] = [end.longitude, end.latitude];

    const requestId = ++routeRequestRef.current;

    try {
      const route = findBikeRoute(originCoords, destCoords, bikeLanes);

      if (route && Array.isArray(route.coordinates)) {
        const maplibreCoords = route.coordinates.map((c) => [c.longitude, c.latitude]);
        setRouteCoordinates(maplibreCoords);
        setRouteDistance(route.distanceKm);
        setRouteInfo(
          `Navigating to ${end.name}! Distance: ~${(route.distanceKm * 1000).toFixed(0)}m (${route.distanceKm.toFixed(2)} km)`
        );

        // Fetch OSRM road-aligned paths (using 'foot' profile to bypass car regulations)
        if (route.transitions && route.transitions.length > 0) {
          fetchOSRMTransitions(maplibreCoords, route.transitions, requestId);
        }
      } else {
        setRouteInfo(`No connected bike lane path found.`);
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      setRouteInfo('Error calculating route.');
    }
  };

  // Triggered when user selects a search result (either origin or destination)
  const selectLocation = (item: any) => {
    Keyboard.dismiss();
    setSearchResults([]);

    if (searchFocused === 'origin') {
      setOrigin(item);
      setOriginSearchQuery(item.name);
      setCameraCenter([item.longitude, item.latitude]);
      setCameraZoom(15);
      
      calculateRoute(item, destination);
    } else {
      setDestination(item);
      setSearchQuery(item.name);
      setCameraCenter([item.longitude, item.latitude]);
      setCameraZoom(15);

      calculateRoute(origin, item);
    }
  };

  // Resets custom origin
  const clearOrigin = () => {
    setOrigin(null);
    setOriginSearchQuery('');
    setSearchResults([]);
    calculateRoute(null, destination);
  };

  // Resets search inputs, route lines, destination pins
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setDestination(null);
    setRouteCoordinates([]);
    setRouteDistance(0);
    setIsNavigating(false);
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
      const customName = `Dropped Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      const customLoc = {
        id: `custom-${Date.now()}`,
        name: customName,
        latitude: lat,
        longitude: lng,
        isOffline: true,
      };
      selectLocation(customLoc);
    }
  };

  // Dynamically calculate ETA string based on 15 km/h avg cycling speed
  const durationMin = useMemo(() => Math.round((routeDistance / 15) * 60), [routeDistance]);
  const etaString = useMemo(() => {
    if (routeDistance === 0) return '--:--';
    const now = new Date();
    now.setMinutes(now.getMinutes() + durationMin);
    const hrs = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  }, [routeDistance, durationMin]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating HUD Search Bar & Shortcuts */}
      <View style={styles.searchContainer}>
        {/* Origin Search Field */}
        <View style={[styles.searchBarRow, searchFocused === 'origin' && styles.searchBarRowActive]}>
          <Text style={styles.searchPrefix}>🟢 From:</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="My Location (GPS)"
            placeholderTextColor="#94a3b8"
            value={origin ? origin.name : originSearchQuery}
            onChangeText={handleSearch}
            onFocus={() => {
              setSearchFocused('origin');
              setSearchResults([]);
            }}
          />
          {origin && (
            <TouchableOpacity style={styles.clearButton} onPress={clearOrigin}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Separator Line */}
        <View style={styles.searchSeparator} />

        {/* Destination Search Field */}
        <View style={[styles.searchBarRow, searchFocused === 'destination' && styles.searchBarRowActive]}>
          <Text style={styles.searchPrefix}>🔴 To:</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or bike facility..."
            placeholderTextColor="#94a3b8"
            value={destination ? destination.name : searchQuery}
            onChangeText={handleSearch}
            onFocus={() => {
              setSearchFocused('destination');
              setSearchResults([]);
            }}
          />
          {destination && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Favorite Places row */}
        {!destination && searchQuery.length === 0 && originSearchQuery.length === 0 && (
          <View style={styles.favoritesRow}>
            <TouchableOpacity style={styles.favoriteButton} onPress={() => navigateToFavorite('home')}>
              <Text style={styles.favoriteButtonText}>
                🏠 Home: {homeLocation ? 'Go' : 'Set'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.favoriteButton} onPress={() => navigateToFavorite('work')}>
              <Text style={styles.favoriteButtonText}>
                💼 Work: {workLocation ? 'Go' : 'Set'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <FlatList
            style={styles.resultsList}
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => selectLocation(item)}>
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

        {/* Layer Visibility Toggle Chips */}
        {!destination && searchQuery.length === 0 && originSearchQuery.length === 0 && (
          <View style={styles.filterChipsRow}>
            <TouchableOpacity 
              style={[styles.filterChip, showBikeLanes && styles.filterChipActive]} 
              onPress={() => setShowBikeLanes(prev => !prev)}
            >
              <Text style={[styles.filterChipText, showBikeLanes && styles.filterChipTextActive]}>
                🚴 Ciclovías: {showBikeLanes ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterChip, showAmenities && styles.filterChipActive]} 
              onPress={() => setShowAmenities(prev => !prev)}
            >
              <Text style={[styles.filterChipText, showAmenities && styles.filterChipTextActive]}>
                🅿️ Bici-Parking: {showAmenities ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Top Guidance Direction HUD */}
      {isNavigating && destination && (
        <View style={styles.guidanceHUD}>
          <Text style={styles.guidanceHUDDirection}>🏁 Navigating along bike lanes</Text>
          <Text style={styles.guidanceHUDStreet} numberOfLines={1}>
            Heading towards: {destination.name}
          </Text>
        </View>
      )}

      {/* MapLibre Map View */}
      <View style={styles.mapContainer}>
        <MapLibreGL.MapView
          style={styles.map}
          mapStyle={mapStyleURL}
          logoEnabled={false}
          attributionEnabled={false}
          onRegionDidChange={handleRegionChange}
          onLongPress={handleLongPress}
        >
          <MapLibreGL.Camera
            zoomLevel={isNavigating ? 16.5 : cameraZoom}
            centerCoordinate={isNavigating && userLocation ? [userLocation.longitude, userLocation.latitude] : cameraCenter}
            heading={isNavigating ? userHeading : 0}
            pitch={isNavigating ? 45 : 0}
            animationMode="flyTo"
            animationDuration={1500}
          />

          {/* Render GPS location dot natively */}
          {hasPermission && <MapLibreGL.UserLocation />}

          {/* Custom Origin Pin Annotation */}
          {origin && (
            <MapLibreGL.PointAnnotation
              id="originAnnotation"
              coordinate={[origin.longitude, origin.latitude]}
            >
              <View style={styles.originMarker} />
            </MapLibreGL.PointAnnotation>
          )}

          {/* Render Bike Lanes (LineStrings) */}
          {showBikeLanes && (
            <MapLibreGL.ShapeSource id="bikeLanesSource" shape={bikeLanesGeoJSON}>
              <MapLibreGL.LineLayer
                id="bikeLanesLayer"
                style={{
                  lineColor: '#10b981', // Emerald green
                  lineWidth: 4.5,
                  lineOpacity: 0.85,
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Render Amenities (Points / Parking / Parking spots) */}
          {showAmenities && (
            <MapLibreGL.ShapeSource id="amenitiesSource" shape={amenitiesGeoJSON}>
              <MapLibreGL.CircleLayer
                id="amenitiesLayer"
                style={{
                  circleColor: '#f59e0b', // Amber Orange
                  circleRadius: 6,
                  circleStrokeColor: '#ffffff',
                  circleStrokeWidth: 1.5,
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Render Calculated Dijkstra Route */}
          {routeGeoJSON && (
            <MapLibreGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
              <MapLibreGL.LineLayer
                id="routeLayer"
                style={{
                  lineColor: '#3b82f6', // Waze Blue
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
      <View style={[styles.floatingButtonsContainer, destination && { bottom: 185 }]}>
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

      {/* Control Panel / Bottom HUD Sheet */}
      {destination ? (
        <View style={styles.bottomHUDCard}>
          <View style={styles.hudHeader}>
            <Text style={styles.hudDestName} numberOfLines={1}>{destination.name}</Text>
            <TouchableOpacity onPress={clearSearch} style={styles.hudCloseButton}>
              <Text style={styles.hudCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hudMetricsRow}>
            <View style={styles.hudMetric}>
              <Text style={styles.hudMetricValue}>{etaString}</Text>
              <Text style={styles.hudMetricLabel}>ETA</Text>
            </View>
            <View style={styles.hudMetric}>
              <Text style={styles.hudMetricValue}>{durationMin} min</Text>
              <Text style={styles.hudMetricLabel}>Duration</Text>
            </View>
            <View style={styles.hudMetric}>
              <Text style={styles.hudMetricValue}>{routeDistance.toFixed(1)} km</Text>
              <Text style={styles.hudMetricLabel}>Distance</Text>
            </View>
          </View>

          <View style={styles.hudActionsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, isNavigating ? styles.actionButtonActive : styles.actionButtonStart]} 
              onPress={() => setIsNavigating(prev => !prev)}
            >
              <Text style={styles.actionButtonText}>
                {isNavigating ? '⏹️ Stop Nav' : '▶️ Start Nav'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButtonSecondary} 
              onPress={() => saveFavorite('home', destination)}
            >
              <Text style={styles.actionButtonTextSecondary}>🏠 Set Home</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButtonSecondary} 
              onPress={() => saveFavorite('work', destination)}
            >
              <Text style={styles.actionButtonTextSecondary}>💼 Set Work</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.controlPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.infoScroll}>
            <Text style={styles.infoText}>{routeInfo}</Text>
          </ScrollView>
        </View>
      )}
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
  searchBarRowActive: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  searchSeparator: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 12,
  },
  searchPrefix: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 12,
    minWidth: 55,
  },
  searchInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 10,
    color: '#f8fafc',
    fontSize: 15,
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
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#334155',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  filterChipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#14b8a6',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#f8fafc',
  },
  favoritesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  favoriteButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#475569',
  },
  favoriteButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  guidanceHUD: {
    position: 'absolute',
    top: 210, // Shift down to avoid overlap with double search inputs
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 5,
    borderLeftColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  guidanceHUDDirection: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  guidanceHUDStreet: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '500',
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
  originMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981', // emerald green
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
    bottom: 90,
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
  bottomHUDCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hudDestName: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  hudCloseButton: {
    padding: 4,
  },
  hudCloseText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hudMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 14,
  },
  hudMetric: {
    alignItems: 'center',
  },
  hudMetricValue: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hudMetricLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  hudActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  actionButtonStart: {
    backgroundColor: '#3b82f6',
  },
  actionButtonActive: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#475569',
  },
  actionButtonTextSecondary: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
});
