export enum UserRole {
  VISITOR = 'visitor',
  VENDOR = 'vendor',
  ORGANIZER = 'organizer',
  ADMIN = 'admin',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ACTIVE = 'active',
  ENDED = 'ended',
}

export enum AnnouncementPriority {
  NORMAL = 'normal',
  HIGH = 'high',
  EMERGENCY = 'emergency',
}

export enum ContactConsentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export enum AnalyticsEventType {
  APP_OPEN = 'app_open',
  EVENT_SELECTED = 'event_selected',
  SEARCH_PERFORMED = 'search_performed',
  SEARCH_RESULT_CLICKED = 'search_result_clicked',
  VENDOR_VIEWED = 'vendor_viewed',
  VENDOR_FAVORITED = 'vendor_favorited',
  NAVIGATION_STARTED = 'navigation_started',
  NAVIGATION_COMPLETED = 'navigation_completed',
  QR_SCAN_SUCCESS = 'qr_scan_success',
  USER_REGISTERED = 'user_registered',
  USER_LOGIN_SUCCESS = 'user_login_success',
  // Legacy aliases kept for backward compatibility with existing rows.
  SEARCH = 'search',
  VENDOR_VIEW = 'vendor_view',
  NAVIGATION_START = 'navigation_start',
  QR_SCAN = 'qr_scan',
  FAVORITE_ADD = 'favorite_add',
  LOGIN = 'login',
  CUSTOM = 'custom',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
}

export enum ChatSenderRole {
  VISITOR = 'visitor',
  VENDOR = 'vendor',
}

export enum ChatReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  SCAM = 'scam',
}

export enum ChatReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  ACTION_TAKEN = 'action_taken',
}
