const ADMIN_TOKEN_KEY = 'tee_time_admin_token';

const getBaseUrl = (): string => {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env : undefined;
  const url = env?.VITE_API_BASE_URL;
  if (url) return String(url).replace(/\/$/, '');
  return ''; // use relative /api (Vite proxy)
};

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function removeAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export type LoginResponse =
  | { success: true; accessToken: string; expiresIn?: string }
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
  if (data.success && data.accessToken) {
    return { success: true, accessToken: data.accessToken, expiresIn: data.expiresIn };
  }
  return { success: false, message: data.message || 'Login failed.' };
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

function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const base = getBaseUrl();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${base}${url}`, { ...options, headers });
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

export async function searchUsers(q: string): Promise<{ success: true; data: AdminUser[] } | { success: false; message: string }> {
  const res = await authFetch(`/api/admin/users?q=${encodeURIComponent(q)}&limit=50`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Search failed' };
  return { success: true, data: data.data || [] };
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

export async function listReports(status?: string): Promise<{ success: true; data: UserReport[] } | { success: false; message: string }> {
  const url = status ? `/api/admin/reports?status=${encodeURIComponent(status)}` : '/api/admin/reports';
  const res = await authFetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data.message || 'Failed to load reports' };
  return { success: true, data: data.data || [] };
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
