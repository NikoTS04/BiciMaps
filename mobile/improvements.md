# BiciMaps: Routing Phenomena & Future Improvements

This document tracks routing phenomena, edge cases, and proposed structural improvements identified during the hybrid Dijkstra/OSRM routing implementation.

---

## 🔍 Observed Phenomena & Routing Edge Cases

### 1. One-Way Street Detours & Loop-Arounds (Car Routing Constraints)
* **Phenomenon:** The online OSRM fallback sometimes generates long detour loops around blocks to get to a point, even when a direct 10-meter crossing is visible.
* **Why it happens:** The public OSRM API uses the `driving` (car) profile. It strictly obeys one-way street directions, medians, and illegal car maneuvers. In reality, a cyclist can dismount and walk their bike across a sidewalk, go counter-traffic on quiet residential roads, or cross pedestrian zones.
* **Proposed Solution:** 
  * Transition to a self-hosted OSRM or GraphHopper instance running a custom **`bicycle` profile** (Lua script).
  * Configure the profile to allow traversing pedestrian lanes, permit riding in both directions on low-speed residential streets, and ignore turn restrictions for bicycles.

### 2. Snap Snarling (Multi-level Roads & Parallel Lanes)
* **Phenomenon:** When snapping your origin/destination to the nearest bike lane, the algorithm looks purely at Euclidean (straight-line) distance. In areas with multi-level junctions (bridges/tunnels) or dense parallel streets, it might snap you to a bike lane on an overpass that is physically inaccessible from your current street level.
* **Proposed Solution:**
  * Implement bearing/heading checks to ensure the snap candidate aligns with the user's travel direction.
  * Use GPS altitude or street connectivity checks to prevent vertical snapping errors.

### 3. High-Speed Arterial Danger Zones
* **Phenomenon:** Standard street-routing engines may guide cyclists onto major high-speed avenues (like *Vía Expresa* or *Javier Prado* in Lima) if it is mathematically the shortest path, despite being extremely dangerous or legally restricted for bicycles.
* **Proposed Solution:**
  * Implement **Safety Weighting** in the router. Penalize high-speed roads (e.g., multiplier of `10x` cost) and prioritize secondary residential roads, even if it results in a slightly longer route.

### 4. Hybrid Graph Sync Divergence
* **Phenomenon:** The offline `bikelanes.json` network and the online OSM street network are independent datasets. If OpenStreetMap updates its roads, or we update our offline bike lanes, the start/end connection coordinates might not match perfectly, causing tiny visual "zig-zags" at stitching points.
* **Proposed Solution:**
  * Build a synchronization script that snaps and snaps our GeoJSON endpoints directly to OpenStreetMap road vertices during our preprocessing pipeline.

---

## 🎨 Next Phase: UX, UI, & Styling Roadmap

Now that pathfinding is fast and accurate, we can start planning the user interface. Below is a checklist of proposed styling and feature upgrades to make BiciMaps look like a premium navigation app:

### 1. Visual Styling & Themes (Waze-like aesthetic)
* **Custom Map Styles:** Use a custom MapLibre vector style with soft cartoonish colors, highly visible green/blue route lines, and minimized street labels to mimic Waze.
* **Dark Mode Support:** Auto-toggle dark stylesheet values when the user's OS is in Dark Mode or at night.

### 2. User Experience (UX) Enhancements
* **Active Navigation Layout:**
  * A top instruction banner displaying the next turn (e.g., *"In 200m turn left"*).
  * A bottom card showing ETA, remaining distance (km), and remaining time (minutes).
* **Smooth Camera Transitions:** Follow the user's location with automatic map rotation matching their GPS heading (compass).

### 3. Useful Functionalities
* **Search History & Favorites:** Bookmarks for "Home", "Work", and recently searched locations stored locally using `AsyncStorage`.
* **Amenities Toggles:** A floating button to easily toggle visibility of bike parkings (`amenities`) and repair shops.
