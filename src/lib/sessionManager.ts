import { ActiveSession, ClinicTenant } from './types';
import { getActiveClinic } from './tenancy';

const SESSIONS_STORAGE_KEY = 'clinsyst_active_sessions';
const CURRENT_SESSION_ID_KEY = 'clinsyst_current_session_id';
export const SESSION_TERMINATED_EVENT = 'clinsyst-session-terminated';
export const SESSION_UPDATED_EVENT = 'clinsyst-sessions-updated';

// Inactivity threshold: sessions with no heartbeat for 60 seconds are purged
const SESSION_EXPIRY_MS = 60 * 1000;

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('clinsyst_session_channel');
  }
} catch {
  // Ignore in environments where BroadcastChannel is restricted
}

function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;
  let os = 'Desktop';
  if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS Device';
  else if (/Android/i.test(ua)) os = 'Android Device';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return `${os} (${browser})`;
}

/**
 * Get all active sessions, pruning expired heartbeats
 */
export function getActiveSessions(clinicId?: string): ActiveSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const list: ActiveSession[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    const now = Date.now();
    // Keep only sessions active within expiration window
    const valid = list.filter(s => now - s.last_heartbeat < SESSION_EXPIRY_MS);

    if (valid.length !== list.length) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(valid));
    }

    const currentId = getCurrentSessionId();
    const mapped = valid.map(s => ({
      ...s,
      is_current: s.id === currentId,
    }));

    if (clinicId) {
      return mapped.filter(s => s.clinic_id === clinicId);
    }
    return mapped;
  } catch {
    return [];
  }
}

/**
 * Get the current tab's active session ID from sessionStorage
 */
