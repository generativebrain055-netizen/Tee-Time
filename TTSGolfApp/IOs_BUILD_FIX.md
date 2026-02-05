# Fix: "module map file ... EXApplication.modulemap not found" (and all Expo/Pods module maps)

The app target expects Pods (EXApplication, Expo, EXConstants, etc.) to already be built in DerivedData. If you build **only the app** in Xcode, those Pods are not built first, so the module maps are missing.

---

## Solution 1: One script (recommended)

From the **TTSGolfApp** folder run:

```bash
cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp
chmod +x scripts/ios-build-fix.sh
./scripts/ios-build-fix.sh
```

This will:
1. Clean Xcode Derived Data for TeeTimeSocial  
2. Remove `ios/Pods`, `Podfile.lock`, `build`  
3. Run `pod install`  
4. Run **`npx expo run:ios`** (builds Pods then the app and launches the simulator)

After this, the simulator should open with the app. Later you can open the workspace in Xcode and build there; the Pods will already be in DerivedData.

---

## Solution 2: Manual steps

Run in Terminal:

```bash
# 1. Clean Derived Data
rm -rf ~/Library/Developer/Xcode/DerivedData/TeeTimeSocial-*

# 2. Reinstall Pods
cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp/ios
rm -rf Pods Podfile.lock build
pod install

# 3. Build and run (this builds Pods first, then the app)
cd ..
npx expo run:ios
```

Use **TeeTimeSocial.xcworkspace** in Xcode, not the `.xcodeproj`.

---

## Solution 3: Build from Xcode only

If you want to build only from Xcode:

1. Do steps 1 and 2 above (clean Derived Data, then `pod install`).
2. Open the **workspace**:  
   `open ios/TeeTimeSocial.xcworkspace`
3. In Xcode, **build the Pods target first**:
   - **Product → Scheme → Pods-TeeTimeSocial**
   - **Product → Build** (⌘B)
4. Then build the app:
   - **Product → Scheme → TeeTimeSocial**
   - **Product → Build** (⌘B)

After the first time, you can usually just build the TeeTimeSocial scheme.

---

## Why this happens

- The app’s build settings point to module maps under **PODS_CONFIGURATION_BUILD_DIR** (e.g. `.../Debug-iphonesimulator/EXApplication/EXApplication.modulemap`).
- Those paths are filled only when the **Pods** target is built.
- If you open the **.xcodeproj** instead of the **.xcworkspace**, the Pods project is not part of the build, so Pods are never built and the module maps never appear.
- Even with the workspace, Xcode sometimes builds the app target before the Pods target, so the first build can fail until Pods are built once (e.g. via **Pods-TeeTimeSocial** or `npx expo run:ios`).

---

## Summary

| Goal              | What to do |
|-------------------|------------|
| Fix and run once  | Run `./scripts/ios-build-fix.sh` from **TTSGolfApp** |
| Build from CLI    | `npx expo run:ios` from **TTSGolfApp** |
| Build in Xcode    | Open **TeeTimeSocial.xcworkspace**, build **Pods-TeeTimeSocial** once, then **TeeTimeSocial** |
