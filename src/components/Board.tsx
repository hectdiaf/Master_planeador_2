import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Ban,
  Check,
  Pencil,
  Scissors,
  Settings2,
  Trash2,
  Unlock,
} from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Chunk, ChunkStatus, DayConfig, Order } from "../types";
import { FLOW_LABELS, ORDER_COLORS, STATUS_FLOW, STATUS_META } from "../types";
import { colDate, fmtNum, pctColor } from "../lib";
import { DEFAULT_DAY_CONFIG, capacityOf, type PlannerApi } from "../store";
import { Badge, Stepper } from "./ui";

function DayColumn({
  date,
  isToday,
  children,
}: {
  date: string;
  isToday: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[168px] flex-1 flex-col rounded-xl border transition ${
        isToday
          ? "border-accent/55 bg-accent/[0.03] shadow-[inset_0_0_0_1px_var(--sf-accent)]"
          : "border-line bg-panel/70"
      } ${isOver ? "border-accent bg-accent/[0.06]" : ""}`}
    >
      {children}
    </div>
  );
}

function ColumnHeader({
  date,
  isToday,
  assigned,
  cfg,
  onGear,
}: {
  date: string;
  isToday: boolean;
  assigned: number;
  cfg: DayConfig;
  onGear: () => void;
}) {
  const c = colDate(date);
  const cap = capacityOf(cfg);
  const pct = cap.cap > 0 ? (assigned / cap.cap) * 100 : 0;
  const tone = pctColor(pct);
  const hex =
    tone === "danger"
      ? "var(--sf-danger)"
      : tone === "warn"
        ? "var(--sf-warn)"
        : "var(--sf-ok)";

  return (
    <div className="border-b border-line/70 px-2.5 pb-2 pt-2">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-display text-[15px] font-bold uppercase leading-none tracking-wide ${
              isToday ? "text-accent" : ""
            }`}
          >
            {c.dow}
          </span>
          <span className="font-display text-[22px] font-bold leading-none tabular">
            {c.dnum}
          </span>
          <span className="text-[11px] font-medium text-mut">{c.mon}</span>
        </div>
        <div className="flex items-center gap-1">
          {isToday && (
            <span className="rounded-full bg-accent/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider text-accent">
              Hoy
            </span>
          )}
          <button
            onClick={onGear}
            title="Configurar capacidad del día"
            className="grid h-6 w-6 place-items-center rounded-md text-faint transition hover:bg-raise hover:text-ink"
          >
            <Settings2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, pct)}%`, background: hex }}
          />
        </div>
        <span
          className="font-mono text-[10.5px] font-bold tabular"
          style={{ color: hex }}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] tabular text-faint">
        <span>
          {fmtNum(assigned)} / {fmtNum(cap.cap)} uds
        </span>
        {pct > 100 && (
          <span className="flex items-center gap-0.5 font-bold text-danger">
            <AlertTriangle size={9} />
            Sobrecarga
          </span>
        )}
      </div>
    </div>
  );
}

function CardPill({
  chunk,
  order,
  popOpen,
  onTogglePop,
  onClick,
  api,
  onSplit,
  onBlockChunk,
  onDespachoChunk,
  onRemoveChunk,
  notify,
}: {
  chunk: Chunk;
  order: Order;
  popOpen: boolean;
  onTogglePop: () => void;
  onClick: () => void;
  api: PlannerApi;
  onSplit: () => void;
  onBlockChunk: () => void;
  onDespachoChunk: () => void;
  onRemoveChunk: () => void;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chunk:${chunk.id}`,
  });
  const pillRef = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);
  const accent = ORDER_COLORS[order.color];
  const blocked = chunk.status === "bloqueado";
  const done = chunk.status === "despacho";

  // Popover en capa fija (por encima de todas las tarjetas/columnas, sin recortes).
  const togglePop = () => {
    if (popOpen) {
      setPopPos(null);
      onTogglePop();
      return;
    }
    const r = pillRef.current?.getBoundingClientRect();
    if (r) {
      const W = 256;
      const H = 348;
      const left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8);
      const top =
        r.bottom + H + 12 > window.innerHeight
          ? Math.max(8, r.top - H - 8)
          : r.bottom + 6;
      setPopPos({ top, left });
    }
    onTogglePop();
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (pillRef as { current: HTMLDivElement | null }).current = node;
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group relative cursor-grab rounded-lg border border-line bg-panel p-2 shadow-card transition hover:-translate-y-[1px] hover:border-line2 hover:shadow-pop active:cursor-grabbing animate-fade-up ${
        isDragging ? "opacity-40" : ""
      } ${done ? "opacity-80" : ""}`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: accent }}
        >
          {order.code}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePop();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Edición rápida"
          className={`grid h-6 w-6 place-items-center rounded-md transition hover:bg-raise ${
            popOpen ? "bg-raise text-ink" : "text-faint opacity-0 group-hover:opacity-100"
          }`}
        >
          <Pencil size={12} />
        </button>
      </div>

      <p className="truncate text-[12.5px] font-bold leading-tight">{order.client}</p>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="font-mono text-[11px] font-bold tabular">
          {fmtNum(chunk.units)}{" "}
          <span className="font-medium text-faint">/ {fmtNum(order.totalUnits)} uds</span>
        </span>
        <Badge status={chunk.status} size="sm" />
      </div>

      {blocked && (
        <p className="mt-1 truncate text-[9.5px] font-semibold text-danger" title={chunk.blockReason}>
          ⚠ Bloqueado por: {chunk.blockReason}
        </p>
      )}
      {done && (
        <p className="mt-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-ok">
          <Check size={10} /> Finalizado
        </p>
      )}

      {popOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[65]"
              onClick={(e) => {
                e.stopPropagation();
                togglePop();
              }}
            />
            <div
              className="fixed z-[70] w-64 rounded-xl border border-line bg-panel p-3 text-left shadow-pop animate-pop"
              style={{ top: popPos?.top ?? 0, left: popPos?.left ?? 0 }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10.5px] font-bold text-mut">{order.code}</span>
              <Badge status={chunk.status} size="sm" />
            </div>

            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
              Unidades este día
            </span>
            <Stepper
              value={chunk.units}
              onChange={(v) => api.setChunkUnits(chunk.id, v)}
              min={1}
              max={order.totalUnits}
              step={5}
              unit="uds"
            />

            <span className="mb-1 mt-2.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
              Estado de esta tarjeta
            </span>
            <select
              value={chunk.status}
              onChange={(e) => {
                const v = e.target.value as ChunkStatus;
                if (v === "bloqueado") {
                  onTogglePop();
                  onBlockChunk();
                } else if (v === "despacho") {
                  onTogglePop();
                  onDespachoChunk();
                } else {
                  api.setChunkStatus(chunk.id, v);
                  notify(`Tarjeta → ${STATUS_META[v].label}`);
                }
              }}
              className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-[12px] outline-none focus:border-accent"
            >
              {[...STATUS_FLOW, "bloqueado" as ChunkStatus].map((s) => (
                <option key={s} value={s}>
                  {FLOW_LABELS[s]}
                </option>
              ))}
            </select>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  togglePop();
                  onSplit();
                }}
                className="flex items-center justify-center gap-1 rounded-md border border-line px-2 py-1.5 text-[11px] font-semibold text-mut transition hover:border-accent/50 hover:text-accent"
              >
                <Scissors size={11} />
                Dividir
              </button>
              <button
                onClick={() => {
                  togglePop();
                  onRemoveChunk();
                }}
                className="flex items-center justify-center gap-1 rounded-md border border-line px-2 py-1.5 text-[11px] font-semibold text-mut transition hover:border-danger/50 hover:text-danger"
              >
                <Trash2 size={11} />
                Quitar
              </button>
            </div>
            {blocked ? (
              <button
                onClick={() => {
                  api.unblockChunk(chunk.id);
                  notify("Bloqueo liberado.", "ok");
                  onTogglePop();
                }}
                className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border border-ok/40 bg-ok/10 px-2 py-1.5 text-[11px] font-semibold text-ok transition hover:bg-ok/20"
              >
                <Unlock size={11} />
                Liberar bloqueo
              </button>
            ) : (
              <button
                onClick={() => {
                  onTogglePop();
                  onBlockChunk();
                }}
                className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-[11px] font-semibold text-danger transition hover:bg-danger/20"
              >
                <Ban size={11} />
                Bloquear tarjeta
              </button>
            )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export function Board({
  dates,
  chunks,
  ordersById,
  dayConfigs,
  assigned,
  today,
  api,
  notify,
  onCardClick,
  onSplit,
  onBlockChunk,
  onDespachoChunk,
  onRemoveChunk,
  onGear,
  onAssignOrder,
}: {
  dates: string[];
  chunks: Chunk[];
  ordersById: Map<string, Order>;
  dayConfigs: Record<string, DayConfig>;
  assigned: Record<string, number>;
  today: string;
  api: PlannerApi;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
  onCardClick: (orderId: string) => void;
  onSplit: (chunkId: string) => void;
  onBlockChunk: (chunkId: string) => void;
  onDespachoChunk: (chunkId: string) => void;
  onRemoveChunk: (chunkId: string) => void;
  onGear: (date: string) => void;
  onAssignOrder: (orderId: string, date: string) => void;
}) {
  const [popId, setPopId] = useState<string | null>(null);

  return (
    <div className="flex h-full min-w-max gap-2">
      {dates.map((date) => {
        const dayChunks = chunks
          .filter((c) => c.date === date)
          .sort((a, b) => {
            const oa = ordersById.get(a.orderId);
            const ob = ordersById.get(b.orderId);
            return (oa?.code ?? "").localeCompare(ob?.code ?? "");
          });

        return (
          <DayColumn key={date} date={date} isToday={date === today}>
            <ColumnHeader
              date={date}
              isToday={date === today}
              assigned={assigned[date] ?? 0}
              cfg={dayConfigs[date] ?? DEFAULT_DAY_CONFIG}
              onGear={() => onGear(date)}
            />

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
              {dayChunks.length === 0 ? (
                <button
                  onClick={() => onAssignOrder("", date)}
                  className="grid flex-1 place-items-center rounded-lg border border-dashed border-line text-[11px] font-medium text-faint transition hover:border-accent/50 hover:text-accent"
                  style={{ minHeight: 90 }}
                >
                  Suelta un pedido aquí
                </button>
              ) : (
                dayChunks.map((c) => {
                  const order = ordersById.get(c.orderId);
                  if (!order) return null;
                  return (
                    <CardPill
                      key={c.id}
                      chunk={c}
                      order={order}
                      popOpen={popId === c.id}
                      onTogglePop={() => setPopId((p) => (p === c.id ? null : c.id))}
                      onClick={() => onCardClick(order.id)}
                      api={api}
                      onSplit={() => onSplit(c.id)}
                      onBlockChunk={() => onBlockChunk(c.id)}
                      onDespachoChunk={() => onDespachoChunk(c.id)}
                      onRemoveChunk={() => onRemoveChunk(c.id)}
                      notify={notify}
                    />
                  );
                })
              )}
            </div>
          </DayColumn>
        );
      })}
    </div>
  );
}
