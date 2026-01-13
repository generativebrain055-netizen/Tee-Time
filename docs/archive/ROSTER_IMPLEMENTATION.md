# Multiple Golf Buddy Rosters - Implementation Requirements

## Executive Summary

This document defines implementation-ready requirements for the enhanced roster system based on 8 user stories. The existing codebase has a solid foundation - this spec identifies gaps and new features needed.

## Current State Analysis

### ✅ Already Implemented
- Basic roster CRUD (add/remove/reorder)
- Roster groups with CRUD operations
- On-deck toggle functionality
- Member profile view with stats
- Waiver wire system
- Sorting by position, socialRate, handicap, name, distance, membership

### ❌ Gaps to Address
1. **Notifications** when added to someone's roster
2. **Roster selection during tee time creation** (auto-invite flow)
3. **Animated drag-and-drop** between Roster/On Deck
4. **Per-roster sort preference persistence**
5. **Unique roster name validation**
6. **Empty roster confirmation** before auto-invite

---

## Data Models

### 1. Schema Updates (Add to unified_schema.sql)

```sql
-- Add sort_preference to roster_groups
ALTER TABLE roster_groups ADD COLUMN IF NOT EXISTS sort_preference VARCHAR(20) DEFAULT 'position';
-- Valid: 'position', 'socialRate', 'handicap', 'name', 'distance', 'membership'

-- Add notification tracking for roster additions
CREATE TABLE IF NOT EXISTS roster_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
    notified_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roster_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES roster_groups(id) ON DELETE SET NULL,
    group_name VARCHAR(100),
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_roster_notification UNIQUE (roster_id, notified_user_id)
);

CREATE INDEX idx_roster_notifications_user ON roster_notifications(notified_user_id);
CREATE INDEX idx_roster_notifications_pending ON roster_notifications(notified_user_id, notification_sent) 
    WHERE notification_sent = false;
```

### 2. Updated Entity Relationships

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │  roster_groups  │       │     roster      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ user_id (FK)    │       │ id (PK)         │
│ phone_number    │       │ id (PK)         │◄──────│ group_id (FK)   │
│ first_name      │       │ name (unique/   │       │ user_id (FK)    │──►users
│ last_name       │       │   per user)     │       │ contact_user_id │──►users
└─────────────────┘       │ sort_preference │       │ is_on_deck      │
                          │ auto_invite     │       │ position        │
                          └─────────────────┘       └─────────────────┘
                                                            │
                                                            ▼
                                                    ┌─────────────────┐
                                                    │roster_notifica- │
                                                    │     tions       │
                                                    ├─────────────────┤
                                                    │ roster_id (FK)  │
                                                    │ notified_user_id│
                                                    │ notification_   │
                                                    │   sent          │
                                                    └─────────────────┘
```

---

## API Endpoints

### New Endpoints Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/roster/groups/:id/sort` | Update group sort preference |
| GET | `/api/roster/groups/:id/auto-invite` | Get auto-invite members for tee time |
| POST | `/api/tee-times/from-roster` | Create tee time with roster auto-invite |
| GET | `/api/notifications/roster-adds` | Get pending roster addition notifications |
| PUT | `/api/notifications/roster-adds/:id/read` | Mark notification as read |

### Existing Endpoints (No Changes Needed)
- `GET /api/roster` - Get roster
- `POST /api/roster` - Add to roster  
- `DELETE /api/roster/:id` - Remove from roster
- `PUT /api/roster/reorder` - Reorder roster
- `PUT /api/roster/:id/on-deck` - Toggle on-deck
- `PUT /api/roster/:id/move` - Move member (drag-drop)
- `GET/POST/PUT/DELETE /api/roster/groups/*` - Group CRUD

---

## Business Logic

### User Story 1: Multiple Rosters (Groups)
**Status: ✅ Mostly Implemented**

**Gap:** Unique name validation per user

```javascript
// Backend: rosterRepository.js - Add validation
async createGroup(userId, data) {
  // Check unique name
  const existing = await pool.query(
    "SELECT id FROM roster_groups WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
    [userId, data.name]
  );
  if (existing.rows.length > 0) {
    throw new Error("DUPLICATE_NAME");
  }
  // ... existing create logic
}
```

