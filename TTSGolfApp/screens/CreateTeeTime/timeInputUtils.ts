/**
 * Parse typed tee time for Create flow. Returns canonical display string "h:mm AM/PM"
 * (hour 1–12, no leading zero on hour) or null if invalid.
 */
export function parseFlexibleTeeTime(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  const withPeriod = s.match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM|A\.M\.|P\.M\.)\s*$/i);
  if (withPeriod) {
    let h = parseInt(withPeriod[1], 10);
    const min = parseInt(withPeriod[2], 10);
    const apRaw = withPeriod[3].replace(/\./g, "").toUpperCase();
    const ap = apRaw.startsWith("P") ? "PM" : "AM";
    if (h < 1 || h > 12 || min > 59 || min < 0) return null;
    return `${h}:${String(min).padStart(2, "0")} ${ap}`;
  }

  const twentyFour = s.match(/^(\d{1,2}):(\d{1,2})\s*$/);
  if (twentyFour) {
    const h24 = parseInt(twentyFour[1], 10);
    const min = parseInt(twentyFour[2], 10);
    if (h24 < 0 || h24 > 23 || min > 59 || min < 0) return null;
    return toTwelveHourDisplay(h24, min);
  }

  return null;
}

function toTwelveHourDisplay(h24: number, minute: number): string {
  const ap = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${ap}`;
}
