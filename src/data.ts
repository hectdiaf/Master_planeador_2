import type {
  Channel,
  Chunk,
  ChunkStatus,
  DayConfig,
  Order,
  OrderItem,
  Product,
} from "./types";
import { DEFAULT_DAY } from "./types";
import { ensureBiz, shiftBiz, todayISO } from "./lib";

export const PRODUCTS: Product[] = [
  { id: "p01", name: "iPhone 11 64GB" },
  { id: "p02", name: "iPhone 12 64GB" },
  { id: "p03", name: "iPhone 13 128GB" },
  { id: "p04", name: "iPhone XR 64GB" },
  { id: "p05", name: "iPhone SE 2022 64GB" },
  { id: "p06", name: "Galaxy S21 128GB" },
  { id: "p07", name: "Galaxy S22 128GB" },
  { id: "p08", name: "Galaxy A32 64GB" },
  { id: "p09", name: "Galaxy A54 128GB" },
  { id: "p10", name: "Redmi Note 11 128GB" },
  { id: "p11", name: "Redmi 9A 32GB" },
  { id: "p12", name: "Moto G60 128GB" },
  { id: "p13", name: "Tecno Spark 20 128GB" },
  { id: "p14", name: "Tecno Camon 30 256GB" },
];

export const productName = (id: string): string =>
  PRODUCTS.find((p) => p.id === id)?.name ?? "Referencia";

export interface SeedState {
  orders: Order[];
  chunks: Chunk[];
  dayConfigs: Record<string, DayConfig>;
}

export function seedState(): SeedState {
  const today = ensureBiz(todayISO());
  /** día laborable relativo a hoy (−3…+5) */
  const d = (n: number) => shiftBiz(today, n);
  const ts = (hoursAgo: number) =>
    new Date(Date.now() - hoursAgo * 3600_000).toISOString();

  let oc = 0;
  const mkOrder = (
    code: string,
    client: string,
    channel: Channel,
    reqOffset: number,
    delOffset: number,
    items: OrderItem[],
    colorIdx: number,
    logs: Order["logs"] = []
  ): Order => ({
    id: `o${++oc}`,
    code,
    client,
    channel,
    requestDate: d(reqOffset),
    deliveryDate: d(delOffset),
    items,
    colorIdx,
    logs,
    createdAt: ts(72 + oc * 5),
    updatedAt: ts(2 + oc),
  });

  const orders: Order[] = [
    mkOrder("PED-101", "Claro Colombia", "Retail", -6, 5, [{ productId: "p02", qty: 200 }], 0, [
      { id: "l1", text: "Lote recibido en planta, 200 uds verificadas en recepción.", at: ts(70), auto: true },
      { id: "l2", text: "Cliente solicita priorizar unidades con pantalla original.", at: ts(30) },
    ]),
    mkOrder("PED-102", "Falabella", "Ecommerce", -5, 6, [{ productId: "p06", qty: 150 }], 1),
    mkOrder("PED-103", "Tigo", "Retail", -4, 7, [{ productId: "p10", qty: 120 }], 2),
    mkOrder("PED-104", "Almacenes Éxito", "Retail", -4, 8, [
      { productId: "p01", qty: 80 },
      { productId: "p08", qty: 40 },
    ], 3),
    mkOrder("PED-105", "WOM", "Open Market", -3, 4, [{ productId: "p12", qty: 100 }], 4, [
      { id: "l3", text: "40 uds detenidas: falla de cámara detectada en QA.", at: ts(20), auto: true },
    ]),
    mkOrder("PED-106", "Alkosto", "Open Market", -7, 9, [
      { productId: "p13", qty: 120 },
      { productId: "p14", qty: 80 },
    ], 5),
    mkOrder("PED-107", "MercadoLibre", "Ecommerce", -9, -1, [{ productId: "p04", qty: 90 }], 6, [
      { id: "l4", text: "90 uds despachadas — entregado al transportador.", at: ts(26), auto: true },
    ]),
    mkOrder("PED-108", "Movistar", "Retail", -2, 9, [{ productId: "p07", qty: 60 }], 7),
    mkOrder("PED-109", "Claro Colombia", "Tiendas propias", -2, 10, [{ productId: "p05", qty: 45 }], 1),
    mkOrder("PED-110", "Almacenes Éxito", "SAC", -1, 11, [{ productId: "p11", qty: 150 }], 2),
    mkOrder("PED-111", "Falabella", "Ecommerce", -1, 12, [{ productId: "p09", qty: 70 }], 3),
    mkOrder("PED-112", "Tigo", "Otros", 0, 13, [{ productId: "p03", qty: 110 }], 4),
  ];

  let cc = 0;
  const mkChunk = (
    orderId: string,
    date: string,
    units: number,
    status: ChunkStatus,
    extra?: Partial<Chunk>
  ): Chunk => ({
    id: `c${++cc}`,
    orderId,
    date,
    units,
    status,
    createdAt: ts(48 - cc),
    ...extra,
  });

  const chunks: Chunk[] = [
    // PED-101 · 200 uds → 60 en QA (avance 30%), 70 en reacond., 70 sin agendar
    mkChunk("o1", d(-1), 60, "qa"),
    mkChunk("o1", d(0), 70, "reacondicionamiento"),
    // PED-102 · 150 uds → 60 QA (40%), 60 empaque
    mkChunk("o2", d(0), 60, "qa"),
    mkChunk("o2", d(1), 60, "empaque"),
    // PED-103 · 120 uds en primera revisión (día de crunch)
    mkChunk("o3", d(4), 120, "revision"),
    // PED-104 · 120 uds → 40 reac / 30 QA (25%) / 30 empaque
    mkChunk("o4", d(-1), 40, "reacondicionamiento"),
    mkChunk("o4", d(2), 30, "qa"),
    mkChunk("o4", d(3), 30, "empaque"),
    // PED-105 · 100 uds → 40 bloqueadas por falla en QA + 60 en reacond.
    mkChunk("o5", d(-2), 40, "bloqueado", {
      prevStatus: "qa",
      blockReason: "Falla en QA",
      blockedAt: ts(20),
    }),
    mkChunk("o5", d(1), 60, "reacondicionamiento"),
    // PED-106 · 200 uds → 50 despacho / 50 empaque / 50 QA (25%) / 50 revisión
    mkChunk("o6", d(-2), 50, "despacho"),
    mkChunk("o6", d(2), 50, "qa"),
    mkChunk("o6", d(3), 50, "empaque"),
    mkChunk("o6", d(4), 50, "revision"),
    // PED-107 · 90 uds despachadas (permanece en calendario)
    mkChunk("o7", d(-3), 90, "despacho"),
  ];

  const dayConfigs: Record<string, DayConfig> = {};
  for (let i = -4; i <= 9; i++) dayConfigs[d(i)] = { ...DEFAULT_DAY };
  // Día de crunch: capacidad reducida para evidenciar sobrecarga
  dayConfigs[d(4)] = { tecnicos: 6, qa: 3, minutos: 510, paradas: 50 };

  return { orders, chunks, dayConfigs };
}
