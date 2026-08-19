/* ── Modelo de dominio ────────────────────────────────────────────
   El estado vive en cada tarjeta (Chunk) del calendario, NO en el
   pedido general. Un pedido puede tener unidades en procesos
   distintos simultáneamente.                                */

export type Channel =
  | "Retail"
  | "Open Market"
  | "Ecommerce"
  | "Tiendas propias"
  | "SAC"
  | "Otros";

export const CHANNELS: Channel[] = [
  "Retail",
  "Open Market",
  "Ecommerce",
  "Tiendas propias",
  "SAC",
  "Otros",
];

/** Estados operativos — pertenecen a cada tarjeta del calendario. */
export type ChunkStatus =
  | "revision"
  | "reacondicionamiento"
  | "qa"
  | "empaque"
  | "despacho"
  | "bloqueado";

export interface Product {
  id: string;
  name: string;
}

/** Línea de producto dentro de un pedido (un pedido = N referencias). */
export interface OrderItem {
  productId: string;
  qty: number;
}

export interface LogEntry {
  id: string;
  text: string;
  at: string; // ISO datetime
  auto?: boolean;
}

export interface Order {
  id: string;
  code: string;
  client: string;
  channel: Channel;
  requestDate: string; // ISO date
  deliveryDate: string; // ISO date
  items: OrderItem[]; // unidades totales = suma de items (siempre calculado)
  colorIdx: number;
  logs: LogEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Tarjeta / asignación diaria en el calendario. Estado independiente. */
export interface Chunk {
  id: string;
  orderId: string;
  date: string; // jornada operativa (nunca domingo)
  units: number;
  status: ChunkStatus;
  prevStatus?: ChunkStatus; // para liberar bloqueos
  blockReason?: string;
  blockedAt?: string; // ISO datetime
  createdAt: string;
}

/** Capacidad configurada POR DÍA (no por semana). */
export interface DayConfig {
  tecnicos: number; // 15 teléfonos / turno
  qa: number; // 45 unidades / turno
  minutos: number; // minutos operativos del día (510 = turno 7:40–17:00 menos 50 min de pausas)
  paradas: number; // paradas no programadas / cuellos de botella (min)
}

export const DEFAULT_DAY: DayConfig = {
  tecnicos: 10,
  qa: 5,
  minutos: 510,
  paradas: 50,
};

export const TECH_RATE = 15; // teléfonos por turno por técnico
export const QA_RATE = 45; // unidades por turno por persona de QA
export const BASE_SHIFT_MIN = 510; // 8.5 h efectivas de referencia

export interface Filters {
  client: string; // 'all' o nombre de cliente
  status: string; // 'all' o ChunkStatus
  product: string; // 'all' o producto
}

export const STATUS_META: Record<
  ChunkStatus,
  { label: string; short: string; hex: string }
> = {
  revision: { label: "Primera Revisión", short: "Revisión", hex: "#0284c7" },
  reacondicionamiento: {
    label: "Reacondicionamiento",
    short: "Reac.",
    hex: "#0d9488",
  },
  qa: { label: "QA y Limpieza", short: "QA", hex: "#b45309" },
  empaque: { label: "Empaque", short: "Emp.", hex: "#65a30d" },
  despacho: { label: "Despacho / Terminado", short: "Fin", hex: "#15803d" },
  bloqueado: { label: "Bloqueado / Pausa", short: "Bloq.", hex: "#dc2626" },
};

/** Flujo operativo en orden (checklist y avance de etapas). */
export const FLOW: ChunkStatus[] = [
  "revision",
  "reacondicionamiento",
  "qa",
  "empaque",
  "despacho",
];

export const BLOCK_REASONS = [
  "Falta de repuestos",
  "Falla en QA",
  "Consulta comercial",
  "Otro",
] as const;

/** Paleta de acento por pedido (índice cíclico). */
export const ACCENTS = [
  "#0d9488",
  "#0284c7",
  "#d97706",
  "#ea580c",
  "#e11d48",
  "#65a30d",
  "#0e7490",
  "#a21caf",
];

export const accentOf = (idx: number) => ACCENTS[idx % ACCENTS.length];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
