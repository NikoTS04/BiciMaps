import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { findBikeRoute } from './utils/router';

// Import bundled GeoJSON assets
import bikelanesData from './assets/bikelanes.json';
import amenitiesData from './assets/amenities.json';

export default function App() {
  const [bikeLanes, setBikeLanes] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<string>('Select Origin & Destination');
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [visibleRegion, setVisibleRegion] = useState<any>({
    latitude: -12.0855,
    longitude: -77.0370,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  });

  // Optimize Map rendering using viewport bounding box filtering
  const visibleBikeLanes = useMemo(() => {
    if (!visibleRegion) return bikeLanes;
    const minLat = visibleRegion.latitude - visibleRegion.latitudeDelta / 2;
    const maxLat = visibleRegion.latitude + visibleRegion.latitudeDelta / 2;
    const minLng = visibleRegion.longitude - visibleRegion.longitudeDelta / 2;
    const maxLng = visibleRegion.longitude + visibleRegion.longitudeDelta / 2;

    return bikeLanes.filter((feature) => {
      if (feature && feature.geometry && feature.geometry.type === 'LineString' && Array.isArray(feature.geometry.coordinates)) {
        return feature.geometry.coordinates.some((coord: number[]) => {
          const [lng, lat] = coord;
          return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
        });
      }
      return false;
    });
  }, [visibleRegion, bikeLanes]);

  const visibleAmenities = useMemo(() => {
    if (!visibleRegion) return amenities;
    const minLat = visibleRegion.latitude - visibleRegion.latitudeDelta / 2;
    const maxLat = visibleRegion.latitude + visibleRegion.latitudeDelta / 2;
    const minLng = visibleRegion.longitude - visibleRegion.longitudeDelta / 2;
    const maxLng = visibleRegion.longitude + visibleRegion.longitudeDelta / 2;

    return amenities.filter((feature) => {
      if (feature && feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
        const [lng, lat] = feature.geometry.coordinates;
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      }
      return false;
    });
  }, [visibleRegion, amenities]);

  useEffect(() => {
    if (bikelanesData && bikelanesData.features) {
      setBikeLanes(bikelanesData.features);
    }
    if (amenitiesData && amenitiesData.features) {
      setAmenities(amenitiesData.features);
    }

    let subscription: { remove: () => void } | null = null;

    // Request offline GPS location permissions safely
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);

          // Get last known position first (fast and does not trigger sensor request if not needed)
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

  // Handle route calculation between Miraflores and San Isidro using offline router
  const calculateRoute = () => {
    try {
      const origin: [number, number] = userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number' && !isNaN(userLocation.latitude) && !isNaN(userLocation.longitude)
        ? [userLocation.longitude, userLocation.latitude] 
        : [-77.0311, -12.1111]; // Default Miraflores
      const destination: [number, number] = [-77.0315, -12.0975]; // San Isidro

      const route = findBikeRoute(origin, destination, bikeLanes);
      if (route && Array.isArray(route.coordinates)) {
        setRouteCoordinates(route.coordinates);
        setRouteInfo(
          `Route found via Bike Network! Distance: ~${(route.distanceKm * 1000).toFixed(0)}m (${route.distanceKm.toFixed(2)} km)`
        );
      } else {
        setRouteInfo('Could not calculate bike route.');
      }
    } catch (error) {
      console.error("Error calculating bike route:", error);
      setRouteInfo('Error calculating bike route.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚴‍♂️ BiciMaps Lima & Callao</Text>
        <Text style={styles.headerSubtitle}>100% Offline Bike Navigation (Min SDK 24+)</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          showsUserLocation={hasPermission}
          followsUserLocation={hasPermission}
          initialRegion={{
            latitude: -12.0855,
            longitude: -77.0370,
            latitudeDelta: 0.12,
            longitudeDelta: 0.12,
          }}
          onRegionChangeComplete={setVisibleRegion}
        >
          {/* Render Bike Lanes (Ciclovías) */}
          {visibleBikeLanes.map((feature, index) => {
            if (feature && feature.geometry && feature.geometry.type === 'LineString' && Array.isArray(feature.geometry.coordinates)) {
              const coords = feature.geometry.coordinates
                .filter((coord: any) => Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number' && !isNaN(coord[0]) && !isNaN(coord[1]))
                .map((coord: number[]) => ({
                  latitude: coord[1],
                  longitude: coord[0],
                }));
              if (coords.length > 0) {
                return (
                  <Polyline
                    key={`line-${index}`}
                    coordinates={coords}
                    strokeColor="#22c55e"
                    strokeWidth={4}
                  />
                );
              }
            }
            return null;
          })}

          {/* Render Calculated Route */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#3b82f6"
              strokeWidth={6}
            />
          )}

          {/* Render Amenities / Parking */}
          {visibleAmenities.slice(0, 150).map((feature, index) => {
            if (feature && feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length >= 2) {
              const [lng, lat] = feature.geometry.coordinates;
              if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                return (
                  <Marker
                    key={`amenity-${index}`}
                    coordinate={{ latitude: lat, longitude: lng }}
                    title={feature.properties?.name || 'Bike Facility'}
                    pinColor="#f59e0b"
                  />
                );
              }
            }
            return null;
          })}
        </MapView>
      </View>

      <View style={styles.controlPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.infoScroll}>
          <Text style={styles.infoText}>{routeInfo}</Text>
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={calculateRoute}>
          <Text style={styles.buttonText}>Calculate Bike Route ➔ San Isidro</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controlPanel: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  infoScroll: {
    marginBottom: 12,
  },
  infoText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
