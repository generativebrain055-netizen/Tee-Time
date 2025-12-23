# Social Rate & Attendance System - Implementation Requirements

## Version 1.0 | December 2024

---

## 1. DATA MODELS

### 1.1 Social Rate Log Table (NEW)

```sql
CREATE TABLE social_rate_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tee_time_id UUID REFERENCES tee_times(id) ON DELETE SET NULL,
    invite_id UUID REFERENCES invites(id) ON DELETE SET NULL,
    
    -- Score change details
    previous_score INT NOT NULL,
    delta INT NOT NULL,  -- Can be positive or negative
    new_score INT NOT NULL,
    
    -- Reason tracking
    reason VARCHAR(50) NOT NULL,
    reason_details TEXT,
    
    -- Metadata
    triggered_by UUID REFERENCES users(id),  -- Who caused this (organizer for no-show)
    is_system_generated BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_reason CHECK (reason IN (
        'invite_accepted',      -- +2
        'invite_declined_late', -- -1 (after 24h)
        'cancellation_late',    -- -5 (within 24h of tee time)
        'no_show',              -- -10
        'initial_score',        -- Starting score (100)
        'admin_adjustment'      -- Manual admin adjustment
    ))
);

CREATE INDEX idx_social_rate_logs_user ON social_rate_logs(user_id);
CREATE INDEX idx_social_rate_logs_tee_time ON social_rate_logs(tee_time_id);
CREATE INDEX idx_social_rate_logs_created ON social_rate_logs(created_at DESC);
```


### 1.2 Tee Time Attendance Table (NEW)

```sql
CREATE TABLE tee_time_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tee_time_id UUID NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES tee_time_participants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Attendance status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Check-in details
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES users(id),  -- Organizer who checked them in
    
    -- No-show handling
    marked_no_show_at TIMESTAMPTZ,
    marked_no_show_by UUID REFERENCES users(id),
    no_show_notified BOOLEAN DEFAULT false,
    
    -- Penalty tracking
    penalty_applied BOOLEAN DEFAULT false,
    penalty_log_id UUID REFERENCES social_rate_logs(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_attendance_status CHECK (status IN (
        'pending',      -- Not yet checked in
        'present',      -- Confirmed present
        'no_show',      -- Marked as no-show
        'cancelled'     -- User cancelled before tee time
    )),
    CONSTRAINT unique_attendance UNIQUE (tee_time_id, participant_id)
);

CREATE INDEX idx_attendance_tee_time ON tee_time_attendance(tee_time_id);
CREATE INDEX idx_attendance_user ON tee_time_attendance(user_id);
CREATE INDEX idx_attendance_status ON tee_time_attendance(status);
```

### 1.3 User Profile Updates

```sql
-- Modify user_profiles table
ALTER TABLE user_profiles 
    ALTER COLUMN social_rate TYPE INT USING (social_rate * 20)::INT,
    ALTER COLUMN social_rate SET DEFAULT 100;

-- Add constraint for non-negative score (no minimum cap, but can't go below 0)
ALTER TABLE user_profiles 
    ADD CONSTRAINT social_rate_non_negative CHECK (social_rate >= 0);
```


### 1.4 Tee Time Status Updates

```sql
-- Add new statuses to tee_times table
ALTER TABLE tee_times 
    DROP CONSTRAINT valid_tee_time_status,
    ADD CONSTRAINT valid_tee_time_status CHECK (status IN (
        'pending',      -- Created, awaiting confirmations
        'confirmed',    -- Has minimum players confirmed
        'in_progress',  -- Tee time has started (check-in available)
        'completed',    -- Tee time finished
        'cancelled'     -- Cancelled by organizer
    ));

-- Add check-in tracking columns
ALTER TABLE tee_times ADD COLUMN IF NOT EXISTS
    check_in_started_at TIMESTAMPTZ,
    check_in_completed_at TIMESTAMPTZ,
    check_in_completed_by UUID REFERENCES users(id);
```

### 1.5 Participant Cancellation Tracking

```sql
-- Add cancellation tracking to tee_time_participants
ALTER TABLE tee_time_participants ADD COLUMN IF NOT EXISTS
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    penalty_applied BOOLEAN DEFAULT false;
```

---

## 2. STATE MACHINES

