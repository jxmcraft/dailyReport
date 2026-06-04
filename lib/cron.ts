export type CronInterval = "Hourly" | "Daily" | "Weekly";

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** New-agent form: weekly defaults to Monday (cron dow = 1). */
export function buildCronFromFrequency(
  frequency: string,
  time: string,
  dow = 1
): string {
  const [hour, minute] = (time || "07:00").split(":").map(Number);
  if (frequency === "Hourly") return "0 */1 * * *";
  if (frequency === "Weekly") return `${minute} ${hour} * * ${dow}`;
  return `${minute} ${hour} * * *`;
}

export function parseCron(cron: string): {
  interval: CronInterval;
  time: string;
  dow: number;
} {
  const parts = cron.trim().split(/\s+/);
  const [min = "0", hour = "7", , , dowField = "*"] = parts;
  if (hour.startsWith("*/")) {
    return { interval: "Hourly", time: "07:00", dow: 1 };
  }
  const time = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  if (dowField !== "*") {
    return { interval: "Weekly", time, dow: Number(dowField) || 1 };
  }
  return { interval: "Daily", time, dow: 1 };
}

export function toCron(interval: CronInterval, time: string, dow: number): string {
  const [hour, min] = time.split(":").map((v) => Number(v));
  if (interval === "Hourly") return "0 */1 * * *";
  if (interval === "Weekly") return `${min} ${hour} * * ${dow}`;
  return `${min} ${hour} * * *`;
}

export function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, , , dow] = parts;
  const time =
    hour.includes("*") || hour.includes("/")
      ? null
      : `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;

  if (hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`;
  if (dow !== "*") {
    const day = DOW[Number(dow)] ?? `day ${dow}`;
    return time ? `Weekly on ${day} at ${time}` : `Weekly on ${day}`;
  }
  return time ? `Daily at ${time}` : "Daily";
}
