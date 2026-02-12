# Icon Implementation Guide

## Downloaded Icons from Figma

The following icons have been downloaded from Figma:
- `app-icon.png` (806x1750) - Main app icon
- `favicon.png` (650x650) - Web favicon

## Icon Requirements for Expo/React Native

### Standard Icon Sizes

1. **App Icon (iOS/Android)**
   - Recommended: 1024x1024 pixels
   - Format: PNG with transparency
   - Current downloaded: 806x1750 (needs resizing to 1024x1024)

2. **Adaptive Icon (Android)**
   - Foreground: 1024x1024 pixels (safe area: 512x512 center)
   - Background: Solid color or gradient
   - Format: PNG

3. **Favicon (Web)**
   - Recommended: 32x32, 48x48, or 512x512 pixels
   - Format: PNG or ICO
   - Current downloaded: 650x650 (can be used as-is or resized)

4. **Splash Icon**
   - Recommended: 1242x2436 (iPhone) or 1024x1024 (Android)
   - Format: PNG
   - Usually contains logo centered on background

## Implementation Steps

### Option 1: Use Downloaded Icons Directly (Quick)

1. **App Icon**: Resize `app-icon.png` to 1024x1024
   ```bash
   # Using ImageMagick or similar tool
   convert app-icon.png -resize 1024x1024^ -gravity center -extent 1024x1024 AppIcon.png
   ```

2. **Favicon**: Use `favicon.png` as-is (650x650 is acceptable)
   - Already configured in `app.json` as `./assets/favicon.png`

3. **Adaptive Icon**: Create from app-icon
   ```bash
   convert app-icon.png -resize 1024x1024^ -gravity center -extent 1024x1024 adaptive-icon.png
   ```

### Option 2: Use Figma Export (Recommended)

1. Export icons from Figma with proper sizes:
   - App Icon: 1024x1024
   - Favicon: 512x512 or 32x32
   - Adaptive Icon: 1024x1024 (foreground only)

2. Replace existing files in `/assets`:
   - `AppIcon.png` → Main app icon
   - `favicon.png` → Web favicon
   - `adaptive-icon.png` → Android adaptive icon foreground
   - `splash-icon.png` → Splash screen icon

## Current Configuration

The `app.json` file is configured as follows:

```json
{
  "icon": "./assets/AppIcon.png",           // Main app icon
  "ios": {
    "icon": "./assets/AppIcon.png"          // iOS app icon
  },
  "android": {
    "icon": "./assets/AppIcon.png",         // Android app icon
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#ffffff"
    }
  },
  "web": {
    "favicon": "./assets/favicon.png"       // Web favicon
  },
  "splash": {
    "image": "./assets/splash-icon.png"     // Splash screen
  }
}
```

## Next Steps

1. **Resize app-icon.png** to 1024x1024 and save as `AppIcon.png`
2. **Use favicon.png** as-is or resize to preferred size (32x32, 48x48, or 512x512)
3. **Create adaptive-icon.png** from the app icon (1024x1024, centered)
4. **Update splash-icon.png** if needed (usually logo on white background)

## Tools for Icon Processing

- **ImageMagick**: Command-line image manipulation
- **GIMP**: Free image editor
- **Photoshop**: Professional image editor
- **Online tools**: 
  - https://www.iloveimg.com/resize-image
  - https://www.favicon-generator.org/

## Notes

- The downloaded `app-icon.png` (806x1750) has an unusual aspect ratio
- Consider if this is meant to be a vertical logo or if it needs cropping/resizing
- For best results, export icons directly from Figma at the correct sizes
- Ensure icons have transparent backgrounds where needed
- Test icons on actual devices to ensure they look good
