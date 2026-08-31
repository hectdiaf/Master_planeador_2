import { useMemo, useState } from "react";
import {
  CalendarPlus,
  ClipboardList,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Settings2,
  Trash2,
} from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import type { Chunk, DayConfig, Order } from "../types";
import { ORDER_COLORS } from "../types";
import { capacityLoadByDate, colDate, fmtNum, orderProgress, pctColor, todayISO } from "../lib";
import { DEFAULT_DAY_CONFIG, capacityOf, type PlannerApi } from "../store";
import { Ring, Stepper, inputCls } from "./ui";

export type Tab = "backlog" | "capacidad";

function BacklogCard({
  o,
  sched,
  doneUnits,
  api,
  notify,
  onEditOrder,
  onAssign,
  firstDay,
}: {
  o: Order;
  sched: number;
  doneUnits: number;
  api: PlannerApi;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
  onEditOrder: (id: string) => void;
  onAssign: (orderId: string, date: string) => void;
  firstDay: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `order:${o.id}`,
  });
  const [armed, setArmed] = useState(false);
  const accent = ORDER_COLORS[o.color];
  const remaining = Math.max(0, o.totalUnits - sched);
  const progress = orderProgress(o.totalUnits, doneUnits, o.archived);

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-lg border border-line bg-panel p-2.5 shadow-card transition animate-fade-up ${
        isDragging ? "opacity-40" : ""
      } ${o.archived ? "opacity-70" : ""}`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...attributes}
          {...listeners}
          title="Arrastrar al calendario"
          className="mt-0.5 -ml-1 cursor-grab text-faint transition hover:text-ink active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight">{o.client}</p>
          <p className="truncate text-[11px] text-mut">
            {o.code} · {o.channel}
          </p>
        </div>
        <div className="flex flex-col items-center gap-[2px]" title={`Avance = (QA + Empaque + Despacho) ÷ totales (${fmtNum(doneUnits)}/${fmtNum(o.totalUnits)})`}>
          <Ring value={progress} size={34} color={accent} />
          <span className="font-mono text-[8px] uppercase tracking-wider text-faint">Avance</span>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="rounded-full bg-raise px-2 py-[2px] font-mono text-[10px] font-bold tabular text-mut">
          {fmtNum(sched)} / {fmtNum(o.totalUnits)} uds
        </span>
        {remaining > 0 && !o.archived && (
          <span className="rounded-full bg-warn/12 px-2 py-[2px] font-mono text-[10px] font-bold tabular text-warn">
            sin agendar: {fmtNum(remaining)}
          </span>
        )}
        {o.archived && (
          <span className="rounded-full bg-ok/12 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide text-ok">
            Finalizado
          </span>
        )}
      </div>

      {!o.archived && (
        <>
          <div className="mt-2 flex items-center gap-1.5">
            {remaining > 0 && (
              <button
                onClick={() => onAssign(o.id, firstDay)}
                className="flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.07] px-2 py-1 text-[10.5px] font-bold text-accent transition hover:bg-accent/15 active:scale-[0.97]"
              >
                <CalendarPlus size={11} />
                Agendar
              </button>
            )}
            <button
              onClick={() => onEditOrder(o.id)}
              title="Editar información del pedido"
              className="ml-auto grid h-6 w-6 place-items-center rounded-md text-faint transition hover:bg-raise hover:text-ink"
            >
              <Pencil size={12} />
            </button>
            {armed ? (
              <button
                onClick={() => {
                  api.removeOrder(o.id);
                  notify("Pedido eliminado del plan.", "danger");
                }}
                onMouseLeave={() => setArmed(false)}
                className="rounded-md border border-danger/50 bg-danger/12 px-1.5 py-0.5 text-[9.5px] font-bold text-danger"
              >
                ¿Seguro?
              </button>
            ) : (
              <button
                onClick={() => setArmed(true)}
                title="Eliminar pedido"
                className="grid h-6 w-6 place-items-center rounded-md text-faint transition hover:bg-danger/12 hover:text-danger"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NumField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <div>
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
        {label}
      </span>
      <Stepper value={value} onChange={onChange} min={min} max={max} step={step} unit={unit} />
      <p className="mt-0.5 text-[10px] text-faint">{hint}</p>
    </div>
  );
}

export function Sidebar({
  tab,
  onTab,
  collapsed,
  onToggleCollapse,
  orders,
  chunks,
  dayConfigs,
  api,
  notify,
  dates,
  onEditOrder,
  onNewOrder,
  onAssign,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  orders: Order[];
  chunks: Chunk[];
  dayConfigs: Record<string, DayConfig>;
  api: PlannerApi;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
  dates: string[];
  onEditOrder: (id: string) => void;
  onNewOrder: () => void;
  onAssign: (orderId: string, date: string) => void;
}) {
  const [showFinalized, setShowFinalized] = useState(false);
  const [selDay, setSelDay] = useState(dates[0]);
  const today = todayISO();

  const activeDay = dates.includes(selDay) ? selDay : dates[0];
  const cfg = dayConfigs[activeDay] ?? DEFAULT_DAY_CONFIG;
  const cap = capacityOf(cfg);

  // Carga real por día y por equipo: tarjetas actuales + pasos históricos.
  const assignedByDay = useMemo(() => capacityLoadByDate(chunks), [chunks]);

  const scheduled = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of chunks) m[c.orderId] = (m[c.orderId] ?? 0) + c.units;
    return m;
  }, [chunks]);

  const doneByOrder = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of chunks)
      if (c.status === "qa" || c.status === "empaque" || c.status === "despacho")
        m[c.orderId] = (m[c.orderId] ?? 0) + c.units;
    return m;
  }, [chunks]);

  const active = orders.filter((o) => !o.archived);
  const finalized = orders.filter((o) => o.archived);
  const sorted = useMemo(() => {
    const act = [...active].sort((a, b) => {
      const sa = scheduled[a.id] ?? 0;
      const sb = scheduled[b.id] ?? 0;
      if ((sa === 0) !== (sb === 0)) return sa === 0 ? -1 : 1;
      return a.deliveryDate.localeCompare(b.deliveryDate);
    });
    return showFinalized ? [...act, ...finalized] : act;
  }, [active, finalized, scheduled, showFinalized]);

  const capacityPct = (load: number, available: number) =>
    available > 0 ? (load / available) * 100 : 0;
  const capacityColor = (pct: number) => {
    const tone = pctColor(pct);
    return tone === "danger" ? "var(--sf-danger)" : tone === "warn" ? "var(--sf-warn)" : "var(--sf-ok)";
  };
  const techLoad = assignedByDay.tech[activeDay] ?? 0;
  const qaLoad = assignedByDay.qa[activeDay] ?? 0;
  const techPct = capacityPct(techLoad, cap.techCap);
  const qaPct = capacityPct(qaLoad, cap.qaCap);

  const tabBtn = (t: Tab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => onTab(t)}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[12px] font-semibold transition ${
        tab === t ? "bg-accent/12 text-accent" : "text-mut hover:bg-raise hover:text-ink"
      }`}
      title={label}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-line bg-panel/70 transition-all ${
        collapsed ? "w-[52px]" : "w-[318px]"
      }`}
    >
      <div className={`flex items-center gap-1 border-b border-line p-2 ${collapsed ? "flex-col" : ""}`}>
        {tabBtn("backlog", <ClipboardList size={15} />, "Resumen y pedidos")}
        {tabBtn("capacidad", <Settings2 size={15} />, "Capacidad por día")}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expandir panel" : "Colapsar panel"}
          className={`${collapsed ? "" : "ml-auto"} grid h-7 w-7 place-items-center rounded-md text-faint transition hover:bg-raise hover:text-ink`}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {collapsed ? (
        <div className="p-2 text-center font-mono text-[10px] uppercase tracking-widest text-faint">
          {tab === "backlog" ? "Pedidos" : "Capacidad"}
        </div>
      ) : tab === "backlog" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
              Backlog · {active.length} activos
            </span>
            {finalized.length > 0 && (
              <button
                onClick={() => setShowFinalized((v) => !v)}
                className={`rounded-full border px-2 py-[2px] text-[10px] font-semibold transition ${
                  showFinalized
                    ? "border-ok/50 bg-ok/10 text-ok"
                    : "border-line text-faint hover:text-ink"
                }`}
              >
                Finalizados ({finalized.length})
              </button>
            )}
          </div>
          <p className="mb-2 rounded-md border border-dashed border-line px-2 py-1.5 text-[10.5px] leading-snug text-faint">
            Arrastra un pedido a cualquier día del calendario o usa «Agendar».
          </p>
          <div className="flex flex-col gap-2">
            {sorted.map((o) => (
              <BacklogCard
                key={o.id}
                o={o}
                sched={scheduled[o.id] ?? 0}
                doneUnits={doneByOrder[o.id] ?? 0}
                api={api}
                notify={notify}
                onEditOrder={onEditOrder}
                onAssign={onAssign}
                firstDay={dates[0]}
              />
            ))}
          </div>
          <button
            onClick={onNewOrder}
            className="mt-2 w-full rounded-lg border border-dashed border-line py-2 text-[11.5px] font-semibold text-mut transition hover:border-accent/50 hover:text-accent"
          >
            + Nuevo pedido
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Configuración de capacidad
          </span>
          <p className="mt-1 rounded-md border border-dashed border-line px-2 py-1.5 text-[10.5px] leading-snug text-faint">
            Se configura <b>por día individual</b>, no por semana completa.
          </p>

          <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {dates.map((d) => {
              const c = colDate(d);
              const p = capacityOf(dayConfigs[d] ?? DEFAULT_DAY_CONFIG);
              const techDp = capacityPct(assignedByDay.tech[d] ?? 0, p.techCap);
              const qaDp = capacityPct(assignedByDay.qa[d] ?? 0, p.qaCap);
              const sel = d === activeDay;
              return (
                <button
                  key={d}
                  onClick={() => setSelDay(d)}
                  className={`flex min-w-[52px] flex-col items-center rounded-lg border px-1.5 py-1.5 transition ${
                    sel ? "border-accent/60 bg-accent/[0.08]" : "border-line bg-panel hover:border-line2"
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase ${sel ? "text-accent" : "text-faint"}`}>
                    {c.dow}
                  </span>
                  <span className="font-display text-[16px] font-bold leading-none tabular">
                    {c.dnum}
                  </span>
                  <span className="mt-1 flex w-8 flex-col gap-[2px]">
                    <span className="h-[3px] overflow-hidden rounded-full bg-paper"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, techDp)}%`, background: capacityColor(techDp) }} /></span>
                    <span className="h-[3px] overflow-hidden rounded-full bg-paper"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, qaDp)}%`, background: capacityColor(qaDp) }} /></span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-1 flex items-center justify-between">
            <span className="text-[12px] font-bold">
              {colDate(activeDay).dowLong} {colDate(activeDay).dnum} de {colDate(activeDay).mon}
              {activeDay === today && <span className="ml-1 text-[10px] font-bold uppercase text-accent">· hoy</span>}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-3 rounded-lg border border-line bg-raise/50 p-3">
            <NumField
              label="N° de técnicos"
              hint="15 teléfonos por turno por técnico"
              value={cfg.techs}
              onChange={(v) => api.setDayConfig(activeDay, { techs: v })}
              min={0}
              max={200}
              step={1}
            />
            <NumField
              label="N° de QA / Calidad"
              hint="45 unidades por turno por persona"
              value={cfg.qa}
              onChange={(v) => api.setDayConfig(activeDay, { qa: v })}
              min={0}
              max={200}
              step={1}
            />
            <NumField
              label="Minutos operativos / día"
              hint="510 min = 8.5 h efectivas del turno"
              value={cfg.opMin}
              onChange={(v) => api.setDayConfig(activeDay, { opMin: v })}
              min={60}
              max={1440}
              step={5}
              unit="min"
            />
            <NumField
              label="Paradas / cuello de botella"
              hint="Paradas no programadas del día"
              value={cfg.stopMin}
              onChange={(v) => api.setDayConfig(activeDay, { stopMin: v })}
              min={0}
              max={cfg.opMin}
              step={5}
              unit="min"
            />
          </div>

          <div className="mt-2.5 rounded-lg border border-line bg-panel p-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
              Cálculo de capacidad instalada
            </span>
            <div className="mt-1.5 flex flex-col gap-1 font-mono text-[11.5px] tabular">
              <div className="flex items-center justify-between">
                <span className="text-mut">
                  C_téc = {cfg.techs} × 15 × {(cap.scale).toFixed(2)}
                </span>
                <span className="font-bold">{fmtNum(cap.techCap)} uds</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mut">
                  C_QC = {cfg.qa} × 45 × {cap.scale.toFixed(2)}
                </span>
                <span className="font-bold">{fmtNum(cap.qaCap)} uds</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-1">
                <span className="text-mut">C_total = mín(C_téc, C_QC)</span>
                <span className="font-bold text-accent">{fmtNum(cap.cap)} uds</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mut">P_hora = C_total ÷ {(cap.effMin / 60).toFixed(1)} h</span>
                <span className="font-bold">
                  {cap.pHora.toLocaleString("es", { maximumFractionDigits: 1 })} uds/h
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-1" title="Reacondicionamiento únicamente">
                <span className="text-mut">Capacidad Técnicos</span>
                <span className="font-bold" style={{ color: capacityColor(techPct) }}>{fmtNum(techLoad)} / {fmtNum(cap.techCap)} · {Math.round(techPct)}%</span>
              </div>
              <div className="flex items-center justify-between" title="Primera revisión, QA y limpieza, y Empaque">
                <span className="text-mut">Capacidad QA</span>
                <span className="font-bold" style={{ color: capacityColor(qaPct) }}>{fmtNum(qaLoad)} / {fmtNum(cap.qaCap)} · {Math.round(qaPct)}%</span>
              </div>
            </div>
            {[
              { label: "Técnicos", pct: techPct },
              { label: "QA", pct: qaPct },
            ].map((item) => (
              <div key={item.label} className="mt-2">
                <div className="h-[7px] overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, item.pct)}%`, background: capacityColor(item.pct) }} /></div>
                {item.pct > 100 && <p className="mt-1 text-[10.5px] font-bold text-danger">Sobrecarga de {item.label}: supera el 100% de su capacidad.</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
