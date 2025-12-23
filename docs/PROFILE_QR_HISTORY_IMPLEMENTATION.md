# User Profile, Social Rate, QR Code & Tee Time History - Implementation Requirements

## Executive Summary

This document defines implementation-ready requirements for 5 user stories related to profile management, social rate tracking, QR-based drafting, and tee time history.

## Current State Analysis

### ✅ Already Implemented
- Basic profile view/edit (name, email, location, handicap, bio, preferences)
- Social Rate scoring system with automatic adjustments
- Social Rate history logging (immutable)
- Tee time CRUD with status filtering
- Calendar view for tee times

### ❌ Gaps to Address
1. **Profile**: Phone verification before save, handicap change logging, club memberships
2. **Social Rate**: Full history UI with filtering
3. **QR Code**: "Get Drafted" QR generation and "Scan to Draft" flow
4. **Tee Time History**: Comprehensive history with attendance status, pagination

---

## Data Models

### 1. Schema Updates

```sql
-- ============================================================================
-- HANDICAP CHANGE LOG (for tracking handicap updates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS handicap_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_handicap DECIMAL(4,1),
    new_handicap DECIMAL(4,1) NOT NULL,
    source VARCHAR(20) DEFAULT 'user_edit', -- 'user_edit', 'ghin_sync', 'admin'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_handicap_source CHECK (source IN ('user_edit', 'ghin_sync', 'admin'))
);

CREATE INDEX idx_handicap_logs_user ON handicap_logs(user_id);
CREATE INDEX idx_handicap_logs_created ON handicap_logs(created_at DESC);

-- ============================================================================
-- CLUB MEMBERSHIPS (multi-select)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    location VARCHAR(255),
    website VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_club_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    membership_type VARCHAR(50), -- 'full', 'social', 'junior', etc.
    member_since DATE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_club UNIQUE (user_id, club_id)
);

CREATE INDEX idx_user_club_memberships_user ON user_club_memberships(user_id);

-- ============================================================================
-- QR DRAFT CODES (for "Get Drafted" feature)
-- ============================================================================
CREATE TABLE IF NOT EXISTS draft_qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL UNIQUE, -- SHA256 of the actual code
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ, -- Optional expiration
    scanned_count INT DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_draft_qr_codes_user ON draft_qr_codes(user_id);
CREATE INDEX idx_draft_qr_codes_hash ON draft_qr_codes(code_hash) WHERE is_active = true;

-- ============================================================================
-- GAME SCORES (linked to completed tee times)
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tee_time_id UUID NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES tee_time_participants(id) ON DELETE SET NULL,
    score INT NOT NULL,
    holes_played INT DEFAULT 18,
    course_par INT DEFAULT 72,
    score_differential DECIMAL(4,1), -- For handicap calculation
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_tee_time_score UNIQUE (user_id, tee_time_id),
    CONSTRAINT valid_holes CHECK (holes_played IN (9, 18))
);

CREATE INDEX idx_game_scores_user ON game_scores(user_id);
CREATE INDEX idx_game_scores_tee_time ON game_scores(tee_time_id);
CREATE INDEX idx_game_scores_created ON game_scores(created_at DESC);

-- Add attendance_status to tee_time_participants if not exists
ALTER TABLE tee_time_participants 
ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) DEFAULT 'pending';
-- Values: 'pending', 'confirmed', 'present', 'no_show', 'cancelled'
```

### 2. QR Code Payload Structure

```typescript
interface DraftQRPayload {
  version: number;        // Schema version for forward compatibility
  userId: string;         // User's UUID
  code: string;           // Unique code (not the hash)
  exp?: number;           // Optional expiration timestamp (Unix)
  sig: string;            // HMAC signature for validation
}

// Encoded as base64 JSON, then embedded in QR
// Example: eyJ2ZXJzaW9uIjoxLCJ1c2VySWQiOiIxMjM0Li4uIiwiY29kZSI6ImFiYzEyMyIsInNpZyI6Inh4eCJ9
```

---

## API Endpoints