### 2.1 Tee Time Status State Machine

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌───────────┐  ┌───────────┐  ┌───────────┐
     │ confirmed │  │ cancelled │  │ (expired) │
     └─────┬─────┘  └───────────┘  └───────────┘
           │
           │ (5 min before tee time)
           ▼
    ┌─────────────┐
    │ in_progress │
    └──────┬──────┘
           │
           │ (check-in completed OR tee time passed)
           ▼
    ┌───────────┐
    │ completed │
    └───────────┘
```

**Transitions:**
- `pending → confirmed`: When minimum players accept
- `pending → cancelled`: Organizer cancels
- `confirmed → in_progress`: 5 minutes before tee time (automatic)
- `confirmed → cancelled`: Organizer cancels
- `in_progress → completed`: Check-in completed OR tee time + 30 min passed


### 2.2 Invite Status State Machine

```
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
  ┌──────────┐    ┌──────────┐    ┌─────────┐
  │ accepted │    │ declined │    │ expired │
  └──────────┘    └──────────┘    └─────────┘
        │
        │ (user cancels participation)
        ▼
  ┌───────────┐
  │ cancelled │
  └───────────┘
```

### 2.3 Attendance Status State Machine

```
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
  ┌─────────┐     ┌─────────┐     ┌───────────┐
  │ present │     │ no_show │     │ cancelled │
  └─────────┘     └─────────┘     └───────────┘
       │               │
       │               │ (penalty applied)
       │               ▼
       │         ┌──────────────┐
       │         │ -10 points   │
       │         └──────────────┘
       │
       ▼
  ┌──────────────┐
  │ No penalty   │
  └──────────────┘
```

---

## 3. SOCIAL RATE BUSINESS RULES

### 3.1 Point Adjustments

| Action | Points | Condition |
|--------|--------|-----------|
| Accept invite | +2 | Always |
| Decline invite | -1 | Only if declined > 24h after receiving invite |
| Decline invite | 0 | If declined within 24h of receiving invite |
| Cancel participation | -5 | If cancelled within 24h of tee time |
| Cancel participation | 0 | If cancelled > 24h before tee time |
| No-show | -10 | Marked by organizer during check-in |

### 3.2 Initial Score
- Every new user starts with **100 points**
- Score has **no maximum cap** (can exceed 100)
- Score has **minimum of 0** (cannot go negative)

### 3.3 Idempotency Rules
- Each invite can only trigger ONE score change per action type
- Use `penalty_applied` flags to prevent duplicate penalties
- Log entries are immutable - no updates or deletes allowed


---

## 4. BACKEND IMPLEMENTATION

### 4.1 Social Rate Service

```javascript
// backend/services/socialRateService.js

const POINT_VALUES = {
  INVITE_ACCEPTED: 2,
  INVITE_DECLINED_LATE: -1,
  CANCELLATION_LATE: -5,
  NO_SHOW: -10,
  INITIAL_SCORE: 100
};

const REASONS = {
  INVITE_ACCEPTED: 'invite_accepted',
  INVITE_DECLINED_LATE: 'invite_declined_late',
  CANCELLATION_LATE: 'cancellation_late',
  NO_SHOW: 'no_show',
  INITIAL_SCORE: 'initial_score',
  ADMIN_ADJUSTMENT: 'admin_adjustment'
};

class SocialRateService {
  
  // Initialize score for new user
  async initializeScore(userId) {
    const currentScore = await this.getCurrentScore(userId);
    if (currentScore !== null) return currentScore;
    
    await this.logScoreChange({
      userId,
      previousScore: 0,
      delta: POINT_VALUES.INITIAL_SCORE,
      newScore: POINT_VALUES.INITIAL_SCORE,
      reason: REASONS.INITIAL_SCORE
    });
    
    return POINT_VALUES.INITIAL_SCORE;
  }
  
  // Apply points for accepting invite
  async applyAcceptBonus(userId, teeTimeId, inviteId) {
    // Check idempotency - has this invite already given points?
    const existing = await this.findLogEntry(userId, inviteId, REASONS.INVITE_ACCEPTED);
    if (existing) return existing.new_score;
    
    return this.adjustScore(userId, POINT_VALUES.INVITE_ACCEPTED, {
      reason: REASONS.INVITE_ACCEPTED,
      teeTimeId,
      inviteId
    });
  }
  
