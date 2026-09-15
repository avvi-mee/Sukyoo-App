/**
 * Whole days from today to a date, negative once past.
 *
 * Compared at UTC midnight rather than by subtracting timestamps, so a licence
 * or document expiring "today" reads as 0 rather than as -1 late in the evening
 * — which is the difference between a warning and a false alarm.
 */
export function daysUntil(isoDate: string) {
  const target = Date.parse(`${isoDate}T00:00:00Z`);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}