### User Story 1: Profile View & Edit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Get current user profile (existing) |
| PUT | `/auth/profile` | Update profile (existing, needs enhancement) |
| GET | `/api/profile/handicap-history` | Get handicap change history |
| GET | `/api/profile/clubs` | Get user's club memberships |
| POST | `/api/profile/clubs` | Add club membership |
| DELETE | `/api/profile/clubs/:id` | Remove club membership |
| GET | `/api/profile/game-scores` | Get past game scores (read-only) |

### User Story 2: Social Rate

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social-rate` | Get current score + summary (existing) |
| GET | `/api/social-rate/history` | Get score history (existing) |
| GET | `/api/social-rate/user/:userId` | Get another user's score (existing) |

### User Story 3 & 4: QR Code Draft

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/draft/qr` | Get/generate user's QR code |
| POST | `/api/draft/qr/regenerate` | Regenerate QR (invalidates old) |
| POST | `/api/draft/scan` | Scan and validate QR code |
| POST | `/api/draft/confirm` | Confirm adding user to on-deck |

### User Story 5: Tee Time History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tee-times/history` | Get complete tee time history |
| GET | `/api/tee-times` | Get tee times with status filter (existing) |

---

## Business Logic

### User Story 1: Profile View & Edit

**Profile Fields:**
| Field | Editable | Validation | Notes |
|-------|----------|------------|-------|
| Full Name | ✅ | Required | First + Last name |
| Phone Number | ✅ | Verified | Requires OTP verification before save |
| Email | ✅ | Valid format | Optional |
| Location | ✅ | None | City + optional geolocation |
| Handicap | ✅ | 0-54 | Changes logged with timestamp |
| Club Memberships | ✅ | Multi-select | From clubs table |
| Past Game Scores | ❌ | Read-only | Linked to completed tee times |
| Social Rate | ❌ | Read-only | System-managed |

**Handicap Change Logging:**
```javascript
// profileRepository.js
async updateHandicap(userId, newHandicap, source = 'user_edit') {
  const current = await this.getCurrentHandicap(userId);
  
  // Log the change
  await pool.query(`
    INSERT INTO handicap_logs (user_id, previous_handicap, new_handicap, source)
    VALUES ($1, $2, $3, $4)
  `, [userId, current, newHandicap, source]);
  
  // Update profile
  await pool.query(`
    UPDATE user_profiles SET handicap = $1, updated_at = NOW()
    WHERE user_id = $2
  `, [newHandicap, userId]);
}
```

**Phone Number Change Flow:**
1. User enters new phone number
2. System sends OTP to new number
3. User verifies OTP
4. Phone number updated only after verification

### User Story 2: Social Rate

**Scoring Rules (Already Implemented):**
| Action | Points | Condition |
|--------|--------|-----------|
| Accept invite | +2 | Always |
| Decline invite | -1 | If > 24h after invite sent |
| Cancel participation | -5 | If within 24h of tee time |
| No-show | -10 | Marked by organizer |
| Initial score | 100 | New users |

**Immutability Guarantees:**
- All changes logged in `social_rate_logs` table
- No UPDATE/DELETE operations on logs
- Idempotency checks prevent duplicate entries
- `is_system_generated = true` for all automatic changes

**Frontend Display:**
```typescript
// SocialRateHistory screen
interface SocialRateEntry {
  id: string;
  delta: number;           // +2, -1, -5, -10
  previousScore: number;
  newScore: number;
  reason: string;          // 'invite_accepted', 'no_show', etc.
  reasonDetails?: string;  // Human-readable explanation
  teeTime?: {
    id: string;
    courseName: string;
    date: string;
    time: string;
  };
  createdAt: string;
}
```

### User Story 3: "Get Drafted" QR Code

**QR Generation Flow:**
```javascript
// draftService.js
const crypto = require('crypto');

class DraftService {
  generateQRCode(userId) {
    // Generate unique code
    const code = crypto.randomBytes(16).toString('hex');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    // Create signature for validation
    const payload = { version: 1, userId, code };
    const sig = crypto.createHmac('sha256', process.env.QR_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    // Store hash (not the code itself)
    await pool.query(`
      INSERT INTO draft_qr_codes (user_id, code_hash, version)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id) WHERE is_active = true
      DO UPDATE SET version = draft_qr_codes.version + 1, 
                    code_hash = $2, 
                    created_at = NOW()
    `, [userId, codeHash]);
    
    // Return payload for QR encoding
    return {
      version: 1,
      userId,
      code,
      sig
    };
  }
  
  regenerateQRCode(userId) {
    // Revoke old codes
    await pool.query(`
      UPDATE draft_qr_codes 
      SET is_active = false, revoked_at = NOW()
      WHERE user_id = $1 AND is_active = true
    `, [userId]);
    
    // Generate new
    return this.generateQRCode(userId);
  }
}
```

