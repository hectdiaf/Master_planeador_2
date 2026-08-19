import type { AppState } from "./store";
import type { Chunk, DayConfig, Order, OrderStatus } from "./types";
import { uid } from "./types";
import { businessDaysFrom, ensureBiz, shiftDays, todayISO } from "./lib";

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const now = () => new Date().toISOString();

function order(
  o: Partial<Order> &
    Pick<Order, "code" | "product" | "client" | "channel" | "totalUnits" | "color">
): Order {
  return {
    id: uid(),
    subchannel: "—",
    category: "Gama Media",
    progress: 0,
    requestDate: shiftDays(todayISO(), -5),
    deliveryDate: shiftDays(todayISO(), 7),
    status: "backlog" as OrderStatus,
    logs: [],
    createdAt: ago(120),
    updatedAt: ago(3),
    ...o,
  } as Order;
}

function chunk(orderId: string, date: string, units: number, h: number): Chunk {
  return { id: uid(), orderId, date: ensureBiz(date), units, createdAt: ago(h) };
}

export function seedState(): AppState {
  const d = businessDaysFrom(todayISO(), 14);

  const o1 = order({
    code: "OP-2481", product: "iPhone 11 64GB", client: "Mercado Libre",
    channel: "Marketplace", subchannel: "Mercado Libre Full", category: "Premium",
    color: "teal", totalUnits: 200, progress: 35, status: "revision",
    requestDate: shiftDays(d[0], -4), deliveryDate: d[6],
    logs: [
      { id: uid(), text: "Ingreso de 200 unidades desde CEDIS norte.", at: ago(52), auto: true },
      { id: uid(), text: "Diagnóstico iniciado en 35% del lote, 12 equipos con falla de batería.", at: ago(6) },
    ],
    createdAt: ago(52), updatedAt: ago(6),
  });

  const o2 = order({
    code: "OP-2477", product: "Galaxy A32", client: "Falabella",
    channel: "Retail", subchannel: "Tienda física", category: "Gama Media",
    color: "sky", totalUnits: 120, progress: 70, status: "qa",
    requestDate: shiftDays(d[0], -7), deliveryDate: d[4],
    logs: [{ id: uid(), text: "Lote en verificación QA, limpieza profunda en curso.", at: ago(20), auto: true }],
    createdAt: ago(160), updatedAt: ago(20),
  });

  const o3 = order({
    code: "OP-2470", product: "Redmi Note 10", client: "Claro",
    channel: "Operador", subchannel: "Postpago", category: "Gama Entrada",
    color: "amber", totalUnits: 300, progress: 45, status: "reacondicionamiento",
    requestDate: shiftDays(d[0], -9), deliveryDate: d[9],
    logs: [{ id: uid(), text: "Cambio de módulo de carga en 40 unidades.", at: ago(28), auto: true }],
    createdAt: ago(220), updatedAt: ago(28),
  });

  const o4 = order({
    code: "OP-2466", product: "iPhone XR", client: "Ripley",
    channel: "Retail", subchannel: "Online", category: "Premium",
    color: "rose", totalUnits: 80, progress: 88, status: "empaque",
    requestDate: shiftDays(d[0], -12), deliveryDate: d[3],
    logs: [{ id: uid(), text: "Cajas máster listas, pendiente sello de seguridad.", at: ago(10), auto: true }],
    createdAt: ago(300), updatedAt: ago(10),
  });

  const o5 = order({
    code: "OP-2459", product: "Galaxy S20 FE", client: "Entel",
    channel: "Operador", subchannel: "Postpago", category: "Premium",
    color: "orange", totalUnits: 150, progress: 40,
    status: "bloqueado", prevStatus: "reacondicionamiento",
    blockReason: "Falta de repuestos",
    blockedAt: ago(20),
    requestDate: shiftDays(d[0], -8), deliveryDate: d[8],
    logs: [
      { id: uid(), text: "Reacondicionamiento al 40%, 60 equipos con pantalla dañada.", at: ago(46), auto: true },
      { id: uid(), text: "Bloqueado: Falta de repuestos — pantallas SM-G780 en espera de proveedor (ETA 5 días).", at: ago(20), auto: true },
    ],
    createdAt: ago(260), updatedAt: ago(20),
  });

  const o6 = order({
    code: "OP-2454", product: "Moto G30", client: "Mercado Libre",
    channel: "Marketplace", subchannel: "Publicación clásica", category: "Gama Entrada",
    color: "lime", totalUnits: 90, progress: 0, status: "backlog",
    requestDate: shiftDays(d[0], -2), deliveryDate: d[7],
    logs: [{ id: uid(), text: "Pedido recibido, pendiente recepción física del lote.", at: ago(30), auto: true }],
    createdAt: ago(30), updatedAt: ago(30),
  });

  const o7 = order({
    code: "OP-2450", product: "iPhone 12", client: "Falabella",
    channel: "Retail", subchannel: "Marketplace Falabella", category: "Premium",
    color: "cyan", totalUnits: 60, progress: 0, status: "backlog",
    requestDate: shiftDays(d[0], -1), deliveryDate: d[9],
    logs: [{ id: uid(), text: "Cliente solicita gradación estética A/B por unidad.", at: ago(18) }],
    createdAt: ago(22), updatedAt: ago(18),
  });

  const o8 = order({
    code: "OP-2447", product: "Galaxy A52", client: "Tottus",
    channel: "Mayorista", subchannel: "Lote B2B", category: "Lote Mayorista",
    color: "sky", totalUnits: 220, progress: 15, status: "revision",
    requestDate: shiftDays(d[0], -6), deliveryDate: d[11],
    logs: [{ id: uid(), text: "Recepción completa, diagnóstico en primera estación.", at: ago(40), auto: true }],
    createdAt: ago(140), updatedAt: ago(40),
  });

  const o9 = order({
    code: "OP-2439", product: "iPhone 8", client: "Claro",
    channel: "Operador", subchannel: "Renovación de flota", category: "Outlet",
    color: "teal", totalUnits: 90, progress: 100, status: "despacho", archived: true,
    requestDate: shiftDays(d[0], -15), deliveryDate: d[6],
    logs: [
      { id: uid(), text: "Empaque completado: 9 cajas máster de 10 unidades.", at: ago(50), auto: true },
      { id: uid(), text: "Despacho confirmado — entregado al operador. Pedido finalizado.", at: ago(30), auto: true },
    ],
    createdAt: ago(400), updatedAt: ago(30),
  });

  const o10 = order({
    code: "OP-2435", product: "Redmi 9A", client: "Ripley",
    channel: "Retail", subchannel: "Online", category: "Gama Entrada",
    color: "lime", totalUnits: 160, progress: 52, status: "reacondicionamiento",
    requestDate: shiftDays(d[0], -10), deliveryDate: d[10],
    logs: [{ id: uid(), text: "84 unidades reacondicionadas, 76 en línea de reparación.", at: ago(14), auto: true }],
    createdAt: ago(320), updatedAt: ago(14),
  });

  const o11 = order({
    code: "OP-2431", product: "Galaxy M32", client: "Entel",
    channel: "Corporativo", subchannel: "Flota empresas", category: "Lote Corporativo",
    color: "cyan", totalUnits: 75, progress: 0, status: "backlog",
    requestDate: todayISO(), deliveryDate: d[12],
    logs: [{ id: uid(), text: "Solicitud corporativa nueva, esperar orden de compra firmada.", at: ago(8) }],
    createdAt: ago(8), updatedAt: ago(8),
  });

  const o12 = order({
    code: "OP-2428", product: "iPhone SE 2020", client: "Mercado Libre",
    channel: "Marketplace", subchannel: "Mercado Libre Full", category: "Premium",
    color: "orange", totalUnits: 100, progress: 63, status: "qa",
    requestDate: shiftDays(d[0], -11), deliveryDate: d[5],
    logs: [{ id: uid(), text: "QA reporta 4 equipos con micrófono fuera de especificación.", at: ago(12) }],
    createdAt: ago(340), updatedAt: ago(12),
  });

  const orders = [o1, o2, o3, o4, o5, o6, o7, o8, o9, o10, o11, o12];

  const chunks: Chunk[] = [
    chunk(o1.id, d[0], 50, 48), chunk(o1.id, d[1], 50, 48), chunk(o1.id, d[2], 50, 48),
    chunk(o2.id, d[1], 60, 44),
    chunk(o3.id, d[0], 30, 40), chunk(o3.id, d[3], 70, 40),
    chunk(o4.id, d[2], 40, 36),
    chunk(o5.id, d[7], 75, 30),
    chunk(o8.id, d[4], 60, 26),
    chunk(o9.id, d[6], 90, 50),
    chunk(o10.id, d[5], 60, 22),
    chunk(o12.id, d[2], 40, 18),
  ];

  const cfg = (techs: number, qa: number, opMin = 480, stopMin = 0): DayConfig => ({
    techs, qa, opMin, stopMin,
  });

  const dayConfigs: Record<string, DayConfig> = {
    [d[0]]: cfg(6, 2),
    [d[1]]: cfg(6, 2),
    [d[2]]: cfg(6, 2),
    [d[3]]: cfg(7, 3),
    [d[4]]: cfg(5, 2),
    [d[5]]: cfg(6, 2, 480, 45),
    [d[6]]: cfg(6, 2),
    [d[7]]: cfg(6, 2),
  };

  return { orders, chunks, dayConfigs, createdAt: now() };
}