  // Apply penalty for late decline (> 24h after invite received)
  async applyLateDeclinePenalty(userId, teeTimeId, inviteId, inviteCreatedAt) {
    const hoursSinceInvite = (Date.now() - new Date(inviteCreatedAt)) / (1000 * 60 * 60);
    
    // Only penalize if > 24 hours since invite was sent
    if (hoursSinceInvite <= 24) return null;
    
    // Check idempotency
    const existing = await this.findLogEntry(userId, inviteId, REASONS.INVITE_DECLINED_LATE);
    if (existing) return existing.new_score;
    
    return this.adjustScore(userId, POINT_VALUES.INVITE_DECLINED_LATE, {
      reason: REASONS.INVITE_DECLINED_LATE,
      teeTimeId,
      inviteId,
      details: `Declined ${Math.floor(hoursSinceInvite)}h after invite`
    });
  }
  
  // Apply penalty for late cancellation (within 24h of tee time)
  async applyLateCancellationPenalty(userId, teeTimeId, teeDateTime) {
    const hoursUntilTeeTime = (new Date(teeDateTime) - Date.now()) / (1000 * 60 * 60);
    
    // Only penalize if within 24 hours of tee time
    if (hoursUntilTeeTime > 24) return null;
    
    // Check idempotency using tee_time_id + reason
    const existing = await this.findLogEntryByTeeTime(userId, teeTimeId, REASONS.CANCELLATION_LATE);
    if (existing) return existing.new_score;
    
    return this.adjustScore(userId, POINT_VALUES.CANCELLATION_LATE, {
      reason: REASONS.CANCELLATION_LATE,
      teeTimeId,
      details: `Cancelled ${Math.abs(Math.floor(hoursUntilTeeTime))}h before tee time`
    });
  }
  
  // Apply no-show penalty
  async applyNoShowPenalty(userId, teeTimeId, markedBy) {
    // Check idempotency
    const existing = await this.findLogEntryByTeeTime(userId, teeTimeId, REASONS.NO_SHOW);
    if (existing) return existing.new_score;
    
    return this.adjustScore(userId, POINT_VALUES.NO_SHOW, {
      reason: REASONS.NO_SHOW,
      teeTimeId,
      triggeredBy: markedBy,
      details: 'Marked as no-show by organizer'
    });
  }
  
  // Core score adjustment (private)
  async adjustScore(userId, delta, options) {
    const currentScore = await this.getCurrentScore(userId);
    const newScore = Math.max(0, currentScore + delta); // Floor at 0
    
    await this.logScoreChange({
      userId,
      previousScore: currentScore,
      delta,
      newScore,
      ...options
    });
    
    await this.updateUserScore(userId, newScore);
    return newScore;
  }
  
  // Get user's score history
  async getScoreHistory(userId, limit = 50) {
    // Returns chronological list of all score changes
  }
}
```


### 4.2 Attendance Service

```javascript
// backend/services/attendanceService.js

class AttendanceService {
  
  // Create attendance records when tee time is confirmed
  async initializeAttendance(teeTimeId) {
    const participants = await teeTimeRepository.getParticipants(teeTimeId);
    
    for (const participant of participants) {
      await this.createAttendanceRecord({
        teeTimeId,
        participantId: participant.id,
        userId: participant.user_id,
        status: 'pending'
      });
    }
  }
  
  // One-tap check-in: Mark all as present
  async checkInAll(teeTimeId, organizerId) {
    const attendance = await this.getAttendanceByTeeTime(teeTimeId);
    
    for (const record of attendance) {
      if (record.status === 'pending') {
        await this.markPresent(record.id, organizerId);
      }
    }
    
    await this.completeCheckIn(teeTimeId, organizerId);
  }
  
  // Mark individual as present
  async markPresent(attendanceId, checkedInBy) {
    await this.updateAttendance(attendanceId, {
      status: 'present',
      checkedInAt: new Date(),
      checkedInBy
    });
  }
  