**Security Considerations:**
- QR contains userId but NOT phone, email, or other PII
- Code is signed with HMAC to prevent tampering
- Hash stored in DB, not the actual code
- Optional expiration for time-limited codes
- Regeneration invalidates all previous codes

### User Story 4: "Scan to Draft" Flow

**Scan & Validation Flow:**
```javascript
// draftController.js
async scanQRCode(req, res) {
  const { qrData } = req.body; // Base64 encoded payload
  const scannerId = req.user.id;
  
  try {
    // 1. Decode and parse
    const payload = JSON.parse(Buffer.from(qrData, 'base64').toString());
    const { version, userId, code, sig, exp } = payload;
    
    // 2. Validate signature
    const expectedSig = crypto.createHmac('sha256', process.env.QR_SECRET)
      .update(JSON.stringify({ version, userId, code }))
      .digest('hex');
    
    if (sig !== expectedSig) {
      return res.status(400).json({ success: false, message: 'Invalid QR code' });
    }
    
    // 3. Check expiration
    if (exp && Date.now() > exp * 1000) {
      return res.status(400).json({ success: false, message: 'QR code expired' });
    }
    
    // 4. Verify code exists and is active
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const qrRecord = await pool.query(`
      SELECT * FROM draft_qr_codes 
      WHERE code_hash = $1 AND is_active = true
    `, [codeHash]);
    
    if (qrRecord.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'QR code invalid or revoked' });
    }
    
    // 5. Check if already in roster/on-deck
    const existing = await rosterRepository.isInRoster(scannerId, userId);
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already in your roster',
        code: 'ALREADY_IN_ROSTER'
      });
    }
    
    // 6. Get user profile for confirmation modal
    const userProfile = await userRepository.getPublicProfile(userId);
    const mutualClubs = await this.getMutualClubs(scannerId, userId);
    
    // 7. Update scan count
    await pool.query(`
      UPDATE draft_qr_codes 
      SET scanned_count = scanned_count + 1, last_scanned_at = NOW()
      WHERE id = $1
    `, [qrRecord.rows[0].id]);
    
    res.json({
      success: true,
      user: {
        id: userId,
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        avatar: userProfile.avatar_url,
        socialRate: userProfile.social_rate,
        handicap: userProfile.handicap,
        homeCourse: userProfile.home_course
      },
      mutualClubs,
      confirmationRequired: true
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid QR code format' });
  }
}

async confirmDraft(req, res) {
  const { userId } = req.body;
  const scannerId = req.user.id;
  
  // Add to on-deck (not main roster)
  const entry = await rosterRepository.addToRoster(scannerId, {
    contactUserId: userId,
    isOnDeck: true // Add to on-deck section
  });
  
  // Send notification to drafted user
  await rosterNotificationService.sendRosterAddNotification(entry, req.user);
  
  res.json({ success: true, message: 'User added to your On-Deck list' });
}
```

**Confirmation Modal Data:**
```typescript
interface DraftConfirmation {
  user: {
    id: string;
    name: string;
    avatar?: string;
    socialRate: number;
    handicap?: number;
    homeCourse?: string;
  };
  mutualClubs: string[];  // Club names in common
  confirmationRequired: true;
}
```

### User Story 5: Tee Time History

