import { CalendarCheck2, ChevronLeft, ChevronRight, Crosshair, FilterX } from "lucide-react";
import type { Filters, Order, OrderStatus } from "../types";
import { STATUS_FLOW, STATUS_META } from "../types";
import { fmtRange } from "../lib";
import { btnGhost } from "./ui";

function Select({
  value,
  onChange,
  options,
  all,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  all: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-line bg-panel px-2 text-[12px] font-medium text-ink outline-none transition focus:border-accent"
    >
      <option value="all">{all}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Toolbar({
  dates,
  onPrev,
  onNext,
  onToday,
  filters,
  setFilters,
  orders,
}: {
  dates: string[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  orders: Order[];
}) {
  const clients = [...new Set(orders.map((o) => o.client))].sort();
  const products = [...new Set(orders.map((o) => o.product))].sort();
  const counts = new Map<string, number>();
  for (const o of orders) counts.set(o.client, (counts.get(o.client) ?? 0) + 1);

  const active =
    filters.client !== "all" || filters.status !== "all" || filters.product !== "all";

  return (
    <div className="shrink-0 space-y-2.5 px-5 pb-3 pt-1">
      {/* fila 1: navegación + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-md border border-line bg-panel">
          <button
            onClick={onPrev}
            className="flex h-8 items-center gap-1 px-2.5 text-[12.5px] font-medium text-mut transition hover:bg-raise hover:text-ink"
            title="Día operativo anterior"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="h-5 w-px bg-line" />
          <button
            onClick={onToday}
            className="flex h-8 items-center gap-1.5 px-3 text-[12.5px] font-semibold text-accent transition hover:bg-accent-soft"
            title="Centrar la columna de hoy"
          >
            <Crosshair size={13} /> Hoy
          </button>
          <span className="h-5 w-px bg-line" />
          <button
            onClick={onNext}
            className="flex h-8 items-center gap-1 px-2.5 text-[12.5px] font-medium text-mut transition hover:bg-raise hover:text-ink"
            title="Día operativo siguiente"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>

        <span className="hidden font-mono text-[11.5px] tracking-wide text-mut sm:block">
          {fmtRange(dates[0], dates[dates.length - 1])}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 hidden text-[11px] font-semibold uppercase tracking-wider text-faint lg:block">
            Filtros
          </span>
          <Select
            value={filters.client}
            onChange={(v) => setFilters({ ...filters, client: v })}
            options={clients}
            all="Cliente / Canal: todos"
          />
          <Select
            value={filters.status}
            onChange={(v) => setFilters({ ...filters, status: v })}
            options={[...STATUS_FLOW, "bloqueado"].filter(
              (s, i, a) => a.indexOf(s) === i
            )}
            all="Estado: todos"
          />
          <Select
            value={filters.product}
            onChange={(v) => setFilters({ ...filters, product: v })}
            options={products}
            all="Producto: todos"
          />
          {active && (
            <button
              onClick={() => setFilters({ client: "all", status: "all", product: "all" })}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-danger transition hover:bg-danger/10"
            >
              <FilterX size={13} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* fila 2: conteo por cliente + leyenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Pedidos por cliente
          </span>
          {clients.map((c) => {
            const on = filters.client === c;
            return (
              <button
                key={c}
                onClick={() =>
                  setFilters({ ...filters, client: on ? "all" : c })
                }
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-semibold transition active:scale-95 ${
                  on
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-panel text-mut hover:border-line2 hover:text-ink"
                }`}
                title={`Filtrar por ${c}`}
              >
                <CalendarCheck2 size={12} className={on ? "text-accent" : "text-faint"} />
                {c}
                <span className="font-mono text-[10.5px] tabular">{counts.get(c)}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-2">
            {STATUS_FLOW.concat("bloqueado" as OrderStatus).map((s) => (
              <span key={s} className="flex items-center gap-1 text-[10.5px] font-medium text-mut" title={STATUS_META[s].label}>
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].hex }} />
                {STATUS_META[s].short}
              </span>
            ))}
          </div>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <div className="flex items-center gap-2 text-[10.5px] font-medium text-mut">
            <span className="uppercase tracking-wider text-faint">Ocupación</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-4 rounded-full bg-ok/80" /> &lt;85%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-4 rounded-full bg-warn/80" /> 85–100%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-4 rounded-full bg-danger/80" /> &gt;100%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { btnGhost };