  // Mark individual as no-show
  async markNoShow(attendanceId, markedBy) {
    const record = await this.getAttendanceById(attendanceId);
    
    // Prevent duplicate penalties
    if (record.penalty_applied) {
      throw new Error('Penalty already applied for this attendance');
    }
    
    // Check if user cancelled - no penalty if they did
    if (record.status === 'cancelled') {
      throw new Error('Cannot mark cancelled participant as no-show');
    }
    
    // Apply no-show penalty
    const penaltyLog = await socialRateService.applyNoShowPenalty(
      record.user_id,
      record.tee_time_id,
      markedBy
    );
    
    await this.updateAttendance(attendanceId, {
      status: 'no_show',
      markedNoShowAt: new Date(),
      markedNoShowBy: markedBy,
      penaltyApplied: true,
      penaltyLogId: penaltyLog.id
    });
    
    // Notify user they were marked as no-show
    await notificationService.sendNoShowNotification(record.user_id, record.tee_time_id);
  }
  
  // Handle user cancellation
  async handleCancellation(teeTimeId, userId, teeDateTime) {
    const attendance = await this.getAttendanceByUser(teeTimeId, userId);
    
    if (!attendance) return;
    
    // Apply late cancellation penalty if within 24h
    await socialRateService.applyLateCancellationPenalty(userId, teeTimeId, teeDateTime);
    
    await this.updateAttendance(attendance.id, {
      status: 'cancelled',
      cancelledAt: new Date()
    });
  }
}
```

### 4.3 Check-In Notification Scheduler

```javascript
// backend/services/checkInNotificationService.js

class CheckInNotificationService {
  
  // Schedule check-in notification for 5 minutes before tee time
  async scheduleCheckInNotification(teeTimeId, teeDateTime, organizerId) {
    const notificationTime = new Date(teeDateTime);
    notificationTime.setMinutes(notificationTime.getMinutes() - 5);
    
    await notificationService.scheduleNotification({
      userId: organizerId,
      type: 'push',
      channel: 'check_in_reminder',
      title: 'Time to check in!',
      body: 'Is everyone here? Tap to confirm attendance.',
      data: {
        type: 'CHECK_IN_REMINDER',
        teeTimeId,
        action: 'OPEN_CHECK_IN'
      },
      scheduledFor: notificationTime
    });
  }
  
  // Cron job: Find tee times starting in 5 minutes and trigger notifications
  async processUpcomingTeeTimes() {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const sixMinutesFromNow = new Date(Date.now() + 6 * 60 * 1000);
    
    const teeTimes = await teeTimeRepository.getTeeTimesInRange(
      fiveMinutesFromNow,
      sixMinutesFromNow,
      ['confirmed']
    );
    
    for (const teeTime of teeTimes) {
      // Transition to in_progress
      await teeTimeRepository.updateStatus(teeTime.id, 'in_progress');
      
      // Send notification to organizer only
      await this.sendCheckInNotification(teeTime.id, teeTime.creator_id);
    }
  }
}
```


---

## 5. API ENDPOINTS

### 5.1 Social Rate Endpoints

```
GET  /api/social-rate
     → Returns current score and summary stats

GET  /api/social-rate/history
     → Returns chronological score change history
     Query: ?limit=50&offset=0

GET  /api/social-rate/user/:userId
     → Returns another user's score (public view)
```

### 5.2 Tee Time Filter Endpoints

```
GET  /api/tee-times
     Query: ?status=pending|confirmed|completed
     → Filter by status (mutually exclusive)

GET  /api/tee-times/calendar
     Query: ?start=YYYY-MM-DD&end=YYYY-MM-DD&status=pending|confirmed|completed
     → Calendar view with optional status filter
```

### 5.3 Attendance/Check-In Endpoints

```
GET  /api/tee-times/:id/attendance
     → Get attendance status for all participants
     → Only organizer can view

POST /api/tee-times/:id/check-in/all
     → One-tap: Mark all participants as present
     → Only organizer can call

POST /api/tee-times/:id/check-in/:participantId
     Body: { status: 'present' | 'no_show' }
     → Mark individual participant status
     → Only organizer can call

POST /api/tee-times/:id/cancel-participation
     → User cancels their own participation
     → Applies penalty if within 24h of tee time
```

### 5.4 Invite Response Updates

```
PUT  /api/invites/:id/respond
     Body: { response: 'accepted' | 'declined' }
     → Now triggers Social Rate adjustments
     → +2 for accept
     → -1 for decline if > 24h after invite sent
```

---

## 6. FRONTEND IMPLEMENTATION

### 6.1 Social Rate Display Component

```typescript
// TTSGolfApp/components/SocialRateDisplay.tsx

