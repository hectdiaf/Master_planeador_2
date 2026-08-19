import type { Channel, Chunk, ChunkStatus, DayConfig, Order } from "./types";
import { uid } from "./types";
import { businessDaysFrom, shiftDays, todayISO } from "./lib";

const base: DayConfig = { techs: 10, qa: 5, opMin: 510, stopMin: 50 };
const D = businessDaysFrom(todayISO(), 10);
const now = new Date().toISOString();
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const mkLog = (text: string, at = now) => ({ id: uid(), text, at, auto: true });

interface Prod {
  name: string;
  qty: number;
}

function mkOrder(
  code: string,
  client: string,
  channel: Channel,
  color: Order["color"],
  products: Prod[],
  extra: Partial<Order> = {}
): Order {
  const items = products.map((p) => ({ id: uid(), ...p }));
  return {
    id: uid(),
    code,
    client,
    channel,
    color,
    products: items,
    product: items.map((p) => p.name).join(" + "),
    totalUnits: items.reduce((a, p) => a + p.qty, 0),
    requestDate: shiftDays(D[0], -5),
    deliveryDate: shiftDays(D[0], 8),
    logs: [mkLog("Pedido creado e importado al plan.")],
    createdAt: ago(6),
    updatedAt: now,
    ...extra,
  };
}

const C = (
  o: Order,
  date: string,
  units: number,
  status: ChunkStatus,
  extra: Partial<Chunk> = {}
): Chunk => ({
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
    "PED-2401", "Claro Colombia", "Open Market", "teal",
    [
      { name: "iPhone 12 64GB", qty: 120 },
      { name: "iPhone 12 128GB", qty: 80 },
    ],
    { requestDate: shiftDays(D[0], -6), deliveryDate: shiftDays(D[0], 7) }
  );
  const o2 = mkOrder(
    "PED-2402", "Movistar", "Open Market", "sky",
    [{ name: "Galaxy S21 128GB", qty: 100 }],
    { requestDate: shiftDays(D[0], -5), deliveryDate: shiftDays(D[0], 8) }
  );
  const o3 = mkOrder(
    "PED-2403", "Falabella", "Retail", "amber",
    [{ name: "iPhone 11 64GB", qty: 120 }],
    { requestDate: shiftDays(D[0], -8), deliveryDate: shiftDays(D[0], 4) }
  );
  const o4 = mkOrder(
    "PED-2404", "Mercado Libre", "Ecommerce", "orange",
    [{ name: "Redmi Note 11", qty: 300 }],
    { requestDate: shiftDays(D[0], -4), deliveryDate: shiftDays(D[0], 10) }
  );
  const o5 = mkOrder(
    "PED-2405", "Éxito", "Retail", "rose",
    [{ name: "Galaxy A32", qty: 90 }],
    { requestDate: shiftDays(D[0], -2), deliveryDate: shiftDays(D[0], 12) }
  );
  const o6 = mkOrder(
    "PED-2406", "Distrib. Andina", "Otros", "lime",
    [{ name: "iPhone XR 64GB", qty: 250 }],
    { requestDate: shiftDays(D[0], -7), deliveryDate: shiftDays(D[0], 9) }
  );
  const o7 = mkOrder(
    "PED-2407", "Claro Colombia", "SAC", "cyan",
    [{ name: "Moto G60", qty: 40 }],
    { requestDate: shiftDays(D[0], -12), deliveryDate: shiftDays(D[0], 1), archived: true }
  );
  const o8 = mkOrder(
    "PED-2408", "Falabella", "Tiendas propias", "teal",
    [{ name: "iPhone 13 128GB", qty: 60 }],
    { requestDate: shiftDays(D[0], -3), deliveryDate: shiftDays(D[0], 11) }
  );
  const o9 = mkOrder(
    "PED-2409", "Movistar", "Ecommerce", "sky",
    [{ name: "Galaxy S20 FE", qty: 140 }],
    { requestDate: shiftDays(D[0], -9), deliveryDate: shiftDays(D[0], 6) }
  );
  const o10 = mkOrder(
    "PED-2410", "Alkosto", "Retail", "amber",
    [{ name: "Redmi 9A", qty: 400 }],
    { requestDate: shiftDays(D[0], -5), deliveryDate: shiftDays(D[0], 13) }
  );
  const o11 = mkOrder(
    "PED-2411", "Mercado Libre", "Ecommerce", "orange",
    [{ name: "iPhone SE 2020", qty: 75 }],
    { requestDate: shiftDays(D[0], -1), deliveryDate: shiftDays(D[0], 14) }
  );
  const o12 = mkOrder(
    "PED-2412", "Distrib. Andina", "Otros", "rose",
    [{ name: "Galaxy A54 5G", qty: 160 }],
    { requestDate: shiftDays(D[0], -1), deliveryDate: shiftDays(D[0], 15) }
  );

  const orders = [o1, o2, o3, o4, o5, o6, o7, o8, o9, o10, o11, o12];

  const chunks: Chunk[] = [
    // PED-2401: mismo pedido en tres procesos distintos a la vez
    C(o1, D[0], 50, "reacondicionamiento"),
    C(o1, D[1], 50, "qa"),
    C(o1, D[2], 50, "empaque"),
    // PED-2402
    C(o2, D[1], 45, "qa"),
    C(o2, D[3], 30, "revision"),
    // PED-2403
    C(o3, D[0], 70, "empaque"),
    // PED-2404
    C(o4, D[2], 60, "revision"),
    C(o4, D[4], 40, "revision"),
    // PED-2406: una tarjeta bloqueada, otra en curso
    C(o6, D[1], 30, "reacondicionamiento"),
    C(o6, D[4], 30, "bloqueado", {
      prevStatus: "reacondicionamiento",
      blockReason: "Falta de repuestos",
      blockedAt: ago(1),
    }),
    // PED-2407: finalizado
    C(o7, D[0], 40, "despacho"),
    // PED-2408
    C(o8, D[3], 40, "revision"),
    // PED-2409
    C(o9, D[2], 25, "qa"),
    C(o9, D[5], 20, "reacondicionamiento"),
    // PED-2410
    C(o10, D[5], 60, "reacondicionamiento"),
    C(o10, D[6], 50, "revision"),
  ];

  // Todos los días con la configuración por defecto:
  // 10 técnicos · 5 QA · 510 min operativos · 50 min de paradas.
  const dayConfigs: Record<string, DayConfig> = {};
  for (const d of D) dayConfigs[d] = { ...base };

  return { orders, chunks, dayConfigs };
}
