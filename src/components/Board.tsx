import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  AlertTriangle,
  Ban,
  Check,
  MoreHorizontal,
  Plus,
  Scissors,
  Settings2,
  Trash2,
  Unlock,
} from "lucide-react";
import type { Chunk, ChunkStatus, DayConfig, Filters, Order } from "../types";
import { DEFAULT_DAY, FLOW, STATUS_META, accentOf } from "../types";
import {
  capacityFor,
  colDate,
  fmtMedium,
  fmtNum,
  orderRemaining,
  orderUnits,
  pctColor,
  todayISO,
} from "../lib";
import { Badge, Stepper } from "./ui";

/* ── Tarjeta (píldora) ──────────────────────────────────────────── */

function Card({
  chunk,
  order,
  dimmed,
  highlightRing,
  focused,
  onClick,
  onGear,
}: {
  chunk: Chunk;
  order: Order;
  dimmed: boolean;
  highlightRing: boolean;
  focused: boolean;
  onClick: () => void;
  onGear: (rect: DOMRect) => void;
}) {
  const meta = STATUS_META[chunk.status];
  const accent = accentOf(order.colorIdx);
  const total = orderUnits(order);
  const blocked = chunk.status === "bloqueado";
  const done = chunk.status === "despacho";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`group/card relative w-full cursor-pointer rounded-lg border p-2 pl-3 text-left transition-all duration-150 animate-fade ${
        blocked
          ? "border-danger/40 bg-danger/[0.05] hover:border-danger/60"
          : "border-line bg-panel hover:-translate-y-[1px] hover:border-line2 hover:shadow-pop"
      } ${dimmed ? "opacity-25 saturate-50" : ""} ${
        highlightRing ? "ring-2 ring-accent ring-offset-1 ring-offset-paper" : ""
      } ${focused ? "border-accent/70" : ""} ${done ? "opacity-90" : ""}`}
      style={{ boxShadow: `inset 3px 0 0 0 ${accent}` }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 truncate text-[12.5px] font-semibold leading-tight">
          {order.client}
        </span>
        <button
          aria-label="Edición rápida de la tarjeta"
          onClick={(e) => {
            e.stopPropagation();
            onGear((e.currentTarget as HTMLElement).getBoundingClientRect());
          }}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded text-faint transition hover:bg-raise hover:text-ink ${
            dimmed ? "" : "opacity-0 group-hover/card:opacity-100"
          }`}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-[19px] font-bold leading-none tabular">
          {fmtNum(chunk.units)}
        </span>
        <span className="font-mono text-[10px] tabular text-faint">
          / {fmtNum(total)} uds
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Badge status={chunk.status} size="sm" />
        {done && <Check size={11} className="text-ok" />}
      </div>

      {blocked && chunk.blockReason && (
        <p
          className="mt-1 flex items-start gap-1 text-[10px] font-medium leading-snug text-danger"
          title={`Bloqueado: ${chunk.blockReason}`}
        >
          <AlertTriangle size={10} className="mt-[1px] shrink-0" />
          <span className="truncate">Bloqueado: {chunk.blockReason}</span>
        </p>
      )}
      <span className="sr-only">{meta.label}</span>
    </div>
  );
}

/* ── Columna de día ─────────────────────────────────────────────── */

function DayColumn({
  date,
  chunks,
  ordersById,
  dayConfigs,
  filters,
  matchOrder,
  highlight,
  focusChunkId,
  onCardClick,
  onGear,
  onDropChunk,
  onDropOrder,
  onAdd,
  onGearDay,
}: {
  date: string;
  chunks: Chunk[];
  ordersById: Map<string, Order>;
  dayConfigs: Record<string, DayConfig>;
  filters: Filters;
  matchOrder: (o: Order) => boolean;
  highlight: { orderId: string; status: ChunkStatus | "sinAgendar" } | null;
  focusChunkId: string | null;
  onCardClick: (chunk: Chunk) => void;
  onGear: (chunk: Chunk, rect: DOMRect) => void;
  onDropChunk: (chunkId: string, date: string) => void;
  onDropOrder: (orderId: string, date: string) => void;
  onAdd: (date: string) => void;
  onGearDay: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  const cfg = dayConfigs[date] ?? DEFAULT_DAY;
  const cap = capacityFor(cfg);
  const assigned = chunks.reduce((a, c) => a + c.units, 0);
  const pct = cap.cDia > 0 ? (assigned / cap.cDia) * 100 : assigned > 0 ? 999 : 0;
  const tone = pctColor(pct);
  const toneVar =
    tone === "ok" ? "var(--sf-ok)" : tone === "warn" ? "var(--sf-warn)" : "var(--sf-danger)";
  const cd = colDate(date);
  const isToday = date === todayISO();

  const sorted = [...chunks].sort((a, b) => {
    const ia = FLOW.indexOf(a.status as (typeof FLOW)[number]);
    const ib = FLOW.indexOf(b.status as (typeof FLOW)[number]);
    return (ia === -1 ? 2.5 : ia) - (ib === -1 ? 2.5 : ib);
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-1 flex-col rounded-xl border transition-colors ${
        isOver
          ? "border-accent/70 bg-accent/[0.05]"
          : isToday
            ? "border-accent/40 bg-raise/50"
            : "border-line bg-raise/30"
      }`}
    >
      <div className="px-2 pb-1.5 pt-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-display text-[15px] font-bold uppercase leading-none tracking-wide ${
                isToday ? "text-accent" : ""
              }`}
            >
              {cd.dow}
            </span>
            <span className="font-mono text-[11px] tabular text-mut">
              {cd.dnum} {cd.mon}
            </span>
            {isToday && (
              <span className="rounded-full bg-accent px-1.5 py-[1px] text-[8.5px] font-bold uppercase tracking-wider text-white dark:text-[#0d1512]">
                Hoy
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {pct > 100 && (
              <span
                className="flex items-center gap-0.5 rounded-full bg-danger/12 px-1.5 py-[1px] text-[9px] font-bold uppercase text-danger"
                title={`Ocupación ${Math.round(pct)}% — sobre la capacidad de ${cap.cDia} uds`}
              >
                <AlertTriangle size={9} />
                Sobrecarga
              </span>
            )}
            <button
              onClick={() => onGearDay(date)}
              aria-label="Configurar capacidad del día"
              title={`Capacidad: ${cap.cInst} instaladas → ${cap.cDia} uds/día · ${cap.pHora.toFixed(1)} uds/h`}
              className="grid h-5 w-5 place-items-center rounded text-faint transition hover:bg-panel hover:text-ink"
            >
              <Settings2 size={12} />
            </button>
            <button
              onClick={() => onAdd(date)}
              aria-label="Asignar unidades a este día"
              title="Asignar unidades a este día"
              className="grid h-5 w-5 place-items-center rounded text-faint transition hover:bg-panel hover:text-accent"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-paper">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, pct)}%`, background: toneVar }}
            />
          </div>
          <span
            className="w-9 text-right font-mono text-[10.5px] font-bold tabular"
            style={{ color: toneVar }}
          >
            {Math.round(pct)}%
          </span>
        </div>
        <div className="mt-0.5 flex justify-between font-mono text-[9px] tabular text-faint">
          <span>{fmtNum(assigned)} uds</span>
          <span>cap. {fmtNum(cap.cDia)}</span>
        </div>
      </div>

      <div className="flex min-h-[90px] flex-1 flex-col gap-1.5 px-1.5 pb-2">
        {sorted.map((c) => {
          const o = ordersById.get(c.orderId);
          if (!o) return null;
          const orderMatch = matchOrder(o);
          const statusMatch =
            filters.status === "all" || c.status === filters.status;
          const dimmed = !orderMatch || !statusMatch;
          const highlightRing =
            !!highlight &&
            highlight.orderId === c.orderId &&
            highlight.status === c.status;
          return (
            <Card
              key={c.id}
              chunk={c}
              order={o}
              dimmed={dimmed}
              highlightRing={highlightRing}
              focused={focusChunkId === c.id}
              onClick={() => onCardClick(c)}
              onGear={(rect) => onGear(c, rect)}
            />
          );
        })}
        {chunks.length === 0 && (
          <div
            className={`grid flex-1 place-items-center rounded-lg border border-dashed text-[10.5px] transition ${
              isOver ? "border-accent/60 text-accent" : "border-line/80 text-faint"
            }`}
          >
            {isOver ? "Soltar aquí" : "Sin tarjetas"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Popover de edición rápida de tarjeta ───────────────────────── */

function CardPopover({
  chunk,
  order,
  pos,
  remaining,
  onClose,
  onUnits,
  onStatus,
  onBlock,
  onUnblock,
  onSplit,
  onRemove,
}: {
  chunk: Chunk;
  order: Order;
  pos: { x: number; y: number };
  remaining: number;
  onClose: () => void;
  onUnits: (units: number) => void;
  onStatus: (s: ChunkStatus) => void;
  onBlock: () => void;
  onUnblock: () => void;
  onSplit: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", h);
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("mousedown", h);
      window.removeEventListener("keydown", k);
    };
  }, [onClose]);

  const left = Math.min(pos.x, window.innerWidth - 272);
  const top = Math.min(pos.y + 6, window.innerHeight - 330);

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[264px] rounded-xl border border-line bg-panel p-3 shadow-pop animate-pop"
      style={{ left, top }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-faint">
          {order.code} · {fmtMedium(chunk.date)}
        </span>
        <Badge status={chunk.status} size="sm" />
      </div>

      <div className="mb-2">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mut">
          Unidades en este día (máx. {chunk.units + remaining})
        </span>
        <Stepper
          value={chunk.units}
          onChange={onUnits}
          min={1}
          max={chunk.units + remaining}
          step={5}
          unit="uds"
        />
      </div>

      <div className="mb-2">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mut">
          Estado de esta tarjeta
        </span>
        <select
          value={chunk.status}
          onChange={(e) => onStatus(e.target.value as ChunkStatus)}
          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[12.5px] font-medium outline-none focus:border-accent"
        >
          {FLOW.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
          <option value="bloqueado">Bloqueado / Pausa…</option>
        </select>
      </div>

      {chunk.status === "bloqueado" && (
        <button
          onClick={onUnblock}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-ok/40 bg-ok/10 px-2 py-1.5 text-[12px] font-semibold text-ok transition hover:bg-ok/20"
        >
          <Unlock size={13} />
          Liberar bloqueo
        </button>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={onSplit}
          disabled={chunk.units < 2}
          title="Fraccionar en varios días"
          className="flex items-center justify-center gap-1 rounded-md border border-line px-1 py-1.5 text-[11px] font-medium text-mut transition enabled:hover:bg-raise enabled:hover:text-ink disabled:opacity-40"
        >
          <Scissors size={12} />
          Dividir
        </button>
        <button
          onClick={onBlock}
          title={chunk.status === "bloqueado" ? "Cambiar motivo" : "Bloquear tarjeta"}
          className="flex items-center justify-center gap-1 rounded-md border border-line px-1 py-1.5 text-[11px] font-medium text-mut transition hover:bg-raise hover:text-ink"
        >
          <Ban size={12} />
          Bloquear
        </button>
        <button
          onClick={onRemove}
          title="Quitar del día (vuelve al backlog)"
          className="flex items-center justify-center gap-1 rounded-md border border-danger/30 px-1 py-1.5 text-[11px] font-medium text-danger transition hover:bg-danger/10"
        >
          <Trash2 size={12} />
          Quitar
        </button>
      </div>
    </div>
  );
}

/* ── Board ──────────────────────────────────────────────────────── */

export function Board({
  dates,
  chunks,
  ordersById,
  dayConfigs,
  filters,
  matchOrder,
  highlight,
  focusChunkId,
  remainingOf,
  onCardClick,
  onChunkUnits,
  onChunkStatus,
  onBlockChunk,
  onUnblockChunk,
  onSplitChunk,
  onRemoveChunk,
  onDropChunk,
  onDropOrder,
  onAdd,
  onGearDay,
}: {
  dates: string[];
  chunks: Chunk[];
  ordersById: Map<string, Order>;
  dayConfigs: Record<string, DayConfig>;
  filters: Filters;
  matchOrder: (o: Order) => boolean;
  highlight: { orderId: string; status: ChunkStatus | "sinAgendar" } | null;
  focusChunkId: string | null;
  remainingOf: (orderId: string) => number;
  onCardClick: (chunk: Chunk) => void;
  onChunkUnits: (chunkId: string, units: number) => void;
  onChunkStatus: (chunkId: string, status: ChunkStatus) => void;
  onBlockChunk: (chunkId: string) => void;
  onUnblockChunk: (chunkId: string) => void;
  onSplitChunk: (chunkId: string) => void;
  onRemoveChunk: (chunkId: string) => void;
  onDropChunk: (chunkId: string, date: string) => void;
  onDropOrder: (orderId: string, date: string) => void;
  onAdd: (date: string) => void;
  onGearDay: (date: string) => void;
}) {
  const [pop, setPop] = useState<{ chunk: Chunk; x: number; y: number } | null>(null);
  const popChunk = pop ? chunks.find((c) => c.id === pop.chunk.id) ?? null : null;
  const popOrder = popChunk ? ordersById.get(popChunk.orderId) ?? null : null;

  return (
    <div className="relative min-h-0 flex-1">
      <div className="flex h-full min-h-0 gap-2 overflow-x-auto p-3">
        {dates.map((date) => (
          <DayColumn
            key={date}
            date={date}
            chunks={chunks.filter((c) => c.date === date)}
            ordersById={ordersById}
            dayConfigs={dayConfigs}
            filters={filters}
            matchOrder={matchOrder}
            highlight={highlight}
            focusChunkId={focusChunkId}
            onCardClick={onCardClick}
            onGear={(chunk, rect) =>
              setPop({ chunk, x: rect.left, y: rect.bottom })
            }
            onDropChunk={onDropChunk}
            onDropOrder={onDropOrder}
            onAdd={onAdd}
            onGearDay={onGearDay}
          />
        ))}
      </div>

      {pop && popChunk && popOrder && (
        <CardPopover
          chunk={popChunk}
          order={popOrder}
          pos={{ x: pop.x, y: pop.y }}
          remaining={remainingOf(popOrder.id)}
          onClose={() => setPop(null)}
          onUnits={(u) => onChunkUnits(popChunk.id, u)}
          onStatus={(s) => {
            setPop(null);
            onChunkStatus(popChunk.id, s);
          }}
          onBlock={() => {
            setPop(null);
            onBlockChunk(popChunk.id);
          }}
          onUnblock={() => {
            setPop(null);
            onUnblockChunk(popChunk.id);
          }}
          onSplit={() => {
            setPop(null);
            onSplitChunk(popChunk.id);
          }}
          onRemove={() => {
            setPop(null);
            onRemoveChunk(popChunk.id);
          }}
        />
      )}
    </div>
  );
}
