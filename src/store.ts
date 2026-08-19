import { useEffect, useMemo, useState } from "react";
import type {
  Chunk,
  ChunkStatus,
  ColorKey,
  DayConfig,
  LogEntry,
  Order,
} from "./types";
import { QA_RATE, STATUS_META, TECH_RATE, clamp, uid } from "./types";
import { fmtMedium } from "./lib";
import { makeSeed } from "./data";

export interface PlannerState {
  orders: Order[];
  chunks: Chunk[];
  dayConfigs: Record<string, DayConfig>;
}

export const DEFAULT_DAY_CONFIG: DayConfig = {
  techs: 10,
  qa: 5,
  opMin: 480,
  stopMin: 45,
};

export interface Capacity {
  techCap: number;
  qaCap: number;
  cap: number;
  effMin: number;
}

export function capacityOf(cfg: DayConfig): Capacity {
  const techCap = cfg.techs * TECH_RATE;
  const qaCap = cfg.qa * QA_RATE;
  return {
    techCap,
    qaCap,
    cap: Math.min(techCap, qaCap),
    effMin: Math.max(0, cfg.opMin - cfg.stopMin),
  };
}

export interface OrderInput {
  code: string;
  product: string;
  client: string;
  channel: string;
  subchannel: string;
  category: string;
  color: ColorKey;
  totalUnits: number;
  requestDate: string;
  deliveryDate: string;
}

export interface PlannerApi {
  updateOrder(id: string, patch: Partial<Order>, logText?: string): void;
  addNote(id: string, text: string): void;
  removeOrder(id: string): void;
  createOrder(input: OrderInput): void;
  assign(orderId: string, date: string, units: number): void;
  setChunkUnits(chunkId: string, units: number): void;
  setChunkStatus(chunkId: string, status: ChunkStatus): void;
  blockChunk(chunkId: string, reason: string): void;
  unblockChunk(chunkId: string): void;
  confirmDespachoChunk(chunkId: string): void;
  moveChunk(chunkId: string, date: string): void;
  splitChunk(chunkId: string, parts: { date: string; units: number }[]): void;
  removeChunk(chunkId: string): void;
  setDayConfig(date: string, patch: Partial<DayConfig>): void;
}

const STORAGE_KEY = "po-planner-v3";

function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlannerState;
      const valid =
        Array.isArray(parsed.orders) &&
        Array.isArray(parsed.chunks) &&
        !!parsed.dayConfigs &&
        parsed.chunks.every((c) => typeof c.status === "string");
      if (valid) return parsed;
    }
  } catch {
    /* datos corruptos o de una versión previa: re-sembrar */
  }
  return makeSeed();
}

const touch = (o: Order): Order => ({ ...o, updatedAt: new Date().toISOString() });

const withLog = (o: Order, text: string): Order => {
  const entry: LogEntry = { id: uid(), text, at: new Date().toISOString(), auto: true };
  return touch({ ...o, logs: [...o.logs, entry] });
};

