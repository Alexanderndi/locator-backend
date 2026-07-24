# Festive Vendor Locator API Reference

Complete reference for all HTTP endpoints in **locator-backend** (NestJS).

| Item | Detail |
|------|--------|
| **Base URL** | `/v1` |
| **Local dev** | `http://localhost:3000/v1` |
| **Auth** | `Authorization: Bearer <accessToken>` (JWT) |
| **Errors** | RFC 7807-style: `{ type, title, status, detail, instance }` |
| **Pagination** | `{ data: T[], meta: { total, page, pageSize, totalPages } }` |
| **Static files** | `GET /media/*` (uploaded images, not under `/v1`) |

### User object

Used across auth and user endpoints:

```json
{
  "id": "uuid",
  "email": "visitor@example.com",
  "phone": "+2348012345678",
  "displayName": "Jane Doe",
  "avatarUrl": null,
  "role": "visitor",
  "vendorId": null,
  "createdAt": "2026-07-23T10:00:00.000Z"
}
```

**Roles:** `visitor`, `vendor`, `organizer`, `admin`

---

## 1. Health

### `GET /v1/health`

**Auth:** None

**Response (200):**

```json
{
  "status": "ok",
  "service": "festive-vendor-locator-api",
  "version": "1.0.0"
}
```

---

## 2. Auth — `/v1/auth/*`

### `POST /v1/auth/register`

**Payload:**

```json
{
  "email": "visitor@example.com",
  "password": "TestPass1",
  "displayName": "Jane Doe",
  "phone": "+2348012345678"
}
```

> Password: min 8 chars, at least 1 uppercase letter and 1 digit.

**Response (201):**

```json
{
  "user": { "id": "...", "email": "...", "role": "visitor" },
  "accessToken": "eyJ...",
  "refreshToken": "abc123...",
  "message": "Account created successfully"
}
```

---

### `POST /v1/auth/register/vendor`

**Payload:**

```json
{
  "email": "vendor@example.com",
  "password": "TestPass1",
  "displayName": "Booth Owner",
  "eventId": "uuid",
  "businessName": "Mama's Kitchen",
  "categoryId": "uuid",
  "description": "Local food vendor",
  "phone": "+2348012345678",
  "boothNumber": "A12",
  "zone": "Food Court",
  "latitude": 4.9515,
  "longitude": 8.3228
}
```

**Response (201):**

```json
{
  "user": { "id": "...", "role": "vendor", "vendorId": "..." },
  "vendor": { "id": "uuid", "name": "Mama's Kitchen", "eventId": "uuid" },
  "accessToken": "eyJ...",
  "refreshToken": "abc123...",
  "message": "Vendor account created"
}
```

---

### `POST /v1/auth/login`

**Payload:**

```json
{
  "email": "visitor@example.com",
  "password": "TestPass1"
}
```

**Response (200):**

```json
{
  "user": { "id": "...", "email": "...", "role": "visitor" },
  "accessToken": "eyJ...",
  "refreshToken": "abc123..."
}
```

---

### `POST /v1/auth/refresh`

**Payload:**

```json
{
  "refreshToken": "abc123..."
}
```

**Response (200):** Same shape as login.

---

### `POST /v1/auth/logout`

**Payload:**

```json
{
  "refreshToken": "abc123..."
}
```

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

### `POST /v1/auth/otp/request`

**Payload:**

```json
{
  "phone": "+2348012345678"
}
```

**Response (201):**

```json
{
  "message": "OTP sent",
  "expiresIn": 300,
  "resendIn": 60,
  "phone": "+2348012345678"
}
```

---

### `POST /v1/auth/otp/verify`

**Payload:**

```json
{
  "phone": "+2348012345678",
  "code": "123456",
  "displayName": "Jane Doe"
}
```

> `code` must be exactly 6 digits. `displayName` is optional.

**Response (201):**

```json
{
  "user": { "id": "...", "phone": "...", "role": "visitor" },
  "accessToken": "eyJ...",
  "refreshToken": "abc123...",
  "isNewUser": true,
  "message": "Phone verified"
}
```

---

## 3. Users — `/v1/users/*`

**Auth:** JWT required on all routes.

