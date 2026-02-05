# Open TeeTime Social in Xcode

This is an **Expo** project. The native `ios` folder is generated when you run prebuild. Follow these steps to open the app in Xcode.

## Step 1: Generate the iOS project

From the project root (`TTSGolfApp`), run:

```bash
cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp

# Generate native ios (and android) folders
npx expo prebuild --platform ios
```

This creates an `ios` folder with the Xcode project.

## Step 2: Open in Xcode

**Option A – from terminal:**

```bash
open ios/teetimesocial.xcworkspace
```

If the workspace name differs, use:

```bash
open ios/*.xcworkspace
```

**Option B – from Finder:**

1. Open the `TTSGolfApp` folder.
2. Go into the `ios` folder.
3. Double-click the **`.xcworkspace`** file (e.g. `teetimesocial.xcworkspace`).

> **Important:** Open the **`.xcworkspace`** file, not the `.xcodeproj`, so CocoaPods and dependencies load correctly.

## Step 3: Run from Xcode

1. Select your target device or simulator.
2. Press **⌘R** or click the Run (Play) button.

---

## One-liner (after prebuild once)

After you’ve run prebuild at least once:

```bash
cd /Volumes/Macintosh_HD/Users/user284740/Downloads/TeeTimeSocial/Tee-Time/TTSGolfApp && open ios/*.xcworkspace
```

---

## Notes

- **First time:** Run `npx expo prebuild --platform ios` before opening Xcode.
- **After pulling or changing native config:** Run `npx expo prebuild --platform ios` again (use `--clean` if you have native changes to reset).
- **Development:** You can also run `npx expo run:ios` from the terminal; it will prebuild if needed and then build/run.
