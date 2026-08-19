import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Plus,
} from "lucide-react";
import type { ChunkStatus, Filters } from "../types";
import { FLOW, STATUS_META } from "../types";

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
      className={`h-8 rounded-md border bg-panel px-2 text-[12px] font-medium outline-none transition focus:border-accent ${
        value === "all" ? "border-line text-mut" : "border-accent/50 text-ink"
      }`}
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
  rangeLabel,
  isToday,
  onPrev,
  onNext,
  onToday,
  filters,
  setFilters,
  clients,
  clientCounts,
  products,
  onClearFilters,
  onNewOrder,
}: {
  rangeLabel: string;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  clients: string[];
  clientCounts: Record<string, number>;
  products: string[];
  onClearFilters: () => void;
  onNewOrder: () => void;
}) {
  const statusOptions: ChunkStatus[] = [...FLOW, "bloqueado"];
  const active =
    (filters.client !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.product !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-panel/60 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-md border border-line">
          <button
            onClick={onPrev}
            aria-label="Días anteriores"
            className="grid h-8 w-8 place-items-center bg-panel text-mut transition hover:bg-raise hover:text-ink"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={onToday}
            className={`flex h-8 items-center gap-1.5 border-x border-line px-3 text-[12px] font-semibold transition ${
              isToday
                ? "bg-accent text-white dark:text-[#0d1512]"
                : "bg-panel text-ink hover:bg-raise"
            }`}
          >
            <CalendarCheck2 size={13} />
            Hoy
          </button>
          <button
            onClick={onNext}
            aria-label="Días siguientes"
            className="grid h-8 w-8 place-items-center bg-panel text-mut transition hover:bg-raise hover:text-ink"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <span className="font-mono text-[11.5px] uppercase tracking-wide text-mut">
          {rangeLabel}
        </span>

        <div className="mx-1 h-5 w-px bg-line" />

        <Select
          value={filters.client}
          onChange={(v) => setFilters({ ...filters, client: v })}
          options={clients}
          all="Cliente / Canal: todos"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className={`h-8 rounded-md border bg-panel px-2 text-[12px] font-medium outline-none transition focus:border-accent ${
            filters.status === "all" ? "border-line text-mut" : "border-accent/50 text-ink"
          }`}
        >
          <option value="all">Estado tarjeta: todos</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <Select
          value={filters.product}
          onChange={(v) => setFilters({ ...filters, product: v })}
          options={products}
          all="Producto: todos"
        />

        {active > 0 && (
          <button
            onClick={onClearFilters}
            className="flex h-8 items-center gap-1 rounded-md border border-line px-2 text-[11.5px] font-medium text-mut transition hover:border-danger/40 hover:text-danger"
          >
            <FilterX size={13} />
            Limpiar ({active})
          </button>
        )}

        <button
          onClick={onNewOrder}
          className="ml-auto flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] dark:text-[#0d1512]"
        >
          <Plus size={14} />
          Nuevo pedido
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
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
              className={`flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-[11px] font-medium transition ${
                on
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-line bg-panel text-mut hover:border-line2 hover:text-ink"
              }`}
            >
              {c}
              <span className="font-mono font-semibold tabular">
                {clientCounts[c] ?? 0}
              </span>
            </button>
          );
        })}

        <span className="mx-1 h-4 w-px bg-line" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
          Leyenda
        </span>
        {statusOptions.map((s) => (
          <span
            key={s}
            className="flex items-center gap-1 text-[11px] text-mut"
            title={STATUS_META[s].label}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: STATUS_META[s].hex }}
            />
            {STATUS_META[s].short}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[11px] text-mut">
          <span className="inline-flex h-2 w-8 overflow-hidden rounded-sm">
            <span className="h-full flex-1" style={{ background: "var(--sf-ok)" }} />
            <span className="h-full flex-1" style={{ background: "var(--sf-warn)" }} />
            <span className="h-full flex-1" style={{ background: "var(--sf-danger)" }} />
          </span>
          Ocupación &lt;85 / ≤100 / &gt;100%
        </span>
      </div>
    </div>
  );
}
