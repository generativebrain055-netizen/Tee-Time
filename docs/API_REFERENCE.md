# TeeTime API Reference

Base URL: `https://api.yourdomain.com`

All endpoints require authentication unless marked as public.

---

## Authentication

### Headers

```
Authorization: Bearer <access_token>
```

### OAuth Sign In

**Google Sign In**

```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "google-id-token-from-client"
}
```

**Apple Sign In**

```http
POST /auth/apple
Content-Type: application/json

{
  "identityToken": "apple-identity-token",
  "user": {
    "name": { "firstName": "John", "lastName": "Doe" }
  }
}
```

**Response (both)**

```json
{
  "status": "authenticated",
  "success": true,
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "isNewUser": false,
  "needsOnboarding": true,
  "missingFields": ["location", "homeCourse"]
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}
```

### Complete Profile (OAuth Onboarding)

```http
POST /auth/complete-profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "location": "Phoenix, AZ",
  "homeCourse": "TPC Scottsdale"
}
```

---

## Tee Times

### Create Tee Time

```http
POST /api/tee-times
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "courseName": "TPC Scottsdale",
  "courseLocation": "Scottsdale, AZ",
  "teeDate": "2025-02-15",
  "teeTime": "08:30",
  "maxPlayers": 4,
  "inviteType": "roster",
  "notes": "Morning round"
}
```

### Get Upcoming Tee Times

```http
GET /api/tee-times/upcoming?limit=10
Authorization: Bearer <access_token>
```

### Get Tee Time Details

```http
GET /api/tee-times/:id
Authorization: Bearer <access_token>
```

### Cancel Tee Time

```http
DELETE /api/tee-times/:id
Authorization: Bearer <access_token>
```

---

## Invites

### Create Invites

```http
POST /api/invites
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "teeTimeId": "uuid",
  "invitees": [
    { "userId": "uuid" },
    { "phone": "+15551234567", "name": "John Doe" }
  ]
}
```

### Get Pending Invites

```http
GET /api/invites/pending
Authorization: Bearer <access_token>
```

### Respond to Invite

```http
PUT /api/invites/:id/respond
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "response": "accepted" | "declined"
}
```

---

## Roster

### Get Roster

```http
GET /api/roster?limit=50&offset=0
Authorization: Bearer <access_token>
```

### Add to Roster

```http
POST /api/roster
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "contactUserId": "uuid"
}
```

or

```json
{
  "contactPhone": "+15551234567",
  "contactName": "John Doe"
}
```

### Remove from Roster

```http
DELETE /api/roster/:id
Authorization: Bearer <access_token>
```

### Reorder Roster

```http
PUT /api/roster/reorder
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "orderedIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Friends

### Get Friends

```http
GET /api/friends?limit=50&offset=0
Authorization: Bearer <access_token>
```

### Send Friend Request

```http
POST /api/friends/request
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userId": "uuid"
}
```

### Respond to Friend Request

```http
PUT /api/friends/requests/:id/respond
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "accept": true | false
}
```

---

## Notifications

### Get Notifications

```http
GET /api/notifications?limit=50&offset=0&unreadOnly=false
Authorization: Bearer <access_token>
```

### Mark as Read

```http
PUT /api/notifications/:id/read
Authorization: Bearer <access_token>
```

### Mark All as Read

```http
PUT /api/notifications/read-all
Authorization: Bearer <access_token>
```

### Delete Notification

```http
DELETE /api/notifications/:id
Authorization: Bearer <access_token>
```

---

## Courses

### Search Courses (Public)

```http
GET /api/courses/search?q=scottsdale&limit=20
```

### Search Clubs (Public)

```http
GET /api/courses/clubs/search?q=TPC&limit=20
```

### Search Cities (Public)

```http
GET /api/courses/cities/search?q=phoenix
```

---

## Health Check (Public)

```http
GET /health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-29T12:00:00.000Z",
  "uptime": 86400
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not authorized for this action)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Rate Limits

- Authentication endpoints: 5 requests/minute
- General API: 100 requests/minute
- Search endpoints: 30 requests/minute
