import { useCallback, useEffect, useMemo, useState } from "react";
import type { Chunk, DayConfig, LogEntry, Order, OrderStatus } from "./types";
import { QA_RATE, TECH_RATE, clamp, uid } from "./types";
import { fmtMedium, todayISO } from "./lib";
import { seedState } from "./data";

export interface AppState {
  orders: Order[];
  chunks: Chunk[];
  dayConfigs: Record<string, DayConfig>;
  createdAt?: string;
}

export const DEFAULT_DAY_CONFIG: DayConfig = {
  techs: 6,
  qa: 2,
  opMin: 480,
  stopMin: 0,
};

export interface Capacity {
  techCap: number;
  qaCap: number;
  cap: number; // cuello de botella = mínima capacidad
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

const STORAGE_KEY = "po-state-v1";
const THEME_KEY = "po-theme";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.orders) && Array.isArray(parsed.chunks)) {
        return { ...parsed, dayConfigs: parsed.dayConfigs ?? {} };
      }
    }
  } catch {
    /* semilla limpia */
  }
  return seedState();
}

export function loadTheme(): "light" | "dark" {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark" || t === "light") return t;
  } catch {
    /* por defecto claro */
  }
  return "light";
}

export function saveTheme(t: "light" | "dark") {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* sin persistencia */
  }
}

function log(text: string, auto = false): LogEntry {
  return { id: uid(), text, at: new Date().toISOString(), auto };
}

function touch(o: Order): Order {
  return { ...o, updatedAt: new Date().toISOString() };
}

export function usePlanner() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }, [state]);

  const patchOrder = useCallback(
    (id: string, patch: Partial<Order>, logText?: string) => {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== id) return o;
          const next = { ...o, ...patch };
          if (logText) next.logs = [log(logText, true), ...o.logs];
          return touch(next);
        }),
      }));
    },
    []
  );

  const api = useMemo(() => {
    const addOrder = (
      data: Omit<Order, "id" | "logs" | "createdAt" | "updatedAt" | "archived">
    ): Order => {
      const o: Order = {
        ...data,
        id: uid(),
        logs: [log("Pedido creado en backlog.", true)],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, orders: [o, ...s.orders] }));
      return o;
    };

    const removeOrder = (id: string) => {
      setState((s) => ({
        ...s,
        orders: s.orders.filter((o) => o.id !== id),
        chunks: s.chunks.filter((c) => c.orderId !== id),
      }));
    };

    const setStatus = (id: string, status: OrderStatus) => {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== id || o.status === status) return o;
          const meta: Record<string, string> = {
            revision: "Estado → Primera Revisión (diagnóstico iniciado).",
            reacondicionamiento: "Estado → Reacondicionamiento activo.",
            qa: "Estado → Control de Calidad y limpieza.",
            empaque: "Estado → Empaque en cajas.",
            despacho: "Estado → Despacho confirmado. Pedido finalizado.",
            backlog: "Estado → devuelto a Pendiente.",
          };
          const next: Order = { ...o, status };
          if (status !== "bloqueado") {
            next.blockReason = undefined;
            next.blockedAt = undefined;
            next.prevStatus = undefined;
          }
          if (status === "despacho") next.progress = 100;
          next.logs = [log(meta[status] ?? `Estado → ${status}`, true), ...o.logs];
          return touch(next);
        }),
      }));
    };

    const blockOrder = (id: string, reason: string) => {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== id) return o;
          const next: Order = {
            ...o,
            prevStatus: o.status === "bloqueado" ? o.prevStatus : o.status,
            status: "bloqueado",
            blockReason: reason,
            blockedAt: new Date().toISOString(),
          };
          next.logs = [log(`Bloqueado: ${reason}.`, true), ...o.logs];
          return touch(next);
        }),
      }));
    };

    const unblockOrder = (id: string) => {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== id || o.status !== "bloqueado") return o;
          const back = o.prevStatus ?? "backlog";
          const next: Order = {
            ...o,
            status: back,
            blockReason: undefined,
            blockedAt: undefined,
            prevStatus: undefined,
          };
          next.logs = [log(`Bloqueo liberado, retoma en ${back === "backlog" ? "pendiente" : back}.`, true), ...o.logs];
          return touch(next);
        }),
      }));
    };

    const addLog = (id: string, text: string) => {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) =>
          o.id === id ? touch({ ...o, logs: [log(text), ...o.logs] }) : o
        ),
      }));
    };

    const addChunk = (orderId: string, date: string, units: number) => {
      const c: Chunk = {
        id: uid(),
        orderId,
        date,
        units: Math.max(1, Math.round(units)),
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, chunks: [...s.chunks, c] }));
      return c;
    };

    const moveChunk = (chunkId: string, date: string) => {
      setState((s) => ({
        ...s,
        chunks: s.chunks.map((c) => (c.id === chunkId ? { ...c, date } : c)),
      }));
    };

    const setChunkUnits = (chunkId: string, units: number) => {
      setState((s) => ({
        ...s,
        chunks: s.chunks.map((c) =>
          c.id === chunkId ? { ...c, units: Math.max(1, Math.round(units)) } : c
        ),
      }));
    };

    const removeChunk = (chunkId: string) => {
      setState((s) => ({ ...s, chunks: s.chunks.filter((c) => c.id !== chunkId) }));
    };

    const splitChunk = (chunkId: string, parts: { date: string; units: number }[]) => {
      setState((s) => {
        const orig = s.chunks.find((c) => c.id === chunkId);
        if (!orig) return s;
        const fresh: Chunk[] = parts.map((p) => ({
          id: uid(),
          orderId: orig.orderId,
          date: p.date,
          units: Math.max(1, Math.round(p.units)),
          createdAt: new Date().toISOString(),
        }));
        const orders = s.orders.map((o) =>
          o.id === orig.orderId
            ? touch({
                ...o,
                logs: [
                  log(`Fracción de ${orig.units} uds dividida en ${parts.length} jornadas (${fmtMedium(p0date(fresh))} en adelante).`, true),
                  ...o.logs,
                ],
              })
            : o
        );
        return {
          ...s,
          chunks: [...s.chunks.filter((c) => c.id !== chunkId), ...fresh],
          orders,
        };
      });
    };

    const confirmDespacho = (id: string) => {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== id) return o;
          const next: Order = {
            ...o,
            status: "despacho",
            progress: 100,
            archived: true,
            blockReason: undefined,
            blockedAt: undefined,
            prevStatus: undefined,
          };
          next.logs = [
            log("Despacho confirmado — el pedido finalizó y salió del backlog.", true),
            ...o.logs,
          ];
          return touch(next);
        }),
      }));
    };

    const setDayConfig = (date: string, cfg: DayConfig) => {
      setState((s) => ({ ...s, dayConfigs: { ...s.dayConfigs, [date]: cfg } }));
    };

    return {
      addOrder,
      removeOrder,
      patchOrder,
      setStatus,
      blockOrder,
      unblockOrder,
      addLog,
      addChunk,
      moveChunk,
      setChunkUnits,
      removeChunk,
      splitChunk,
      confirmDespacho,
      setDayConfig,
    };
  }, [patchOrder]);

  return { state, api };
}

function p0date(chunks: Chunk[]): string {
  return chunks.length ? chunks[0].date : todayISO();
}

export type PlannerApi = ReturnType<typeof usePlanner>["api"];

export { clamp };
