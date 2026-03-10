const ADMIN_TOKEN_KEY = 'tee_time_admin_token';

const getBaseUrl = (): string => {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env : undefined;
  const url = env?.VITE_API_BASE_URL;
  if (url) return String(url).replace(/\/$/, '');
  return ''; // use relative /api (Vite proxy)
};

export function getAdminToken(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function removeAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export type LoginResponse =
  | { success: true; accessToken: string; expiresIn?: string }
  | { success: true; needsMfaVerification: true; temporaryToken: string; message?: string }
  | { success: false; message: string };

export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: data.message || 'Login failed.' };
  }
  if (data.success && data.needsMfaVerification && data.temporaryToken) {
    return { success: true, needsMfaVerification: true, temporaryToken: data.temporaryToken, message: data.message };
  }
  if (data.success && data.accessToken) {
    return { success: true, accessToken: data.accessToken, expiresIn: data.expiresIn };
  }
  return { success: false, message: data.message || 'Login failed.' };
}

export type MfaVerifyResponse =
  | { success: true; accessToken: string; expiresIn?: string }
  | { success: false; message: string };

export async function adminVerifyMfa(temporaryToken: string, code: string): Promise<MfaVerifyResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temporaryToken, code: code.trim().replace(/\s/g, '') }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: data.message || 'Verification failed.' };
  }
  if (data.success && data.accessToken) {
    return { success: true, accessToken: data.accessToken, expiresIn: data.expiresIn };
  }
  return { success: false, message: data.message || 'Verification failed.' };
}

export type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  teeTimesBooked: number;
};

export type DashboardStatsResponse =
  | { success: true; data: DashboardStats }
  | { success: false; message?: string };

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  const token = getAdminToken();
  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: data.message || 'Failed to load stats' };
  }
  if (data.success && data.data) {
    return { success: true, data: data.data };
  }
  return { success: false, message: 'Invalid response' };
}

export type CourseUsageEntry = {
  course_name: string;
  course_location: string;
  tee_time_count: number;
};

export type CourseUsageResponse =
  | { success: true; data: CourseUsageEntry[] }
  | { success: false; message?: string };

export async function fetchCourseUsage(limit?: number): Promise<CourseUsageResponse> {
  const token = getAdminToken();
  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }
  const base = getBaseUrl();
  const qs = limit != null ? `?limit=${limit}` : '';
  const res = await fetch(`${base}/api/admin/courses/usage${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: data.message || 'Failed to load course usage' };
  }
  if (data.success && Array.isArray(data.data)) {
    return { success: true, data: data.data };
  }
  return { success: false, message: 'Invalid response' };
}

function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const base = getBaseUrl();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${base}${url}`, { ...options, headers });
}

