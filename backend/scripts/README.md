# Backend Scripts

## 📁 Folder Structure

### Root Scripts (Recurring/Production)
Essential scripts that run regularly or are needed for production operations.

- **`setup-database.js`** - Initial database setup
- **`run-full-schema.js`** - Execute complete schema
- **`migrate-database.js`** - Run database migrations
- **`process-check-in-reminders.js`** - Process check-in reminders (scheduled)
- **`process-expired-invites.js`** - Process expired invites (scheduled)
- **`check-tee-times.js`** - Check tee time status
- **`get-user-info.js`** - Get user information utility

### `/tests` - Test Scripts
Scripts for testing various features and endpoints.

- `test-oauth-endpoints.js` - Test OAuth API endpoints
- `test-oauth-setup.js` - Verify OAuth configuration
- `test-otp-flow.js` - Test OTP authentication flow
- `test-twilio.js` - Test Twilio configuration
- `test-twilio-sms.js` - Test Twilio SMS sending
- `test-twilio-verify.js` - Test Twilio Verify service
- `test-fcfs-tiebreaker.js` - Test FCFS tiebreaker logic
- `test-roster-exhausted.js` - Test roster exhausted notifications
- `test-time-comparison.js` - Test time comparison utilities

### `/utilities` - One-time/Utility Scripts
Scripts for one-time operations, migrations, or manual tasks.

- `execute-oauth-migration.js` - Run OAuth migration
- `run-oauth-migration.js` - OAuth migration runner
- `migrate-repository-template.js` - Repository migration template
- `send-test-checkin-reminder.js` - Send test check-in reminder
- `trigger-check-in-reminder.js` - Manually trigger check-in reminder
- `trigger-roster-exhausted.js` - Manually trigger roster exhausted notification
- `update-tee-time.js` - Update tee time utility

## 🚀 Usage

### Production Scripts
```bash
# Setup database
node backend/scripts/setup-database.js

# Run migrations
node backend/scripts/migrate-database.js

# Process scheduled tasks (these run automatically via scheduler)
node backend/scripts/process-check-in-reminders.js
node backend/scripts/process-expired-invites.js
```

### Testing
```bash
# Test OAuth
node backend/scripts/tests/test-oauth-endpoints.js

# Test OTP
node backend/scripts/tests/test-otp-flow.js

# Test Twilio
node backend/scripts/tests/test-twilio.js
```

### Utilities
```bash
# Get user info
node backend/scripts/get-user-info.js <user-id>

# Check tee times
node backend/scripts/check-tee-times.js
```

## 📝 Notes

- **Recurring scripts** are in the root and may be called by the scheduler
- **Test scripts** are for development/testing only
- **Utility scripts** are for one-time operations or manual tasks
- All scripts use environment variables from `.env`
