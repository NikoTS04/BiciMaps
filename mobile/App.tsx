import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (bikelanesData && bikelanesData.features) {
      setBikeLanes(bikelanesData.features);
    }
    if (amenitiesData && amenitiesData.features) {
      setAmenities(amenitiesData.features);
    }

    // Request offline GPS location permissions
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Watch position for offline navigation tracking
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5 },
          (loc) => {
            setUserLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        );
      }
    })();
  }, []);

  // Handle route calculation between Miraflores and San Isidro using offline router
  const calculateRoute = () => {
    const origin: [number, number] = userLocation 
      ? [userLocation.longitude, userLocation.latitude] 
      : [-77.0311, -12.1111]; // Default Miraflores
    const destination: [number, number] = [-77.0315, -12.0975]; // San Isidro

    const route = findBikeRoute(origin, destination, bikeLanes);
    setRouteCoordinates(route.coordinates);
    setRouteInfo(
      `Route found via Bike Network! Distance: ~${(route.distanceKm * 1000).toFixed(0)}m (${route.distanceKm.toFixed(2)} km)`
    );
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
          showsUserLocation={true}
          followsUserLocation={true}
          initialRegion={{
            latitude: -12.0855,
            longitude: -77.0370,
            latitudeDelta: 0.12,
            longitudeDelta: 0.12,
          }}
        >
          {/* Render Bike Lanes (Ciclovías) */}
          {bikeLanes.map((feature, index) => {
            if (feature.geometry.type === 'LineString') {
              const coords = feature.geometry.coordinates.map((coord: number[]) => ({
                latitude: coord[1],
                longitude: coord[0],
              }));
              return (
                <Polyline
                  key={`line-${index}`}
                  coordinates={coords}
                  strokeColor="#22c55e"
                  strokeWidth={4}
                />
              );
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
          {amenities.slice(0, 100).map((feature, index) => {
            if (feature.geometry.type === 'Point') {
              const [lng, lat] = feature.geometry.coordinates;
              return (
                <Marker
                  key={`amenity-${index}`}
                  coordinate={{ latitude: lat, longitude: lng }}
                  title={feature.properties?.name || 'Bike Facility'}
                  pinColor="#f59e0b"
                />
              );
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
