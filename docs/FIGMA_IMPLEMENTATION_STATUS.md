# Figma “Ready for dev” – Implementation status

All items below are from the Tee Time Social Figma file (labels **“ready for dev”**). Status: **Implemented** (frontend + backend in place), **Partial** (some parts done), or **Not implemented**.

---

## Implemented (frontend + backend)

| Figma item | Frontend | Backend | Notes |
|------------|----------|---------|--------|
| **Login Flow** | ✅ LoginScreen, OTP, magic link | ✅ `/auth/*` | |
| **Sign Up Flow** | ✅ OnboardingScreen, steps | ✅ `/auth/register`, profile | |
| **SSO Sign up** | ✅ OAuthButtons, OAuthOnboarding*, OAuthPhoneEntry, etc. | ✅ `/auth/google`, magic link verify | |
| **New home screen** | ✅ Home (greeting, Quick actions, week calendar, Next tee time, View schedule) | ✅ Tee times, roster, notifications | |
| **Full schedule view - month** | ✅ FullCalendarScreen (month, filters, tee times list, pull-to-refresh) | ✅ `GET /api/tee-times/calendar` (with participants) | |
| **Global Search** | ✅ GlobalSearchScreen, search bar, People/Tee Times/Groups/Courses | ✅ `GET /api/search?q=` | |
| **Notifications** | ✅ NotificationsScreen (Activity/Invites, mark read, badges) | ✅ Notifications, unfilled slot payload | |
| **Unfilled Slot Alert** | ✅ Inline card + “Invite from On-Deck” → SelectOnDeck | ✅ `organizer_fill_warning`, tee_date/tee_time in notifications | |
| **Roster, On-Deck, Groups** | ✅ RosterScreen, on-deck, groups list, GroupProfile, CreateGroup | ✅ `/api/roster`, groups, on-deck | |
| **Removing from Roster, Adding to Roster, On-Deck Search** | ✅ Roster flows, SelectOnDeck, search | ✅ Roster APIs, invite from roster | |
| **Roster Invite** | ✅ CreateTeeTime → roster order, response window | ✅ Invites from roster, response window | |
| **FCFS invite** | ✅ CreateTeeTime → FCFSInviteStep, ReviewFCFSInviteStep | ✅ FCFS invites, deadline | |
| **Manual Invite** | ✅ CreateTeeTime → ManualInviteStep, ReviewManualInviteStep | ✅ Manual invite API | |
| **Tee Time Invite Details** | ✅ CreateTeeTime (date, time, location, course, group size, invite type) | ✅ Create tee time, invites | |
| **Tee Time Status Screen** | ✅ TeeTimeDetailScreen (details, participants, status) | ✅ `GET /api/tee-times/:id`, attendance | |
| **Pre tee time check in** | ✅ CheckInScreen (check-in all, who bailed) | ✅ `/api/tee-times/:id/check-in/*` | |
| **Availability Tab + Tee time entry point** | ✅ AvailabilityScreen, EditAvailability, CreateTeeTime from Home | ✅ `/api/availability` | |
| **Profiles** | ✅ Profile, EditProfile, FriendProfile, UserProfile, QRCode, ScanQR | ✅ Profile, friends, roster | |
| **Account + Profile Settings, Support & FAQ's** | ✅ SettingsScreen, NotificationSettings, HelpSupportScreen | ✅ Settings/preferences where needed | |
| **Messages** | ✅ MessagesScreen (conversations), ChatDetailScreen | ✅ `/api/messages/conversations`, messages | |
| **Filter & Sort** | ✅ Roster sort (DraggableRosterScreen – Manual, Social Rate, Handicap, etc.) | ✅ Roster reorder, search | |
| **Creating a group** | ✅ CreateGroupScreen | ✅ Roster groups API | |
| **App Icon/Display Name** | ✅ app.json (name, icon, splash) | N/A | |

---

## Partial / not fully implemented

| Figma item | What’s done | What’s missing |
|------------|-------------|----------------|
| **Creating a group from TT/ad hoc group chat** | ChatActionsMenu has “Create group”; some group chat entry points | Full flow: create group from a tee time chat or ad hoc conversation; group-profile “Group Chat” still “Coming Soon” in some paths |
| **Composing a new message** | Messages list + ChatDetail; `handleCompose` exists | Compose flow (e.g. pick recipient, new thread) is TODO in code; no dedicated “New message” / recipient picker screen |
| **Groups: Inviting people, removing yourself** | Group profile, members; CreateGroup | Invite-to-group and “leave group” flows may not match Figma end-to-end |

---

## Not implemented (Figma only)

None of the “ready for dev” items are completely missing from the app. The gaps are partial (see above).

---

## Summary

- **Implemented:** All major Figma “ready for dev” flows have corresponding frontend screens and backend APIs (login, sign up, SSO, home, schedule, global search, notifications, unfilled slot, roster/on-deck/groups, roster/FCFS/manual invite, tee time details/status, check-in, availability, profiles, settings, messages list/chat, filter & sort, creating a group, app icon/name).
- **Partial:** (1) **Creating a group from TT/ad hoc group chat** – create-from-chat flow and full group chat not done. (2) **Composing a new message** – new conversation / recipient picker not built. (3) **Groups: Inviting people, removing yourself** – may need UX/flow alignment with Figma.

---

## Backend routes (reference)

- Auth: `/auth/*`
- Availability: `/api/availability`
- Roster: `/api/roster`, on-deck, groups
- Search: `/api/search`
- Tee times: `/api/tee-times`, calendar, history, cancel
- Attendance: `/api/tee-times/:id/check-in/*`, cancel-participation
- Invites: `/api/invites`
- Friends: `/api/friends`
- Courses: `/api/courses`
- Notifications: `/api/notifications`
- Messages: `/api/messages`
- Draft (QR): `/api/draft`
- Social rate: `/api/social-rate`
