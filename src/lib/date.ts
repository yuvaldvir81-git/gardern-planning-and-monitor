/** Whole days between a "YYYY-MM-DD" date and today, computed in UTC to avoid timezone drift from date-only parsing. */
export function daysSince(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const planted = Date.UTC(year, month - 1, day);

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.max(0, Math.round((today - planted) / 86_400_000));
}
