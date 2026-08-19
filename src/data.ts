import type { Chunk, ChunkStatus, DayConfig, Order } from "./types";
import { uid } from "./types";
import { businessDaysFrom, shiftDays, todayISO } from "./lib";

const base: DayConfig = { techs: 10, qa: 5, opMin: 480, stopMin: 45 };
const D = businessDaysFrom(todayISO(), 10);
const now = new Date().toISOString();
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const mkLog = (text: string, at = now) => ({ id: uid(), text, at, auto: true });

type Base = Pick<
  Order,
  | "product"
  | "client"
  | "channel"
  | "subchannel"
  | "category"
  | "color"
  | "totalUnits"
  | "requestDate"
  | "deliveryDate"
>;

function mkOrder(code: string, b: Base, progress: number, extra: Partial<Order> = {}): Order {
  return {
    id: uid(),
    code,
    progress,
    logs: [mkLog("Pedido creado e importado al plan.")],
    createdAt: ago(6),
    updatedAt: now,
    ...b,
    ...extra,
  };
}

const C = (o: Order, date: string, units: number, status: ChunkStatus, extra: Partial<Chunk> = {}): Chunk => ({
  id: uid(),
  orderId: o.id,
  date,
  units,
  status,
  createdAt: now,
  ...extra,
});

export function makeSeed(): {
  orders: Order[];
  chunks: Chunk[];
  dayConfigs: Record<string, DayConfig>;
} {
  const o1 = mkOrder(
    "PED-2401",
    { product: "iPhone 12 64GB", client: "Claro Colombia", channel: "Operador", subchannel: "Postpago", category: "Premium", color: "teal", totalUnits: 200, requestDate: shiftDays(D[0], -6), deliveryDate: shiftDays(D[0], 7) },
    60
  );
  const o2 = mkOrder(
    "PED-2402",
    { product: "Galaxy S21 128GB", client: "Movistar", channel: "Operador", subchannel: "Prepago", category: "Gama Media", color: "sky", totalUnits: 150, requestDate: shiftDays(D[0], -5), deliveryDate: shiftDays(D[0], 8) },
    35
  );
  const o3 = mkOrder(
    "PED-2403",
    { product: "iPhone 11 64GB", client: "Falabella", channel: "Retail", subchannel: "Tienda física", category: "Premium", color: "amber", totalUnits: 120, requestDate: shiftDays(D[0], -8), deliveryDate: shiftDays(D[0], 4) },
    80
  );
  const o4 = mkOrder(
    "PED-2404",
    { product: "Redmi Note 11", client: "Mercado Libre", channel: "Marketplace", subchannel: "Full", category: "Gama Entrada", color: "orange", totalUnits: 300, requestDate: shiftDays(D[0], -4), deliveryDate: shiftDays(D[0], 10) },
    15
  );
  const o5 = mkOrder(
    "PED-2405",
    { product: "Galaxy A32", client: "Éxito", channel: "Retail", subchannel: "Online", category: "Gama Media", color: "rose", totalUnits: 90, requestDate: shiftDays(D[0], -2), deliveryDate: shiftDays(D[0], 12) },
    0
  );
  const o6 = mkOrder(
    "PED-2406",
    { product: "iPhone XR 64GB", client: "Distrib. Andina", channel: "Mayorista", subchannel: "Regional", category: "Outlet", color: "lime", totalUnits: 250, requestDate: shiftDays(D[0], -7), deliveryDate: shiftDays(D[0], 9) },
    45
  );
  const o7 = mkOrder(
    "PED-2407",
    { product: "Moto G60", client: "Claro Colombia", channel: "Operador", subchannel: "Corporativo", category: "Gama Media", color: "cyan", totalUnits: 180, requestDate: shiftDays(D[0], -12), deliveryDate: shiftDays(D[0], 1) },
    100,
    { archived: true }
  );
  const o8 = mkOrder(
    "PED-2408",
    { product: "iPhone 13 128GB", client: "Falabella", channel: "Retail", subchannel: "Marketplace propio", category: "Premium", color: "teal", totalUnits: 60, requestDate: shiftDays(D[0], -3), deliveryDate: shiftDays(D[0], 11) },
    10
  );
  const o9 = mkOrder(
    "PED-2409",
    { product: "Galaxy S20 FE", client: "Movistar", channel: "Operador", subchannel: "Postpago", category: "Premium", color: "sky", totalUnits: 140, requestDate: shiftDays(D[0], -9), deliveryDate: shiftDays(D[0], 6) },
    50
  );
  const o10 = mkOrder(
    "PED-2410",
    { product: "Redmi 9A", client: "Alkosto", channel: "Retail", subchannel: "Tienda física", category: "Gama Entrada", color: "amber", totalUnits: 400, requestDate: shiftDays(D[0], -5), deliveryDate: shiftDays(D[0], 13) },
    25
  );
  const o11 = mkOrder(
    "PED-2411",
    { product: "iPhone SE 2020", client: "Mercado Libre", channel: "Marketplace", subchannel: "Clásico", category: "Gama Media", color: "orange", totalUnits: 75, requestDate: shiftDays(D[0], -1), deliveryDate: shiftDays(D[0], 14) },
    0
  );
  const o12 = mkOrder(
    "PED-2412",
    { product: "Galaxy A54", client: "Distrib. Andina", channel: "Mayorista", subchannel: "Nacional", category: "Gama Media", color: "rose", totalUnits: 160, requestDate: shiftDays(D[0], -1), deliveryDate: shiftDays(D[0], 15) },
    0
  );

  const orders = [o1, o2, o3, o4, o5, o6, o7, o8, o9, o10, o11, o12];

  // El mismo pedido puede tener tarjetas en procesos distintos al mismo tiempo.
  const chunks: Chunk[] = [
    C(o1, D[0], 50, "reacondicionamiento"),
    C(o1, D[1], 50, "qa"),
    C(o1, D[2], 50, "empaque"),
    C(o2, D[1], 60, "qa"),
    C(o2, D[3], 40, "revision"),
    C(o3, D[0], 100, "empaque"),
    C(o4, D[2], 120, "revision"),
    C(o4, D[4], 80, "reacondicionamiento"),
    C(o6, D[1], 90, "reacondicionamiento"),
    C(o6, D[4], 60, "qa"),
    C(o7, D[0], 180, "despacho"),
    C(o8, D[3], 40, "revision"),
    C(o9, D[2], 70, "bloqueado", {
      prevStatus: "reacondicionamiento",
      blockReason: "Falta de repuestos",
      blockedAt: ago(1),
    }),
    C(o9, D[5], 40, "reacondicionamiento"),
    C(o10, D[5], 100, "reacondicionamiento"),
    C(o10, D[6], 100, "qa"),
  ];

  const dayConfigs: Record<string, DayConfig> = {};
  for (const d of D) dayConfigs[d] = { ...base };
  dayConfigs[D[0]] = { techs: 20, qa: 7, opMin: 480, stopMin: 30 };
  dayConfigs[D[1]] = { techs: 18, qa: 6, opMin: 480, stopMin: 45 };
  dayConfigs[D[2]] = { techs: 16, qa: 5, opMin: 480, stopMin: 50 };

  return { orders, chunks, dayConfigs };
}
