import "server-only";
// Bounded per-instance cache: never stores credentials; access is checked before every lookup.
const entries = new Map<string, { expires: number; value: unknown }>();
export async function cached<T>(
  key: string,
  ttl: number,
  task: () => Promise<T>,
): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await task();
  if (entries.size >= 256) entries.delete(entries.keys().next().value!);
  entries.set(key, { expires: Date.now() + ttl, value });
  return value;
}
const requests = new Map<string, { start: number; count: number }>();
export function withinQuota(user: string) {
  const now = Date.now();
  const slot = requests.get(user);
  if (!slot || now - slot.start > 60000) {
    if (requests.size >= 1024) requests.delete(requests.keys().next().value!);
    requests.set(user, { start: now, count: 1 });
    return true;
  }
  return ++slot.count <= 30;
}