**History Query with Attendance Status:**
```javascript
// teeTimeRepository.js
async getTeeTimeHistory(userId, options = {}) {
  const { 
    filter = 'all', // 'all', 'upcoming', 'completed', 'cancelled'
    limit = 20, 
    offset = 0 
  } = options;
  
  let whereClause = `
    (tt.creator_id = $1 OR ttp.user_id = $1)
  `;
  
  if (filter === 'upcoming') {
    whereClause += ` AND tt.tee_date >= CURRENT_DATE AND tt.status NOT IN ('cancelled', 'completed')`;
  } else if (filter === 'completed') {
    whereClause += ` AND tt.status = 'completed'`;
  } else if (filter === 'cancelled') {
    whereClause += ` AND (tt.status = 'cancelled' OR ttp.status = 'cancelled')`;
  }
  
  const query = `
    SELECT DISTINCT ON (tt.id)
      tt.id,
      tt.course_name,
      tt.course_location,
      tt.tee_date,
      tt.tee_time,
      tt.status as tee_time_status,
      tt.creator_id,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      ttp.status as participant_status,
      tta.status as attendance_status,
      CASE 
        WHEN tt.creator_id = $1 THEN 'organizer'
        ELSE 'participant'
      END as user_role,
      (SELECT COUNT(*) FROM tee_time_participants WHERE tee_time_id = tt.id AND status = 'confirmed') as participant_count
    FROM tee_times tt
    LEFT JOIN tee_time_participants ttp ON tt.id = ttp.tee_time_id AND ttp.user_id = $1
    LEFT JOIN tee_time_attendance tta ON ttp.id = tta.participant_id
    LEFT JOIN users u ON tt.creator_id = u.id
    WHERE ${whereClause}
    ORDER BY tt.id, tt.tee_date DESC, tt.tee_time DESC
    LIMIT $2 OFFSET $3
  `;
  
  return pool.query(query, [userId, limit, offset]);
}
```

**History Entry Display:**
```typescript
interface TeeTimeHistoryEntry {
  id: string;
  courseName: string;
  courseLocation?: string;
  teeDate: string;
  teeTime: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  userRole: 'organizer' | 'participant';
  attendanceStatus?: 'pending' | 'present' | 'no_show' | 'cancelled';
  organizer: {
    firstName: string;
    lastName: string;
  };
  participantCount: number;
}
```

---

## Edge Cases & Error Handling

### QR Code Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid QR format | Return "Invalid QR code format" |
| Expired QR | Return "QR code expired" |
| Revoked QR | Return "QR code invalid or revoked" |
| User already in roster | Return "User already in your roster" with code |
| Self-scan | Return "Cannot add yourself" |
| QR sharing/misuse | Rate limit scans per user, log all scans |
| Offline scan | Cache validation locally, sync when online |

### Timezone Handling

```javascript
// All dates stored in UTC
// Convert to user's timezone for display
const formatTeeTimeForUser = (teeTime, userTimezone = 'America/New_York') => {
  const dateTime = new Date(`${teeTime.tee_date}T${teeTime.tee_time}`);
  return {
    date: dateTime.toLocaleDateString('en-US', { timeZone: userTimezone }),
    time: dateTime.toLocaleTimeString('en-US', { 
      timeZone: userTimezone,
      hour: 'numeric',
      minute: '2-digit'
    })
  };
};
```

### Partial Profile Completion

```typescript
// Profile completeness indicator
const calculateProfileCompleteness = (profile: UserProfile): number => {
  const fields = [
    { key: 'firstName', weight: 15 },
    { key: 'lastName', weight: 15 },
    { key: 'phone', weight: 20 },
    { key: 'location', weight: 10 },
    { key: 'handicap', weight: 15 },
    { key: 'homeCourse', weight: 10 },
    { key: 'avatar', weight: 10 },
    { key: 'bio', weight: 5 },
  ];
  
  return fields.reduce((score, field) => {
    return score + (profile[field.key] ? field.weight : 0);
  }, 0);
};
```

### Social Rate Idempotency

Already implemented - each score change checks for existing log entry before applying:
```javascript
// Prevents duplicate bonuses/penalties
const existing = await this.findLogEntry(userId, inviteId, reason);
if (existing) return existing.new_score;
```

---

## UI/UX Specifications

