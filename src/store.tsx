import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Channel,
  Chunk,
  ChunkStatus,
  DayConfig,
  LogEntry,
  Order,
  OrderItem,
} from "./types";
import { STATUS_META, clamp, uid } from "./types";
import { fmtMedium, orderRemaining, orderUnits } from "./lib";
import { seedState } from "./data";

export interface Core {
  orders: Order[];
  chunks: Chunk[];
  dayConfigs: Record<string, DayConfig>;
}

const LS_KEY = "po-refurbi-v3";

function loadInitial(): Core {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Core>;
      if (p && Array.isArray(p.orders) && Array.isArray(p.chunks)) {
        return {
          orders: p.orders,
          chunks: p.chunks,
          dayConfigs: p.dayConfigs ?? {},
        };
      }
    }
  } catch {
    /* seed */
  }
  return seedState();
}

const nowISO = () => new Date().toISOString();
const mkLog = (text: string, auto = true): LogEntry => ({
  id: uid(),
  text,
  at: nowISO(),
  auto,
});
const touch = (o: Order): Order => ({ ...o, updatedAt: nowISO() });
const withLog = (o: Order, text: string, auto = true): Order => ({
  ...touch(o),
  logs: [...o.logs, mkLog(text, auto)],
});

export interface OrderInput {
  client: string;
  channel: Channel;
  requestDate: string;
  deliveryDate: string;
  items: OrderItem[];
}

export interface Api {
  createOrder(input: OrderInput, code: string, colorIdx: number): string;
  updateOrder(id: string, patch: Partial<OrderInput>, note?: string): void;
  removeOrder(id: string): void;
  assignUnits(orderId: string, date: string, units: number): void;
  moveChunk(chunkId: string, date: string): void;
  setChunkUnits(chunkId: string, units: number): void;
  setChunkStatus(chunkId: string, status: ChunkStatus): void;
  blockChunk(chunkId: string, reason: string): void;
  unblockChunk(chunkId: string): void;
  splitChunk(chunkId: string, parts: { date: string; units: number }[]): void;
  removeChunk(chunkId: string): void;
  setDayConfig(date: string, cfg: DayConfig): void;
  addNote(orderId: string, text: string): void;
}

interface CtxValue {
  state: Core;
  api: Api;
  canUndo: boolean;
  undo: () => void;
}