### User Story 2: Drag-and-Drop Between Roster/On Deck
**Status: ⚠️ Backend Ready, Frontend Needs Animation**

**Implementation:**
```typescript
// Frontend: Use react-native-reanimated + react-native-gesture-handler
// Install: npx expo install react-native-reanimated react-native-gesture-handler

// DraggableMember.tsx - Animated drag component
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  runOnJS 
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface DraggableMemberProps {
  member: RosterMember;
  onDrop: (memberId: string, targetSection: 'roster' | 'onDeck', newPosition: number) => void;
}

const DraggableMember = ({ member, onDrop }: DraggableMemberProps) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);
  
  const gesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.05);
      zIndex.value = 100;
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      scale.value = withSpring(1);
      zIndex.value = 0;
      translateY.value = withSpring(0);
      // Calculate drop target and call API
      runOnJS(onDrop)(member.id, calculateTarget(e.absoluteY), calculatePosition(e.absoluteY));
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    zIndex: zIndex.value,
    shadowOpacity: scale.value > 1 ? 0.2 : 0,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.memberCard, animatedStyle]}>
        {/* Member content */}
      </Animated.View>
    </GestureDetector>
  );
};
```

**Optimistic Updates for Slow Networks:**
```typescript
// useRosterDragDrop.ts
const useRosterDragDrop = () => {
  const [optimisticState, setOptimisticState] = useState<RosterMember[]>([]);
  const [pendingMoves, setPendingMoves] = useState<Map<string, MoveOperation>>(new Map());

  const handleDrop = async (memberId: string, target: string, position: number) => {
    // 1. Optimistic update immediately
    setOptimisticState(prev => reorderLocally(prev, memberId, target, position));
    
    // 2. Track pending operation
    const operationId = `${memberId}-${Date.now()}`;
    setPendingMoves(prev => new Map(prev).set(operationId, { memberId, target, position }));
    
    try {
      // 3. API call
      await rosterApi.moveMember(memberId, { targetGroupId: null, isOnDeck: target === 'onDeck', newPosition: position });
      // 4. Remove from pending on success
      setPendingMoves(prev => { const m = new Map(prev); m.delete(operationId); return m; });
    } catch (error) {
      // 5. Rollback on failure
      setPendingMoves(prev => { const m = new Map(prev); m.delete(operationId); return m; });
      setOptimisticState(prev => rollbackMove(prev, memberId));
      Alert.alert('Error', 'Failed to move member. Please try again.');
    }
  };

  return { roster: optimisticState, handleDrop, hasPendingMoves: pendingMoves.size > 0 };
};
```

### User Story 3: Roster Sorting & Smart Ordering
**Status: ✅ Backend Ready, Frontend Needs Sort Persistence**

