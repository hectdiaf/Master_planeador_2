import type { Chunk, ChunkStatus, DayConfig, Order } from "./types";
import { BASE_SHIFT_MIN, QA_RATE, TECH_RATE } from "./types";

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

/** n días laborables consecutivos desde una fecha. */
export function businessDaysFrom(startIso: string, n: number): string[] {
  return buildWindow(startIso, n);
}

export function shiftDays(iso: string, n: number): string {
  return toISO(addDays(parseISO(iso), n));
}

/** Desplaza n días laborables (salta domingos). */
export function shiftBiz(iso: string, n: number): string {
  let out = iso;
  if (n > 0) for (let i = 0; i < n; i++) out = nextBiz(out);
  else for (let i = 0; i < -n; i++) out = prevBiz(out);
  return out;
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

/* ── Capacidad instalada por día (lean) ───────────────────────────
   Turno 7:40–17:00 · 30 min almuerzo + 20 min descanso = 510 min.
   C_téc = N_téc × 15      C_QC = N_QC × 45
   C_total = mín(C_téc, C_QC)      P_hora = C_total / 8.5
   La capacidad del día se ajusta por tiempo efectivo:
   C_día = C_total × (minutos − paradas) / 510                     */

export interface CapacityInfo {
  cTec: number;
  cQc: number;
  cInst: number; // cuello de botella = mín(cTec, cQc)
  tiempoEfectivo: number; // minutos − paradas
  cDia: number; // capacidad ajustada del día
  pHora: number; // producción por hora efectiva
}

export function capacityFor(cfg: DayConfig): CapacityInfo {
  const cTec = cfg.tecnicos * TECH_RATE;
  const cQc = cfg.qa * QA_RATE;
  const cInst = Math.min(cTec, cQc);
  const tiempoEfectivo = Math.max(0, cfg.minutos - cfg.paradas);
  const cDia = Math.round((cInst * tiempoEfectivo) / BASE_SHIFT_MIN);
  const pHora = cInst / 8.5;
  return { cTec, cQc, cInst, tiempoEfectivo, cDia, pHora };
}

/* ── Derivados de pedido (siempre calculados, nunca digitados) ─── */

export const orderUnits = (o: Order): number =>
  o.items.reduce((a, i) => a + i.qty, 0);

export const chunksOf = (chunks: Chunk[], orderId: string): Chunk[] =>
  chunks.filter((c) => c.orderId === orderId);

export const orderAssigned = (chunks: Chunk[], orderId: string): number =>
  chunksOf(chunks, orderId).reduce((a, c) => a + c.units, 0);

export const orderRemaining = (o: Order, chunks: Chunk[]): number =>
  Math.max(0, orderUnits(o) - orderAssigned(chunks, o.id));

/** Avance general = unidades en QA / unidades totales × 100. */
export function orderProgress(o: Order, chunks: Chunk[]): number {
  const total = orderUnits(o);
  if (total <= 0) return 0;
  const qa = chunksOf(chunks, o.id)
    .filter((c) => c.status === "qa")
    .reduce((a, c) => a + c.units, 0);
  return Math.min(100, Math.round((qa / total) * 100));
}

/** Desglose dinámico de unidades por proceso (+ sin agendar). */
export function unitsByStatus(
  o: Order,
  chunks: Chunk[]
): Record<ChunkStatus | "sinAgendar", number> {
  const out: Record<ChunkStatus | "sinAgendar", number> = {
    revision: 0,
    reacondicionamiento: 0,
    qa: 0,
    empaque: 0,
    despacho: 0,
    bloqueado: 0,
    sinAgendar: 0,
  };
  for (const c of chunksOf(chunks, o.id)) out[c.status] += c.units;
  out.sinAgendar = orderRemaining(o, chunks);
  return out;
}
