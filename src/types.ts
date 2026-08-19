/** Estado operativo de cada tarjeta/asignación del calendario. */
export type ChunkStatus =
  | "revision"
  | "reacondicionamiento"
  | "qa"
  | "empaque"
  | "despacho"
  | "bloqueado";

export interface LogEntry {
  id: string;
  text: string;
  at: string; // ISO datetime
  auto?: boolean;
}

export interface Order {
  id: string;
  code: string;
  product: string;
  client: string;
  channel: string;
  subchannel: string;
  category: string;
  color: ColorKey;
  totalUnits: number;
  progress: number; // 0..100 (avance general del pedido)
  requestDate: string; // ISO date
  deliveryDate: string; // ISO date
  archived?: boolean; // todas sus tarjetas despachadas: sale del backlog, sigue en calendario
  logs: LogEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Tarjeta / asignación del calendario — el estado vive aquí, no en el pedido. */
export interface Chunk {
  id: string;
  orderId: string;
  date: string; // ISO date (jornada operativa, nunca domingo)
  units: number;
  status: ChunkStatus;
  prevStatus?: ChunkStatus;
  blockReason?: string;
  blockedAt?: string;
  createdAt: string;
}

export interface DayConfig {
  techs: number;
  qa: number;
  opMin: number;
  stopMin: number;
}

export interface Filters {
  client: string; // 'all' o nombre de cliente
  status: string; // 'all' o ChunkStatus
  product: string; // 'all' o producto
}

export type ColorKey =
  | "teal"
  | "sky"
  | "amber"
  | "orange"
  | "rose"
  | "lime"
  | "cyan";

export const ORDER_COLORS: Record<ColorKey, string> = {
  teal: "#0d9488",
  sky: "#0284c7",
  amber: "#d97706",
  orange: "#ea580c",
  rose: "#e11d48",
  lime: "#65a30d",
  cyan: "#0e7490",
};

export const COLOR_KEYS = Object.keys(ORDER_COLORS) as ColorKey[];

export const STATUS_META: Record<
  ChunkStatus,
  { label: string; short: string; hex: string }
> = {
  revision: { label: "Primera Revisión", short: "Revisión", hex: "#0284c7" },
  reacondicionamiento: { label: "Reacondicionamiento", short: "Reac.", hex: "#0d9488" },
  qa: { label: "QA y Limpieza", short: "QA", hex: "#d97706" },
  empaque: { label: "Empaque", short: "Emp.", hex: "#65a30d" },
  despacho: { label: "Despachado", short: "Fin", hex: "#188a4c" },
  bloqueado: { label: "Bloqueado / Pausa", short: "Bloq.", hex: "#d3382f" },
};

/** Flujo operativo en orden (para desgloses y leyendas). */
export const STATUS_FLOW: ChunkStatus[] = [
  "revision",
  "reacondicionamiento",
  "qa",
  "empaque",
  "despacho",
];

export const FLOW_LABELS: Record<ChunkStatus, string> = {
  revision: "Primera revisión",
  reacondicionamiento: "Reacondicionamiento",
  qa: "Control de calidad y limpieza",
  empaque: "Empaque",
  despacho: "Despacho / Terminado",
  bloqueado: "Bloqueado / En pausa",
};

export const BLOCK_REASONS = [
  "Falta de repuestos",
  "Falla en QA",
  "Consulta comercial",
  "Otro",
] as const;

export const CATEGORIES = [
  "Premium",
  "Gama Media",
  "Gama Entrada",
  "Outlet",
  "Lote Corporativo",
  "Lote Mayorista",
];

export const CHANNELS = [
  "Marketplace",
  "Retail",
  "Operador",
  "Mayorista",
  "Corporativo",
];

export const TECH_RATE = 15; // teléfonos/día por técnico
export const QA_RATE = 45; // unidades/día por persona de QA

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
