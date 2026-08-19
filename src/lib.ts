import type { Chunk } from "./types";

export const WEEKDAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
export const WEEKDAYS_LONG = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
export const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function todayISO(): string {
  return toISO(new Date());
}

export const isSunday = (iso: string) => parseISO(iso).getDay() === 0;

/** Siguiente día laborable (salta domingos). */
export function nextBiz(iso: string): string {
  let d = addDays(parseISO(iso), 1);
  while (d.getDay() === 0) d = addDays(d, 1);
  return toISO(d);
}

/** Día laborable anterior (salta domingos). */
export function prevBiz(iso: string): string {
  let d = addDays(parseISO(iso), -1);
  while (d.getDay() === 0) d = addDays(d, -1);
  return toISO(d);
}

/** Si cae domingo, corre al lunes. */
export function ensureBiz(iso: string): string {
  return isSunday(iso) ? nextBiz(iso) : iso;
}

/** Ventana de `count` días operativos consecutivos partiendo desde anchor (domingos excluidos). */
export function buildWindow(anchor: string, count = 8): string[] {
  const out: string[] = [];
  let d = parseISO(ensureBiz(anchor));
  while (out.length < count) {
    if (d.getDay() !== 0) out.push(toISO(d));
    d = addDays(d, 1);
  }
  return out;
}

/** n días laborables consecutivos desde una fecha (para datos semilla). */
export function businessDaysFrom(startIso: string, n: number): string[] {
  return buildWindow(startIso, n);
}

export function shiftDays(iso: string, n: number): string {
  return toISO(addDays(parseISO(iso), n));
}

export interface ColDate {
  dow: string; // LUN
  dowLong: string; // lunes
  dnum: string; // 16
  mon: string; // feb
  year: number;
}

export function colDate(iso: string): ColDate {
  const d = parseISO(iso);
  return {
    dow: WEEKDAYS[d.getDay()],
    dowLong: WEEKDAYS_LONG[d.getDay()],
    dnum: String(d.getDate()).padStart(2, "0"),
    mon: MONTHS[d.getMonth()],
    year: d.getFullYear(),
  };
}

export function fmtLong(iso: string): string {
  const c = colDate(iso);
  return `${c.dnum} ${c.mon} ${c.year}`;
}

export function fmtMedium(iso: string): string {
  const c = colDate(iso);
  return `${c.dow.toLowerCase()} ${c.dnum} ${c.mon}`;
}

export function fmtRange(a: string, b: string): string {
  const ca = colDate(a);
  const cb = colDate(b);
  const ya = ca.year === cb.year ? "" : ` ${ca.year}`;
  return `${ca.dnum} ${ca.mon}${ya} — ${cb.dnum} ${cb.mon} ${cb.year}`;
}

export function fmtTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${fmtTime(isoDateTime)}`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("es").format(n);
}

export function pctColor(p: number): "ok" | "warn" | "danger" {
  if (p > 100) return "danger";
  if (p >= 85) return "warn";
  return "ok";
}

/* ── avance del pedido: se deriva de las tarjetas en QA ── */

export function orderQaUnits(chunks: Chunk[]): number {
  return chunks.reduce((a, c) => (c.status === "qa" ? a + c.units : a), 0);
}

/** Avance general (%) = unidades en QA ÷ unidades totales × 100. */
export function orderProgress(totalUnits: number, qaUnits: number): number {
  if (totalUnits <= 0) return 0;
  return Math.min(100, Math.round((qaUnits / totalUnits) * 100));
}