// --- Ad slots (4 placements: loading screen + 3 banners) ---
export type AdSlot = {
  id: string;
  slot_key: 'loading_screen' | 'banner_1' | 'banner_2' | 'banner_3';
  label: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export async function listAdSlots(): Promise<{ success: true; data: AdSlot[] } | { success: false; message: string }> {
  const res = await authFetch('/api/admin/ad-slots');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to load ad slots' };
  if (data.success && Array.isArray(data.data)) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export async function updateAdSlot(
  slotKey: string,
  payload: { label?: string; description?: string | null; image_url?: string | null; link_url?: string | null; active?: boolean; sort_order?: number }
): Promise<{ success: true; data: AdSlot } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/ad-slots/${encodeURIComponent(slotKey)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to update ad slot' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

/** Upload a custom creative image for a slot (JPEG, PNG, WebP, GIF; max 2MB). Replaces existing asset. */
export async function uploadAdSlotAsset(slotKey: string, file: File): Promise<{ success: true; data: AdSlot; image_url: string } | { success: false; message: string }> {
  const base64 = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result && result.startsWith('data:') ? result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
  if (!base64) return { success: false, message: 'Could not read file' };
  const res = await authFetch(`/api/admin/ad-slots/${encodeURIComponent(slotKey)}/asset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Upload failed' };
  if (data.success && data.data) return { success: true, data: data.data, image_url: data.image_url || data.data.image_url };
  return { success: false, message: 'Invalid response' };
}

/** Remove the custom creative for a slot (clears image and deletes stored file). */
export async function removeAdSlotAsset(slotKey: string): Promise<{ success: true; data: AdSlot } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/ad-slots/${encodeURIComponent(slotKey)}/asset`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to remove creative' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

// --- User management ---
export type AdminUser = {
  id: string;
  phone_number?: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_verified?: boolean;
  is_locked?: boolean;
  created_at?: string;
  social_rate?: number;
  handicap?: number;
  avatar_url?: string;
};

export const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export async function searchUsers(q: string, limit?: number, offset?: number): Promise<{ success: true; data: AdminUser[]; total: number } | { success: false; message: string }> {
  const params = new URLSearchParams();
  params.set('q', q);
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  const res = await authFetch(`/api/admin/users?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Search failed' };
  return { success: true, data: data.data || [], total: data.total ?? 0 };
}

export type UserProfileActivity = {
  loginLogs: { id: string; login_method: string; status: string; attempted_at: string }[];
  socialRateLogs: { id: string; previous_score: number; delta: number; new_score: number; reason: string; reason_details?: string; created_at: string }[];
};

export type UserProfileResponse = {
  user: AdminUser & Record<string, unknown>;
  activity: UserProfileActivity;
};

export async function getUserProfile(id: string): Promise<{ success: true; data: UserProfileResponse } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/users/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to load user' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export async function updateUser(id: string, body: Record<string, unknown>): Promise<{ success: true; data: AdminUser } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Update failed' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export async function suspendUser(id: string): Promise<{ success: true; data: AdminUser } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/users/${id}/suspend`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Suspend failed' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export async function unsuspendUser(id: string): Promise<{ success: true; data: AdminUser } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/users/${id}/unsuspend`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Unsuspend failed' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export async function banUser(id: string): Promise<{ success: true; data: AdminUser } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/users/${id}/ban`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Ban failed' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

// --- Reported issues ---
export type UserReport = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description?: string;
  status: string;
  admin_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  reporter?: { first_name?: string; last_name?: string; username?: string; phone_number?: string } | null;
  reported_user?: { first_name?: string; last_name?: string; username?: string; phone_number?: string } | null;
};

export async function listReports(status?: string, limit?: number, offset?: number): Promise<{ success: true; data: UserReport[]; total: number } | { success: false; message: string }> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  const url = params.toString() ? `/api/admin/reports?${params}` : '/api/admin/reports';
  const res = await authFetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to load reports' };
  return { success: true, data: data.data || [], total: data.total ?? 0 };
}

export async function updateReport(id: string, updates: { status?: string; admin_notes?: string }): Promise<{ success: true; data: UserReport } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/reports/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Update failed' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

// --- Broadcast push notifications ---
export type BroadcastPreview = {
  title: string;
  body: string;
  recipientCount: number;
  message: string;
};

export async function previewBroadcast(title: string, body: string): Promise<{ success: true; data: BroadcastPreview } | { success: false; message: string }> {
  const res = await authFetch('/api/admin/notifications/broadcast/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || '', body: body || '' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Preview failed' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export type BroadcastResult = {
  sent: number;
  failed: number;
  total: number;
  message: string;
};

export async function sendBroadcast(title: string, body: string): Promise<{ success: true; data: BroadcastResult } | { success: false; message: string }> {
  const res = await authFetch('/api/admin/notifications/broadcast/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.trim(), body: body.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Send failed' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

// --- System settings (read-only status) ---
export type FirebaseSettingsStatus = {
  configured: boolean;
  projectIdMasked: string | null;
  envVars: string[];
  description: string;
};

export type TwilioSettingsStatus = {
  configured: boolean;
  availableForTest?: boolean;
  accountSidMasked: string | null;
  fromNumberMasked: string | null;
  envVars: string[];
  description: string;
};

export type SystemSettings = {
  firebase: FirebaseSettingsStatus;
  twilio: TwilioSettingsStatus;
};

export async function getSystemSettings(): Promise<{ success: true; data: SystemSettings } | { success: false; message: string }> {
  const res = await authFetch('/api/admin/settings');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to load settings' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

/** Send a test SMS via Twilio. Phone number must be E.164 (e.g. +15551234567). Trial accounts: use a verified number. */
export async function sendTwilioTestSms(to: string): Promise<{ success: true; data: { to: string; mode?: string; sid?: string } } | { success: false; message: string }> {
  const res = await authFetch('/api/admin/twilio/test-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: to.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to send test SMS' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: data.message || 'Invalid response' };
}

// --- Golf courses (US database for autocomplete) ---
export type GolfCourse = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  website?: string | null;
  holes?: number | null;
  par?: number | null;
  course_type?: string | null;
  price_range?: string | null;
  rating?: number | null;
  google_place_id?: string | null;
  created_at?: string;
};

export async function listCourses(q?: string, limit?: number, offset?: number): Promise<{ success: true; data: GolfCourse[]; total: number } | { success: false; message: string }> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  const url = params.toString() ? `/api/admin/courses?${params}` : '/api/admin/courses';
  const res = await authFetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to load courses' };
  if (data.success && Array.isArray(data.data)) return { success: true, data: data.data, total: data.total ?? data.data.length };
  return { success: false, message: 'Invalid response' };
}

export async function getCourse(id: string): Promise<{ success: true; data: GolfCourse } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/courses/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to load course' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export async function createCourse(body: Partial<GolfCourse>): Promise<{ success: true; data: GolfCourse } | { success: false; message: string }> {
  const res = await authFetch('/api/admin/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to create course' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export async function updateCourse(id: string, body: Partial<GolfCourse>): Promise<{ success: true; data: GolfCourse } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/courses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to update course' };
  if (data.success && data.data) return { success: true, data: data.data };
  return { success: false, message: 'Invalid response' };
}

export async function deleteCourse(id: string): Promise<{ success: true } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to delete course' };
  if (data.success) return { success: true };
  return { success: false, message: data.message || 'Delete failed' };
}

// --- Golf courses (database table golf_courses) ---
export type CsvCourse = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  telephone?: string | null;
  phone?: string | null;
  website?: string | null;
  /** Ongoing booked tee times (pending/confirmed/in_progress, date >= today). */
  ongoingBooked?: number;
};

function normalizeCourse(c: Record<string, unknown>): CsvCourse {
  return {
    ...c,
    id: String(c.id ?? ''),
    telephone: (c.telephone ?? c.phone) as string | null | undefined,
    postalCode: (c.postalCode ?? c.postal_code) as string | null | undefined,
  } as CsvCourse;
}

export async function listCsvCourses(q?: string, limit?: number, offset?: number): Promise<{ success: true; data: CsvCourse[]; total: number } | { success: false; message: string }> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  const url = params.toString() ? `/api/admin/courses?${params}` : '/api/admin/courses';
  const res = await authFetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to load courses' };
  if (data.success && Array.isArray(data.data)) {
    const list = data.data.map((c: Record<string, unknown>) => normalizeCourse(c));
    return { success: true, data: list, total: data.total ?? list.length };
  }
  return { success: false, message: 'Invalid response' };
}

export async function addCsvCourse(body: { name: string; address?: string; city?: string; state?: string; country?: string; postal_code?: string; latitude?: number; longitude?: number; phone?: string; website?: string }): Promise<{ success: true; data: CsvCourse } | { success: false; message: string }> {
  const res = await authFetch('/api/admin/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to add course' };
  if (data.success && data.data) return { success: true, data: normalizeCourse(data.data) };
  return { success: false, message: data.message || 'Invalid response' };
}

export async function updateCsvCourse(id: string, body: { name?: string; address?: string; city?: string; state?: string; country?: string; postal_code?: string; latitude?: number; longitude?: number; phone?: string; website?: string }): Promise<{ success: true; data: CsvCourse } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/courses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to update course' };
  if (data.success && data.data) return { success: true, data: normalizeCourse(data.data) };
  return { success: false, message: data.message || 'Invalid response' };
}

export async function deleteCsvCourse(id: string): Promise<{ success: true } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/courses/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to delete course' };
  if (data.success) return { success: true };
  return { success: false, message: data.message || 'Invalid response' };
}
