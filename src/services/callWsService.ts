/**
 * Call WebSocket Service
 * Maintains a persistent WebSocket connection to the NestJS backend for real-time
 * call lifecycle events and updates (call_created, call_updated, call_ended, participant_updated).
 *
 * Runs seamlessly whether the app is in the foreground (active) or background.
 */

import { AppState, AppStateStatus } from 'react-native';
import { WS_CALLS_URL } from '../constants/env';
import { useCallStore } from '../store/useCallStore';
import { usePresenceStore } from '../store/usePresenceStore';
import { getAuthState } from '../store/useAuthStore';

export type CallWsListener = (event: string, data: any) => void;

let socket: WebSocket | null = null;
let currentUserId: string | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let reconnectAttempts = 0;
let isExplicitlyClosed = false;

const listeners = new Set<CallWsListener>();

/**
 * Initialize and connect WebSocket for the authenticated user
 */
export function initCallWs(userId: string): void {
  if (!userId) return;

  if (socket && currentUserId === userId && socket.readyState === WebSocket.OPEN) {
    return;
  }

  currentUserId = userId;
  isExplicitlyClosed = false;
  connect(userId);
  setupAppStateListener();
}

/**
 * Ensure WebSocket is actively connected, re-connecting if closed.
 */
export function ensureCallWs(userId: string): void {
  if (!userId) return;
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    currentUserId = userId;
    isExplicitlyClosed = false;
    connect(userId);
    setupAppStateListener();
  }
}

/**
 * Disconnect WebSocket (e.g. on logout)
 */
export function disconnectCallWs(): void {
  isExplicitlyClosed = true;
  currentUserId = null;
  clearTimers();
  appStateSubscription?.remove();
  appStateSubscription = null;

  if (socket) {
    try {
      socket.close();
    } catch {
      // Ignore
    }
    socket = null;
  }
}

/**
 * Subscribe to call WebSocket events
 */
export function addCallWsListener(listener: CallWsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Send a message/event over WebSocket to NestJS
 */
export function sendCallWsMessage(event: string, data: any = {}): boolean {
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify({ event, data }));
      return true;
    } catch (err) {
      console.warn('[CallWS] Failed to send message:', err);
    }
  }
  return false;
}

function connect(userId: string): void {
  if (isExplicitlyClosed || !userId) return;

  clearTimers();

  const url = `${WS_CALLS_URL}?userId=${encodeURIComponent(userId)}`;
  console.log(`[CallWS] Connecting to ${url}...`);

  try {
    socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('[CallWS] WebSocket connected successfully');
      reconnectAttempts = 0;

      // Identify the user
      sendCallWsMessage('identify', { userId });

      // Start ping heartbeat
      startPingInterval();
    };

    socket.onmessage = (e: WebSocketMessageEvent) => {
      try {
        if (typeof e.data !== 'string') return;
        const message = JSON.parse(e.data);
        handleWsMessage(message);
      } catch (err) {
        console.warn('[CallWS] Error parsing message:', err, e.data);
      }
    };

    socket.onerror = (e: WebSocketErrorEvent) => {
      console.warn('[CallWS] WebSocket error:', e.message);
    };

    socket.onclose = (e: WebSocketCloseEvent) => {
      console.log(`[CallWS] WebSocket closed: code=${e.code}, reason=${e.reason}`);
      clearTimers();
      socket = null;

      if (!isExplicitlyClosed && currentUserId) {
        scheduleReconnect();
      }
    };
  } catch (err) {
    console.warn('[CallWS] Failed to create WebSocket:', err);
    scheduleReconnect();
  }
}

function handleWsMessage(message: { event?: string; data?: any }): void {
  const { event, data } = message;
  if (!event) return;

  console.log(`[CallWS] Received event: ${event}`, data);

  // Dispatch to registered listeners
  for (const listener of listeners) {
    try {
      listener(event, data);
    } catch (err) {
      console.error('[CallWS] Listener error:', err);
    }
  }

  // Built-in CallStore synchronization
  const store = useCallStore.getState();
  const currentDbCallId = store.call.dbCallId;

  switch (event) {
    case 'call_created':
    case 'incoming_call': {
      // If the user is a callee and there is no active call in progress
      const loggedInUserId = getAuthState().user?.id;
      if (data && loggedInUserId && data.hostId !== loggedInUserId) {
        // Callee received an incoming call notification from DB
        const participant = data.participants?.find((p: any) => p.userId === loggedInUserId);
        if (participant && (data.status === 'INITIATING' || data.status === 'RINGING')) {
          if (store.status === 'idle') {
            const hostParticipant = data.participants?.find((p: any) => p.role === 'HOST');
            store.setCall({
              dbCallId: data.id,
              destination: data.hostId,
              displayName: hostParticipant?.user?.name || 'Incoming call',
              photo: hostParticipant?.user?.photo || null,
              conversationId: data.conversationId || null,
            });
            store.setIsVideo(!!data.isVideo);
            store.setStatus('incoming');
          }
        }
      }
      break;
    }

    case 'call_updated': {
      if (data && data.id === currentDbCallId) {
        if (data.status === 'ACTIVE' && store.status !== 'active') {
          store.setStatus('active');
        } else if (
          data.status === 'ENDED' ||
          data.status === 'CANCELLED' ||
          data.status === 'REJECTED' ||
          data.status === 'MISSED' ||
          data.status === 'FAILED'
        ) {
          if (store.status !== 'idle' && store.status !== 'ended') {
            store.setStatus('ended');
          }
        }
      }
      break;
    }

    case 'call_ended': {
      if (data && (data.id === currentDbCallId || data.callId === currentDbCallId)) {
        if (store.status !== 'idle' && store.status !== 'ended') {
          store.setStatus('ended');
        }
      }
      break;
    }

    case 'sip_presence_updated':
    case 'presence_updated': {
      if (data && (data.userId || data.id)) {
        const targetUserId = data.userId || data.id;
        const isOnline =
          data.isOnline === true ||
          data.status === 'ONLINE' ||
          data.status === 'online';
        const status = data.status || (isOnline ? 'ONLINE' : 'OFFLINE');
        usePresenceStore
          .getState()
          .setPresence(targetUserId, isOnline, status, data.lastHeartbeatAt);
      }
      break;
    }

    case 'pong':
      // Heartbeat response
      break;
  }
}

function startPingInterval(): void {
  if (pingInterval) clearInterval(pingInterval);

  pingInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendCallWsMessage('ping', { timestamp: Date.now() });
    }
  }, 25_000);
}

function scheduleReconnect(): void {
  if (isExplicitlyClosed || !currentUserId || reconnectTimeout) return;

  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10_000);
  console.log(`[CallWS] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})...`);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    if (currentUserId && !isExplicitlyClosed) {
      connect(currentUserId);
    }
  }, delay);
}

function clearTimers(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

function setupAppStateListener(): void {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    console.log(`[CallWS] AppState changed to ${nextState}`);

    if (nextState === 'active' || nextState === 'background') {
      // Ensure connection is alive
      if (currentUserId && !isExplicitlyClosed) {
        if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
          console.log('[CallWS] Re-verifying connection after AppState change...');
          connect(currentUserId);
        } else if (socket.readyState === WebSocket.OPEN) {
          sendCallWsMessage('ping', { appState: nextState });
        }
      }
    }
  });
}