### Profile Screen Layout
```
┌─────────────────────────────────────┐
│  [Banner with Avatar]               │
│  ┌─────┐                            │
│  │ 👤  │  John Smith                │
│  └─────┘  📍 Austin, TX             │
│           ⛳ Handicap: 12            │
├─────────────────────────────────────┤
│  [Get Drafted QR]  [Edit Profile]   │
├─────────────────────────────────────┤
│  PREFERENCES                        │
│  🕐 Morning  🚶 Walk  👥 Any size   │
├─────────────────────────────────────┤
│  CLUB MEMBERSHIPS                   │
│  • Austin Country Club              │
│  • Barton Creek Resort              │
│  [+ Add Club]                       │
├─────────────────────────────────────┤
│  STATS                              │
│  Rounds: 24  Courses: 8  SR: 95     │
├─────────────────────────────────────┤
│  RECENT ROUNDS (Read-only)          │
│  ┌─────────────────────────────┐    │
│  │ Pine Valley • Dec 15 • 82   │    │
│  │ Barton Creek • Dec 8 • 78   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Social Rate History Screen
```
┌─────────────────────────────────────┐
│  ← Social Rate History              │
├─────────────────────────────────────┤
│  Current Score: 95                  │
│  ████████████████░░░░ 95/100        │
├─────────────────────────────────────┤
│  HISTORY                            │
│  ┌─────────────────────────────┐    │
│  │ +2  Accepted invite         │    │
│  │     Pine Valley • Dec 15    │    │
│  │     2 days ago              │    │
│  ├─────────────────────────────┤    │
│  │ -5  Late cancellation       │    │
│  │     Barton Creek • Dec 10   │    │
│  │     7 days ago              │    │
│  ├─────────────────────────────┤    │
│  │ +2  Accepted invite         │    │
│  │     Austin CC • Dec 5       │    │
│  │     12 days ago             │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### QR Code Modal ("Get Drafted")
```
┌─────────────────────────────────────┐
│           Get Drafted               │
│                                     │
│      ┌─────────────────────┐        │
│      │                     │        │
│      │    [QR CODE HERE]   │        │
│      │                     │        │
│      └─────────────────────┘        │
│                                     │
│  Let others scan this code to       │
│  add you to their On-Deck list      │
│                                     │
│  [Share QR]  [Regenerate]           │
│                                     │
│  ⚠️ Regenerating will invalidate    │
│     any previously shared codes     │
└─────────────────────────────────────┘
```

### Scan Confirmation Modal
```
┌─────────────────────────────────────┐
│         Add to On-Deck?             │
│                                     │
│      ┌─────┐                        │
│      │ 👤  │  Mike Johnson          │
│      └─────┘                        │
│                                     │
│  Social Rate: 92                    │
│  Handicap: 15                       │
│  Home Course: Barton Creek          │
│                                     │
│  🏌️ Mutual Clubs:                   │
│  • Austin Country Club              │
│                                     │
│  [Cancel]        [Add to On-Deck]   │
└─────────────────────────────────────┘
```

