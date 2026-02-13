# Why You See These Errors (Plain Explanation)

## Error 1: "Network request failed" / "Backend verification error" / "Could not connect to the server"

**What it means:** The app on your phone or simulator tried to call your backend server and could not reach it.

**In Xcode console you may see:** `Socket SO_ERROR [61: Connection refused]`, `TCP Conn ... Failed : error 0:61`, `HTTP load failed ... Could not connect to the server`, `NSErrorFailingURLStringKey=http://SOME_IP:3000/...`

**Why it happens:**

1. **Backend not running** – The server must be running: `cd backend && npm run dev` (you should see "HTTP Server is running on port 3000").
2. **Wrong or stale IP in .env** – The app uses `EXPO_PUBLIC_API_URL` (e.g. `http://195.82.45.129:3000`). If that IP is wrong (e.g. old Wi‑Fi, different network, or a remote server that’s down), you get **Connection refused (61)**.
3. **localhost on simulator/device** – On the **iOS Simulator** or a **physical phone**, "localhost" is the device itself, not your Mac. So `http://localhost:3000` will never reach your Mac’s backend.

**Fix:**

1. Start the backend: `cd backend && npm run dev`. In a browser on your Mac open `http://localhost:3000/health` – you should see `{"status":"ok",...}`.
2. Use your **Mac’s current IP** in the app. In **TTSGolfApp/.env** set:
   - `EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:3000`
3. Get your Mac’s IP:
   - Terminal: `ipconfig getifaddr en0` (Wi‑Fi) or run `node TTSGolfApp/scripts/get-local-ip.js`
   - Or: **System Settings → Network → Wi‑Fi → Details**
4. If you use a different network or VPN, the IP can change – update `.env` and restart Expo.
5. Restart the app so it picks up `.env`: `cd TTSGolfApp && npx expo start -c`, then run the app again from Xcode or Expo.

---

## Error 2: Backend "app crashed - waiting for file changes before starting..."

**What it means:** The Node.js backend process exited instead of staying running, so nodemon is waiting for you to fix something.

**Why it can happen:**

1. **Wrong .env file:** The backend reads `backend/.env`. If it was reading a different folder’s `.env` (e.g. project root), `SUPABASE_URL` and `SUPABASE_ANON_KEY` would be missing and the app would throw and exit. (This was fixed so the backend loads `backend/.env`.)

2. **Database (Supabase) unreachable:** If Supabase is down or the URL/keys are wrong, the startup check can fail. The server is now set to **still start** and only log a warning, so you should see a message like "Database connection failed" and the server keeps running.

3. **Another startup error:** Something else (e.g. a required file, or a bad env value) can throw during startup and cause the process to exit.

**What to do:** In the terminal where you ran `npm run dev` (in the `backend` folder), look at the **last lines before "app crashed"**. That message (and the line or two above it) is the reason. Copy that error and use it to fix the config or code (or share it so someone can tell you exactly what to change).

---

## Quick checklist

| Step | What to do |
|------|------------|
| 1 | Backend runs from `backend` folder: `cd backend && npm run dev`. You should see "HTTP Server is running on port 3000". |
| 2 | On your Mac, test: open browser to `http://localhost:3000/health`. You should see `{"status":"ok",...}`. |
| 3 | In **TTSGolfApp/.env** set `EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:3000` (use your Mac’s IP, not localhost). |
| 4 | Restart the app: `cd TTSGolfApp && npx expo start -c`, then open the app on the simulator/device again. |

If the backend never reaches "Server is running", the reason is in the backend terminal output right before "app crashed".

---

## Simulator-only console spam (safe to ignore)

When you run the app in the **iOS Simulator**, Xcode’s console may flood with messages like:

- **`CHHapticPattern` / `hapticpatternlibrary.plist` couldn't be opened** – The simulator has no haptic hardware and no system haptic library. The **system keyboard** tries to load it when you focus a text field. This is an Apple simulator limitation, not a bug in your app. It does **not** happen on a real device.
- **`nw_protocol_socket_set_no_wake_from_sleep`** – Normal simulator networking log; harmless.
- **`instanceHandle is null, event of type topBlur will be dropped`** – React Native internal; safe to ignore.
- **`RTIInputSystemClient remoteTextInputSessionWithID...perform input operation requires a valid sessionID`** – Simulator keyboard/input quirk; safe to ignore.

**You cannot fix these in app code.** They come from the simulator and system frameworks.

**To hide them in Xcode:**

1. In the **bottom console**, click the filter (funnel) icon or the search field.
2. Type a **negative filter** so these lines are hidden, for example:
   - Filter out haptics: in the filter box enter `-hapticpatternlibrary -CHHapticPattern` (if your Xcode version supports minus to exclude).
   - Or filter *by* your app: e.g. only show lines containing `TTS` or your app name so system messages are hidden.

**Alternative:** Run the app on a **physical iPhone**. The haptic and most other simulator-only messages will not appear there.

**Other simulator messages (also safe to ignore):**

