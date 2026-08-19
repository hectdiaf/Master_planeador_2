import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
  GripVertical,
  ListChecks,
  PanelLeftOpen,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";
import type { DayConfig, Order, OrderStatus } from "../types";
import {
  FLOW_LABELS,
  ORDER_COLORS,
  STATUS_FLOW,
  STATUS_META,
  clamp,
} from "../types";
import type { PlannerApi } from "../store";
import { DEFAULT_DAY_CONFIG, capacityOf } from "../store";
import { colDate, fmtLong, nextBiz, prevBiz, pctColor } from "../lib";
import type { Toast } from "./ui";
import { Badge, Ring, Stepper, btnGhost, inputCls, labelCls } from "./ui";

type Tab = "backlog" | "capacidad";

export function Sidebar({
  tab,
  onTab,
  collapsed,
  onToggleCollapse,
  orders,
  hiddenFinalized,
  scheduled,
  api,
  notify,
  onEditOrder,
  onNewOrder,
  onBlock,
  onDespacho,
  onAssign,
  dates,
  capDate,
  setCapDate,
  dayConfigs,
  assigned,
  setDayConfig,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  orders: Order[];
  hiddenFinalized: number;
  scheduled: Record<string, number>;
  api: PlannerApi;
  notify: (text: string, tone?: Toast["tone"]) => void;
  onEditOrder: (id: string) => void;
  onNewOrder: () => void;
  onBlock: (id: string) => void;
  onDespacho: (id: string) => void;
  onAssign: (orderId: string | null, date: string) => void;
  dates: string[];
  capDate: string;
  setCapDate: (d: string) => void;
  dayConfigs: Record<string, DayConfig>;
  assigned: Record<string, number>;
  setDayConfig: (d: string, cfg: DayConfig) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const armTimer = useRef<number | null>(null);

  const pendingUnits = useMemo(
    () =>
      orders.reduce((acc, o) => {
        const rem = o.totalUnits - (scheduled[o.id] ?? 0);
        return acc + Math.max(0, rem);
      }, 0),
    [orders, scheduled]
  );

  if (collapsed) {
    return (
      <aside className="flex w-[52px] shrink-0 flex-col items-center gap-2 border-r border-line bg-panel py-3">
        <button
          onClick={onToggleCollapse}
          className="grid h-8 w-8 place-items-center rounded-md text-mut transition hover:bg-raise hover:text-ink"
          title="Expandir panel"
        >
          <PanelLeftOpen size={16} />
        </button>
        <div className="my-1 h-px w-7 bg-line" />
        <button
          onClick={() => onTab("backlog")}
          className={`grid h-9 w-9 place-items-center rounded-md transition ${
            tab === "backlog"
              ? "bg-accent-soft text-accent"
              : "text-mut hover:bg-raise hover:text-ink"
          }`}
          title="Resumen y gestión de pedidos"
        >
          <ListChecks size={17} />
        </button>
        <button
          onClick={() => onTab("capacidad")}
          className={`grid h-9 w-9 place-items-center rounded-md transition ${
            tab === "capacidad"
              ? "bg-accent-soft text-accent"
              : "text-mut hover:bg-raise hover:text-ink"
          }`}
          title="Configuración de capacidad"
        >
          <Gauge size={17} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[336px] shrink-0 flex-col border-r border-line bg-panel">
      {/* encabezado del panel */}
      <div className="flex shrink-0 items-center gap-1 border-b border-line px-3 py-2">
        <div className="flex flex-1 rounded-lg bg-sunk p-0.5">
          <button
            onClick={() => onTab("backlog")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-semibold transition ${
              tab === "backlog"
                ? "bg-panel text-ink shadow-card"
                : "text-mut hover:text-ink"
            }`}
          >
            <ListChecks size={14} /> Resumen
          </button>
          <button
            onClick={() => onTab("capacidad")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-semibold transition ${
              tab === "capacidad"
                ? "bg-panel text-ink shadow-card"
                : "text-mut hover:text-ink"
            }`}
          >
            <Gauge size={14} /> Capacidad
          </button>
        </div>
        <button
          onClick={onToggleCollapse}
          className="grid h-7 w-7 place-items-center rounded-md text-mut transition hover:bg-raise hover:text-ink"
          title="Contraer panel"
        >
          <PanelLeftOpen size={15} className="-scale-x-100" />
        </button>
      </div>

      {tab === "backlog" ? (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-raise/60 px-3 py-2">
            <p className="text-[11.5px] text-mut">
              <span className="font-mono font-semibold text-ink tabular">{orders.length}</span>{" "}
              pedidos ·{" "}
              <span className="font-mono font-semibold text-warn tabular">{pendingUnits}</span>{" "}
              uds sin agendar
            </p>
            <button
              onClick={onNewOrder}
              className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11.5px] font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 dark:text-[#0d1512]"
            >
              <Plus size={13} /> Nuevo
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
            {orders.length === 0 && (
              <div className="mt-10 px-4 text-center">
                <ListChecks size={26} className="mx-auto text-faint" />
                <p className="mt-2 text-[12.5px] text-mut">
                  No hay pedidos que coincidan con los filtros actuales.
                </p>
              </div>
            )}
            {orders.map((o, i) => {
              const sched = scheduled[o.id] ?? 0;
              const rem = Math.max(0, o.totalUnits - sched);
              const over = sched > o.totalUnits;
              const open = expandedId === o.id;
              const hex = ORDER_COLORS[o.color];
              return (
                <div
                  key={o.id}
                  draggable={!open}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("po/order", o.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="group rounded-lg border border-line bg-panel shadow-card transition animate-fade-up hover:border-line2 hover:shadow-pop"
                  style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
                >
                  <div className="flex cursor-grab items-start gap-2 px-2.5 pt-2 active:cursor-grabbing">
                    <GripVertical size={13} className="mt-1 shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: hex }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10.5px] text-faint">{o.code}</span>
                        <span className="truncate text-[13px] font-semibold leading-tight">{o.product}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-mut">
                        {o.client} · {o.channel}
                      </p>
                    </div>
                    <Ring value={o.progress} size={32} color={hex} />
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1.5">
                    <Badge status={o.status} size="sm" />
                    <span className="font-mono text-[10.5px] text-mut tabular">
                      {sched}/{o.totalUnits} agend.
                    </span>
                    {over && (
                      <span className="font-mono text-[10px] font-semibold text-danger">sobregiro</span>
                    )}
                    {!over && rem > 0 && (
                      <span className="rounded bg-warn/12 px-1 font-mono text-[10px] font-semibold text-warn tabular">
                        {rem} sin agendar
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-0.5">
                      <button
                        onClick={() => onAssign(o.id, dates[0])}
                        className="grid h-6 w-6 place-items-center rounded text-mut transition hover:bg-accent-soft hover:text-accent"
                        title="Agendar en un día"
                      >
                        <CalendarPlus size={13.5} />
                      </button>
                      <button
                        onClick={() => setExpandedId(open ? null : o.id)}
                        className={`grid h-6 w-6 place-items-center rounded transition hover:bg-raise ${open ? "text-accent" : "text-mut"}`}
                        title="Edición rápida"
                      >
                        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* barra de agendado */}
                  <div className="mx-2.5 mb-2 h-1 overflow-hidden rounded-full bg-sunk">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (sched / Math.max(1, o.totalUnits)) * 100)}%`,
                        background: over ? "var(--sf-danger)" : hex,
                      }}
                    />
                  </div>

                  {open && (
                    <div className="space-y-2.5 border-t border-dashed border-line px-2.5 py-2.5 animate-fade">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>Unidades totales</label>
                          <Stepper
                            value={o.totalUnits}
                            min={1}
                            step={10}
                            onChange={(v) => api.patchOrder(o.id, { totalUnits: v })}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Avance general</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={o.progress}
                              onChange={(e) =>
                                api.patchOrder(o.id, { progress: Number(e.target.value) })
                              }
                              className="w-full"
                            />
                            <span className="w-9 font-mono text-[11.5px] font-semibold text-mut tabular">
                              {o.progress}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Fecha de solicitud</label>
                          <input
                            type="date"
                            value={o.requestDate}
                            onChange={(e) =>
                              e.target.value &&
                              api.patchOrder(o.id, { requestDate: e.target.value })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Entrega tentativa</label>
                          <input
                            type="date"
                            value={o.deliveryDate}
                            onChange={(e) =>
                              e.target.value &&
                              api.patchOrder(o.id, { deliveryDate: e.target.value })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={labelCls}>Estado</label>
                          <select
                            value={o.status}
                            onChange={(e) => {
                              const v = e.target.value as OrderStatus;
                              if (v === "bloqueado") onBlock(o.id);
                              else if (v === "despacho") onDespacho(o.id);
                              else {
                                api.setStatus(o.id, v);
                                notify(`Estado → ${STATUS_META[v].label}`);
                              }
                            }}
                            className={inputCls}
                          >
                            {([...STATUS_FLOW, "bloqueado"] as OrderStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {FLOW_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button onClick={() => onEditOrder(o.id)} className={btnGhost}>
                          <PencilLine size={13} /> Editar info
                        </button>
                        <button
                          onClick={() => onBlock(o.id)}
                          className={btnGhost}
                          disabled={o.status === "bloqueado"}
                          style={o.status === "bloqueado" ? { opacity: 0.45 } : undefined}
                        >
                          <AlertTriangle size={13} /> Bloquear
                        </button>
                        <button
                          onClick={() => {
                            if (armedDelete === o.id) {
                              api.removeOrder(o.id);
                              setArmedDelete(null);
                              notify(`Pedido ${o.code} eliminado`, "danger");
                            } else {
                              setArmedDelete(o.id);
                              if (armTimer.current) window.clearTimeout(armTimer.current);
                              armTimer.current = window.setTimeout(
                                () => setArmedDelete(null),
                                2600
                              );
                            }
                          }}
                          className={`ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition ${
                            armedDelete === o.id
                              ? "bg-danger text-white"
                              : "text-danger hover:bg-danger/10"
                          }`}
                        >
                          <Trash2 size={13} />
                          {armedDelete === o.id ? "¿Confirmar?" : ""}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {hiddenFinalized > 0 && (
              <p className="px-2 pb-1 pt-1 text-center text-[10.5px] text-faint">
                {hiddenFinalized} pedido(s) finalizados ya no aparecen en el backlog — siguen visibles en el calendario.
              </p>
            )}
            <p className="px-2 pb-1 text-center text-[10.5px] text-faint">
              Arrastra un pedido hasta una columna del calendario para agendarlo.
            </p>
          </div>
        </>
      ) : (
        <CapacityPanel
          dates={dates}
          capDate={capDate}
          setCapDate={setCapDate}
          dayConfigs={dayConfigs}
          assigned={assigned}
          setDayConfig={setDayConfig}
        />
      )}
    </aside>
  );
}

function CapacityPanel({
  dates,
  capDate,
  setCapDate,
  dayConfigs,
  assigned,
  setDayConfig,
}: {
  dates: string[];
  capDate: string;
  setCapDate: (d: string) => void;
  dayConfigs: Record<string, DayConfig>;
  assigned: Record<string, number>;
  setDayConfig: (d: string, cfg: DayConfig) => void;
}) {
  const cfg = dayConfigs[capDate] ?? DEFAULT_DAY_CONFIG;
  const c = capacityOf(cfg);
  const load = assigned[capDate] ?? 0;
  const p = c.cap > 0 ? (load / c.cap) * 100 : 0;
  const tone = pctColor(p);
  const cd = colDate(capDate);

  const set = (patch: Partial<DayConfig>) =>
    setDayConfig(capDate, { ...cfg, ...patch });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="flex items-center justify-between">
        <p className={labelCls} style={{ marginBottom: 0 }}>
          Jornada a configurar
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCapDate(prevBiz(capDate))}
            className="grid h-6 w-6 place-items-center rounded border border-line text-mut transition hover:bg-raise hover:text-ink"
            title="Jornada anterior"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setCapDate(nextBiz(capDate))}
            className="grid h-6 w-6 place-items-center rounded border border-line text-mut transition hover:bg-raise hover:text-ink"
            title="Jornada siguiente"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* tira de días de la ventana */}
      <div className="mt-2 grid grid-cols-8 gap-1">
        {dates.map((d) => {
          const dc = colDate(d);
          const ccfg = capacityOf(dayConfigs[d] ?? DEFAULT_DAY_CONFIG);
          const lp = ccfg.cap > 0 ? ((assigned[d] ?? 0) / ccfg.cap) * 100 : 0;
          const sel = d === capDate;
          return (
            <button
              key={d}
              onClick={() => setCapDate(d)}
              className={`flex flex-col items-center rounded-md border py-1.5 transition active:scale-95 ${
                sel
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-panel hover:border-line2"
              }`}
              title={`${dc.dow} ${dc.dnum} ${dc.mon} — ocupación ${Math.round(lp)}%`}
            >
              <span className={`text-[9px] font-bold ${sel ? "text-accent" : "text-faint"}`}>
                {dc.dow.slice(0, 2)}
              </span>
              <span className={`font-mono text-[12px] font-semibold tabular ${sel ? "text-ink" : "text-mut"}`}>
                {dc.dnum}
              </span>
              <span
                className="mt-0.5 h-1 w-5 rounded-full"
                style={{
                  background:
                    lp > 100
                      ? "var(--sf-danger)"
                      : lp >= 85
                        ? "var(--sf-warn)"
                        : lp > 0
                          ? "var(--sf-ok)"
                          : "var(--sf-line)",
                }}
              />
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 font-display text-[17px] font-semibold capitalize tracking-wide">
        {cd.dowLong} {fmtLong(capDate)}
      </p>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-line bg-paper p-2.5">
          <label className={labelCls}>N° Técnicos</label>
          <Stepper value={cfg.techs} min={0} max={40} step={1} onChange={(v) => set({ techs: v })} />
          <p className="mt-1.5 text-[10.5px] leading-snug text-faint">
            15 teléfonos/día por técnico
          </p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-2.5">
          <label className={labelCls}>N° QA / Calidad</label>
          <Stepper value={cfg.qa} min={0} max={20} step={1} onChange={(v) => set({ qa: v })} />
          <p className="mt-1.5 text-[10.5px] leading-snug text-faint">
            45 unidades/día por persona
          </p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-2.5">
          <label className={labelCls}>Min. operativos</label>
          <Stepper value={cfg.opMin} min={60} max={960} step={30} onChange={(v) => set({ opMin: v })} />
          <p className="mt-1.5 text-[10.5px] leading-snug text-faint">Disponibles por jornada</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-2.5">
          <label className={labelCls}>Paradas / cuello</label>
          <Stepper value={cfg.stopMin} min={0} max={cfg.opMin} step={15} onChange={(v) => set({ stopMin: v })} />
          <p className="mt-1.5 text-[10.5px] leading-snug text-faint">Minutos no programados</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-paper p-3">
        <p className={labelCls}>Cálculo automático</p>
        <dl className="space-y-1.5 text-[12px]">
          <div className="flex justify-between">
            <dt className="text-mut">Capacidad técnica</dt>
            <dd className="font-mono font-semibold tabular">{c.techCap} uds <span className="font-sans font-normal text-faint">({cfg.techs}×15)</span></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mut">Capacidad QA</dt>
            <dd className="font-mono font-semibold tabular">{c.qaCap} uds <span className="font-sans font-normal text-faint">({cfg.qa}×45)</span></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mut">Minutos efectivos</dt>
            <dd className="font-mono font-semibold tabular">{c.effMin} min</dd>
          </div>
          <div className="flex justify-between border-t border-dashed border-line pt-1.5">
            <dt className="font-semibold">Capacidad máxima (cuello de botella)</dt>
            <dd className="font-mono font-bold text-accent tabular">{c.cap} uds/día</dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-paper p-3">
        <div className="flex items-baseline justify-between">
          <p className={labelCls} style={{ marginBottom: 0 }}>% Ocupación planeada</p>
          <p
            className="font-mono text-[15px] font-bold tabular"
            style={{
              color:
                tone === "danger"
                  ? "var(--sf-danger)"
                  : tone === "warn"
                    ? "var(--sf-warn)"
                    : "var(--sf-ok)",
            }}
          >
            {Math.round(p)}%
          </p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunk">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${clamp(p, 0, 100)}%`,
              background:
                tone === "danger"
                  ? "var(--sf-danger)"
                  : tone === "warn"
                    ? "var(--sf-warn)"
                    : "var(--sf-ok)",
            }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-mut tabular">
          {load} / {c.cap} unidades asignadas
        </p>
        {p > 100 && (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-danger/10 px-2 py-1.5 text-[11px] font-medium text-danger">
            <AlertTriangle size={13} className="mt-px shrink-0" />
            Sobrecarga de {Math.round(p - 100)}% — reasigna fracciones a otra jornada.
          </p>
        )}
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
        La capacidad se configura <strong className="text-mut">por día individual</strong>; los cambios
        aplican únicamente a la jornada seleccionada. Los domingos nunca son laborables.
      </p>
    </div>
  );
}
