const WIB_TIMEZONE = "Asia/Jakarta";

function getWibParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  // Handle midnight hour "24" edge case in some ICU builds
  const hour = map.hour === "24" ? "00" : map.hour;
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour,
    minute: map.minute,
    second: map.second,
  };
}

export function getWibDateString(date: Date = new Date()): string {
  const p = getWibParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Hari presensi di-reset setiap pukul 04:00 WIB (bukan 00:00 WIB).
 * Pukul 00:00 - 03:59 WIB masih dihitung sebagai hari presensi sebelumnya.
 */
export function getAttendanceDateString(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() - 4 * 60 * 60 * 1000);
  return getWibDateString(shifted);
}

export function getWibIsoString(date: Date = new Date()): string {
  const p = getWibParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+07:00`;
}

export function getWibDisplayDateTime(date: Date = new Date()): string {
  const p = getWibParts(date);
  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateText = dateFormatter.format(date);
  return `${dateText} • ${p.hour}:${p.minute}:${p.second} WIB`;
}