export function usePlanner(): PlannerState & { api: PlannerApi } {
  const [state, setState] = useState<PlannerState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* sin espacio: ignorar */
    }
  }, [state]);

  const api = useMemo<PlannerApi>(() => {
    const patchOrder = (
      s: PlannerState,
      id: string,
      fn: (o: Order) => Order
    ): PlannerState => ({
      ...s,
      orders: s.orders.map((o) => (o.id === id ? fn(o) : o)),
    });

    const patchChunk = (
      s: PlannerState,
      chunkId: string,
      fn: (c: Chunk) => Chunk
    ): PlannerState => ({
      ...s,
      chunks: s.chunks.map((c) => (c.id === chunkId ? fn(c) : c)),
    });

    const chunkAction = (
      s: PlannerState,
      chunkId: string,
      fn: (c: Chunk) => Chunk,
      log: (c: Chunk) => string
    ): PlannerState => {
      const c = s.chunks.find((x) => x.id === chunkId);
      if (!c) return s;
      const next = patchChunk(s, chunkId, fn);
      return patchOrder(next, c.orderId, (o) => withLog(o, log(c)));
    };

    return {
      updateOrder(id, patch, logText) {
        setState((s) =>
          patchOrder(s, id, (o) =>
            withLog({ ...o, ...patch }, logText ?? "Información del pedido actualizada.")
          )
        );
      },

      addNote(id, text) {
        setState((s) =>
          patchOrder(s, id, (o) =>
            touch({
              ...o,
              logs: [...o.logs, { id: uid(), text, at: new Date().toISOString() }],
            })
          )
        );
      },

      removeOrder(id) {
        setState((s) => ({
          ...s,
          orders: s.orders.filter((o) => o.id !== id),
          chunks: s.chunks.filter((c) => c.orderId !== id),
        }));
      },

      createOrder(input) {
        const nowIso = new Date().toISOString();
        const order: Order = {
          id: uid(),
          ...input,
          progress: 0,
          logs: [{ id: uid(), text: "Pedido creado manualmente.", at: nowIso, auto: true }],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        setState((s) => ({ ...s, orders: [order, ...s.orders] }));
      },

      assign(orderId, date, units) {
        setState((s) => {
          const chunk: Chunk = {
            id: uid(),
            orderId,
            date,
            units,
            status: "revision",
            createdAt: new Date().toISOString(),
          };
          return {
            ...patchOrder(s, orderId, (o) =>
              withLog(o, `${units} uds asignadas al ${fmtMedium(date)} → Primera Revisión.`)
            ),
            chunks: [...s.chunks, chunk],
          };
        });
      },

      setChunkUnits(chunkId, units) {
        setState((s) =>
          chunkAction(
            s,
            chunkId,
            (c) => ({ ...c, units: clamp(units, 1, 99999) }),
            (c) => `Unidades de la tarjeta del ${fmtMedium(c.date)} ajustadas a ${units}.`
          )
        );
      },

      setChunkStatus(chunkId, status) {
        setState((s) =>
          chunkAction(
            s,
            chunkId,
            (c) =>
              c.status === status
                ? c
                : {
                    ...c,
                    status,
                    prevStatus: undefined,
                    blockReason: undefined,
                    blockedAt: undefined,
                  },
            (c) =>
              `Tarjeta del ${fmtMedium(c.date)} (${c.units} uds) → ${STATUS_META[status].label}.`
          )
        );
      },

      blockChunk(chunkId, reason) {
        setState((s) =>
          chunkAction(
            s,
            chunkId,
            (c) => ({
              ...c,
              prevStatus: c.status === "bloqueado" ? c.prevStatus : c.status,
              status: "bloqueado",
              blockReason: reason,
              blockedAt: new Date().toISOString(),
            }),
            (c) => `Tarjeta del ${fmtMedium(c.date)} (${c.units} uds) bloqueada — motivo: ${reason}.`
          )
        );
      },

      unblockChunk(chunkId) {
        setState((s) =>
          chunkAction(
            s,
            chunkId,
            (c) => ({
              ...c,
              status: c.prevStatus ?? "revision",
              prevStatus: undefined,
              blockReason: undefined,
              blockedAt: undefined,
            }),
            (c) =>
              `Bloqueo liberado en tarjeta del ${fmtMedium(c.date)} → ${
                STATUS_META[c.prevStatus ?? "revision"].label
              }.`
          )
        );
      },

      confirmDespachoChunk(chunkId) {
        setState((s) => {
          const c = s.chunks.find((x) => x.id === chunkId);
          if (!c) return s;
          const next = patchChunk(s, chunkId, (x) => ({
            ...x,
            status: "despacho",
            prevStatus: undefined,
            blockReason: undefined,
            blockedAt: undefined,
          }));
          const siblings = next.chunks.filter((x) => x.orderId === c.orderId);
          const allDone = siblings.every((x) => x.status === "despacho");
          return patchOrder(next, c.orderId, (o) =>
            withLog(
              allDone ? { ...o, archived: true, progress: 100 } : o,
              allDone
                ? `Tarjeta del ${fmtMedium(c.date)} despachada (${c.units} uds). Pedido finalizado — sale del backlog.`
                : `Tarjeta del ${fmtMedium(c.date)} despachada (${c.units} uds).`
            )
          );
        });
      },

      moveChunk(chunkId, date) {
        setState((s) =>
          chunkAction(
            s,
            chunkId,
            (c) => (c.date === date ? c : { ...c, date }),
            (c) => `Tarjeta de ${c.units} uds movida al ${fmtMedium(date)}.`
          )
        );
      },

      splitChunk(chunkId, parts) {
        setState((s) => {
          const c = s.chunks.find((x) => x.id === chunkId);
          if (!c) return s;
          const created: Chunk[] = parts.map((p) => ({
            id: uid(),
            orderId: c.orderId,
            date: p.date,
            units: p.units,
            status: c.status,
            prevStatus: c.prevStatus,
            blockReason: c.blockReason,
            blockedAt: c.blockedAt,
            createdAt: new Date().toISOString(),
          }));
          const next = {
            ...s,
            chunks: [...s.chunks.filter((x) => x.id !== chunkId), ...created],
          };
          return patchOrder(next, c.orderId, (o) =>
            withLog(o, `Tarjeta de ${c.units} uds dividida en ${parts.length} fracciones.`)
          );
        });
      },

      removeChunk(chunkId) {
        setState((s) => {
          const c = s.chunks.find((x) => x.id === chunkId);
          if (!c) return s;
          const next = { ...s, chunks: s.chunks.filter((x) => x.id !== chunkId) };
          return patchOrder(next, c.orderId, (o) =>
            withLog(o, `Se quitaron ${c.units} uds del ${fmtMedium(c.date)}.`)
          );
        });
      },

      setDayConfig(date, patch) {
        setState((s) => ({
          ...s,
          dayConfigs: {
            ...s.dayConfigs,
            [date]: { ...(s.dayConfigs[date] ?? DEFAULT_DAY_CONFIG), ...patch },
          },
        }));
      },
    };
  }, []);

  return { ...state, api };
}

export function loadTheme(): "light" | "dark" {
  try {
    return localStorage.getItem("po-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(t: "light" | "dark"): void {
  try {
    localStorage.setItem("po-theme", t);
  } catch {
    /* ignorar */
  }
}
