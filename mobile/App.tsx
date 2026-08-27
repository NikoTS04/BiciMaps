import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Keyboard, Dimensions, BackHandler, TextInput } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { findBikeRoute } from './utils/router';
import { t } from './src/utils/i18n';

// Import custom glassmorphic components
import WazeBottomSheet from './src/components/WazeBottomSheet';
import RoutePreview from './src/components/RoutePreview';
import NavigationHUD from './src/components/NavigationHUD';
import LayersDrawer from './src/components/LayersDrawer';
import PinDetails from './src/components/PinDetails';
import OptionsSheet from './src/components/OptionsSheet';
import MenuDetailSheet from './src/components/MenuDetailSheet';
import GlassCard from './src/components/GlassCard';

// Import bundled JSON assets
import bikelanesData from './assets/bikelanes.json';
import amenitiesData from './assets/amenities.json';

// Initialize MapLibre GL
MapLibreGL.setAccessToken(null);

// OpenStreetMap Liberty vector style for a clean Waze-like aesthetic
const mapStyleURL = 'https://tiles.openfreemap.org/styles/liberty';
const { height: screenHeight } = Dimensions.get('window');

export default function App() {
  const [lang, setLang] = useState<'en' | 'es'>('es'); // Default language is Spanish
  const [bikeLanes, setBikeLanes] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<string>('');
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
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  // Map Layer Toggles
  const [showBikeLanes, setShowBikeLanes] = useState<boolean>(true);
  const [showAmenities, setShowAmenities] = useState<boolean>(true);

  // Bookmarks / Home & Work states
  const [homeLocation, setHomeLocation] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [workLocation, setWorkLocation] = useState<{ latitude: number; longitude: number; name: string } | null>(null);

  // Custom Favorites states (manage custom places list)
  const [customFavorites, setCustomFavorites] = useState<any[]>([]);

  // UI state toggles
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  // Draggable Bottom Sheet State
  const [sheetState, setSheetState] = useState<'collapsed' | 'default' | 'expanded'>('default');

  // Dropped Pin State
  const [droppedPin, setDroppedPin] = useState<{ latitude: number; longitude: number; name: string } | null>(null);

  // Swipe Options Sheet State
  const [optionsItem, setOptionsItem] = useState<any | null>(null);

  // Active MenuDetailSheet setting sheet
  const [activeDetailSheet, setActiveDetailSheet] = useState<'languages' | 'layers' | 'favorites' | null>(null);

  // Naming Modal State (rendered outside MapView to bypass gesture blockers)
  const [namingPinLocation, setNamingPinLocation] = useState<any | null>(null);
  const [namingInputText, setNamingInputText] = useState<string>('');

  // Prevent stitching race conditions
  const routeRequestRef = useRef<number>(0);

  // Bounding box region for viewport-based layers optimization
  const [visibleRegion, setVisibleRegion] = useState<any>({
    latitude: -12.0855,
    longitude: -77.0370,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  });

  // Handle hardware Android back button interactions
  useEffect(() => {
    const backAction = () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return true;
      }
      if (activeDetailSheet) {
        setActiveDetailSheet(null);
        return true;
      }
      if (namingPinLocation) {
        setNamingPinLocation(null);
        return true;
      }
      if (optionsItem) {
        setOptionsItem(null);
        return true;
      }
      if (droppedPin) {
        setDroppedPin(null);
        return true;
      }
      if (isNavigating) {
        setIsNavigating(false);
        return true;
      }
      if (destination) {
        clearSearch();
        return true;
      }
      if (sheetState === 'expanded') {
        setSheetState('default');
        return true;
      }
      return false; // Exit app
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isDrawerOpen, activeDetailSheet, namingPinLocation, optionsItem, droppedPin, isNavigating, destination, sheetState]);

  useEffect(() => {
    if (bikelanesData && bikelanesData.features) {
      setBikeLanes(bikelanesData.features);
    }
    if (amenitiesData && amenitiesData.features) {
      setAmenities(amenitiesData.features);
    }

    loadLanguage();
    loadFavorites();
    loadRecentSearches();

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

  // Load language settings
  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem('bicimaps_language');
      if (stored === 'en' || stored === 'es') {
        setLang(stored);
      }
    } catch (e) {
      console.warn('Failed to load language', e);
    }
  };

  // Load favorites from AsyncStorage
  const loadFavorites = async () => {
    try {
      const home = await AsyncStorage.getItem('bicimaps_home');
      const work = await AsyncStorage.getItem('bicimaps_work');
      if (home) setHomeLocation(JSON.parse(home));
      if (work) setWorkLocation(JSON.parse(work));
      
      loadCustomFavorites();
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
  };

  // Load custom favorites list
  const loadCustomFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('bicimaps_custom_favorites');
      if (stored) setCustomFavorites(JSON.parse(stored));
    } catch (e) {
      console.warn('Failed to load custom favorites', e);
    }
  };

  // Load recent searches
  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('bicimaps_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {
      console.warn('Failed to load recent searches', e);
    }
  };

  // Save Home/Work favorite location
  const saveFavorite = async (type: 'home' | 'work', loc?: any) => {
    const targetLoc = loc || destination;
    if (!targetLoc) return;
    try {
      await AsyncStorage.setItem(`bicimaps_${type}`, JSON.stringify(targetLoc));
      if (type === 'home') setHomeLocation(targetLoc);
      else setWorkLocation(targetLoc);
      alert(`${type === 'home' ? t('home', lang) : t('work', lang)} saved!`);
    } catch (e) {
      console.warn('Failed to save favorite', e);
    }
  };

  // Delete custom favorite place
  const deleteCustomFavorite = async (id: string) => {
    const updated = customFavorites.filter(fav => fav.id !== id);
    try {
      await AsyncStorage.setItem('bicimaps_custom_favorites', JSON.stringify(updated));
      setCustomFavorites(updated);
    } catch (e) {
      console.warn('Failed to delete favorite', e);
    }
  };

  // Add recent search
  const addRecentSearch = async (loc: any) => {
    const filtered = recentSearches.filter(item => item.name.toLowerCase() !== loc.name.toLowerCase());
    const updated = [loc, ...filtered].slice(0, 8);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem('bicimaps_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent searches', e);
    }
  };

  // Eliminate recent search
  const eliminateRecentSearch = async (id: string) => {
    const updated = recentSearches.filter(item => item.id !== id);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem('bicimaps_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete recent search', e);
    }
    setOptionsItem(null);
  };

  // Save recent search item as favorite
  const saveRecentAsFavorite = async (item: any) => {
    const newFav = {
      id: `fav-${Date.now()}`,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.name,
    };
    const updated = [...customFavorites, newFav];
    setCustomFavorites(updated);
    try {
      await AsyncStorage.setItem('bicimaps_custom_favorites', JSON.stringify(updated));
      alert(t('savedToFavorites', lang));
    } catch (e) {
      console.warn('Failed to save custom favorite', e);
    }
    setOptionsItem(null);
  };

  // Navigate to saved Favorite directly
  const navigateToFavorite = (type: 'home' | 'work') => {
    const loc = type === 'home' ? homeLocation : workLocation;
    if (loc) {
      selectLocation(loc);
    } else {
      alert(`${t('whereTo', lang)}`);
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

  const routeProgress = useMemo(() => {
    if (routeCoordinates.length === 0 || !userLocation) {
      return { covered: [], remaining: routeCoordinates };
    }

    const userCoord: [number, number] = [userLocation.longitude, userLocation.latitude];
    let closestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < routeCoordinates.length; i++) {
      const dx = (routeCoordinates[i][0] - userCoord[0]) * 108.8;
      const dy = (routeCoordinates[i][1] - userCoord[1]) * 110.6;
      const dist = dx * dx + dy * dy;
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }

    const covered = routeCoordinates.slice(0, closestIdx + 1);
    const remaining = [userCoord, ...routeCoordinates.slice(closestIdx + 1)];

    return { covered, remaining };
  }, [routeCoordinates, userLocation]);

  const coveredGeoJSON = useMemo(() => {
    if (routeProgress.covered.length === 0) return null;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: routeProgress.covered,
      },
      properties: {},
    };
  }, [routeProgress.covered]);

  const remainingGeoJSON = useMemo(() => {
    if (routeProgress.remaining.length === 0) return null;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: routeProgress.remaining,
      },
      properties: {},
    };
  }, [routeProgress.remaining]);

  const handleRegionChange = (feature: any) => {
    if (feature && feature.properties) {
      const zoom = feature.properties.zoomLevel;
      const coords = feature.geometry.coordinates;
      
      const bounds = feature.properties.visibleBounds;
      if (bounds) {
        const [ne, sw] = bounds;
        setVisibleRegion({
          latitude: coords[1],
          longitude: coords[0],
          latitudeDelta: Math.abs(ne[1] - sw[1]),
          longitudeDelta: Math.abs(ne[0] - sw[0]),
        });
      }

      if (feature.properties.isUserInteraction) {
        setCameraCenter(coords);
        setCameraZoom(zoom);
        setSheetState('collapsed');
      }
    }
  };

  // Geocoding search handler
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

    // 1. Local Offline Search
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

    const cleanSearchQuery = (str: string): string => {
      let q = str.toLowerCase();
      q = q.replace(/^(av\b\.?|avenida|jr\b\.?|jiron|jirón|calle|pasaje|psj\.?|ca\b\.?)\s+/i, '');
      q = q.replace(/\s+\d+$/, '');
      return q.trim();
    };

    const fetchGeocoding = async (searchStr: string): Promise<any[]> => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchStr)}&bbox=-77.20,-12.25,-76.85,-11.90&limit=5`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.features && Array.isArray(data.features)) {
            return data.features.map((item: any) => {
              const prop = item.properties;
              const coords = item.geometry.coordinates;
              
              const name = prop.name || '';
              const housenumber = prop.housenumber || '';
              const district = prop.district || prop.city || '';
              
              let displayName = name;
              if (housenumber) displayName += ` ${housenumber}`;
              if (district && district !== name) displayName += `, ${district}`;
              
              return {
                id: `online-${prop.osm_id || Math.random().toString()}`,
                name: displayName,
                latitude: coords[1],
                longitude: coords[0],
                isOffline: false,
              };
            });
          }
        }
      } catch (e) {
        console.warn("Photon fetch error:", e);
      }
      return [];
    };

    try {
      let results = await fetchGeocoding(text);
      
      if (results.length === 0) {
        const cleaned = cleanSearchQuery(text);
        if (cleaned.length >= 2 && cleaned !== text.toLowerCase().trim()) {
          results = await fetchGeocoding(cleaned);
        }
      }

      setSearchResults((prev) => {
        const merged = [...prev];
        results.forEach((onlineItem: any) => {
          if (!merged.some((m) => m.name.toLowerCase() === onlineItem.name.toLowerCase())) {
            merged.push(onlineItem);
          }
        });
        return merged.slice(0, 8);
      });
    } catch (error) {
      console.warn("Online geocoding search failed:", error);
    }
  };

  // Query OSRM to stitch street-aligned paths
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
        const url = `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${t.startCoord[0]},${t.startCoord[1]};${t.endCoord[0]},${t.endCoord[1]}?overview=full&geometries=geojson`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'BiciMapsApp/1.0' }
        });
        
        if (requestId !== routeRequestRef.current) return;

        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes[0] && data.routes[0].geometry) {
            const streetCoords = data.routes[0].geometry.coordinates;
            if (Array.isArray(streetCoords) && streetCoords.length > 0) {
              const insertIdx = t.startIndex + offset;
              const deleteCount = 2;
              
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

  // Calculate shortest path route
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
        : [-77.0311, -12.1111];

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

        if (route.transitions && route.transitions.length > 0) {
          fetchOSRMTransitions(maplibreCoords, route.transitions, requestId);
        }
      } else {
        setRouteInfo(t('noConnectedPath', lang));
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      setRouteInfo(t('errorCalculate', lang));
    }
  };

  // Location selection handler
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
      addRecentSearch(item);
    }
  };

  const clearOrigin = () => {
    setOrigin(null);
    setOriginSearchQuery('');
    setSearchResults([]);
    calculateRoute(null, destination);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setDestination(null);
    setRouteCoordinates([]);
    setRouteDistance(0);
    setIsNavigating(false);
    setRouteInfo('');
    if (userLocation) {
      setCameraCenter([userLocation.longitude, userLocation.latitude]);
      setCameraZoom(14);
    }
    setSheetState('default');
  };

  // Handle manual destination pinning via map long-press (shows comic PinDetails pop-up card)
  const handleLongPress = (feature: any) => {
    if (feature && feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
      const [lng, lat] = feature.geometry.coordinates;
      const customName = `Dropped Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setDroppedPin({
        name: customName,
        latitude: lat,
        longitude: lng,
      });
      // Clear active searches
      setDestination(null);
      setRouteCoordinates([]);
      setRouteDistance(0);
      setIsNavigating(false);
    }
  };

  // Save dropped pin into Custom Favorites list (outside map view keyboard overlay)
  const saveDroppedPinAsFavorite = async (name: string) => {
    if (!namingPinLocation) return;
    const newFav = {
      id: `fav-${Date.now()}`,
      name: name,
      latitude: namingPinLocation.latitude,
      longitude: namingPinLocation.longitude,
      address: `Dropped Pin at ${namingPinLocation.latitude.toFixed(4)}, ${namingPinLocation.longitude.toFixed(4)}`,
    };
    const updated = [...customFavorites, newFav];
    try {
      await AsyncStorage.setItem('bicimaps_custom_favorites', JSON.stringify(updated));
      setCustomFavorites(updated);
      setDroppedPin(null);
      alert(t('savedToFavorites', lang));
    } catch (e) {
      console.warn('Failed to save custom favorite', e);
    }
  };

  // Duration & ETA utilities
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
      
      {/* 1. Full-screen sliding menu sidebar */}
      {isDrawerOpen && (
        <LayersDrawer
          lang={lang}
          onOpenDetailSheet={setActiveDetailSheet}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      {/* 2. Menu sub-sheet options details (93% height bottom sheets) */}
      {activeDetailSheet && (
        <MenuDetailSheet
          type={activeDetailSheet}
          lang={lang}
          showBikeLanes={showBikeLanes}
          showAmenities={showAmenities}
          customFavorites={customFavorites}
          onToggleBikeLanes={() => setShowBikeLanes(prev => !prev)}
          onToggleAmenities={() => setShowAmenities(prev => !prev)}
          onSelectLanguage={async (newLang) => {
            setLang(newLang);
            try {
              await AsyncStorage.setItem('bicimaps_language', newLang);
            } catch (e) {}
          }}
          onSelectFavorite={(fav) => {
            selectLocation(fav);
            setActiveDetailSheet(null);
          }}
          onDeleteFavorite={deleteCustomFavorite}
          onClose={() => setActiveDetailSheet(null)}
        />
      )}

      {/* 3. Top Guidance directions HUD */}
      {isNavigating && destination && (
        <NavigationHUD destination={destination} />
      )}

      {/* 4. Floating Hamburger Menu Icon (Top-Left, idle state) */}
      {!isNavigating && !isDrawerOpen && !activeDetailSheet && (
        <TouchableOpacity style={styles.hamburgerButton} onPress={() => setIsDrawerOpen(true)}>
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
      )}

      {/* 5. Map View */}
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

          {hasPermission && <MapLibreGL.UserLocation />}

          {/* Render custom origin */}
          {origin && (
            <MapLibreGL.PointAnnotation
              id="originAnnotation"
              coordinate={[origin.longitude, origin.latitude]}
            >
              <View style={styles.originMarker} />
            </MapLibreGL.PointAnnotation>
          )}

          {/* Render dropped pin with comic callout spike */}
          {droppedPin && (
            <MapLibreGL.MarkerView
              id="droppedPinMarkerView"
              coordinate={[droppedPin.longitude, droppedPin.latitude]}
            >
              <PinDetails
                pinLocation={droppedPin}
                lang={lang}
                onGoTo={() => {
                  selectLocation({
                    name: droppedPin.name,
                    latitude: droppedPin.latitude,
                    longitude: droppedPin.longitude,
                    isOffline: true,
                  });
                  setDroppedPin(null);
                }}
                onStartFrom={() => {
                  const newOrigin = {
                    name: droppedPin.name,
                    latitude: droppedPin.latitude,
                    longitude: droppedPin.longitude,
                  };
                  setOrigin(newOrigin);
                  setOriginSearchQuery(droppedPin.name);
                  setDroppedPin(null);
                  if (destination) {
                    calculateRoute(newOrigin, destination);
                  }
                }}
                onSaveFavorite={() => {
                  setNamingPinLocation(droppedPin);
                  setNamingInputText('');
                }}
                onClose={() => setDroppedPin(null)}
              />
            </MapLibreGL.MarkerView>
          )}

          {/* Render bike lanes */}
          {showBikeLanes && (
            <MapLibreGL.ShapeSource id="bikeLanesSource" shape={bikeLanesGeoJSON}>
              <MapLibreGL.LineLayer
                id="bikeLanesLayer"
                style={{
                  lineColor: '#10b981',
                  lineWidth: 4.5,
                  lineOpacity: 0.85,
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Render amenities */}
          {showAmenities && (
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
          )}

          {/* Render covered path progress trail (Slate Gray) */}
          {coveredGeoJSON && (
            <MapLibreGL.ShapeSource id="coveredSource" shape={coveredGeoJSON}>
              <MapLibreGL.LineLayer
                id="coveredLayer"
                style={{
                  lineColor: '#64748b',
                  lineWidth: 6,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 0.6,
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Render remaining route */}
          {remainingGeoJSON && (
            <MapLibreGL.ShapeSource id="remainingSource" shape={remainingGeoJSON}>
              <MapLibreGL.LineLayer
                id="remainingLayer"
                style={{
                  lineColor: '#0284c7',
                  lineWidth: 6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Render destination pin */}
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

      {/* 6. Floating action utility buttons (adjusted relative to WazeBottomSheet state) */}
      <View style={[
        styles.floatingButtonsContainer, 
        sheetState === 'collapsed' && { bottom: 125 },
        sheetState === 'default' && { bottom: Math.round(screenHeight * 0.38) + 15 },
        sheetState === 'expanded' && { bottom: Math.round(screenHeight * 0.93) + 15 },
        destination && { bottom: 220 }
      ]}>
        <TouchableOpacity style={styles.floatingButton} onPress={() => setCameraZoom((prev) => Math.min(prev + 1, 20))}>
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButton} onPress={() => setCameraZoom((prev) => Math.max(prev - 1, 1))}>
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButton} onPress={() => {
          if (userLocation) {
            setCameraCenter([userLocation.longitude, userLocation.latitude]);
            setCameraZoom(15);
            setSheetState('default');
          }
        }}>
          <Text style={styles.buttonText}>o</Text>
        </TouchableOpacity>
      </View>

      {/* 7. Swipe Options Overlay Card */}
      {optionsItem && (
        <OptionsSheet
          item={optionsItem}
          onEliminate={() => eliminateRecentSearch(optionsItem.id)}
          onAddFavorite={() => saveRecentAsFavorite(optionsItem)}
          onClose={() => setOptionsItem(null)}
        />
      )}

      {/* 8. Bottom Route Metrics Card / RoutePreview */}
      {destination && (
        <RoutePreview
          destination={destination}
          etaString={etaString}
          durationMin={durationMin}
          routeDistance={routeDistance}
          isNavigating={isNavigating}
          onToggleNavigation={() => setIsNavigating(prev => !prev)}
          onSaveFavorite={saveFavorite}
          onClose={clearSearch}
        />
      )}

      {/* 9. Waze draggable bottom sheet */}
      {!destination && (
        <WazeBottomSheet
          origin={origin}
          destination={destination}
          originSearchQuery={originSearchQuery}
          searchQuery={searchQuery}
          searchFocused={searchFocused}
          searchResults={searchResults}
          recentSearches={recentSearches}
          sheetState={sheetState}
          lang={lang}
          onSearchTextChange={handleSearch}
          onFocusSearch={setSearchFocused}
          onSelectLocation={selectLocation}
          onClearOrigin={clearOrigin}
          onClearSearch={clearSearch}
          onNavigateToFavorite={navigateToFavorite}
          onOpenAddFavorite={() => {
            setActiveDetailSheet('favorites');
          }}
          onShowOptions={setOptionsItem}
          onStateChange={setSheetState}
        />
      )}

      {/* 10. Out-of-Map Naming Modal Card Overlay (Bypass MapView touch blockers) */}
      {namingPinLocation && (
        <View style={styles.namingOverlay}>
          <TouchableOpacity 
            style={styles.namingBackdrop} 
            onPress={() => setNamingPinLocation(null)} 
            activeOpacity={1} 
          />
          <GlassCard style={styles.namingCard} intensity={90}>
            <Text style={styles.namingTitle}>{t('saveFavorite', lang)}</Text>
            <TextInput
              style={styles.namingInput}
              placeholder={t('enterName', lang)}
              placeholderTextColor="rgba(0,0,0,0.3)"
              value={namingInputText}
              onChangeText={setNamingInputText}
              autoFocus
            />
            <View style={styles.namingButtons}>
              <TouchableOpacity 
                style={styles.namingBtnCancel} 
                onPress={() => setNamingPinLocation(null)}
              >
                <Text style={styles.namingBtnCancelTxt}>{t('cancel', lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.namingBtnConfirm} 
                onPress={() => {
                  if (namingInputText.trim().length === 0) {
                    alert(t('invalidName', lang));
                    return;
                  }
                  saveDroppedPinAsFavorite(namingInputText.trim());
                  setNamingPinLocation(null);
                }}
              >
                <Text style={styles.namingBtnConfirmTxt}>{t('confirm', lang)}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
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
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  hamburgerButton: {
    position: 'absolute',
    top: 54,
    left: 16,
    zIndex: 15,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(242, 242, 242, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  hamburgerText: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: 'bold',
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
    backgroundColor: '#10b981',
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
    right: 16,
    zIndex: 10,
    flexDirection: 'column',
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(242, 242, 242, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: 'bold',
  },
  namingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    justifyContent: 'flex-end',
  },
  namingBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  namingCard: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    paddingBottom: 36,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(242, 242, 242, 0.9)',
  },
  namingTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  namingInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    color: '#0f172a',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 16,
  },
  namingButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  namingBtnCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  namingBtnCancelTxt: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 'bold',
  },
  namingBtnConfirm: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#0284c7',
  },
  namingBtnConfirmTxt: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