**Backend Addition:**
```javascript
// rosterController.js - Add sort preference endpoint
async updateGroupSortPreference(req, res) {
  const { id } = req.params;
  const { sortBy } = req.body;
  const validSorts = ['position', 'socialRate', 'handicap', 'name', 'distance', 'membership'];
  
  if (!validSorts.includes(sortBy)) {
    return res.status(400).json({ success: false, message: 'Invalid sort option' });
  }
  
  const group = await rosterRepository.updateGroupSortPreference(req.user.id, id, sortBy);
  res.json({ success: true, group });
}

// rosterRepository.js
async updateGroupSortPreference(userId, groupId, sortBy) {
  const result = await pool.query(
    `UPDATE roster_groups SET sort_preference = $3, updated_at = NOW() 
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [groupId, userId, sortBy]
  );
  return result.rows[0];
}
```

**Distance Sorting Edge Case:**
```typescript
// When no course selected, show warning
const handleDistanceSort = (courseId?: string) => {
  if (!courseId) {
    Alert.alert(
      'Select a Course',
      'Distance sorting requires a course to be selected. Would you like to select a course?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Select Course', onPress: () => navigation.navigate('CourseSearch') }
      ]
    );
    return;
  }
  setSortBy('distance');
};
```

### User Story 4: Roster Member Profile View
**Status: ✅ Implemented**

Existing `getMemberProfile` endpoint returns:
- Social Rate score + history (via `social_rate_logs`)
- Handicap
- Club memberships
- Waiver wire status
- Attendance stats (times played, acceptance rate)

### User Story 5: Draft/Friends Notification
**Status: ❌ Not Implemented**

**Backend Implementation:**
```javascript
// notificationService.js - New file
class NotificationService {
  async sendRosterAddNotification(rosterEntry, ownerUser) {
    const { contact_user_id, group_id } = rosterEntry;
    if (!contact_user_id) return; // Can't notify non-users
    
    // Check if already notified for this roster entry
    const existing = await pool.query(
      `SELECT id FROM roster_notifications 
       WHERE roster_id = $1 AND notified_user_id = $2`,
      [rosterEntry.id, contact_user_id]
    );
    
    if (existing.rows.length > 0) return; // Already notified, no spam
    
    // Get group name if applicable
    let groupName = null;
    if (group_id) {
      const group = await pool.query('SELECT name FROM roster_groups WHERE id = $1', [group_id]);
      groupName = group.rows[0]?.name;
    }
    
    // Create notification record
    await pool.query(
      `INSERT INTO roster_notifications 
       (roster_id, notified_user_id, roster_owner_id, group_id, group_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [rosterEntry.id, contact_user_id, ownerUser.id, group_id, groupName]
    );
    
    // Create in-app notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, channel, title, body, data)
       VALUES ($1, 'in_app', 'roster', $2, $3, $4)`,
      [
        contact_user_id,
        'Added to Roster',
        `${ownerUser.first_name} ${ownerUser.last_name} added you to their roster${groupName ? ` "${groupName}"` : ''}`,
        JSON.stringify({ 
          type: 'roster_add', 
          ownerId: ownerUser.id, 
          ownerName: `${ownerUser.first_name} ${ownerUser.last_name}`,
          groupName 
        })
      ]
    );
    
    // TODO: Send push notification via FCM/APNs
  }
}

// Update rosterController.addToRoster
async addToRoster(req, res) {
  // ... existing logic ...
  const entry = await rosterRepository.addToRoster(userId, contact);
  
  // Send notification (async, don't block response)
  const user = await userRepository.findById(userId);
  notificationService.sendRosterAddNotification(entry, user).catch(console.error);
  
  res.status(201).json({ success: true, entry });
}
```

### User Story 6: Naming Rosters
**Status: ✅ Implemented with Gap**

**Gap:** Frontend validation for unique names
```typescript
// CreateGroupModal.tsx
const [nameError, setNameError] = useState<string | null>(null);

const handleCreate = async () => {
  if (!name.trim()) {
    setNameError('Name is required');
    return;
  }
  
  try {
    await rosterApi.createGroup({ name, ...otherData });
    onClose();
  } catch (error) {
    if (error.message.includes('DUPLICATE_NAME')) {
      setNameError('You already have a roster with this name');
    } else {
      Alert.alert('Error', 'Failed to create roster');
    }
  }
};
```

### User Story 7: Selecting Roster for Tee Time Creation
**Status: ❌ Not Implemented**

**Backend Implementation:**
```javascript
// teeTimeController.js - Add roster-based creation
async createFromRoster(req, res) {
  const userId = req.user.id;
  const { groupId, courseName, courseLocation, teeDate, teeTime, maxPlayers = 4, notes } = req.body;
  
  // 1. Get roster members (not on-deck) from group
  const members = await rosterRepository.getGroupMembers(userId, groupId);
  const autoInviteMembers = members.filter(m => !m.is_on_deck);
  
  // 2. Check if roster is empty
  if (autoInviteMembers.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'EMPTY_ROSTER',
      requiresConfirmation: true 
    });
  }
  
  // 3. Create tee time
  const teeTimeData = {
    creatorId: userId,
    courseName, courseLocation, teeDate, teeTime,
    maxPlayers,
    inviteType: 'roster',
    notes,
    rosterGroupId: groupId // Track which roster was used
  };
  const teeTime = await teeTimeRepository.create(teeTimeData);
  
  // 4. Auto-invite roster members (up to maxPlayers - 1 for creator)
  const slotsAvailable = maxPlayers - 1;
  const toInvite = autoInviteMembers.slice(0, slotsAvailable);
  
  const invites = await inviteRepository.createBulk(
    teeTime.id,
    userId,
    toInvite.map((m, idx) => ({
      inviteeUserId: m.contact_user_id,
      inviteePhone: m.contact_phone,
      inviteeName: m.contact_name,
      position: idx + 1
    }))
  );
  
  res.status(201).json({
    success: true,
    teeTime,
    invites,
    summary: {
      totalSlots: maxPlayers,
      creatorSlot: 1,
      autoInvited: toInvite.length,
      remainingSlots: slotsAvailable - toInvite.length,
      onDeckAvailable: members.filter(m => m.is_on_deck).length
    }
  });
}
```

**Frontend: RosterSelector Component**
```typescript
// components/RosterSelector.tsx
interface RosterSelectorProps {
  onSelect: (groupId: string, members: RosterMember[]) => void;
  maxPlayers: number;
}