interface SocialRateDisplayProps {
  score: number;
  showHistory?: boolean;
}

// Score color coding:
// 100+ : Green (excellent)
// 80-99: Blue (good)
// 60-79: Yellow (fair)
// 40-59: Orange (needs improvement)
// 0-39 : Red (poor)

const getScoreColor = (score: number) => {
  if (score >= 100) return '#10B981'; // Green
  if (score >= 80) return '#3B82F6';  // Blue
  if (score >= 60) return '#F59E0B';  // Yellow
  if (score >= 40) return '#F97316';  // Orange
  return '#EF4444';                    // Red
};
```

### 6.2 Score History Screen

```typescript
// TTSGolfApp/screens/SocialRateHistoryScreen.tsx

interface ScoreLogEntry {
  id: string;
  delta: number;
  newScore: number;
  reason: string;
  reasonDetails?: string;
  teeTime?: {
    id: string;
    courseName: string;
    date: string;
  };
  createdAt: string;
}

// Display format:
// +2  Accepted invite to Pebble Beach - Dec 20
// -5  Late cancellation - Pine Valley - Dec 18
// -10 No-show - Augusta National - Dec 15
```


### 6.3 Tee Time Filter UI

```typescript
// TTSGolfApp/components/TeeTimeFilter.tsx

type TeeTimeStatus = 'all' | 'pending' | 'confirmed' | 'completed';

interface TeeTimeFilterProps {
  activeFilter: TeeTimeStatus;
  onFilterChange: (status: TeeTimeStatus) => void;
}

// Filter chips: [All] [Pending] [Confirmed] [Completed]
// Mutually exclusive selection
// Applies to both list and calendar views
```

### 6.4 Calendar Invited Tee Times

```typescript
// TTSGolfApp/screens/FullCalendarScreen.tsx

// Invited tee times display:
// - Dashed border style
// - "Invited" badge overlay
// - Different background color (light yellow/amber)
// - Tap opens response modal with Accept/Decline buttons

interface CalendarTeeTime {
  id: string;
  courseName: string;
  teeTime: string;
  status: 'confirmed' | 'pending' | 'completed';
  isInvited: boolean;  // NEW: true if user has pending invite
  inviteId?: string;   // NEW: invite ID for responding
}
```

### 6.5 Check-In Screen

```typescript
// TTSGolfApp/screens/CheckInScreen.tsx

interface CheckInScreenProps {
  teeTimeId: string;
}

// UI Elements:
// 1. Header: "Is everyone here?"
// 2. "Yes, everyone's here" button (green, prominent)
//    → Calls POST /check-in/all
// 3. Participant list with individual toggles
//    → Each row: Avatar, Name, [Present ✓] [No-Show ✗]
// 4. "Complete Check-In" button
//    → Finalizes attendance, applies penalties

// States:
// - pending: Gray checkbox
// - present: Green checkmark
// - no_show: Red X with warning icon
```

### 6.6 Cancellation Confirmation Modal

```typescript
// TTSGolfApp/components/CancelParticipationModal.tsx

interface CancelModalProps {
  teeTime: TeeTime;
  onConfirm: () => void;
  onCancel: () => void;
}

// Display warning if within 24h:
// "⚠️ Cancelling within 24 hours of the tee time will result in a -5 Social Rate penalty."
// 
// Buttons: [Keep My Spot] [Cancel Anyway]
```

---

## 7. EDGE CASES & HANDLING

### 7.1 Late Responses

| Scenario | Handling |
|----------|----------|
| User accepts after tee time passed | Reject with error "This tee time has already started" |
| User declines after tee time passed | Allow, no penalty (already missed) |
| Invite expires before response | Auto-decline, no penalty |

### 7.2 Multiple Invites

| Scenario | Handling |
|----------|----------|
| User invited to same tee time twice | Prevent duplicate invites at creation |
| User accepts one, declines another for same time | Allow - user manages their schedule |
| User in multiple tee times same day | Allow - display warning in UI |

### 7.3 Organizer Self-Participation

| Scenario | Handling |
|----------|----------|
| Organizer is auto-added as participant | Yes, always first participant |
| Organizer cancels tee time | All participants removed, no penalties |
| Organizer cancels own participation | Not allowed - must cancel entire tee time |
| Organizer marks self as no-show | Not allowed - organizer always present |

### 7.4 Check-In Edge Cases

| Scenario | Handling |
|----------|----------|
| Organizer doesn't check in | Auto-complete 30 min after tee time, all marked present |
| Participant added after check-in started | Auto-mark as present |
| Check-in attempted before 5 min window | Reject with "Check-in not available yet" |
| Check-in attempted after tee time + 1 hour | Reject with "Check-in window closed" |


---

## 8. DATABASE MIGRATIONS

### 8.1 Migration: Add Social Rate System

```sql
-- Migration: 001_add_social_rate_system.sql

