# Manual Invite Feature - Testing Guide

## Feature: Manually Add Players to Fill Spots Faster

**Status**: ✅ Implemented

### What This Feature Does:
When someone declines an invite or you have open spots in your tee time, you can now manually select and invite additional players from your roster or on-deck list, rather than waiting for the automatic roster queue.

---

## How to Test:

### Prerequisites:
1. Have a roster with multiple contacts
2. Have some players in your on-deck list
3. Create a tee time with available spots

### Test Steps:

#### 1. Create a Tee Time with Open Spots
- Go to **Home** → **Create Tee Time**
- Fill in course, date, time details
- Set **Max Players** to 4 (or any number)
- Choose any invite type (Roster, Manual, FCFS, etc.)
- Complete the creation

#### 2. Navigate to Tee Time Detail
- Tap on the tee time you just created
- You should see the tee time detail screen

#### 3. Look for the "Invite More Players" Button
- **Location**: Between the "Pending Invites" section and "Notes" section
- **Appearance**: 
  - White card with dashed green border
  - Green user-plus icon
  - Text: "Invite More Players"
  - Subtext showing available spots (e.g., "3 spots available")
- **Visibility**: Only visible to the tee time creator when spots are available

#### 4. Tap "Invite More Players"
- A modal slides up from the bottom
- Shows title: "Invite Players"
- Displays subtitle with selection count

#### 5. Select Players
- **Player List Shows**:
  - Avatar, name, handicap
  - Source label (roster or on-deck)
  - Checkbox on the right
- **Filters Out**:
  - Players already participating
  - Players already invited
- **Selection**:
  - Tap any player card to select/deselect
  - Selected cards turn light green with green border
  - Checkbox shows checkmark when selected
  - Counter updates in the "Send Invites" button

#### 6. Send Invites
- Tap **"Send Invites (X)"** button at the bottom
- Shows loading indicator
- On success:
  - Alert: "Invited X player(s)!"
  - Modal closes
  - Tee time refreshes automatically
  - New invites appear in "Pending Invites" section

#### 7. Verify Results
- Check the "Pending Invites" section
- Newly invited players should appear with "Pending" status
- Available spots count should decrease

---

## Edge Cases to Test:

### No Available Players
- **Scenario**: All roster/on-deck players are already invited or participating
- **Expected**: Modal shows empty state with message "No available players"

### All Spots Filled
- **Scenario**: Tee time is full (participants + invites = max players)
- **Expected**: "Invite More Players" button doesn't appear

### Not the Creator
- **Scenario**: Viewing someone else's tee time
- **Expected**: "Invite More Players" button doesn't appear

### Select Zero Players
- **Scenario**: Try to send invites without selecting anyone
- **Expected**: Alert "Please select at least one player to invite"

---

## UI Elements:

### "Invite More Players" Button
```
┌─────────────────────────────────┐
│         [User Plus Icon]        │
│     Invite More Players         │
│     3 spots available           │
└─────────────────────────────────┘
```

### Player Selection Modal
```
┌─────────────────────────────────┐
│ Invite Players            [X]   │
│ Select players from your roster │
│ or on-deck list (2 selected)    │
│                                  │
│ ┌─────────────────────────────┐ │
│ │ [Avatar] John Doe           │ │
│ │          HCP: 12 • roster  ✓│ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [Avatar] Jane Smith         │ │
│ │          HCP: 8 • on-deck  ○│ │
│ └─────────────────────────────┘ │
│                                  │
│ [Cancel]  [Send Invites (2)]    │
└─────────────────────────────────┘
```

---

## API Endpoints Used:

1. **GET /api/roster/contacts** - Fetch roster contacts
2. **GET /api/roster/on-deck** - Fetch on-deck players
3. **POST /api/invites** - Create manual invites

---

## Success Criteria:

✅ Button appears for creator when spots available  
✅ Modal loads available players correctly  
✅ Players can be selected/deselected  
✅ Invites are sent successfully  
✅ Tee time refreshes with new invites  
✅ Already invited/participating players are filtered out  
✅ Empty state shows when no players available  
✅ Button hidden when tee time is full  
✅ Button hidden for non-creators  

---

## Related Features:

- **Skip Invite**: Skip a pending invite to advance to next roster member
- **Auto-Invite**: Automatically invite roster members based on group settings
- **Roster Order**: Sequential invites with response windows

---

## Notes:

- This feature works with ANY invite type (Roster, Manual, FCFS, etc.)
- You can invite multiple players at once
- Invites are sent as "manual" type
- Players receive notifications immediately
- The feature helps fill spots faster when someone declines or doesn't respond quickly
