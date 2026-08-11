# Chat API Reference

In-app messaging between **visitors** and **vendors**.

| Item | Detail |
|------|--------|
| **Base URL** | `/v1` |
| **Auth** | JWT Bearer token |
| **Real-time** | REST + push notifications (poll or refresh on focus) |

---

## Visitor APIs — `/v1/users/me/chats/*`

**Auth:** JWT (visitor)

### `GET /v1/users/me/chats`

List chat threads.

**Query:** `eventId?`, `q?`, `page?` (default 1), `pageSize?` (default 20)

**Response (200):**
```json
{
  "data": [
    {
      "id": "conv-uuid",
      "eventId": "event-uuid",
      "vendor": {
        "id": "vendor-uuid",
        "name": "Kilimanjaro",
        "logoUrl": "https://api.example.com/media/catalogue/logo.jpg",
        "boothNumber": "A12",
        "isOnline": false
      },
      "lastMessage": {
        "preview": "Thanks for visiting our booth!",
        "sentAt": "2026-08-08T21:00:00.000Z",
        "senderRole": "vendor"
      },
      "unreadCount": 2,
      "createdAt": "2026-08-08T20:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "pageSize": 20, "totalPages": 1 }
}
```

---

### `POST /v1/users/me/chats`

Start or reopen a conversation.

**Payload:**
```json
{
  "vendorId": "vendor-uuid",
  "eventId": "event-uuid"
}
```

**Response (201):** Conversation summary (same shape as list item).

---

### `GET /v1/users/me/chats/:conversationId`

Get one conversation summary.

**Response (200):** Conversation summary object.

---

### `GET /v1/users/me/chats/:conversationId/messages`

Paginated message history (oldest → newest within page).

**Query:** `page?` (default 1), `pageSize?` (default 50)

**Response (200):**
```json
{
  "data": [
    {
      "id": "msg-uuid",
      "conversationId": "conv-uuid",
      "senderId": "user-uuid",
      "senderRole": "visitor",
      "type": "text",
      "body": "Do you have jollof rice today?",
      "mediaUrl": null,
      "mimeType": null,
      "createdAt": "2026-08-08T21:05:00.000Z"
    }
  ],
  "meta": { "total": 15, "page": 1, "pageSize": 50, "totalPages": 1 }
}
```

---

### `POST /v1/users/me/chats/:conversationId/messages`

Send a text message.

**Payload:**
```json
{
  "body": "Do you have jollof rice today?"
}
```

**Response (201):**
```json
{
  "id": "msg-uuid",
  "conversationId": "conv-uuid",
  "senderId": "user-uuid",
  "senderRole": "visitor",
  "type": "text",
  "body": "Do you have jollof rice today?",
  "mediaUrl": null,
  "mimeType": null,
  "createdAt": "2026-08-08T21:05:00.000Z"
}
```

---

### `POST /v1/users/me/chats/:conversationId/messages/media`

Send an image message.

**Content-Type:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `image` | file (max 8 MB) | Yes |

**Response (201):**
```json
{
  "id": "msg-uuid",
  "conversationId": "conv-uuid",
  "senderId": "user-uuid",
  "senderRole": "visitor",
  "type": "image",
  "body": null,
  "mediaUrl": "https://api.example.com/media/chat/photo.jpg",
  "mimeType": "image/jpeg",
  "createdAt": "2026-08-08T21:06:00.000Z"
}
```

---

### `PATCH /v1/users/me/chats/:conversationId/read`

Mark conversation as read.

**Response (200):**
```json
{
  "conversationId": "conv-uuid",
  "read": true
}
```

---

### `POST /v1/users/me/chats/read-all`

Mark all chats read.

**Query:** `eventId?`

**Response (200):**
```json
{
  "updated": 3
}
```

---

### `POST /v1/users/me/chats/bulk-read`

**Payload:**
```json
{
  "conversationIds": ["conv-uuid-1", "conv-uuid-2"]
}
```

