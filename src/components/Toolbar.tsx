import { CalendarClock, ChevronLeft, ChevronRight, FilterX, Plus } from "lucide-react";
import type { ChunkStatus, Filters, Order } from "../types";
import { STATUS_FLOW, STATUS_META } from "../types";
import { btnPrimary } from "./ui";

const STATUS_OPTIONS: ChunkStatus[] = [
  "revision",
  "reacondicionamiento",
  "qa",
  "empaque",
  "despacho",
  "bloqueado",
];

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
  const active = value !== "all";
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border px-2 py-1.5 text-[12px] font-medium outline-none transition focus:border-accent ${
        active
          ? "border-accent/60 bg-accent/[0.08] text-accent"
          : "border-line bg-panel text-mut hover:border-line2 hover:text-ink"
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

const navBtn =
  "grid h-8 w-8 place-items-center rounded-md border border-line bg-panel text-mut transition hover:border-line2 hover:bg-raise hover:text-ink active:scale-95";

export function Toolbar({
  rangeLabel,
  isToday,
  onPrev,
  onNext,
  onToday,
  filters,
  setFilters,
  orders,
  hiddenFinalized,
  onNewOrder,
}: {
  rangeLabel: string;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  orders: Order[]; // activos (sin archivados)
  hiddenFinalized: number;
  onNewOrder: () => void;
}) {
  const clients = [...new Set(orders.map((o) => o.client))].sort();
  const products = [
    ...new Set(orders.flatMap((o) => o.products.map((p) => p.name))),
  ].sort();
  const counts = clients.map((c) => ({
    client: c,
    n: orders.filter((o) => o.client === c).length,
  }));
  const hasFilters =
    filters.client !== "all" || filters.status !== "all" || filters.product !== "all";

  return (
    <div className="shrink-0 border-b border-line bg-panel/60">
      {/* fila 1: navegación de días */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-3 py-2">
        <button onClick={onPrev} className={navBtn} title="Día anterior" aria-label="Día anterior">
          <ChevronLeft size={15} />
        </button>
        <button onClick={onNext} className={navBtn} title="Día siguiente" aria-label="Día siguiente">
          <ChevronRight size={15} />
        </button>
        <button
          onClick={onToday}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold transition active:scale-[0.97] ${
            isToday
              ? "border-accent/60 bg-accent/12 text-accent"
              : "border-line bg-panel text-mut hover:border-line2 hover:text-ink"
          }`}
        >
          <CalendarClock size={13} />
          Hoy
        </button>
        <span className="ml-1 font-mono text-[12px] uppercase tracking-wider text-mut">
          {rangeLabel}
          {hiddenFinalized > 0 && (
            <span className="ml-2 text-faint">
              · {hiddenFinalized} finalizado{hiddenFinalized > 1 ? "s" : ""} en calendario
            </span>
          )}
        </span>

        <button onClick={onNewOrder} className={btnPrimary + " ml-auto"}>
          <Plus size={14} />
          Nuevo pedido
        </button>
      </div>

      {/* fila 2: filtros + conteo por canal */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-3 py-2">
        <Select
          value={filters.client}
          onChange={(v) => setFilters({ ...filters, client: v })}
          options={clients}
          all="Cliente / Canal: todos"
        />
        <Select
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v })}
          options={STATUS_OPTIONS}
          all="Estado: todos"
        />
        <Select
          value={filters.product}
          onChange={(v) => setFilters({ ...filters, product: v })}
          options={products}
          all="Producto: todos"
        />
        {hasFilters && (
          <button
            onClick={() => setFilters({ client: "all", status: "all", product: "all" })}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11.5px] font-semibold text-danger transition hover:bg-danger/10"
          >
            <FilterX size={12} />
            Limpiar
          </button>
        )}

        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
            Pedidos por canal
          </span>
          {counts.map(({ client, n }) => {
            const active = filters.client === client;
            return (
              <button
                key={client}
                onClick={() =>
                  setFilters({ ...filters, client: active ? "all" : client })
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-medium transition active:scale-[0.97] ${
                  active
                    ? "border-accent/60 bg-accent/12 text-accent"
                    : "border-line bg-panel text-mut hover:border-line2 hover:text-ink"
                }`}
              >
                {client}
                <span className="rounded-full bg-raise px-1.5 font-mono text-[10px] font-bold tabular">
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* fila 3: leyenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
          Leyenda
        </span>
        {[...STATUS_FLOW, "bloqueado" as ChunkStatus].map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[11px] text-mut">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: STATUS_META[s].hex }}
            />
            {STATUS_META[s].label}
          </span>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        <span className="flex items-center gap-1.5 text-[11px] text-mut">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--sf-ok)" }} />
          &lt;85% holgada
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-mut">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--sf-warn)" }} />
          85–100% ajustada
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-mut">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--sf-danger)" }} />
          &gt;100% sobrecarga
        </span>
      </div>
    </div>
  );
}
