/**
 * Notifies when auth session is saved (new tokens/user) or cleared (logout / expire).
 * UserProvider subscribes so profile cache and React state stay aligned with the signed-in user.
 */

export type ProfileSessionEvent = { hasSession: true } | { hasSession: false };

type Listener = (event: ProfileSessionEvent) => void;

const listeners = new Set<Listener>();

export function subscribeProfileSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifySessionSaved(): void {
  listeners.forEach((l) => l({ hasSession: true }));
}

export function notifySessionCleared(): void {
  listeners.forEach((l) => l({ hasSession: false }));
}