const Ctx = createContext<CtxValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Core>(loadInitial);
  const stateRef = useRef(state);
  const history = useRef<Core[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state]);

  /** Aplica una mutación guardando el estado previo para poder deshacer. */
  const commit = useCallback((fn: (s: Core) => Core) => {
    const prev = stateRef.current;
    history.current.push(prev);
    if (history.current.length > 40) history.current.shift();
    const next = fn(prev);
    stateRef.current = next;
    setState(next);
    setTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    stateRef.current = prev;
    setState(prev);
    setTick((t) => t + 1);
  }, []);

  /* helpers sobre el estado actual */
  const findOrder = (s: Core, id: string) => s.orders.find((o) => o.id === id);
  const findChunk = (s: Core, id: string) => s.chunks.find((c) => c.id === id);
  const patchOrder = (s: Core, id: string, fn: (o: Order) => Order): Core => ({
    ...s,
    orders: s.orders.map((o) => (o.id === id ? fn(o) : o)),
  });
  const patchChunk = (s: Core, id: string, fn: (c: Chunk) => Chunk): Core => ({
    ...s,
    chunks: s.chunks.map((c) => (c.id === id ? fn(c) : c)),
  });

  const api: Api = {
    createOrder(input, code, colorIdx) {
      const id = uid();
      const now = nowISO();
      const total = input.items.reduce((a, i) => a + i.qty, 0);
      const order: Order = {
        id,
        code,
        ...input,
        colorIdx,
        logs: [
          mkLog(
            `Pedido creado — ${total} uds en ${input.items.length} referencia(s).`
          ),
        ],
        createdAt: now,
        updatedAt: now,
      };
      commit((s) => ({ ...s, orders: [...s.orders, order] }));
      return id;
    },

    updateOrder(id, patch, note) {
      commit((s) =>
        patchOrder(s, id, (o) => {
          const next = { ...o, ...patch };
          const total = orderUnits(next);
          const text =
            note ?? `Pedido actualizado — total recalculado: ${total} uds.`;
          return withLog(next, text);
        })
      );
    },

    removeOrder(id) {
      commit((s) => ({
        ...s,
        orders: s.orders.filter((o) => o.id !== id),
        chunks: s.chunks.filter((c) => c.orderId !== id),
      }));
    },

    assignUnits(orderId, date, units) {
      commit((s) => {
        const o = findOrder(s, orderId);
        if (!o) return s;
        const rem = orderRemaining(o, s.chunks);
        if (rem <= 0) return s;
        const n = clamp(Math.round(units), 1, rem);
        const chunk: Chunk = {
          id: uid(),
          orderId,
          date,
          units: n,
          status: "revision",
          createdAt: nowISO(),
        };
        const next: Core = { ...s, chunks: [...s.chunks, chunk] };
        return patchOrder(
          next,
          orderId,
          (ord) =>
            withLog(
              ord,
              `Se asignaron ${n} uds al ${fmtMedium(date)} → Primera Revisión.`
            )
        );
      });
    },

    moveChunk(chunkId, date) {
      commit((s) => {
        const c = findChunk(s, chunkId);
        if (!c || c.date === date) return s;
        const next = patchChunk(s, chunkId, (ch) => ({ ...ch, date }));
        return patchOrder(
          next,
          c.orderId,
          (o) => withLog(o, `Tarjeta de ${c.units} uds movida al ${fmtMedium(date)}.`)
        );
      });
    },

    setChunkUnits(chunkId, units) {
      commit((s) => {
        const c = findChunk(s, chunkId);
        if (!c) return s;
        const o = findOrder(s, c.orderId);
        const rem = o ? orderRemaining(o, s.chunks) : 0;
        const n = clamp(Math.round(units), 1, c.units + rem);
        if (n === c.units) return s;
        return patchChunk(s, chunkId, (ch) => ({ ...ch, units: n }));
      });
    },

    setChunkStatus(chunkId, status) {
      commit((s) => {
        const c = findChunk(s, chunkId);
        if (!c || c.status === status) return s;
        const next = patchChunk(s, chunkId, (ch) => ({
          ...ch,
          status,
          prevStatus: undefined,
          blockReason: undefined,
          blockedAt: undefined,
        }));
        return patchOrder(
          next,
          c.orderId,
          (o) =>
            withLog(
              o,
              `Tarjeta ${fmtMedium(c.date)}: ${c.units} uds → ${STATUS_META[status].label}.`
            )
        );
      });
    },

    blockChunk(chunkId, reason) {
      commit((s) => {
        const c = findChunk(s, chunkId);
        if (!c) return s;
        const next = patchChunk(s, chunkId, (ch) => ({
          ...ch,
          prevStatus: ch.status === "bloqueado" ? ch.prevStatus : ch.status,
          status: "bloqueado",
          blockReason: reason,
          blockedAt: nowISO(),
        }));
        return patchOrder(
          next,
          c.orderId,
          (o) => withLog(o, `Bloqueo (${fmtMedium(c.date)}, ${c.units} uds): ${reason}.`)
        );
      });
    },

    unblockChunk(chunkId) {
      commit((s) => {
        const c = findChunk(s, chunkId);
        if (!c || c.status !== "bloqueado") return s;
        const back = c.prevStatus ?? "revision";
        const next = patchChunk(s, chunkId, (ch) => ({
          ...ch,
          status: back,
          prevStatus: undefined,
          blockReason: undefined,
          blockedAt: undefined,
        }));
        return patchOrder(
          next,
          c.orderId,
          (o) =>
            withLog(
              o,
              `Bloqueo liberado (${fmtMedium(c.date)}, ${c.units} uds) → ${STATUS_META[back].label}.`
            )
        );
      });
    },

    splitChunk(chunkId, parts) {
      commit((s) => {
        const c = findChunk(s, chunkId);
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
          createdAt: nowISO(),
        }));
        const next: Core = {
          ...s,
          chunks: [...s.chunks.filter((x) => x.id !== chunkId), ...created],
        };
        return patchOrder(
          next,
          c.orderId,
          (o) =>
            withLog(
              o,
              `Tarjeta de ${c.units} uds fraccionada en ${parts.length} tarjetas (${parts
                .map((p) => `${p.units} uds`)
                .join(", ")}).`
            )
        );
      });
    },

    removeChunk(chunkId) {
      commit((s) => {
        const c = findChunk(s, chunkId);
        if (!c) return s;
        const next: Core = {
          ...s,
          chunks: s.chunks.filter((x) => x.id !== chunkId),
        };
        return patchOrder(
          next,
          c.orderId,
          (o) =>
            withLog(o, `${c.units} uds del ${fmtMedium(c.date)} devueltas al backlog.`)
        );
      });
    },

    setDayConfig(date, cfg) {
      commit((s) => ({ ...s, dayConfigs: { ...s.dayConfigs, [date]: cfg } }));
    },

    addNote(orderId, text) {
      commit((s) =>
        patchOrder(s, orderId, (o) => ({
          ...touch(o),
          logs: [...o.logs, mkLog(text, false)],
        }))
      );
    },
  };

  return (
    <Ctx.Provider
      value={{
        state,
        api,
        canUndo: history.current.length > 0,
        undo,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): CtxValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return v;
}
