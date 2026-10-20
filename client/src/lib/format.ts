const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toEnglishDigits(value: string): string {
  let out = "";
  for (const ch of value) {
    const p = PERSIAN_DIGITS.indexOf(ch);
    const a = ARABIC_DIGITS.indexOf(ch);
    if (p >= 0) out += String(p);
    else if (a >= 0) out += String(a);
    else out += ch;
  }
  return out;
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]!);
}

export function normalizeNumericInput(value: string): string {
  const english = toEnglishDigits(value);
  const cleaned = english.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

export function parseNumeric(value: string): number | null {
  const normalized = toEnglishDigits(value).trim();
  if (normalized === "") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

const jalaliDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const jalaliWeekday = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
});

const jalaliShort = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
});

export function formatJalaliDate(iso: string): string {
  return jalaliDate.format(new Date(iso));
}

export function formatWeekday(iso: string): string {
  return jalaliWeekday.format(new Date(iso));
}

export function formatJalaliShort(iso: string): string {
  return jalaliShort.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatWeight(value: number): string {
  return toPersianDigits(Number.isInteger(value) ? String(value) : value.toFixed(1));
}

export function formatVolume(value: number): string {
  const rounded = Math.round(value);
  return toPersianDigits(rounded.toLocaleString("en-US")).replace(/,/g, "٬");
}

export function formatSet(weightKg: number, reps: number): string {
  return `${formatWeight(weightKg)} × ${toPersianDigits(reps)}`;
}