const RosterSelector = ({ onSelect, maxPlayers }: RosterSelectorProps) => {
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [members, setMembers] = useState<RosterMember[]>([]);
  
  useEffect(() => {
    rosterApi.getGroups().then(res => setGroups(res.groups));
  }, []);
  
  useEffect(() => {
    if (selectedGroup) {
      rosterApi.getGroupMembers(selectedGroup).then(res => setMembers(res.members));
    }
  }, [selectedGroup]);
  
  const autoInviteCount = members.filter(m => !m.isOnDeck).length;
  const slotsNeeded = maxPlayers - 1; // Minus creator
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Roster</Text>
      
      <FlashList
        data={groups}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.groupCard, selectedGroup === item.id && styles.selected]}
            onPress={() => setSelectedGroup(item.id)}
          >
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.memberCount}>{item.memberCount} members</Text>
          </TouchableOpacity>
        )}
        estimatedItemSize={60}
      />
      
      {selectedGroup && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Invite Summary</Text>
          <View style={styles.summaryRow}>
            <Text>Auto-invite from roster:</Text>
            <Text style={styles.count}>{Math.min(autoInviteCount, slotsNeeded)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Remaining slots:</Text>
            <Text style={styles.count}>{Math.max(0, slotsNeeded - autoInviteCount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>On-deck available:</Text>
            <Text style={styles.count}>{members.filter(m => m.isOnDeck).length}</Text>
          </View>
          
          {autoInviteCount === 0 && (
            <View style={styles.warning}>
              <AlertTriangle size={16} color={COLORS.warning} />
              <Text style={styles.warningText}>
                This roster has no auto-invite members. Only on-deck players are available.
              </Text>
            </View>
          )}
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.confirmButton, !selectedGroup && styles.disabled]}
        onPress={() => selectedGroup && onSelect(selectedGroup, members)}
        disabled={!selectedGroup}
      >
        <Text style={styles.confirmText}>Confirm Roster</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### User Story 8: Edit & Delete Rosters
**Status: ✅ Implemented**

**Edge Case: Deleting roster used in past tee times**
```javascript
// rosterRepository.js - Already handles this correctly
async deleteGroup(userId, groupId) {
  // Roster entries keep their data, just lose group_id reference
  await pool.query(
    "UPDATE roster SET group_id = NULL WHERE group_id = $1 AND user_id = $2",
    [groupId, userId]
  );
  
  // Historical tee_times are NOT affected (they store course/date/time, not roster reference)
  const query = "DELETE FROM roster_groups WHERE id = $1 AND user_id = $2 RETURNING *";
  const result = await pool.query(query, [groupId, userId]);
  return result.rows[0];
}
```

**Frontend: Delete Confirmation**
```typescript
const handleDeleteGroup = (groupId: string, groupName: string) => {
  Alert.alert(
    'Delete Roster',
    `Are you sure you want to delete "${groupName}"? This cannot be undone. Members will be moved to your main roster.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          await rosterApi.deleteGroup(groupId);
          refreshGroups();
        }
      }
    ]
  );
};
```

---

## Edge Cases & Error Handling

### 1. Duplicate Entry Prevention
```javascript
// Already implemented via UNIQUE constraints
CONSTRAINT unique_roster_user UNIQUE (user_id, contact_user_id)
CONSTRAINT unique_roster_phone UNIQUE (user_id, contact_phone)
```

### 2. Drag-and-Drop on Slow Networks
- Optimistic UI updates (move immediately, rollback on failure)
- Visual indicator for pending sync (subtle spinner on card)
- Queue operations if offline, sync when back online
- Debounce rapid movements (300ms)

### 3. Distance Sorting Without Course
- Show alert prompting course selection
- Disable distance sort option until course selected
- Cache last selected course for convenience

### 4. Empty Roster Auto-Invite
```typescript
// CreateTeeTime flow
const handleRosterSelect = async (groupId: string) => {
  const { members } = await rosterApi.getGroupMembers(groupId);
  const autoInvite = members.filter(m => !m.isOnDeck);
  
  if (autoInvite.length === 0) {
    Alert.alert(
      'Empty Roster',
      'This roster has no auto-invite members. Would you like to proceed with manual invites only?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', onPress: () => setSelectedRoster(groupId) }
      ]
    );
    return;
  }
  
  setSelectedRoster(groupId);
};
```

### 5. Concurrent Edits
- Use `updated_at` for optimistic locking
- Return 409 Conflict if stale data
- Frontend refreshes and retries

---

## UI/UX Specifications

### Drag-and-Drop Visual Feedback
```
┌─────────────────────────────────────┐
│  ROSTER (Auto-Invite)               │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ ≡  John Smith      SR: 95  │◄── Dragging (elevated, shadow)
│  │    Handicap: 12            │    │
│  └─────────────────────────────┘    │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│    Drop zone indicator         ◄── Dashed border when dragging over
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│  ┌─────────────────────────────┐    │
│  │ ≡  Mike Johnson    SR: 88  │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  ON DECK (Manual Fallback)          │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ ≡  Tom Wilson      SR: 82  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Sort Controls
```
┌─────────────────────────────────────┐
│  Weekend Crew          [Sort ▼]     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Sort by:                    │    │
│  │  ○ Position (drag order)   │    │
│  │  ● Social Rate ↓           │◄── Selected
│  │  ○ Handicap ↑              │    │
│  │  ○ Name A-Z                │    │
│  │  ○ Distance to Course      │◄── Disabled if no course
│  │  ○ Club Membership         │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Tee Time Creation with Roster
```
┌─────────────────────────────────────┐
│  Create Tee Time                    │
├─────────────────────────────────────┤
│  Course: Pine Valley Golf Club      │
│  Date: Dec 28, 2024                 │
│  Time: 8:30 AM                      │
│  Players: 4                         │
├─────────────────────────────────────┤
│  Select Roster                      │
│  ┌─────────────────────────────┐    │
│  │ 🟢 Weekend Crew (6 members) │◄── Selected
│  │ 🔵 Work Buddies (4 members) │    │
│  │ 🟡 Family (3 members)       │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Invite Summary                     │
│  ┌─────────────────────────────┐    │
│  │ You (creator)          1/4 │    │
│  │ Auto-invite from roster 3/4 │    │
│  │ ─────────────────────────── │    │
│  │ Remaining slots         0/4 │    │
│  │                             │    │
│  │ On-deck available: 2       │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [    Create & Send Invites    ]    │
└─────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1 (Critical Path)
1. ✅ Unique roster name validation (backend + frontend)
2. ❌ Roster selection in tee time creation
3. ❌ Auto-invite flow with summary