### Tee Time History Screen
```
┌─────────────────────────────────────┐
│  ← Tee Time History                 │
├─────────────────────────────────────┤
│  [Upcoming] [Completed] [Cancelled] │
├─────────────────────────────────────┤
│  UPCOMING                           │
│  ┌─────────────────────────────┐    │
│  │ Pine Valley Golf Club       │    │
│  │ Dec 28, 2024 • 8:30 AM     │    │
│  │ Organizer: You              │    │
│  │ 👥 3/4 confirmed            │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  COMPLETED                          │
│  ┌─────────────────────────────┐    │
│  │ Barton Creek Resort    ✓   │    │
│  │ Dec 15, 2024 • 9:00 AM     │    │
│  │ Organizer: Mike Johnson     │    │
│  │ Score: 82                   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Austin CC           ⚠️ NS  │◄── No-show badge
│  │ Dec 10, 2024 • 7:30 AM     │    │
│  │ Organizer: Tom Wilson       │    │
│  │ -10 Social Rate             │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1 (Core Features)
1. ✅ Social Rate history UI (backend exists)
2. ❌ QR code generation ("Get Drafted")
3. ❌ QR scanning ("Scan to Draft")
4. ❌ Tee time history with filters

### Phase 2 (Profile Enhancements)
5. ❌ Handicap change logging
6. ❌ Club memberships CRUD
7. ❌ Phone verification for changes
8. ❌ Game scores display

### Phase 3 (Polish)
9. ❌ Profile completeness indicator
10. ❌ QR sharing via system share sheet
11. ❌ Timezone-aware date display

---

## Files to Create/Modify

### Backend
| File | Action | Description |
|------|--------|-------------|
| `controllers/draftController.js` | Create | QR generation and scanning |
| `services/draftService.js` | Create | QR code business logic |
| `routes/draft.js` | Create | Draft API routes |
| `controllers/profileController.js` | Create | Profile-specific endpoints |
| `routes/profile.js` | Create | Profile API routes |
| `repositories/profileRepository.js` | Create | Profile data access |
| `server.js` | Modify | Add new routes |

### Frontend
| File | Action | Description |
|------|--------|-------------|
| `screens/profile/SocialRateHistory.tsx` | Create | Social rate history screen |
| `screens/profile/QRCodeModal.tsx` | Create | "Get Drafted" QR modal |
| `screens/profile/ScanDraftScreen.tsx` | Create | QR scanner screen |
| `screens/profile/TeeTimeHistory.tsx` | Create | Tee time history screen |
| `screens/profile/ClubMemberships.tsx` | Create | Club management |
| `components/QRScanner.tsx` | Create | Camera QR scanner |

### Schema
| File | Action | Description |
|------|--------|-------------|
| `schema/migrations/004_profile_qr_history.sql` | Create | New tables |
| `schema/unified_schema.sql` | Modify | Add new tables |


---

## Implementation Status (Completed)

### Backend Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/draftService.js` | Created | QR code generation, validation, signing |
| `controllers/draftController.js` | Created | QR endpoints (get, regenerate, scan, confirm) |
| `routes/draft.js` | Created | Draft API routes |
| `repositories/userRepository.js` | Modified | Added getPublicProfile method |
| `repositories/teeTimeRepository.js` | Modified | Added getTeeTimeHistory method |
| `controllers/teeTimeController.js` | Modified | Added getHistory endpoint |
| `routes/teeTimes.js` | Modified | Added /history route |
| `server.js` | Modified | Added draft routes |
| `schema/migrations/004_profile_qr_history.sql` | Created | New tables for handicap logs, clubs, QR codes, game scores |

### Frontend Files Modified

| File | Action | Description |
|------|--------|-------------|
| `config/api.ts` | Modified | Added draft endpoints |
| `services/api.ts` | Modified | Added draftApi, TeeTimeHistoryEntry, getHistory |

### API Endpoints Implemented

| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/api/draft/qr` | ✅ Done |
| POST | `/api/draft/qr/regenerate` | ✅ Done |
| POST | `/api/draft/scan` | ✅ Done |
| POST | `/api/draft/confirm` | ✅ Done |
| GET | `/api/tee-times/history` | ✅ Done |
| GET | `/api/social-rate` | ✅ Already existed |
| GET | `/api/social-rate/history` | ✅ Already existed |

### Database Migration

Run this SQL in Supabase to add new tables:
```sql
-- Run: backend/schema/migrations/004_profile_qr_history.sql
```

### Remaining Frontend Work

| Feature | Priority | Effort |
|---------|----------|--------|
| QR Code Modal ("Get Drafted") | High | 2-3 hrs |
| QR Scanner Screen ("Scan to Draft") | High | 3-4 hrs |
| Social Rate History Screen | Medium | 2-3 hrs |
| Tee Time History Screen | Medium | 2-3 hrs |
| Club Memberships UI | Low | 2-3 hrs |

### Security Features

- ✅ QR codes signed with HMAC (tamper-proof)
- ✅ Only hash stored in DB (code never persisted)
- ✅ No PII in QR payload (just userId + code)
- ✅ Regeneration invalidates all previous codes
- ✅ Self-scan prevention
- ✅ Duplicate roster entry prevention
- ✅ Scan count tracking for abuse detection

### Usage Examples

```typescript
// Get QR code for "Get Drafted"
const { qrCode } = await draftApi.getQRCode();
// qrCode.data is base64 encoded, render in QR component

// Scan someone's QR code
const result = await draftApi.scanQRCode(scannedBase64Data);
if (result.confirmationRequired) {
  // Show confirmation modal with result.user info
}

// Confirm adding to On-Deck
await draftApi.confirmDraft(result.user.id);

// Get tee time history
const { history } = await teeTimeApi.getHistory({ filter: 'completed', limit: 20 });
```