export function getCurrentSessionId(): string | null {
  try {
    return sessionStorage.getItem(CURRENT_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Set the current tab's session ID
 */
export function setCurrentSessionId(id: string | null) {
  try {
    if (id) {
      sessionStorage.setItem(CURRENT_SESSION_ID_KEY, id);
    } else {
      sessionStorage.removeItem(CURRENT_SESSION_ID_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Check if a clinic has reached its concurrent session limit
 */
export function checkSessionLimit(clinic: ClinicTenant): {
  allowed: boolean;
  activeCount: number;
  maxSessions: number;
  activeSessions: ActiveSession[];
} {
  const activeSessions = getActiveSessions(clinic.id);
  const maxSessions = clinic.max_concurrent_sessions || 2;
  const currentSessionId = getCurrentSessionId();

  // If current session is already in active list, it's allowed
  const isExistingSession = activeSessions.some(s => s.id === currentSessionId);
  if (isExistingSession) {
    return {
      allowed: true,
      activeCount: activeSessions.length,
      maxSessions,
      activeSessions,
    };
  }

  return {
    allowed: activeSessions.length < maxSessions,
    activeCount: activeSessions.length,
    maxSessions,
    activeSessions,
  };
}

/**
 * Register a new session upon login
 */
export function registerSession(params: {
  clinicId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  forceTerminateOldest?: boolean;
}): {
  success: boolean;
  sessionId?: string;
  error?: string;
  activeCount?: number;
  maxSessions?: number;
  activeSessions?: ActiveSession[];
} {
  const clinic = getActiveClinic();
  const maxSessions = clinic.id === params.clinicId ? (clinic.max_concurrent_sessions || 2) : 2;
  let active = getActiveSessions(params.clinicId);

  // Check if session limit is reached
  if (active.length >= maxSessions) {
    if (params.forceTerminateOldest) {
      // Sort by last heartbeat ascending (oldest first)
      active.sort((a, b) => a.last_heartbeat - b.last_heartbeat);
      const oldest = active.shift();
      if (oldest) {
        notifyTermination(oldest.id, 'Session terminated to allow new login.');
      }
    } else {
      return {
        success: false,
        error: `Concurrent session limit reached (${active.length}/${maxSessions} active sessions). Your ${clinic.plan.toUpperCase()} plan allows up to ${maxSessions} simultaneous logins.`,
        activeCount: active.length,
        maxSessions,
        activeSessions: active,
      };
    }
  }

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newSession: ActiveSession = {
    id: sessionId,
    clinic_id: params.clinicId,
    user_id: params.userId,
    user_email: params.userEmail,
    user_name: params.userName,
    role: params.role,
    device: detectDevice(),
    created_at: new Date().toISOString(),
    last_heartbeat: Date.now(),
    is_current: true,
  };

  const updated = [...active.filter(s => s.id !== sessionId), newSession];
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  setCurrentSessionId(sessionId);

  dispatchSessionsUpdated();
  return { success: true, sessionId };
}

/**
 * Update heartbeat for the current tab session
 */
export function heartbeatSession(): boolean {
  const currentId = getCurrentSessionId();
  if (!currentId) return false;

  const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
  if (!raw) return false;

  try {
    const list: ActiveSession[] = JSON.parse(raw);
    const sessionIndex = list.findIndex(s => s.id === currentId);

    // If session was terminated or removed by admin / concurrent limit
    if (sessionIndex === -1) {
      setCurrentSessionId(null);
      return false;
    }

    list[sessionIndex].last_heartbeat = Date.now();
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * Explicitly terminate a specific session
 */
export function terminateSession(sessionId: string, reason?: string) {
  const currentId = getCurrentSessionId();
  const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
  if (raw) {
    try {
      const list: ActiveSession[] = JSON.parse(raw);
      const filtered = list.filter(s => s.id !== sessionId);
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }

  if (currentId === sessionId) {
    setCurrentSessionId(null);
  }

  notifyTermination(sessionId, reason || 'Session terminated by user or administrator.');
  dispatchSessionsUpdated();
}

/**
 * Terminate all other sessions for a given user or clinic
 */
export function terminateOtherSessions(clinicId: string, currentSessionId?: string) {
  const currId = currentSessionId || getCurrentSessionId();
  const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
  if (raw) {
    try {
      const list: ActiveSession[] = JSON.parse(raw);
      const remaining: ActiveSession[] = [];

      for (const s of list) {
        if (s.clinic_id === clinicId && s.id !== currId) {
          notifyTermination(s.id, 'Session terminated remotely.');
        } else {
          remaining.push(s);
        }
      }

      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(remaining));
      dispatchSessionsUpdated();
    } catch {
      // ignore
    }
  }
}

/**
 * End current session cleanly on sign-out
 */
export function endCurrentSession() {
  const currentId = getCurrentSessionId();
  if (currentId) {
    terminateSession(currentId, 'Signed out');
  }
}

/**
 * Notify listening tabs/windows if their session was terminated
 */
function notifyTermination(sessionId: string, reason: string) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'TERMINATE', sessionId, reason });
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SESSION_TERMINATED_EVENT, { detail: { sessionId, reason } })
    );
  }
}

function dispatchSessionsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT));
  }
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'UPDATED' });
    } catch {
      // ignore
    }
  }
}

/**
 * Set up listeners for remote session termination
 */
export function listenForSessionTermination(
  onTerminated: (reason: string) => void
): () => void {
  function handleLocalEvent(e: Event) {
    const ce = e as CustomEvent<{ sessionId: string; reason: string }>;
    const currentId = getCurrentSessionId();
    if (ce.detail && ce.detail.sessionId === currentId) {
      onTerminated(ce.detail.reason || 'Session ended');
    }
  }

  function handleBroadcast(msg: MessageEvent) {
    const data = msg.data;
    if (data?.type === 'TERMINATE') {
      const currentId = getCurrentSessionId();
      if (data.sessionId === currentId) {
        onTerminated(data.reason || 'Session ended');
      }
    }
  }

  window.addEventListener(SESSION_TERMINATED_EVENT, handleLocalEvent);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener(SESSION_TERMINATED_EVENT, handleLocalEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}
