import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
  AlertTriangle as TriangleAlert,
} from "lucide-react";
import type { Api } from "../store";
import type { Chunk, DayConfig, Order } from "../types";
import { DEFAULT_DAY, accentOf, clamp } from "../types";
import {
  businessDaysFrom,
  capacityFor,
  colDate,
  fmtNum,
  orderAssigned,
  orderProgress,
  orderRemaining,
  orderUnits,
  prevBiz,
  nextBiz,
  pctColor,
  todayISO,
} from "../lib";
import { Ring, inputCls, labelCls } from "./ui";

type Tab = "backlog" | "capacidad";

/* ── Tarjeta de backlog ─────────────────────────────────────────── */

function BacklogCard({
  order,
  chunks,
  api,
  productName,
  onEdit,
  onOpen,
  notify,
}: {
  order: Order;
  chunks: Chunk[];
  api: Api;
  productName: (id: string) => string;
  onEdit: (id: string) => void;
  onOpen: (id: string) => void;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `o:${order.id}`,
    data: { kind: "order", orderId: order.id },
  });
  const [expanded, setExpanded] = useState(false);
  const [armed, setArmed] = useState(false);

  const total = orderUnits(order);
  const assigned = orderAssigned(chunks, order.id);
  const remaining = orderRemaining(order, chunks);
  const progress = orderProgress(order, chunks);
  const qaUnits = chunks
    .filter((c) => c.orderId === order.id && c.status === "qa")
    .reduce((a, c) => a + c.units, 0);
  const over = assigned > total;
  const accent = accentOf(order.colorIdx);

  const setItemQty = (idx: number, qty: number) => {
    const items = order.items.map((it, i) =>
      i === idx ? { ...it, qty: clamp(Math.round(qty), 1, 9999) } : it
    );
    api.updateOrder(order.id, { items });
  };

  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded-lg border bg-raise/60 transition ${
        isDragging
          ? "border-accent/60 opacity-60 shadow-pop"
          : "border-line hover:border-line2 hover:bg-raise"
      }`}
      style={{ ["--card-accent" as string]: accent }}
    >
      <span
        className="absolute inset-y-2 left-0 w-[3px] rounded-r"
        style={{ background: accent }}
      />
      <div className="flex items-start gap-2 py-2 pl-3 pr-2">
        <button
          {...listeners}
          {...attributes}
          aria-label="Arrastrar al calendario"
          title="Arrastrar a un día del calendario"
          className="mt-0.5 cursor-grab touch-none text-faint transition hover:text-mut active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>

        <button
          onClick={() => onOpen(order.id)}
          className="min-w-0 flex-1 text-left"
          title="Abrir detalle"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10.5px] text-faint">{order.code}</span>
            <span className="truncate text-[13px] font-semibold leading-tight">
              {order.client}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-mut">
            {order.items.map((i) => productName(i.productId)).join(" + ")}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-line px-1.5 py-[1px] text-[10px] font-medium text-mut">
              {order.channel}
            </span>
            <span className="font-mono text-[10.5px] tabular text-mut">
              {fmtNum(total)} uds
            </span>
            {remaining > 0 ? (
              <span
                className="rounded-full px-1.5 py-[1px] text-[10px] font-semibold"
                style={{
                  color: accent,
                  background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                }}
              >
                {fmtNum(remaining)} sin agendar
              </span>
            ) : (
              <span className="rounded-full bg-ok/12 px-1.5 py-[1px] text-[10px] font-semibold text-ok">
                Todo agendado
              </span>
            )}
            {over && (
              <span className="flex items-center gap-0.5 rounded-full bg-danger/12 px-1.5 py-[1px] text-[10px] font-semibold text-danger">
                <TriangleAlert size={10} />
                Sobreasignado
              </span>
            )}
          </div>
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <Ring value={progress} size={40} stroke={4} />
          <span className="font-mono text-[8.5px] uppercase tracking-wide text-faint" title="Avance = uds en QA / uds totales">
            {qaUnits}/{total} QA
          </span>
        </div>
      </div>

      {/* edición rápida */}
      <div className="border-t border-line/70 px-2.5 py-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex h-6 items-center gap-1 rounded px-1.5 text-[10.5px] font-semibold transition hover:bg-panel ${
              expanded ? "text-accent" : "text-faint hover:text-mut"
            }`}
          >
            <SlidersHorizontal size={11} />
            Edición rápida
            <ChevronRight
              size={11}
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={() => onEdit(order.id)}
              aria-label="Editar información del pedido"
              title="Editar información del pedido"
              className="grid h-6 w-6 place-items-center rounded text-faint transition hover:bg-panel hover:text-ink"
            >
              <Pencil size={12} />
            </button>
            {armed ? (
              <button
                onClick={() => {
                  api.removeOrder(order.id);
                  notify(`Pedido ${order.code} eliminado.`, "danger");
                }}
                onMouseLeave={() => setArmed(false)}
                className="h-6 rounded bg-danger px-1.5 text-[10px] font-bold text-white transition hover:brightness-110"
              >
                ¿Confirmar?
              </button>
            ) : (
              <button
                onClick={() => setArmed(true)}
                aria-label="Eliminar pedido"
                title="Eliminar pedido"
                className="grid h-6 w-6 place-items-center rounded text-faint transition hover:bg-danger/12 hover:text-danger"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="flex flex-col gap-2 py-2 animate-fade">
            <div className="flex flex-col gap-1.5">
              <span className={labelCls}>Cantidades por referencia</span>
              {order.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-mut">
                    {productName(it.productId)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setItemQty(idx, it.qty - 5)}
                      className="grid h-6 w-6 place-items-center rounded border border-line bg-panel text-mut transition hover:bg-raise active:scale-95"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={it.qty}
                      min={1}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n)) setItemQty(idx, n);
                      }}
                      className="w-14 rounded border border-line bg-panel px-1 py-0.5 text-center font-mono text-[12px] font-semibold tabular outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => setItemQty(idx, it.qty + 5)}
                      className="grid h-6 w-6 place-items-center rounded border border-line bg-panel text-mut transition hover:bg-raise active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <span className="text-[10px] text-faint">
                Total calculado: <b className="font-mono text-mut">{fmtNum(total)} uds</b>
                {assigned > 0 && (
                  <>
                    {" "}
                    · {fmtNum(assigned)} ya en calendario
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className={labelCls}>Solicitud</span>
                <input
                  type="date"
                  value={order.requestDate}
                  onChange={(e) =>
                    e.target.value &&
                    api.updateOrder(order.id, { requestDate: e.target.value }, "Fecha de solicitud actualizada.")
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <span className={labelCls}>Entrega tent.</span>
                <input
                  type="date"
                  value={order.deliveryDate}
                  onChange={(e) =>
                    e.target.value &&
                    api.updateOrder(order.id, { deliveryDate: e.target.value }, "Fecha tentativa de entrega actualizada.")
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <p className="text-[10px] leading-snug text-faint">
              El estado se gestiona por tarjeta en el calendario — arrastra este
              pedido a un día para asignar unidades.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Panel de capacidad por día ─────────────────────────────────── */

function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 1440,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(clamp(value - 1, min, max))}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-panel text-mut transition hover:bg-raise hover:text-ink active:scale-95"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(clamp(Math.round(n), min, max));
          }}
          className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-center font-mono text-[14px] font-semibold tabular outline-none focus:border-accent"
        />
        <button
          onClick={() => onChange(clamp(value + 1, min, max))}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-panel text-mut transition hover:bg-raise hover:text-ink active:scale-95"
        >
          +
        </button>
        {suffix && <span className="w-9 text-[10.5px] text-faint">{suffix}</span>}
      </div>
    </div>
  );
}

