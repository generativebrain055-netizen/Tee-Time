# Figma Reference – Tee Time Social

This document summarizes the **Tee Time Social** Figma file (file key: `E42NRKunR1HIcTEJzwPAyT`) as read from the full-file export. Use it to align implementation with design.

---

## File overview

- **Name:** Tee Time Social  
- **File key:** `E42NRKunR1HIcTEJzwPAyT`  
- **Root:** Mobile Screens (canvas)

---

## Getting data from Figma

To pull the latest file structure and nodes from the Figma API:

1. **Create a Figma personal access token**  
   Figma → Settings → Account → **Personal access tokens** → Generate new token (use scope that includes reading file content).

2. **Run the fetch script** (from the repo root):

   ```bash
   FIGMA_ACCESS_TOKEN=your_token node scripts/figma-get-file.js
   ```

   This writes the full file JSON to **`docs/figma-file-export.json`**.

   To print the JSON to stdout instead:

   ```bash
   FIGMA_ACCESS_TOKEN=your_token node scripts/figma-get-file.js --stdout
   ```

   To use a different file, set `FIGMA_FILE_KEY` (default is the Tee Time Social file key above).

---

## Full schedule view – month (565-*)

**Label in file:** “Full schedule view - month (ready for dev)”

### Schedule screen frame (e.g. 565:5999)

- **Header**
  - Back button (left)
  - Title: **“Schedule”** (style `style_HR5OH6`, white-on-dark in header container)
  - Status bar (time 9:41, battery, etc.)

- **Calendar container**
  - Container: `borderRadius: 12px`, white fill, shadow
  - **Month row:** “July 2025” with prev/next buttons (`borderRadius: 8px`)
  - **Weekday row:** Sun, Mon, Tue, Wed, Thu, Fri, Sat (muted text)
  - **Day grid:** 7 columns, day number buttons
    - Default day: `borderRadius: 8px`, no fill (transparent/default)
    - **Selected day:** Primary Green fill, same 8px radius
    - **Day with event:** Small **Primary Green** rectangle, `borderRadius: 2px` (dot under the number)

Other Schedule-related frames (e.g. 565:3303, 565:5091, 565:5461, 565:5730) follow the same “Schedule” header + container structure with slight layout variants.

---

## Global Search / Find players (791-*)

### Frame 791:1184 – “Global Seach” (typo in Figma)

- **Header:** Back button + title **“Find players”**
- **Tabs / labels:** “Roster” (selected), “Groups”, “On Deck”, “Requests”
- **Search input**
  - Single input frame: `borderRadius: 12px`, border
  - Placeholder: **“Search by name and send a friend request”**

So in Figma this screen is framed as **Find players** with Roster/Groups/On Deck/Requests and a name search; the app’s **Global Search** (people, tee times, groups, courses) is a broader feature that can still use this for the “people” part and layout reference.

### 791:1219 – “Focused/Input State”

- Same Global Search / Find players layout with input in focused state.

---

## Home (795-*)

### 795:6009 – “Home - Default State”

- Contains “This week” and “View schedule” text (week summary and entry to full schedule).

---

## Other nodes (from your URLs)

| Node ID  | Name / purpose        | Notes                          |
|----------|------------------------|--------------------------------|
| 565-3303 | Roster Invite / Schedule | Header “Schedule”, same pattern |
| 565-5999 | Schedule (month)      | July 2025, day grid, selected 24, event dot |
| 565-5461 | Roster Invite / Schedule | Same header pattern            |
| 565-5730 | Roster Invite / Schedule | Same header pattern            |
| 565-5091 | Roster Invite / Schedule | Same header pattern            |
| 791-1184 | Global Search         | Find players, Roster/Groups/On Deck/Requests, search input |
| 791-1219 | Focused/Input State   | Same as 791-1184, focused      |
| 795-6009 | Home - Default State  | This week, View schedule       |
| 795-5958 | Friend Profile - Requested state | Separate from search          |

---

## Design tokens (from Figma)

- **Primary Green** – used for primary actions, selected day, event dot
- **Border radius:** 8px (buttons, day cells), 12px (containers, search input), 2px (event dot)
- **Header:** Back button + title; style `style_HR5OH6` for title
- **Calendar:** Month label (e.g. “July 2025”), weekday row, then 7-column day grid with selectable days and optional event indicator

---

## How to use this

- **Schedule screen:** Match header “Schedule”, 12px container radius, 8px day cells, Primary Green for selected day and event dot (see Full schedule view – month above).
- **Global Search / Find players:** Use 791-1184 and 791-1219 for layout (header “Find players”, tabs, 12px search field); extend to app’s global search (tee times, groups, courses) as needed.
- **Home:** Use 795-6009 for “This week” and “View schedule” placement and styling.

For exact colors and type styles, refer to the Figma file’s style definitions (e.g. `style_HR5OH6`, `style_230EVF`, `fill_WPGHSS`, Primary Green).
