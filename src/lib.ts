import type { Chunk, ChunkStatus } from "./types";

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

/* ── avance del pedido: se deriva de las tarjetas en QA y Empaque ── */

/** Unidades avanzadas: en Control de Calidad o en sus procesos posteriores. */
export function orderDoneUnits(chunks: Chunk[]): number {
  return chunks.reduce(
    (a, c) =>
      c.status === "qa" || c.status === "empaque" || c.status === "despacho"
        ? a + c.units
        : a,
    0
  );
}

/** Avance general (%) = (uds en QA + Empaque + Despacho) ÷ unidades totales × 100. */
export function orderProgress(totalUnits: number, doneUnits: number, finalized = false): number {
  if (finalized) return 100;
  if (totalUnits <= 0) return 0;
  return Math.min(100, Math.round((doneUnits / totalUnits) * 100));
}

/* ── ocupación por día: cuenta el trabajo real de cada jornada ── */

/**
 * Carga de unidades por día. Incluye tanto las tarjetas presentes en la jornada
 * como los pasos históricos (trail) de lotes que ya avanzaron al día siguiente:
 * la ocupación de un día no baja cuando su lote pasa al siguiente proceso.
 */
export function loadByDate(chunks: Chunk[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const c of chunks) {
    m[c.date] = (m[c.date] ?? 0) + c.units;
    for (const t of c.trail ?? []) {
      // evita doble conteo si el lote fue devuelto manualmente a un día ya recorrido
      if (t.date !== c.date) m[t.date] = (m[t.date] ?? 0) + t.units;
    }
  }
  return m;
}

export interface DailyCapacityLoad {
  tech: Record<string, number>;
  qa: Record<string, number>;
}

/**
 * Clasificación de carga por proceso. El modelo actual no tiene un estado de
 * "alistamiento" separado; `qa` representa QA y limpieza y consume QA.
 */
export function capacityAreaForStatus(status: ChunkStatus): "tech" | "qa" | null {
  if (status === "reacondicionamiento") return "tech";
  if (status === "revision" || status === "qa" || status === "empaque") return "qa";
  return null;
}

/**
 * Carga diaria separada por equipo. Conserva los pasos históricos para que
 * una jornada no pierda carga cuando un lote avanza al día siguiente.
 */
export function capacityLoadByDate(chunks: Chunk[]): DailyCapacityLoad {
  const loads: DailyCapacityLoad = { tech: {}, qa: {} };
  const add = (date: string, units: number, status: ChunkStatus | undefined) => {
    if (!status) return;
    const area = capacityAreaForStatus(status);
    if (area) loads[area][date] = (loads[area][date] ?? 0) + units;
  };

  for (const c of chunks) {
    // Una tarjeta bloqueada conserva la etapa que tenía antes del bloqueo.
    add(c.date, c.units, c.status === "bloqueado" ? c.prevStatus : c.status);
    for (const t of c.trail ?? []) add(t.date, t.units, t.status);
  }
  return loads;
}
