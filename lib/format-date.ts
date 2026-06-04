const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Stable locale-independent format (avoids Node vs browser hydration mismatches). */
export function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const month = MONTHS[d.getMonth()];
  const day = d.getDate();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
}

/** Calendar day label for grouping daily reports. */
export function formatDateDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  const month = MONTHS[d.getMonth()];
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}
