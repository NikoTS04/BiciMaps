# BiciMaps Android APK Build Guide

Follow these steps to generate the release APK for BiciMaps and upload it to GitHub.

## 1. Prerequisites
- Node.js (v18+)
- Android Studio / Android SDK (configured with Gradle)
- Expo CLI (`npm install -g expo-cli` or `npx expo`)

## 2. Install Dependencies
Navigate to the `mobile` directory and install dependencies:
```bash
cd mobile
npm install
```

## 3. Pre-Build Verification
Ensure the KML GeoJSON assets are bundled correctly in `mobile/assets/`:
- `bikelanes.geojson`
- `amenities.geojson`

## 4. Generate Android Native Project (Prebuild)
If you are using Expo managed workflow, generate the native Android project directory (`android/`):
```bash
npx expo prebuild --platform android
```

## 5. Build Release APK Locally with Gradle
Once the `android/` folder is generated:
```bash
cd android
./gradlew assembleRelease
```

The compiled release APK will be located at:
`mobile/android/app/build/outputs/apk/release/app-release.apk`

## 6. Uploading to GitHub
1. Create a new GitHub Release in your repository.
2. Drag and drop `app-release.apk` into the release assets.
3. Share the download link with riders across Lima and Callao!