### Phase 2 (Enhanced UX)
4. ❌ Animated drag-and-drop with reanimated
5. ❌ Per-roster sort preference persistence
6. ❌ Optimistic updates for slow networks

### Phase 3 (Notifications)
7. ❌ Roster addition notifications (in-app)
8. ❌ Push notifications for roster adds

---

## Files to Create/Modify

### Backend
| File | Action | Description |
|------|--------|-------------|
| `repositories/rosterRepository.js` | Modify | Add unique name check, sort preference |
| `controllers/rosterController.js` | Modify | Add sort preference endpoint |
| `controllers/teeTimeController.js` | Modify | Add createFromRoster method |
| `services/notificationService.js` | Create | Roster add notifications |
| `routes/roster.js` | Modify | Add sort preference route |
| `routes/teeTimes.js` | Modify | Add from-roster route |

### Frontend
| File | Action | Description |
|------|--------|-------------|
| `components/roster/DraggableMember.tsx` | Create | Animated drag component |
| `components/roster/RosterSelector.tsx` | Create | Tee time roster picker |
| `components/roster/SortMenu.tsx` | Create | Sort options dropdown |
| `hooks/useRosterDragDrop.ts` | Create | Drag-drop state management |
| `screens/CreateTeeTime/index.tsx` | Modify | Add roster selection step |

