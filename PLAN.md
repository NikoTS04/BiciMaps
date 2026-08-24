# BiciMaps: Lima & Callao Bicycle Navigation MVP - Architecture & Plan

## 1. Overview
BiciMaps is a native Android mobile application designed for Lima and Callao, Peru. It operates **100% offline** (no internet or cellular data required during rides) and is packaged as an Android APK compatible with a wide range of Android versions (Android 7.0 / API 24 and above). Its core mission is to provide safe, bike-lane-prioritized point-to-point routing utilizing mapping data embedded from `@Ciudad Bike Friendly.kml`.

---

## 2. Tech Stack & Android Packaging

- **Mobile Framework & APK Build:**
  - **Framework:** React Native (Expo / Bare workflow) or Capacitor with TypeScript, enabling native Android compilation and robust hardware access.
  - **APK Compilation:** EAS Build / Gradle build targeting SDK 24+ (Android 7.0+) up to Android 14+, ensuring broad compatibility across older and newer Android devices commonly used in Lima.

- **Offline Mapping & Rendering:**
  - **Map Engine:** MapLibre GL Native / React Native Maps with offline vector/raster tile packaging (or bundled offline MBTiles covering Lima & Callao).
  - **Styling:** Custom high-contrast dark/light themes optimized for outdoor handlebar visibility.

- **Geospatial & Offline Routing Engine:**
  - **KML Processing & Storage:** Pre-compiled parser that converts `Ciudad Bike Friendly.kml` into local GeoJSON assets bundled inside the APK / local SQLite storage.
  - **Spatial Analysis & Snapping:** `Turf.js` (or native geospatial math libraries) for coordinate snapping, distance calculations, and proximity alerts.
  - **Offline Routing Graph:** Client-side graph builder and A* / Dijkstra pathfinding over the embedded Lima/Callao bike lane network.
  - **GPS Positioning:** Native offline GPS (`FusedLocationProviderClient` / Geolocation API) for real-time user tracking without cellular data.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Client Layer (PWA)                   │
│  - Interactive Map (Mapbox GL JS)                      │
│  - Origin & Destination Search / Geolocation           │
│  - Turn-by-Turn / Route Visualization UI               │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Geospatial & Routing Core              │
│  - KML Parser (`togeojson` -> GeoJSON)                 │
│  - Network Graph Builder (Nodes & Edges from Bikelanes)│
│  - Snapper & Router (Turf.js + A* Pathfinding)         │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                   Data Source Layer                    │
│  - `Ciudad Bike Friendly.kml` (Lima & Callao network)  │
└────────────────────────────────────────────────────────┘
```

---

## 4. Design Choices & UX for Cyclists

1. **Bike-Lane First Routing:**
   - Routes prioritize dedicated bike lanes (`ciclovías`) present in the KML dataset over heavy vehicle traffic arteries.
   - Fallback to low-stress residential streets when bike lanes are absent.

2. **Outdoor Visibility & Ergonomics:**
   - Large touch targets for gloves.
   - High-contrast color palette (bright safety green for active bike paths, high-visibility blue/orange for UI elements).
   - Audio-visual turn cues.

3. **100% Offline Android APK Resilience:**
   - Bundles all map tiles, network data, and KML-derived GeoJSON directly inside the APK package.
   - Operates entirely without internet connection, utilizing device GPS sensors for real-time positioning and tracking.
   - Built with backward compatibility (Target SDK 34, Min SDK 24 / Android 7.0+) to support a wide spectrum of Android devices.

---

## 5. MVP Implementation Steps

1. **Phase 1: Data Parsing & Asset Bundling**
   - Parse `Ciudad Bike Friendly.kml` into optimized GeoJSON and bundle it directly into the Android APK assets.
2. **Phase 2: Offline Map & UI Scaffolding**
   - Set up React Native / Capacitor project with offline vector/raster map rendering covering Lima and Callao.
3. **Phase 3: Client-Side Offline Routing Engine**
   - Implement point-to-point A*/Dijkstra routing over the embedded bike lane network combined with offline GPS snapping.
4. **Phase 4: APK Compilation & Testing**
   - Build and sign release APK (`minSdk 24`), verifying performance and offline GPS navigation across test Android devices.