### `GET /v1/users/me`

**Response (200):** User object.

---

### `PATCH /v1/users/me`

**Payload:**

```json
{
  "displayName": "New Name",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Response (200):** Updated user object.

---

### `GET /v1/users/me/preferences`

**Response (200):**

```json
{
  "pushEnabled": true,
  "emailEnabled": true,
  "favoriteCategories": ["Food", "Crafts"],
  "readNotificationIds": ["notif-uuid-1"]
}
```

---

### `PATCH /v1/users/me/preferences`

**Payload:**

```json
{
  "pushEnabled": false,
  "emailEnabled": true,
  "favoriteCategories": ["Food"]
}
```

**Response (200):** Same shape as GET preferences.

---

### `DELETE /v1/users/me`

**Payload:**

```json
{
  "password": "TestPass1"
}
```

**Response (200):**

```json
{
  "message": "Account deleted successfully"
}
```

---

## 4. Favorites — `/v1/users/me/favorites/*`

**Auth:** JWT required.

### `GET /v1/users/me/favorites`

**Query params:**

| Param | Type | Required |
|-------|------|----------|
| `eventId` | UUID | No |

**Response (200):**

```json
{
  "data": [
    {
      "id": "vendor-uuid",
      "name": "Mama's Kitchen",
      "boothNumber": "A12",
      "zone": "Food Court",
      "latitude": 4.9515,
      "longitude": 8.3228,
      "category": "Food",
      "logoUrl": "/media/...",
      "avgRating": 4.5,
      "reviewCount": 12,
      "hasPromotion": true,
      "eventId": "event-uuid",
      "favoriteId": "favorite-uuid",
      "createdAt": "2026-07-23T10:00:00.000Z"
    }
  ]
}
```

---

### `POST /v1/users/me/favorites`

**Payload:**

```json
{
  "vendorId": "uuid",
  "eventId": "uuid"
}
```

**Response (201):**

```json
{
  "id": "favorite-uuid",
  "vendorId": "uuid",
  "eventId": "uuid",
  "createdAt": "2026-07-23T10:00:00.000Z",
  "alreadyExists": false
}
```

---

### `DELETE /v1/users/me/favorites/:vendorId`

**Response (200):**

```json
{
  "message": "Favorite removed"
}
```

---

## 5. Contact Consent (Visitor)

### `GET /v1/users/me/contact-consent-requests`

**Auth:** JWT

**Response (200):**

```json
{
  "data": [
    {
      "id": "consent-uuid",
      "status": "pending",
      "requestedAt": "2026-07-23T10:00:00.000Z",
      "expiresAt": "2026-08-22T10:00:00.000Z",
      "vendor": {
        "id": "uuid",
        "name": "Mama's Kitchen",
        "boothNumber": "A12"
      }
    }
  ]
}
```

---

### `POST /v1/users/me/contact-consent-requests/:requestId/respond`

**Auth:** JWT

**Payload:**

```json
{
  "action": "accept"
}
```

> `action`: `"accept"` | `"decline"`

**Response (200):** Consent request object + message.

---

## 6. Events — `/v1/events/*`

**Auth:** None (public).

### `GET /v1/events`

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `draft`, `published`, `active`, or `ended` |
| `near` | string | `lat,lng` — adds `distanceMeters` to each event |

**Response (200):**

```json
{
  "data": [
    {
      "id": "event-uuid",
      "name": "Akwa Ibom Xmas Village 2026",
      "description": "...",
      "startDate": "2026-12-01",
      "endDate": "2026-12-31",
      "timezone": "Africa/Lagos",
      "status": "active",
      "coverImageUrl": "/media/...",
      "venue": {
        "id": "venue-uuid",
        "name": "Ibom Plaza",
        "address": "...",
        "latitude": 4.9515,
        "longitude": 8.3228,
        "boundaryNorth": 4.955,
        "boundarySouth": 4.948,
        "boundaryEast": 8.328,
        "boundaryWest": 8.318
      }
    }
  ]
}
```

---

### `GET /v1/events/:eventId`

**Response (200):** Event object plus organization:

```json
{
  "id": "event-uuid",
  "name": "Akwa Ibom Xmas Village 2026",
  "description": "...",
  "startDate": "2026-12-01",
  "endDate": "2026-12-31",
  "timezone": "Africa/Lagos",
  "status": "active",
  "coverImageUrl": "/media/...",
  "venue": { "..." : "..." },
  "organization": {
    "id": "org-uuid",
    "name": "FVL Events"
  }
}
```

---

### `GET /v1/events/:eventId/schedule`

**Response (200):**

```json
{
  "eventId": "event-uuid",
  "timezone": "Africa/Lagos",
  "schedule": [
    {
      "day": "2026-12-01",
      "items": [
        {
          "id": "item-uuid",
          "title": "Opening Ceremony",
          "description": "...",
          "startTime": "2026-12-01T09:00:00.000Z",
          "endTime": "2026-12-01T10:00:00.000Z",
          "location": "Main Stage"
        }
      ]
    }
  ]
}
```

---

### `GET /v1/events/:eventId/categories`

**Response (200):**

```json
{
  "data": [
    {
      "id": "cat-uuid",
      "name": "Food",
      "icon": "🍲",
      "vendorCount": 15
    }
  ]
}
```

---

### `GET /v1/events/:eventId/map`

**Response (200):**

```json
{
  "eventId": "event-uuid",
  "bounds": {
    "north": 4.955,
    "south": 4.948,
    "east": 8.328,
    "west": 8.318
  },
  "center": { "lat": 4.9515, "lng": 8.3228 },
  "floorPlanUrl": "/media/floorplan.png",
  "tileUrlTemplate": null,
  "hasInteractiveMap": true,
  "venue": {
    "id": "venue-uuid",
    "name": "Ibom Plaza",
    "address": "..."
  },
  "entryPoints": [
    { "lat": 4.949, "lng": 8.320, "label": "North Entrance" }
  ]
}
```

---

## 7. Maps & Navigation

### `POST /v1/events/:eventId/routes`

**Payload:**

```json
{
  "lat": 4.9510,
  "lng": 8.3220,
  "toVendorId": "vendor-uuid"
}
```

**Response (200):**

```json
{
  "from": { "lat": 4.949, "lng": 8.320 },
  "originalFrom": { "lat": 4.9510, "lng": 8.3220 },
  "to": {
    "vendorId": "vendor-uuid",
    "name": "Mama's Kitchen",
    "lat": 4.952,
    "lng": 8.324,
    "boothNumber": "A12"
  },
  "distance": 350,
  "duration": 280,
  "polyline": [
    { "lat": 4.949, "lng": 8.320 },
    { "lat": 4.952, "lng": 8.324 }
  ],
  "steps": [
    {
      "instruction": "Walk to the nearest venue entrance",
      "distance": 50,
      "duration": 40
    }
  ],
  "routeType": "straight_line",
  "disclaimer": "Walking route is approximate. Follow venue walkways and signage.",
  "snappedFromEntry": true,
  "entryNote": "Walk to the nearest venue entrance",
  "reachable": true
}
```

---

### `GET /v1/events/:eventId/qr/:vendorId`

**Query params:**

| Param | Type | Required |
|-------|------|----------|
| `sig` | string | Yes — HMAC signature |

**Response (200):**

```json
{
  "valid": true,
  "vendor": {
    "id": "vendor-uuid",
    "name": "Mama's Kitchen",
    "boothNumber": "A12",
    "category": "Food"
  },
  "qrCodePayload": "fvl://event/uuid/vendor/uuid?sig=..."
}
```

---

## 8. Vendors

### `GET /v1/events/:eventId/vendors`

**Query params:** `page` (default 1), `pageSize` (default 20, max 100)

**Response (200):**

```json
{
  "data": [
    {
      "id": "vendor-uuid",
      "name": "Mama's Kitchen",
      "category": "Food",
      "boothNumber": "A12",
      "zone": "Food Court",
      "latitude": 4.9515,
      "longitude": 8.3228,
      "hasPromotion": true,
      "logoUrl": "/media/...",
      "avgRating": 4.5,
      "reviewCount": 12
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

---

### `GET /v1/events/:eventId/vendors/search`

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query |
| `category` | UUID | Filter by category |
| `offers` | boolean | Filter vendors with promotions |
| `page` | number | Page number |
| `pageSize` | number | Items per page |

**Response (200):** Same paginated vendor summary shape as list.

---

### `GET /v1/events/:eventId/vendors/nearby`

**Query params:**

| Param | Type | Required | Default |
|-------|------|----------|---------|
| `lat` | number | Yes | — |
| `lng` | number | Yes | — |
| `radius` | number | No | 500 (meters) |

**Response (200):**

```json
{
  "data": [
    {
      "id": "vendor-uuid",
      "name": "Mama's Kitchen",
      "category": "Food",
      "boothNumber": "A12",
      "zone": "Food Court",
      "latitude": 4.9515,
      "longitude": 8.3228,
      "hasPromotion": true,
      "logoUrl": "/media/...",
      "avgRating": 4.5,
      "reviewCount": 12,
      "distance": 45,
      "isOpen": true
    }
  ],
  "meta": {
    "total": 5,
    "radius": 500
  }
}
```

---

### `GET /v1/events/:eventId/vendors/recommended`

**Auth:** Optional JWT (personalized if logged in)

**Response (200):**

```json
{
  "data": [
    {
      "id": "vendor-uuid",
      "name": "Mama's Kitchen",
      "category": "Food",
      "boothNumber": "A12",
      "zone": "Food Court",
      "latitude": 4.9515,
      "longitude": 8.3228,
      "hasPromotion": true,
      "logoUrl": "/media/...",
      "avgRating": 4.5,
      "reviewCount": 12
    }
  ],
  "personalized": true
}
```

---

### `GET /v1/vendors/:vendorId`

**Response (200):**

```json
{
  "id": "vendor-uuid",
  "eventId": "event-uuid",
  "name": "Mama's Kitchen",
  "slug": "mamas-kitchen",
  "description": "Best jollof in town",
  "boothNumber": "A12",
  "zone": "Food Court",
  "phone": "+2348012345678",
  "email": "vendor@example.com",
  "website": null,
  "logoUrl": "/media/...",
  "latitude": 4.9515,
  "longitude": 8.3228,
  "avgRating": 4.5,
  "reviewCount": 12,
  "category": { "id": "cat-uuid", "name": "Food" },
  "hasPromotion": true,
  "promotions": [
    {
      "id": "promo-uuid",
      "title": "10% Off",
      "description": "...",
      "discountPercent": 10,
      "startDate": "2026-12-01",
      "endDate": "2026-12-31"
    }
  ],
  "qrCodePayload": "fvl://...",
  "images": [{ "url": "/media/...", "mimeType": "image/jpeg" }],
  "openingHours": [{ "day": "Monday", "open": "09:00", "close": "18:00" }]
}
```

---

### `GET /v1/vendors/:vendorId/products`

**Query params:** `page`, `pageSize`

**Response (200):**

```json
{
  "data": [
    {
      "id": "product-uuid",
      "name": "Jollof Rice",
      "description": null,
      "price": 1500,
      "maxPrice": null,
      "currency": "NGN",
      "imageUrl": "/media/...",
      "mimeType": "image/jpeg",
      "isAvailable": true,
      "priceLabel": "₦1,500"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

### `GET /v1/vendors/:vendorId/promotions`

**Response (200):**

```json
{
  "data": [
    {
      "id": "promo-uuid",
      "title": "10% Off",
      "description": "...",
      "discountPercent": 10,
      "startDate": "2026-12-01",
      "endDate": "2026-12-31"
    }
  ]
}
```

---

### `GET /v1/vendors/:vendorId/reviews`

**Auth:** Optional JWT (includes `userReview` if logged in)

**Query params:** `page`, `pageSize`

**Response (200):**

```json
{
  "data": [
    {
      "id": "review-uuid",
      "rating": 5,
      "comment": "Amazing food!",
      "createdAt": "2026-07-23T10:00:00.000Z",
      "user": { "displayName": "Jane D.", "isOwn": false }
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "userReview": null
}
```

---

### `POST /v1/vendors/:vendorId/reviews`

**Auth:** JWT

**Payload:**

```json
{
  "rating": 5,
  "comment": "Amazing food!"
}
```

> `rating`: 1–5. `comment` is optional.

**Response (201):**

```json
{
  "id": "review-uuid",
  "rating": 5,
  "comment": "Amazing food!",
  "status": "approved",
  "createdAt": "2026-07-23T10:00:00.000Z",
  "aggregate": { "avgRating": 4.6, "reviewCount": 13 },
  "moderationMessage": null
}
```

---

### `PATCH /v1/vendors/:vendorId/reviews`

**Auth:** JWT

**Payload:**

```json
{
  "rating": 4,
  "comment": "Updated review"
}
```

**Response (200):** Updated review + aggregate.

---

### `GET /v1/vendors/me/products`

**Auth:** JWT + `vendor` role

**Query params:** `page`, `pageSize` (default 50)

**Response (200):** Paginated products (same shape as public products).

---

### `POST /v1/vendors/me/products`

**Auth:** JWT + `vendor` role

**Content-Type:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `image` | file (max 8 MB) | Yes |
| `name` | string | No |

**Response (201):** Product object.

---

### `DELETE /v1/vendors/me/products/:productId`

**Auth:** JWT + `vendor` role

**Response (200):**

```json
{
  "message": "Catalogue item deleted"
}
```

---

## 9. Notifications

### `POST /v1/users/me/device-tokens`

**Auth:** JWT

**Payload:**

```json
{
  "token": "fcm-device-token",
  "platform": "ios"
}
```

**Response (201):**

```json
{
  "id": "token-uuid",
  "message": "Device token registered"
}
```

---

### `DELETE /v1/users/me/device-tokens`

**Auth:** JWT

**Payload:**

```json
{
  "token": "fcm-device-token"
}
```

> Omit `token` to revoke all device tokens.

**Response (200):**

```json
{
  "message": "Device token revoked"
}
```

---

### `GET /v1/events/:eventId/announcements`

**Response (200):**

```json
{
  "data": [
    {
      "id": "announcement-uuid",
      "title": "Fireworks Tonight!",
      "body": "Join us at 8 PM",
      "priority": "high",
      "publishedAt": "2026-07-23T10:00:00.000Z"
    }
  ]
}
```

---

### `GET /v1/events/:eventId/announcements/:announcementId`

**Response (200):** Single announcement object + `eventId`.

---

### `GET /v1/users/me/notifications`

**Auth:** JWT

**Query params:** `eventId` (UUID, optional)

**Response (200):**

```json
{
  "data": [
    {
      "id": "notif-uuid",
      "type": "announcement",
      "title": "Fireworks Tonight!",
      "body": "Join us at 8 PM",
      "eventId": "event-uuid",
      "read": false,
      "createdAt": "2026-07-23T10:00:00.000Z",
      "data": { "announcementId": "..." }
    }
  ]
}
```

---

### `PATCH /v1/users/me/notifications/:id/read`

**Auth:** JWT

**Response (200):**

```json
{
  "id": "notif-uuid",
  "read": true
}
```

---

### `POST /v1/users/me/reminders`

**Auth:** JWT

**Payload:**

```json
{
  "vendorId": "uuid",
  "eventId": "uuid",
  "scheduledAt": "2026-07-23T18:00:00.000Z",
  "message": "Visit booth"
}
```

**Response (201):**

```json
{
  "id": "reminder-uuid",
  "vendorId": "uuid",
  "eventId": "uuid",
  "scheduledAt": "2026-07-23T18:00:00.000Z",
  "message": "Visit booth"
}
```

---

### `GET /v1/users/me/reminders`

**Auth:** JWT

**Response (200):**

```json
{
  "data": [
    {
      "id": "reminder-uuid",
      "vendorId": "uuid",
      "eventId": "uuid",
      "scheduledAt": "2026-07-23T18:00:00.000Z",
      "message": "Visit booth",
      "isSent": false,
      "vendor": {
        "id": "uuid",
        "name": "Mama's Kitchen",
        "boothNumber": "A12"
      }
    }
  ]
}
```

---

### `DELETE /v1/users/me/reminders/:id`

**Auth:** JWT

**Response (200):**

```json
{
  "id": "reminder-uuid",
  "message": "Reminder cancelled"
}
```

---

## 10. Analytics — `/v1/analytics/*`

### `POST /v1/analytics/events`

**Auth:** Optional JWT

**Payload:**

```json
{
  "eventId": "uuid",
  "type": "search_performed",
  "properties": {
    "query": "jollof",
    "result_count": 3
  }
}
```

**Response (201):**

```json
{
  "id": "analytics-uuid",
  "recorded": true
}
```

---

### `POST /v1/analytics/events/batch`

**Auth:** Optional JWT

**Payload:**

```json
{
  "events": [
    {
      "eventId": "uuid",
      "type": "search_result_clicked",
      "properties": { "query": "jollof" },
      "clientTimestamp": "2026-07-23T10:00:00.000Z"
    }
  ]
}
```

**Response (201):**

```json
{
  "recorded": 1
}
```

---

### `GET /v1/analytics/search/:eventId`

**Auth:** JWT + `admin` or `organizer`

**Query params:** `from`, `to` (ISO dates, optional)

**Response (200):**

```json
{
  "eventId": "event-uuid",
  "eventStartDate": "2026-12-01",
  "eventEndDate": "2026-12-31",
  "rangeStart": "2026-07-01T00:00:00.000Z",
  "rangeEnd": "2026-07-23T23:59:59.999Z",
  "totalSearches": 150,
  "totalClicks": 45,
  "overallCtr": 0.3,
  "topSearches": [
    {
      "query": "jollof",
      "searchCount": 30,
      "clickCount": 12,
      "ctr": 0.4,
      "zeroResultCount": 2
    }
  ],
  "zeroResultSearches": [
    { "query": "sushi", "count": 5 }
  ]
}
```

---

### `GET /v1/analytics/search/:eventId/export`

**Auth:** JWT + `admin` or `organizer`

**Query params:** `from`, `to` (ISO dates, optional)

**Response:** CSV file (`text/csv`).

---

### `GET /v1/analytics/dashboard/:eventId`

**Auth:** JWT + `admin` or `organizer`

**Query params:** `compareEventId` (UUID, optional)

**Response (200):**

```json
{
  "eventId": "event-uuid",
  "dau": 250,
  "activeUsers": 180,
  "totalSearches": 45,
  "navigationStarts": 20,
  "qrScans": 15,
  "topVendors": [
    { "vendorId": "uuid", "name": "Mama's Kitchen", "views": 50 }
  ],
  "dailyTrend": [
    { "date": "2026-07-23", "users": 250, "searches": 45 }
  ]
}
```

---

## 11. Performance — `/v1/performance/*`

### `POST /v1/performance/events/batch`

**Auth:** Optional JWT

**Payload:**

```json
{
  "events": [
    {
      "eventId": "uuid",
      "kind": "api_latency",
      "name": "GET /v1/events",
      "durationMs": 45,
      "properties": {},
      "clientTimestamp": "2026-07-23T10:00:00.000Z"
    }
  ]
}
```

**Response (201):**

```json
{
  "recorded": 1
}
```

---

### `GET /v1/performance/dashboard/:eventId`

**Auth:** JWT + `admin` or `organizer`

**Query params:** `hours` (1–168, default 1)

**Response (200):**

```json
{
  "eventId": "event-uuid",
  "hours": 1,
  "crashCount": 2,
  "crashRate": 0.001,
  "apiLatency": { "p50": 45, "p95": 120, "p99": 250 },
  "recentCrashes": [
    {
      "name": "NullReferenceError",
      "timestamp": "2026-07-23T10:00:00.000Z"
    }
  ]
}
```

---

## 12. Vendor Portal — `/v1/vendor-portal/*`

**Auth:** JWT + `vendor` role (all routes).

### `GET /v1/vendor-portal/dashboard`

**Response (200):**

```json
{
  "user": { "id": "...", "email": "...", "role": "vendor" },
  "vendor": {
    "id": "vendor-uuid",
    "name": "Mama's Kitchen",
    "boothNumber": "A12",
    "zone": "Food Court",
    "category": "Food",
    "description": "...",
    "viewCount": 150,
    "avgRating": 4.5,
    "reviewCount": 12
  },
  "event": { "id": "event-uuid", "name": "Akwa Ibom Xmas Village 2026" }
}
```

---

### `GET /v1/vendor-portal/contact-consent-requests`

**Response (200):**

```json
{
  "data": [
    {
      "id": "consent-uuid",
      "status": "pending",
      "requestedAt": "2026-07-23T10:00:00.000Z",
      "expiresAt": "2026-08-22T10:00:00.000Z",
      "visitor": { "displayName": "Jane D." }
    }
  ]
}
```

---

### `POST /v1/vendor-portal/contact-consent-requests`

**Payload:**

```json
{
  "userEmail": "visitor@example.com",
  "eventId": "uuid"
}
```

**Response (201):** Created consent request object.

---

## 13. Contact Consent (Admin/Organizer)

### `POST /v1/vendors/:vendorId/contact-consent-requests`

**Auth:** JWT + `admin` or `organizer`

**Payload:**

```json
{
  "eventId": "uuid",
  "userId": "uuid",
  "userEmail": "visitor@example.com"
}
```

> Provide `userId` or `userEmail` (or both).

**Response (201):** Consent request object.

---

### `GET /v1/vendors/:vendorId/contact-consent-requests`

**Auth:** JWT + `admin` or `organizer`

**Response (200):**

```json
{
  "data": [
    {
      "id": "consent-uuid",
      "status": "pending",
      "requestedAt": "2026-07-23T10:00:00.000Z",
      "expiresAt": "2026-08-22T10:00:00.000Z"
    }
  ]
}
```

---

## 14. Admin — `/v1/admin/*`

**Auth:** JWT + `admin` or `organizer` (all routes).

### `GET /v1/admin/events`

**Response (200):**

```json
{
  "data": [
    {
      "id": "event-uuid",
      "name": "Akwa Ibom Xmas Village 2026",
      "status": "active",
      "startDate": "2026-12-01",
      "endDate": "2026-12-31",
      "venue": { "latitude": 4.9515, "longitude": 8.3228 }
    }
  ]
}
```

---

### `GET /v1/admin/customers`

**Query params:** `page`, `pageSize`, `limit`

**Response (200):** Paginated visitor list.

---

### `GET /v1/admin/events/:eventId/categories`

**Response (200):**

```json
{
  "data": [
    { "id": "cat-uuid", "name": "Food", "icon": "🍲" }
  ]
}
```

---

### `GET /v1/admin/events/:eventId/vendors/audit-log`

**Query params:** `limit` (max 200)

**Response (200):**

```json
{
  "data": [
    {
      "id": "log-uuid",
      "action": "vendor_created",
      "actorEmail": "organizer@fvl.io",
      "createdAt": "2026-07-23T10:00:00.000Z",
      "details": {}
    }
  ]
}
```

---

### `GET /v1/admin/events/:eventId/vendors`

**Response (200):**

```json
{
  "data": [
    {
      "id": "vendor-uuid",
      "name": "Mama's Kitchen",
      "boothNumber": "A12",
      "zone": "Food Court",
      "isActive": true,
      "latitude": 4.9515,
      "longitude": 8.3228
    }
  ]
}
```

---

### `POST /v1/admin/events/:eventId/vendors`

**Payload:**

```json
{
  "name": "New Vendor",
  "slug": "new-vendor",
  "categoryId": "uuid",
  "description": "...",
  "boothNumber": "B5",
  "zone": "Crafts",
  "latitude": 4.9515,
  "longitude": 8.3228,
  "phone": "+2348012345678",
  "email": "vendor@example.com",
  "logoUrl": "/media/...",
  "isActive": true
}
```

**Response (201):** Admin vendor object.

---

### `PATCH /v1/admin/events/:eventId/vendors/:vendorId`

**Payload:** Same fields as create — all optional.

**Response (200):** Updated admin vendor object.

---

### `DELETE /v1/admin/events/:eventId/vendors/:vendorId`

**Response (200):**

```json
{
  "message": "Vendor deactivated"
}
```

---

### `POST /v1/admin/events/:eventId/vendors/bulk-import`

**Payload:**

```json
{
  "vendors": [
    {
      "name": "Vendor 1",
      "latitude": 4.9515,
      "longitude": 8.3228,
      "categoryName": "Food",
      "boothNumber": "A1"
    }
  ]
}
```

**Response (200):**

```json
{
  "total": 10,
  "imported": 8,
  "failed": 2,
  "results": [
    {
      "row": 1,
      "status": "success",
      "vendor": { "id": "uuid", "name": "Vendor 1" }
    },
    {
      "row": 2,
      "status": "error",
      "errors": ["Duplicate booth number"]
    }
  ]
}
```

---

### `POST /v1/admin/events/:eventId/qr/generate-all`

**Query params:** `regenerate=true` (optional)

**Response (200):**

```json
{
  "generated": 50,
  "data": [
    { "vendorId": "uuid", "qrPayload": "fvl://..." }
  ]
}
```

---

### `POST /v1/admin/events/:eventId/qr/download-pdf`

**Response:** PDF binary (`application/pdf`).

---

### `GET /v1/admin/events/:eventId/vendors/:vendorId/qr/download-pdf`

**Response:** PDF binary (`application/pdf`).

---

### `GET /v1/admin/events/:eventId/announcements`

**Response (200):**

```json
{
  "data": [
    {
      "id": "announcement-uuid",
      "title": "Fireworks Tonight!",
      "body": "Join us at 8 PM",
      "priority": "high",
      "publishedAt": "2026-07-23T10:00:00.000Z",
      "expiresAt": null
    }
  ]
}
```

---

### `POST /v1/admin/events/:eventId/announcements`

**Payload:**

```json
{
  "title": "Fireworks Tonight!",
  "body": "Join us at 8 PM",
  "priority": "high",
  "expiresAt": "2026-07-24T00:00:00.000Z"
}
```

> `priority`: `low`, `normal`, or `high`. `expiresAt` is optional.

**Response (201):** Announcement object + optional push dispatch info.

---

### `PATCH /v1/admin/events/:eventId/announcements/:announcementId`

**Payload:**

```json
{
  "title": "Updated Title",
  "body": "Updated body",
  "priority": "normal",
  "expiresAt": null
}
```

**Response (200):** Updated announcement object.

---

### `DELETE /v1/admin/events/:eventId/announcements/:announcementId`

**Response (200):**

```json
{
  "message": "Announcement deleted"
}
```

---

### `GET /v1/admin/dashboard/:eventId`

**Query params:** `compareEventId` (UUID, optional)

**Response (200):** Admin dashboard with analytics metrics, `activeVendors`, and `announcements`.

---

### `GET /v1/admin/dashboard/:eventId/export-pdf`

**Query params:** `compareEventId` (UUID, optional)

**Response:** PDF binary (`application/pdf`).

---

### `POST /v1/admin/events/:eventId/vendors/:vendorId/contact-consent-requests`

**Payload:**

```json
{
  "userId": "uuid",
  "userEmail": "visitor@example.com"
}
```

**Response (201):** Consent request object.

---

### `GET /v1/admin/events/:eventId/vendors/:vendorId/contact-consent-requests`

**Response (200):**

```json
{
  "data": [
    {
      "id": "consent-uuid",
      "status": "pending",
      "requestedAt": "2026-07-23T10:00:00.000Z",
      "expiresAt": "2026-08-22T10:00:00.000Z"
    }
  ]
}
```

---

## Route Summary

| Module | Routes |
|--------|--------|
| Health | 1 |
| Auth | 7 |
| Users | 5 |
| Favorites | 3 |
| Contact Consent | 5 |
| Events | 5 |
| Maps | 2 |
| Vendors | 13 |
| Notifications | 9 |
| Analytics | 5 |
| Performance | 2 |
| Vendor Portal | 3 |
| Admin | 21 |
| **Total** | **81** |

---

## Source Files

| Purpose | Path |
|---------|------|
| Global prefix `/v1` | `src/bootstrap.ts` |
| Controllers | `src/**/*.controller.ts` |
| Request DTOs | `src/**/dto/*.dto.ts` |
| Enums (roles, statuses) | `src/common/enums/index.ts` |
| Pagination helper | `src/common/dto/pagination.dto.ts` |
| E2E test examples | `test/app.e2e-spec.ts` |