### Schema
| File | Action | Description |
|------|--------|-------------|
| `schema/unified_schema.sql` | Modify | Add sort_preference, roster_notifications |


---

## Implementation Status (Updated)

### ✅ Completed in This Session

| Feature | Files Modified | Status |
|---------|---------------|--------|
| Unique roster name validation | `rosterRepository.js`, `rosterController.js` | ✅ Done |
| Sort preference persistence | `rosterRepository.js`, `rosterController.js`, `roster.js` routes | ✅ Done |
| Auto-invite members endpoint | `rosterRepository.js`, `rosterController.js`, `roster.js` routes | ✅ Done |
| Roster add notifications | `rosterNotificationService.js` (new), `rosterController.js` | ✅ Done |
| Schema updates | `unified_schema.sql`, `migrations/003_roster_enhancements.sql` | ✅ Done |
| Frontend API types | `api.ts` | ✅ Done |

### 🔄 Remaining (Frontend Implementation)

| Feature | Priority | Effort |
|---------|----------|--------|
| Animated drag-and-drop component | High | 4-6 hrs |
| Roster selector in CreateTeeTime | High | 2-3 hrs |
| Sort menu UI component | Medium | 1-2 hrs |
| Notification display in app | Medium | 2-3 hrs |

---

## Quick Start for Frontend Dev

### 1. Install Animation Dependencies
```bash
cd TTSGolfApp
npx expo install react-native-reanimated react-native-gesture-handler
```

### 2. Update babel.config.js
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // Must be last
  };
};
```

### 3. Use New API Methods
```typescript
// Update group sort preference
await rosterApi.updateGroupSort(groupId, 'socialRate');

// Get auto-invite members for tee time
const { members, count } = await rosterApi.getAutoInviteMembers(groupId);

// Create group (now validates unique name)
try {
  await rosterApi.createGroup({ name: 'Weekend Crew' });
} catch (error) {
  if (error.message.includes('DUPLICATE_NAME')) {
    // Show "Name already exists" error
  }
}
```

---

## Database Migration

Run this SQL in Supabase to update existing databases:

```sql
-- Run: backend/schema/migrations/003_roster_enhancements.sql
```

Or use the full schema for fresh installs:
```sql
-- Run: backend/schema/unified_schema.sql
```


---

## In-App Notifications (Completed)

### Backend Files Created/Modified
| File | Description |
|------|-------------|
| `controllers/notificationController.js` | CRUD operations for notifications |
| `routes/notifications.js` | API routes for notifications |
| `services/rosterNotificationService.js` | Sends roster add notifications |
| `server.js` | Added notification routes |

### Frontend Files Created/Modified
| File | Description |
|------|-------------|
| `screens/notifications/index.tsx` | Full notifications screen with FlashList |
| `hooks/useNotifications.ts` | Reusable hooks for notifications |
| `screens/Home/components/Header.tsx` | Bell icon with unread badge |
| `screens/Home/index.tsx` | Navigate to Notifications screen |
| `App.tsx` | Added Notifications screen |
| `services/api.ts` | Added notificationApi |
| `config/api.ts` | Added notification endpoints |

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user's notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### Features
- ✅ Bell icon shows unread count badge (red)
- ✅ Auto-refresh unread count every 30 seconds
- ✅ Pull-to-refresh on notifications list
- ✅ Tap notification to mark as read + navigate
- ✅ Swipe/tap to delete notifications
- ✅ "Mark all as read" button
- ✅ Empty state when no notifications
- ✅ Roster add notifications sent automatically
- ✅ Different icons for notification types (roster, tee time)
- ✅ Time ago display (Just now, 5m ago, 2h ago, etc.)

### Notification Types
| Type | Trigger | Navigation |
|------|---------|------------|
| `roster_add` | User added to someone's roster | FriendProfile screen |
| `tee_time` | Tee time invite (future) | Invites screen |

### Usage
```typescript
// In any component
import { useUnreadNotificationCount } from "../hooks/useNotifications";

const unreadCount = useUnreadNotificationCount();

// Or full notifications
import { useNotifications } from "../hooks/useNotifications";

const { 
  notifications, 
  unreadCount, 
  markAsRead, 
  markAllAsRead 
} = useNotifications();
```