function CapacityPanel({
  date,
  setDate,
  dayConfigs,
  chunks,
  api,
}: {
  date: string;
  setDate: (d: string) => void;
  dayConfigs: Record<string, DayConfig>;
  chunks: Chunk[];
  api: Api;
}) {
  const cfg = dayConfigs[date] ?? DEFAULT_DAY;
  const cap = capacityFor(cfg);
  const assigned = chunks
    .filter((c) => c.date === date)
    .reduce((a, c) => a + c.units, 0);
  const pct = cap.cDia > 0 ? (assigned / cap.cDia) * 100 : assigned > 0 ? 999 : 0;
  const tone = pctColor(pct);
  const toneVar =
    tone === "ok" ? "var(--sf-ok)" : tone === "warn" ? "var(--sf-warn)" : "var(--sf-danger)";
  const strip = businessDaysFrom(prevBiz(date), 10);
  const today = todayISO();
  const c = colDate(date);

  const set = (patch: Partial<DayConfig>) =>
    api.setDayConfig(date, { ...cfg, ...patch });

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setDate(prevBiz(date))}
          className="grid h-7 w-7 place-items-center rounded-md border border-line text-mut transition hover:bg-raise hover:text-ink"
          aria-label="Día anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex flex-1 gap-1 overflow-x-auto pb-0.5">
          {strip.map((d) => {
            const cd = colDate(d);
            const on = d === date;
            return (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={`flex shrink-0 flex-col items-center rounded-md border px-2 py-1 transition ${
                  on
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-line bg-panel text-mut hover:border-line2 hover:text-ink"
                }`}
              >
                <span className="text-[8.5px] font-semibold uppercase">{cd.dow}</span>
                <span className="font-mono text-[11.5px] font-semibold tabular">{cd.dnum}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setDate(nextBiz(date))}
          className="grid h-7 w-7 place-items-center rounded-md border border-line text-mut transition hover:bg-raise hover:text-ink"
          aria-label="Día siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="font-display text-[15px] font-semibold uppercase tracking-wide">
          {c.dowLong} {c.dnum} {c.mon}
        </span>
        {date === today && (
          <span className="rounded-full bg-accent/12 px-2 py-[1px] text-[10px] font-bold uppercase tracking-wide text-accent">
            Hoy
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <NumField label="Técnicos (15 tel/turno)" value={cfg.tecnicos} min={0} max={99} onChange={(v) => set({ tecnicos: v })} />
        <NumField label="QA / Calidad (45 u/turno)" value={cfg.qa} min={0} max={99} onChange={(v) => set({ qa: v })} />
        <NumField label="Minutos operativos" value={cfg.minutos} min={0} max={1440} suffix="min" onChange={(v) => set({ minutos: v })} />
        <NumField label="Paradas / cuellos" value={cfg.paradas} min={0} max={1440} suffix="min" onChange={(v) => set({ paradas: v })} />
      </div>

      <div className="rounded-lg border border-line bg-panel p-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11.5px] tabular">
          <span className="text-mut">C téc = {cfg.tecnicos} × 15</span>
          <span className="text-right font-semibold">{fmtNum(cap.cTec)} uds</span>
          <span className="text-mut">C QC = {cfg.qa} × 45</span>
          <span className="text-right font-semibold">{fmtNum(cap.cQc)} uds</span>
          <span className="text-mut">C instalada = mín(…)</span>
          <span className="text-right font-semibold">{fmtNum(cap.cInst)} uds</span>
          <span className="text-mut">Tiempo efectivo</span>
          <span className="text-right font-semibold">{cap.tiempoEfectivo} / 510 min</span>
          <span className="text-mut">P por hora (C/8.5)</span>
          <span className="text-right font-semibold">{cap.pHora.toFixed(1)} uds/h</span>
        </div>
        <div className="mt-2.5 flex items-end justify-between border-t border-line pt-2.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">
            Capacidad del día
          </span>
          <span className="font-display text-[22px] font-bold leading-none tabular">
            {fmtNum(cap.cDia)}
            <span className="ml-1 text-[11px] font-medium text-mut">uds</span>
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">
            Ocupación planeada
          </span>
          <span className="font-mono text-[13px] font-bold tabular" style={{ color: toneVar }}>
            {Math.round(pct)}%
          </span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, pct)}%`, background: toneVar }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10.5px] tabular text-mut">
          <span>{fmtNum(assigned)} asignadas</span>
          <span>cap. {fmtNum(cap.cDia)}</span>
        </div>
        {pct > 100 && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-danger">
            <TriangleAlert size={12} />
            Día sobrecargado — ajusta recursos o mueve tarjetas.
          </p>
        )}
      </div>

      <p className="text-[10px] leading-snug text-faint">
        Turno 7:40–17:00 · 50 min de pausas incluidas en los 510 min base.
        C<sub>total</sub> = mín(C<sub>téc</sub>, C<sub>QC</sub>) ajustado por tiempo
        efectivo del día.
      </p>
    </div>
  );
}

/* ── Sidebar completo ───────────────────────────────────────────── */

export function Sidebar({
  tab,
  onTab,
  collapsed,
  onToggleCollapse,
  orders,
  chunks,
  dayConfigs,
  api,
  productName,
  capacityDate,
  setCapacityDate,
  onEditOrder,
  onOpenOrder,
  onNewOrder,
  notify,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  orders: Order[];
  chunks: Chunk[];
  dayConfigs: Record<string, DayConfig>;
  api: Api;
  productName: (id: string) => string;
  capacityDate: string;
  setCapacityDate: (d: string) => void;
  onEditOrder: (id: string) => void;
  onOpenOrder: (id: string) => void;
  onNewOrder: () => void;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
}) {
  const sorted = [...orders].sort((a, b) =>
    a.deliveryDate.localeCompare(b.deliveryDate)
  );

  if (collapsed) {
    return (
      <aside className="flex w-11 shrink-0 flex-col items-center gap-2 border-r border-line bg-panel py-2">
        <button
          onClick={onToggleCollapse}
          aria-label="Expandir panel"
          className="grid h-8 w-8 place-items-center rounded-md text-mut transition hover:bg-raise hover:text-ink"
        >
          <PanelLeftOpen size={15} />
        </button>
        <div className="my-1 h-px w-6 bg-line" />
        <button
          onClick={() => {
            onTab("backlog");
            onToggleCollapse();
          }}
          aria-label="Resumen y gestión de pedidos"
          title="Resumen y gestión de pedidos"
          className={`grid h-8 w-8 place-items-center rounded-md transition ${
            tab === "backlog" ? "bg-accent/12 text-accent" : "text-mut hover:bg-raise hover:text-ink"
          }`}
        >
          <Layers size={15} />
        </button>
        <button
          onClick={() => {
            onTab("capacidad");
            onToggleCollapse();
          }}
          aria-label="Configuración de capacidad"
          title="Configuración de capacidad"
          className={`grid h-8 w-8 place-items-center rounded-md transition ${
            tab === "capacidad" ? "bg-accent/12 text-accent" : "text-mut hover:bg-raise hover:text-ink"
          }`}
        >
          <Settings2 size={15} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[330px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        <button
          onClick={() => onTab("backlog")}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[12px] font-semibold transition ${
            tab === "backlog"
              ? "bg-accent/12 text-accent"
              : "text-mut hover:bg-raise hover:text-ink"
          }`}
        >
          <Layers size={13} />
          Resumen
        </button>
        <button
          onClick={() => onTab("capacidad")}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[12px] font-semibold transition ${
            tab === "capacidad"
              ? "bg-accent/12 text-accent"
              : "text-mut hover:bg-raise hover:text-ink"
          }`}
        >
          <Settings2 size={13} />
          Capacidad
        </button>
        <button
          onClick={onToggleCollapse}
          aria-label="Colapsar panel"
          className="grid h-8 w-8 place-items-center rounded-md text-faint transition hover:bg-raise hover:text-ink"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {tab === "backlog" ? (
        <>
          <div className="flex items-center justify-between border-b border-line/70 px-3 py-2">
            <div>
              <span className="text-[12.5px] font-semibold">Backlog &amp; gestión</span>
              <span className="ml-1.5 font-mono text-[11px] tabular text-faint">
                {sorted.length} pedidos
              </span>
            </div>
            <button
              onClick={onNewOrder}
              className="flex h-7 items-center gap-1 rounded-md border border-line px-2 text-[11.5px] font-semibold text-mut transition hover:border-accent/50 hover:text-accent"
            >
              <Plus size={12} />
              Nuevo
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
            <div className="flex flex-col gap-2">
              {sorted.map((o) => (
                <BacklogCard
                  key={o.id}
                  order={o}
                  chunks={chunks}
                  api={api}
                  productName={productName}
                  onEdit={onEditOrder}
                  onOpen={onOpenOrder}
                  notify={notify}
                />
              ))}
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 pb-2 text-center text-[10.5px] text-faint">
              <CalendarClock size={12} />
              Arrastra un pedido hasta un día del calendario para agendarlo.
            </p>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CapacityPanel
            date={capacityDate}
            setDate={setCapacityDate}
            dayConfigs={dayConfigs}
            chunks={chunks}
            api={api}
          />
        </div>
      )}
    </aside>
  );
}
