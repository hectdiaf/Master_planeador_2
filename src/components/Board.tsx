import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  Check,
  Gauge,
  GripVertical,
  Lock,
  Pencil,
  Split,
  Trash2,
  Unlock,
} from "lucide-react";
import type { Chunk, DayConfig, Order, OrderStatus } from "../types";
import {
  FLOW_LABELS,
  ORDER_COLORS,
  STATUS_FLOW,
  STATUS_META,
} from "../types";
import type { PlannerApi } from "../store";
import { DEFAULT_DAY_CONFIG, capacityOf } from "../store";
import { colDate, fmtMedium, fmtNum, pctColor, todayISO } from "../lib";
import type { Toast } from "./ui";
import { Badge, Stepper } from "./ui";

interface PopState {
  chunkId: string;
  x: number;
  y: number;
  up: boolean;
}

export function Board({
  dates,
  chunks,
  ordersById,
  dayConfigs,
  assigned,
  api,
  notify,
  onCardClick,
  onSplit,
  onBlock,
  onUnblock,
  onAssignToDay,
  onAssignOrder,
  onGear,
  onDespacho,
}: {
  dates: string[];
  chunks: Chunk[];
  ordersById: Map<string, Order>;
  dayConfigs: Record<string, DayConfig>;
  assigned: Record<string, number>;
  api: PlannerApi;
  notify: (text: string, tone?: Toast["tone"]) => void;
  onCardClick: (chunk: Chunk) => void;
  onSplit: (chunk: Chunk) => void;
  onBlock: (orderId: string) => void;
  onUnblock: (orderId: string) => void;
  onAssignToDay: (date: string) => void;
  onAssignOrder: (orderId: string, date: string) => void;
  onGear: (date: string) => void;
  onDespacho: (orderId: string) => void;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pop, setPop] = useState<PopState | null>(null);
  const today = todayISO();

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && setPop(null);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, Chunk[]>();
    for (const d of dates) m.set(d, []);
    for (const c of chunks) {
      const arr = m.get(c.date);
      if (arr) arr.push(c);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return m;
  }, [dates, chunks]);

  const popChunk = pop ? chunks.find((c) => c.id === pop.chunkId) ?? null : null;
  const popOrder = popChunk ? ordersById.get(popChunk.orderId) ?? null : null;

  function handleDrop(e: DragEvent, date: string) {
    e.preventDefault();
    setDragOver(null);
    const chunkId = e.dataTransfer.getData("po/chunk");
    const orderId = e.dataTransfer.getData("po/order");
    if (chunkId) {
      const ch = chunks.find((c) => c.id === chunkId);
      if (ch && ch.date !== date) {
        api.moveChunk(chunkId, date);
        notify(`Fracción de ${ch.units} uds movida al ${fmtMedium(date)}.`);
      }
    } else if (orderId) {
      onAssignOrder(orderId, date);
    }
  }

  function openPop(e: React.MouseEvent, chunkId: string) {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const up = r.bottom > window.innerHeight - 330;
    const x = Math.min(Math.max(8, r.left - 220), window.innerWidth - 292);
    setPop({ chunkId, x, y: up ? r.top - 6 : r.bottom + 6, up });
  }

  return (
    <div className="relative flex h-full gap-2.5 overflow-x-auto p-2.5 pr-3">
      {dates.map((date) => {
        const dayChunks = byDate.get(date) ?? [];
        const cfg = dayConfigs[date] ?? DEFAULT_DAY_CONFIG;
        const cap = capacityOf(cfg);
        const load = assigned[date] ?? 0;
        const p = cap.cap > 0 ? (load / cap.cap) * 100 : 0;
        const tone = pctColor(p);
        const cd = colDate(date);
        const isToday = date === today;
        const isOver = dragOver === date;
        const toneColor =
          tone === "danger"
            ? "var(--sf-danger)"
            : tone === "warn"
              ? "var(--sf-warn)"
              : "var(--sf-ok)";

        return (
          <section
            key={date}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOver !== date) setDragOver(date);
            }}
            onDragLeave={(e) => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node))
                setDragOver(null);
            }}
            onDrop={(e) => handleDrop(e, date)}
            className={`flex min-w-[206px] flex-1 flex-col overflow-hidden rounded-xl border transition-colors duration-150 ${
              isOver
                ? "border-accent bg-accent-soft/50"
                : isToday
                  ? "border-accent/55 bg-panel shadow-card"
                  : "border-line bg-panel/70"
            }`}
            style={isToday && !isOver ? { boxShadow: "0 0 0 1px color-mix(in srgb, var(--sf-accent) 35%, transparent), var(--shadow-card)" } : undefined}
          >
            {/* encabezado de columna */}
            <header
              className="shrink-0 border-b border-line px-2.5 pb-2 pt-2"
              style={
                tone === "danger"
                  ? { background: "color-mix(in srgb, var(--sf-danger) 9%, transparent)" }
                  : tone === "warn"
                    ? { background: "color-mix(in srgb, var(--sf-warn) 7%, transparent)" }
                    : undefined
              }
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[21px] font-bold leading-none tracking-wide">
                    {cd.dow} {cd.dnum}
                  </span>
                  <span className="text-[11px] font-medium text-mut">{cd.mon}</span>
                  {isToday && (
                    <span className="ml-0.5 rounded-full bg-accent px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider text-white dark:text-[#0d1512]">
                      Hoy
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onGear(date)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint transition hover:bg-raise hover:text-accent"
                  title="Configurar capacidad de esta jornada"
                >
                  <Gauge size={13.5} />
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, p)}%`, background: toneColor }}
                  />
                </div>
                <span
                  className="font-mono text-[11px] font-bold tabular"
                  style={{ color: toneColor }}
                  title={`Ocupación planeada: ${load} de ${cap.cap} unidades (${Math.round(p)}%)`}
                >
                  {Math.round(p)}%
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-[10.5px] text-mut tabular">
                  {fmtNum(load)}/{fmtNum(cap.cap)} uds
                </span>
                {tone === "danger" ? (
                  <span className="flex items-center gap-1 rounded bg-danger/12 px-1.5 py-[1px] text-[9.5px] font-bold uppercase tracking-wide text-danger">
                    <AlertTriangle size={10} /> Sobrecarga
                  </span>
                ) : (
                  <span className="font-mono text-[9.5px] text-faint">
                    {cfg.techs}T · {cfg.qa}QA · {cap.effMin}′
                  </span>
                )}
              </div>
            </header>

            {/* tarjetas */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {dayChunks.length === 0 && (
                <div
                  className={`grid h-24 place-items-center rounded-lg border border-dashed text-[11px] transition ${
                    isOver ? "border-accent text-accent" : "border-line text-faint"
                  }`}
                >
                  {isOver ? "Suelta para agendar" : "Sin fracciones"}
                </div>
              )}
              {dayChunks.map((c, i) => {
                const o = ordersById.get(c.orderId);
                if (!o) return null;
                return (
                  <OrderCard
                    key={c.id}
                    chunk={c}
                    order={o}
                    index={i}
                    onClick={() => onCardClick(c)}
                    onEdit={(e) => openPop(e, c.id)}
                  />
                );
              })}
            </div>

            <button
              onClick={() => onAssignToDay(date)}
              className="m-2 mt-0 flex shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-line py-1.5 text-[11px] font-semibold text-mut transition hover:border-accent hover:bg-accent-soft/50 hover:text-accent"
            >
              + Asignar pedido
            </button>
          </section>
        );
      })}

      {/* popover de edición rápida */}
      {pop && popChunk && popOrder && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPop(null)} />
          <div
            className="fixed z-50 w-[280px] overflow-hidden rounded-xl border border-line bg-panel shadow-pop animate-pop"
            style={{
              left: pop.x,
              top: pop.y,
              transform: pop.up ? "translateY(-100%)" : undefined,
            }}
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ORDER_COLORS[popOrder.color] }} />
              <span className="font-mono text-[11px] text-mut">{popOrder.code}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
                {popOrder.product}
              </span>
              <Badge status={popOrder.status} size="sm" />
            </div>
            <div className="space-y-2.5 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-medium text-mut">Unidades este día</span>
                <Stepper
                  value={popChunk.units}
                  min={1}
                  max={Math.max(2, popOrder.totalUnits)}
                  step={5}
                  unit="uds"
                  onChange={(v) => api.setChunkUnits(popChunk.id, v)}
                />
              </div>
              <div>
                <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut">
                  Estado del pedido
                </span>
                <select
                  value={popOrder.status}
                  onChange={(e) => {
                    const v = e.target.value as OrderStatus;
                    if (v === "bloqueado") {
                      setPop(null);
                      onBlock(popOrder.id);
                    } else if (v === "despacho") {
                      setPop(null);
                      onDespacho(popOrder.id);
                    } else {
                      if (popOrder.status === "bloqueado") onUnblock(popOrder.id);
                      api.setStatus(popOrder.id, v);
                      notify(`Estado → ${STATUS_META[v].label}`);
                    }
                  }}
                  className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-[12.5px] outline-none focus:border-accent"
                >
                  {([...STATUS_FLOW, "bloqueado"] as OrderStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {FLOW_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setPop(null);
                    onSplit(popChunk);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-line bg-paper px-2 py-1.5 text-[11.5px] font-semibold transition hover:border-accent hover:text-accent"
                >
                  <Split size={13} /> Dividir
                </button>
                {popOrder.status === "bloqueado" ? (
                  <button
                    onClick={() => {
                      onUnblock(popOrder.id);
                      setPop(null);
                      notify("Bloqueo liberado.");
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-ok/40 bg-ok/10 px-2 py-1.5 text-[11.5px] font-semibold text-ok transition hover:bg-ok/20"
                  >
                    <Unlock size={13} /> Liberar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPop(null);
                      onBlock(popOrder.id);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-warn/40 bg-warn/10 px-2 py-1.5 text-[11.5px] font-semibold text-warn transition hover:bg-warn/20"
                  >
                    <Lock size={13} /> Bloquear
                  </button>
                )}
                <button
                  onClick={() => {
                    api.removeChunk(popChunk.id);
                    setPop(null);
                    notify(`Fracción retirada del ${fmtMedium(popChunk.date)}; vuelve al backlog.`, "warn");
                  }}
                  className="col-span-2 flex items-center justify-center gap-1.5 rounded-md border border-danger/35 bg-danger/8 px-2 py-1.5 text-[11.5px] font-semibold text-danger transition hover:bg-danger/15"
                >
                  <Trash2 size={13} /> Quitar del día
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrderCard({
  chunk,
  order,
  index,
  onClick,
  onEdit,
}: {
  chunk: Chunk;
  order: Order;
  index: number;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
}) {
  const hex = ORDER_COLORS[order.color];
  const done = order.status === "despacho";
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("po/chunk", chunk.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-lg border p-2 pl-2.5 shadow-card transition animate-fade-up hover:-translate-y-[1px] hover:shadow-pop active:cursor-grabbing"
      style={{
        animationDelay: `${Math.min(index * 45, 320)}ms`,
        background: `color-mix(in srgb, ${hex} ${done ? 4 : 8}%, var(--sf-panel))`,
        borderColor: `color-mix(in srgb, ${hex} 30%, var(--sf-line))`,
        opacity: done ? 0.82 : 1,
      }}
      title={`${order.code} · ${order.product} — abrir detalle`}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: hex }} />

      <div className="flex items-center justify-between gap-1 pl-1">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{ color: hex }}
        >
          {order.category}
        </span>
        <span className="flex items-center gap-0.5">
          <GripVertical size={12} className="text-faint opacity-0 transition group-hover:opacity-70" />
          <button
            onClick={onEdit}
            aria-label="Edición rápida"
            className="grid h-6 w-6 place-items-center rounded-md text-mut opacity-0 transition hover:bg-raise hover:text-accent group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Pencil size={12.5} />
          </button>
        </span>
      </div>

      <h4 className="mt-0.5 truncate pl-1 text-[13px] font-semibold leading-tight">
        {order.client}
      </h4>
      <p className="truncate pl-1 text-[11px] text-mut">
        {order.product} · <span className="font-mono text-[10px]">{order.code}</span>
      </p>

      <div className="mt-1.5 flex items-center justify-between gap-1 pl-1">
        <Badge status={order.status} size="sm" />
        <span className="flex items-center gap-1 font-mono text-[10.5px] font-semibold tabular" style={{ color: "var(--sf-mut)" }}>
          {done && <Check size={11} style={{ color: "var(--sf-ok)" }} />}
          {chunk.units}/{order.totalUnits} uds
        </span>
      </div>

      {order.status === "bloqueado" && order.blockReason && (
        <p className="mt-1.5 flex items-start gap-1 rounded-md bg-danger/10 px-1.5 py-1 text-[10px] font-medium leading-snug text-danger">
          <AlertTriangle size={10.5} className="mt-px shrink-0" />
          <span className="truncate">Bloqueado por: {order.blockReason}</span>
        </p>
      )}
    </article>
  );
}
