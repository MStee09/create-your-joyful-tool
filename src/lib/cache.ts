// ============================================================================
// Local storage cache for instant load on slow/rural internet
// ============================================================================

const VERSION = 1;

export type CachePayload = {
  version: number;
  savedAt: string;
  data: any;
};

function keyFor(userId: string) {
  return `farmcalc-cache-v${VERSION}:${userId}`;
}

export function loadCache(userId: string): any | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (parsed.version !== VERSION) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveCache(userId: string, data: any) {
  try {
    const payload: CachePayload = {
      version: VERSION,
      savedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(keyFor(userId), JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
}

export function clearCache(userId: string) {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
}

export function getCacheInfo(userId: string): { savedAt: string | null; sizeKb: number } {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { savedAt: null, sizeKb: 0 };
    const parsed = JSON.parse(raw) as CachePayload;
    return {
      savedAt: parsed.savedAt,
      sizeKb: Math.round(raw.length / 1024),
    };
  } catch {
    return { savedAt: null, sizeKb: 0 };
  }
}