-- 1. Create social_rate_logs table
CREATE TABLE social_rate_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tee_time_id UUID REFERENCES tee_times(id) ON DELETE SET NULL,
    invite_id UUID REFERENCES invites(id) ON DELETE SET NULL,
    previous_score INT NOT NULL,
    delta INT NOT NULL,
    new_score INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    reason_details TEXT,
    triggered_by UUID REFERENCES users(id),
    is_system_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_reason CHECK (reason IN (
        'invite_accepted', 'invite_declined_late', 'cancellation_late',
        'no_show', 'initial_score', 'admin_adjustment'
    ))
);

CREATE INDEX idx_social_rate_logs_user ON social_rate_logs(user_id);
CREATE INDEX idx_social_rate_logs_tee_time ON social_rate_logs(tee_time_id);
CREATE INDEX idx_social_rate_logs_invite ON social_rate_logs(invite_id);
CREATE INDEX idx_social_rate_logs_created ON social_rate_logs(created_at DESC);

-- 2. Update user_profiles social_rate column
ALTER TABLE user_profiles 
    ALTER COLUMN social_rate TYPE INT USING COALESCE((social_rate * 20)::INT, 100);
ALTER TABLE user_profiles 
    ALTER COLUMN social_rate SET DEFAULT 100;

-- 3. Initialize existing users with 100 points
UPDATE user_profiles SET social_rate = 100 WHERE social_rate IS NULL;

-- 4. Add constraint
ALTER TABLE user_profiles 
    ADD CONSTRAINT social_rate_non_negative CHECK (social_rate >= 0);
```

### 8.2 Migration: Add Attendance System

```sql
-- Migration: 002_add_attendance_system.sql

-- 1. Create tee_time_attendance table
CREATE TABLE tee_time_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tee_time_id UUID NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES tee_time_participants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES users(id),
    marked_no_show_at TIMESTAMPTZ,
    marked_no_show_by UUID REFERENCES users(id),
    no_show_notified BOOLEAN DEFAULT false,
    penalty_applied BOOLEAN DEFAULT false,
    penalty_log_id UUID REFERENCES social_rate_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_attendance_status CHECK (status IN ('pending', 'present', 'no_show', 'cancelled')),
    CONSTRAINT unique_attendance UNIQUE (tee_time_id, participant_id)
);

CREATE INDEX idx_attendance_tee_time ON tee_time_attendance(tee_time_id);
CREATE INDEX idx_attendance_user ON tee_time_attendance(user_id);
CREATE INDEX idx_attendance_status ON tee_time_attendance(status);

-- 2. Add check-in columns to tee_times
ALTER TABLE tee_times ADD COLUMN check_in_started_at TIMESTAMPTZ;
ALTER TABLE tee_times ADD COLUMN check_in_completed_at TIMESTAMPTZ;
ALTER TABLE tee_times ADD COLUMN check_in_completed_by UUID REFERENCES users(id);

-- 3. Update tee_times status constraint
ALTER TABLE tee_times DROP CONSTRAINT IF EXISTS valid_tee_time_status;
ALTER TABLE tee_times ADD CONSTRAINT valid_tee_time_status 
    CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- 4. Add cancellation tracking to participants
ALTER TABLE tee_time_participants ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE tee_time_participants ADD COLUMN cancel_reason TEXT;
ALTER TABLE tee_time_participants ADD COLUMN penalty_applied BOOLEAN DEFAULT false;

-- 5. Create trigger for updated_at
CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON tee_time_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


---

## 9. CRON JOBS / SCHEDULED TASKS

### 9.1 Check-In Notification Trigger