**Response (200):**
```json
{
  "updated": 2
}
```

---

### `DELETE /v1/users/me/chats/:conversationId`

Soft-delete chat for the visitor.

**Response (200):**
```json
{
  "conversationId": "conv-uuid",
  "message": "Chat deleted"
}
```

---

### `POST /v1/users/me/chats/bulk-delete`

**Payload:**
```json
{
  "conversationIds": ["conv-uuid-1", "conv-uuid-2"]
}
```

**Response (200):**
```json
{
  "deleted": 2
}
```

---

### `POST /v1/users/me/chats/:conversationId/report`

Report vendor from chat.

**Payload:**
```json
{
  "reason": "harassment"
}
```

**Reasons:** `spam`, `inappropriate`, `harassment`, `hate_speech`, `scam`

**Response (201):**
```json
{
  "id": "report-uuid",
  "conversationId": "conv-uuid",
  "reason": "harassment",
  "status": "pending",
  "message": "Thank you for reporting"
}
```

---

## Vendor portal APIs — `/v1/vendor-portal/chats/*`

**Auth:** JWT + `vendor` role

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/vendor-portal/chats` | Same list shape; includes `visitor` instead of hiding it |
| `GET` | `/vendor-portal/chats/:conversationId` | Conversation detail |
| `GET` | `/vendor-portal/chats/:conversationId/messages` | Message history |
| `POST` | `/vendor-portal/chats/:conversationId/messages` | `{ "body": "..." }` |
| `POST` | `/vendor-portal/chats/:conversationId/messages/media` | multipart `image` |
| `PATCH` | `/vendor-portal/chats/:conversationId/read` | Mark read |
| `POST` | `/vendor-portal/chats/read-all` | `?eventId=` optional |
| `POST` | `/vendor-portal/chats/bulk-read` | `{ conversationIds: [] }` |
| `DELETE` | `/vendor-portal/chats/:conversationId` | Soft-delete for vendor |
| `POST` | `/vendor-portal/chats/bulk-delete` | `{ conversationIds: [] }` |

**Sample vendor list item:**
```json
{
  "id": "conv-uuid",
  "eventId": "event-uuid",
  "vendor": { "id": "vendor-uuid", "name": "Kilimanjaro", "..." : "..." },
  "visitor": {
    "id": "user-uuid",
    "displayName": "Jane Doe"
  },
  "lastMessage": { "preview": "Hello", "sentAt": "...", "senderRole": "visitor" },
  "unreadCount": 1,
  "createdAt": "..."
}
```

---

## Admin APIs — `/v1/admin/*`

**Auth:** JWT + `admin` or `organizer`

### `GET /v1/admin/events/:eventId/chat-reports`

**Response (200):**
```json
{
  "data": [
    {
      "id": "report-uuid",
      "conversationId": "conv-uuid",
      "eventId": "event-uuid",
      "reason": "harassment",
      "status": "pending",
      "createdAt": "2026-08-08T21:10:00.000Z",
      "vendor": { "id": "vendor-uuid", "name": "Kilimanjaro" },
      "reporter": { "id": "user-uuid", "displayName": "Jane Doe" }
    }
  ]
}
```

---

### `PATCH /v1/admin/chat-reports/:reportId`

**Payload:**
```json
{
  "status": "reviewed"
}
```

**Statuses:** `pending`, `reviewed`, `action_taken`

**Response (200):**
```json
{
  "id": "report-uuid",
  "status": "reviewed"
}
```

---

## Route summary

| Group | Routes |
|-------|--------|
| Visitor chats | 13 |
| Vendor portal chats | 10 |
| Admin chat reports | 2 |
| **Total** | **25** |

---

## Prerequisites flow

1. Visitor calls `POST /users/me/chats` to open a thread with a vendor
2. Both sides send/receive messages via REST
3. Push notification queued on new message (via device tokens)