- **`nw_protocol_socket_set_no_wake_from_sleep`** / **`nw_connection_copy_connected_local_endpoint`** / **`nw_read_request_report ... Operation timed out`** – Network stack on simulator; harmless.
- **`RTIInputSystemClient ... perform input operation requires a valid sessionID`** – Simulator keyboard/input; harmless.
- **`UIManagerBinding.cpp ... instanceHandle is null, event of type ... will be dropped`** – React Native bridge; harmless.
- **`IOSurfaceClientSetSurfaceNotify failed`** / **`fopen failed for data file`** / **`Errors found! Invalidating cache`** – Simulator graphics/cache; usually harmless.
- **`Attempted to update accumulator ... after completion has already been called`** – Can appear with image/list components; often reduced by fixing empty image URIs (see below).

---

## Xcode console: what each message means

When you run the app from Xcode (e.g. Debug on iOS Simulator), you’ll see many lines in the console. Here’s what to do.

### Fixable: connection / backend

| Console message | Meaning | What to do |
|-----------------|--------|------------|
| `Socket SO_ERROR [61: Connection refused]` | App tried to reach the API URL; nothing is listening on that host:port. | Start backend (`cd backend && npm run dev`). Set `EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:3000` in TTSGolfApp/.env (use your Mac’s IP). Restart Expo with cache clear: `npx expo start -c`. |
| `Could not connect to the server` / `Error -1004` | Same as above: backend unreachable at the URL in .env. | Same as above. Check that the IP in .env is correct (run `node TTSGolfApp/scripts/get-local-ip.js`). |
| `[ERROR] [LoginFlow] Failed to send magic link` / `Network request failed` | Magic link request failed because the API request failed (usually connection refused). | Fix backend and EXPO_PUBLIC_API_URL as above. The app will show an error message; once the backend is reachable, try again. |

### Safe to ignore (simulator / system)

| Console message | Why it appears |
|-----------------|----------------|
| `empty dSYM file detected` / `dSYM was created with an executable with no debug info` | Debug symbols not embedded for that build. Doesn’t affect behaviour; only affects symbolication of crash logs. To fix: run `cd TTSGolfApp && npx expo prebuild --clean`, then build from Xcode again (a config plugin sets Debug to DWARF-only). Optional (alternative): in Xcode → Build Settings → Debug Information Format → set to “DWARF with dSYM” for Debug if you want. |
| `UIScene lifecycle will soon be required` | Future iOS requirement. No immediate action; can be addressed when you adopt the scene lifecycle. |
| `_setUpFeatureFlags called with release level 2` | Apple internal. Ignore. |
| `Failed to send CA Event for app launch measurements` | Analytics/metrics; doesn’t affect app behaviour. Ignore. |
| `nw_socket_handle_socket_event ... SO_ERROR [61]` (when you already fixed the URL) | Can still appear briefly for failed connection attempts. If the app then works, ignore. |
| `nw_protocol_socket_set_no_wake_from_sleep ... SO_NOWAKEFROMSLEEP failed [22]` | Simulator networking quirk. Harmless. |
| `nw_connection_copy_connected_local_endpoint ... Connection has no local endpoint` | Simulator networking. Harmless. |
| `nw_connection_get_connected_socket_block_invoke ... Client called ... on unconnected nw_connection` | Follows a failed connection. Harmless if you’ve fixed the backend URL. |
| `Unbalanced calls start/end for tag 19/20` | React Native internal. Safe to ignore. |
| `Result accumulator timeout: 0.250000, exceeded` | Simulator timing. Ignore. |
| `RTIInputSystemClient ... perform input operation requires a valid sessionID` | Simulator keyboard/input. Ignore. |
| `SafeAreaView has been deprecated` | From a dependency (e.g. react-native-paper), not app code. Safe to ignore. |
| `InspectorPackagerConnection Couldn't connect to packager` | You ran the app from Xcode without Metro. To use dev tools, run `npx expo start` in TTSGolfApp first, then run from Xcode. Optional. |
| `[Notifications]: Attempting to post will/did notification with nil userInfo` | iOS/Expo lifecycle notifications; native code. Safe to ignore. |
| `unable to make sandbox extension: [2: No such file or directory]` | Simulator sandbox quirk. Safe to ignore. |
| `Snapshotting a view (UIKeyboardImpl) that is not in a visible window` | Simulator keyboard. Safe to ignore. |
| `WARNING: Logging before InitGoogleLogging()` (STDERR)` | Internal logging. Safe to ignore. |

### Token / session (expected when token is expired)

- `[DEBUG] [SplashScreen] Token expired, clearing session` – Normal when the stored access token is expired. User is sent to login again.

---

## "source.uri should not be an empty string"

**What it means:** An `<Image>` (or avatar) was given `source={{ uri: '' }}` or `uri` that is empty. React Native warns because an empty URI is invalid.

**Fix in app:** The shared avatar components (`Avatar`, `AppAvatar`, `AvatarImage`) now ignore empty or whitespace-only URIs and show a fallback instead. If you still see the warning, the screen is likely using a raw `<Image source={{ uri: something }} />` where `something` can be empty. Use a fallback: only render the Image when the URI is non-empty, or use `safeImageSource(uri)` from `utils` and render Image only when it returns a value.