```javascript
// Run every minute
// Finds tee times starting in 5 minutes and sends organizer notification

schedule('* * * * *', async () => {
  await checkInNotificationService.processUpcomingTeeTimes();
});
```

### 9.2 Auto-Complete Check-In

```javascript
// Run every 5 minutes
// Auto-completes check-in for tee times 30+ minutes past start

schedule('*/5 * * * *', async () => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  
  const teeTimes = await teeTimeRepository.getInProgressTeeTimes(cutoff);
  
  for (const teeTime of teeTimes) {
    // Mark all pending attendance as present (benefit of doubt)
    await attendanceService.autoCompleteCheckIn(teeTime.id);
    await teeTimeRepository.updateStatus(teeTime.id, 'completed');
  }
});
```

### 9.3 Expire Pending Invites

```javascript
// Run every 5 minutes
// Expires invites past their expiration time

schedule('*/5 * * * *', async () => {
  await inviteRepository.expirePendingInvites();
});
```

---

## 10. NOTIFICATION TEMPLATES

### 10.1 Check-In Reminder (Push)

```json
{
  "title": "Time to check in! ⛳",
  "body": "Your tee time at {courseName} starts in 5 minutes. Is everyone here?",
  "data": {
    "type": "CHECK_IN_REMINDER",
    "teeTimeId": "{teeTimeId}",
    "action": "OPEN_CHECK_IN"
  }
}
```

### 10.2 No-Show Notification (Push)

```json
{
  "title": "Attendance Update",
  "body": "You were marked as a no-show for {courseName} on {date}. Your Social Rate has been updated.",
  "data": {
    "type": "NO_SHOW_NOTIFICATION",
    "teeTimeId": "{teeTimeId}",
    "action": "VIEW_SOCIAL_RATE"
  }
}
```

### 10.3 Cancellation Penalty Warning (In-App)

```json
{
  "title": "Cancellation Warning",
  "body": "Cancelling within 24 hours of your tee time will result in a -5 Social Rate penalty. Are you sure?",
  "actions": ["Keep My Spot", "Cancel Anyway"]
}
```

---

## 11. TESTING CHECKLIST

### 11.1 Social Rate Tests

- [ ] New user starts with 100 points
- [ ] Accept invite adds +2 points
- [ ] Decline within 24h of invite: no penalty
- [ ] Decline after 24h of invite: -1 point
- [ ] Cancel > 24h before tee time: no penalty
- [ ] Cancel within 24h of tee time: -5 points
- [ ] No-show: -10 points
- [ ] Score cannot go below 0
- [ ] Score can exceed 100
- [ ] Duplicate penalties prevented (idempotency)
- [ ] History is immutable

### 11.2 Attendance Tests

- [ ] Attendance records created when tee time confirmed
- [ ] One-tap check-in marks all present
- [ ] Individual no-show marking works
- [ ] No-show triggers penalty
- [ ] Cancelled participants cannot be marked no-show
- [ ] Organizer cannot be marked no-show
- [ ] Check-in notification sent 5 min before
- [ ] Auto-complete after 30 min

### 11.3 Filter Tests

- [ ] Pending filter shows only pending tee times
- [ ] Confirmed filter shows only confirmed
- [ ] Completed filter shows only completed
- [ ] Filters are mutually exclusive
- [ ] Filters work on calendar view
- [ ] Invited tee times show in calendar with badge

---

## 12. ACCEPTANCE CRITERIA SUMMARY

| Feature | Criteria | Status |
|---------|----------|--------|
| Social Rate Display | User sees current score | ⬜ |
| Score History | Chronological, immutable log | ⬜ |
| Auto Score Updates | Triggered by actions, not manual | ⬜ |
| Tee Time Filtering | Pending/Confirmed/Completed | ⬜ |
| Filter Exclusivity | Only one filter active | ⬜ |
| Calendar Invites | Visually distinct, respondable | ⬜ |
| Cancel Participation | Available for confirmed only | ⬜ |
| Cancel Confirmation | Warning before finalizing | ⬜ |
| Check-In Notification | 5 min before, organizer only | ⬜ |
| One-Tap Check-In | Marks all present | ⬜ |
| No-Show Marking | Individual, with penalty | ⬜ |
| No-Show Notification | User notified when marked | ⬜ |

---

*Document Version: 1.0*
*Last Updated: December 2024*
