const STORAGE_KEY = 'aulasync-llaves-offline-v1';
const EVENT_NAME = 'aulasync:llaves-offline-updated';

function isBrowser() {
  return typeof window !== 'undefined';
}

function readQueue() {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function generateClientEventId() {
  return `llave-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOfflineEntregas() {
  return readQueue();
}

export function subscribeOfflineEntregas(listener) {
  if (!isBrowser()) return () => {};

  const handler = () => listener(readQueue());
  window.addEventListener('storage', handler);
  window.addEventListener(EVENT_NAME, handler);

  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(EVENT_NAME, handler);
  };
}

export function queueEntregaOffline(payload) {
  const queue = readQueue();
  const item = {
    ...payload,
    client_event_id: payload.client_event_id || generateClientEventId(),
    offline_created_at: payload.offline_created_at || new Date().toISOString(),
    queued_at: payload.queued_at || new Date().toISOString(),
    last_error: payload.last_error || '',
  };

  queue.unshift(item);
  writeQueue(queue);
  return item;
}

export function removeOfflineEntrega(clientEventId) {
  const nextQueue = readQueue().filter((item) => item.client_event_id !== clientEventId);
  writeQueue(nextQueue);
  return nextQueue;
}

export async function syncOfflineEntregas(sendFn) {
  const orderedQueue = readQueue().sort(
    (a, b) => new Date(a.queued_at || 0).getTime() - new Date(b.queued_at || 0).getTime()
  );

  if (!orderedQueue.length) {
    return { synced: 0, pending: 0, failed: [] };
  }

  const remaining = [];
  const failed = [];
  let synced = 0;

  for (let index = 0; index < orderedQueue.length; index += 1) {
    const item = orderedQueue[index];

    try {
      await sendFn(item);
      synced += 1;
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'No se pudo sincronizar el registro';
      const updatedItem = {
        ...item,
        last_error: message,
        last_attempt_at: new Date().toISOString(),
      };

      remaining.push(updatedItem);
      failed.push(updatedItem);

      if (!error?.response) {
        remaining.push(...orderedQueue.slice(index + 1));
        break;
      }
    }
  }

  writeQueue(remaining);
  return {
    synced,
    pending: remaining.length,
    failed,
  };
}
