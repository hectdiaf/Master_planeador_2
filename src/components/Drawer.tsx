import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Inbox,
  ListChecks,
  Pencil,
  Send,
  Truck,
  X,
} from "lucide-react";
import type { Api } from "../store";
import type { Chunk, ChunkStatus, Order } from "../types";
import { FLOW, STATUS_META, accentOf } from "../types";
import {
  chunksOf,
  fmtDateTime,
  fmtMedium,
  fmtNum,
  orderAssigned,
  orderProgress,
  orderRemaining,
  orderUnits,
  unitsByStatus,
} from "../lib";
import { Badge } from "./ui";

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[5px]">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">
        {k}
      </span>
      <span className="text-right text-[12.5px] font-medium">{v}</span>
    </div>
  );
}

export function Drawer({
  order,
  chunks,
  api,
  productName,
  focusChunkId,
  onFocusChunk,
  highlight,
  onHighlight,
  onClose,
  onEditOrder,
  onBlockChunk,
  onUnblockChunk,
  notify,
}: {
  order: Order;
  chunks: Chunk[];
  api: Api;
  productName: (id: string) => string;
  focusChunkId: string | null;
  onFocusChunk: (id: string | null) => void;
  highlight: { orderId: string; status: ChunkStatus | "sinAgendar" } | null;
  onHighlight: (status: ChunkStatus | "sinAgendar" | null) => void;
  onClose: () => void;
  onEditOrder: (id: string) => void;
  onBlockChunk: (id: string) => void;
  onUnblockChunk: (id: string) => void;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
}) {
  const [note, setNote] = useState("");
  const total = orderUnits(order);
  const assigned = orderAssigned(chunks, order.id);
  const remaining = orderRemaining(order, chunks);
  const progress = orderProgress(order, chunks);
  const qaUnits = unitsByStatus(order, chunks).qa;
  const own = chunksOf(chunks, order.id).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const accent = accentOf(order.colorIdx);
  const focus = focusChunkId ? own.find((c) => c.id === focusChunkId) ?? null : null;
  const blockedChunks = own.filter((c) => c.status === "bloqueado");
  const desglose = unitsByStatus(order, chunks);

  const rows: { key: ChunkStatus | "sinAgendar"; label: string; units: number; hex: string }[] = [
    ...FLOW.map((s) => ({
      key: s as ChunkStatus | "sinAgendar",
      label: STATUS_META[s].label,
      units: desglose[s],
      hex: STATUS_META[s].hex,
    })),
    { key: "sinAgendar", label: "Sin agendar (backlog)", units: desglose.sinAgendar, hex: "#8b95a1" },
  ];

  const submitNote = () => {
    const t = note.trim();
    if (!t) return;
    api.addNote(order.id, t);
    setNote("");
    notify("Observación registrada.");
  };

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-line bg-panel animate-slide-r">
      {/* header */}
      <div className="flex items-start gap-2.5 border-b border-line px-4 py-3">
        <span className="mt-1 h-8 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[17px] font-bold uppercase leading-tight tracking-wide">
              {order.code}
            </h2>
            <span className="rounded-full border border-line px-1.5 py-[1px] text-[10px] font-medium text-mut">
              {order.channel}
            </span>
          </div>
          <p className="truncate text-[13px] font-semibold text-mut">{order.client}</p>
          <p className="mt-0.5 truncate text-[11px] text-faint">
            {order.items.map((i) => `${productName(i.productId)} ×${i.qty}`).join(" · ")}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar panel"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-mut transition hover:bg-raise hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* alerta de bloqueo */}
        {focus && focus.status === "bloqueado" ? (
          <div className="mx-4 mt-3 rounded-lg border border-danger/40 bg-danger/[0.07] p-3">
            <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-danger">
              <AlertTriangle size={13} />
              Tarjeta bloqueada
            </div>
            <p className="mt-1 text-[12.5px] font-medium leading-snug">
              Motivo: {focus.blockReason || "—"}
            </p>
            <p className="mt-0.5 font-mono text-[10.5px] tabular text-danger/80">
              {focus.blockedAt ? fmtDateTime(focus.blockedAt) : ""} · {fmtMedium(focus.date)} ·{" "}
              {focus.units} uds
            </p>
            <button
              onClick={() => onUnblockChunk(focus.id)}
              className="mt-2 rounded-md border border-ok/40 bg-ok/10 px-2.5 py-1 text-[11.5px] font-semibold text-ok transition hover:bg-ok/20"
            >
              Liberar bloqueo
            </button>
          </div>
        ) : blockedChunks.length > 0 ? (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/[0.08] px-3 py-2">
            <AlertTriangle size={14} className="shrink-0 text-warn" />
            <p className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug">
              {blockedChunks.reduce((a, c) => a + c.units, 0)} uds bloqueadas (
              {blockedChunks.map((c) => c.blockReason ?? "motivo").join(", ")}).
            </p>
            <button
              onClick={() => onFocusChunk(blockedChunks[0].id)}
              className="shrink-0 text-[11px] font-bold text-warn underline-offset-2 hover:underline"
            >
              Ver
            </button>
          </div>
        ) : null}

        {/* detalles generales */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Detalles generales
          </h3>
          <div className="mt-1 divide-y divide-line/70 rounded-lg border border-line bg-raise/50 px-3">
            <Detail k="Cliente" v={order.client} />
            <Detail k="Canal" v={order.channel} />
            <Detail k="F. solicitud" v={fmtMedium(order.requestDate)} />
            <Detail k="F. entrega tent." v={fmtMedium(order.deliveryDate)} />
            <Detail k="Unidades totales" v={`${fmtNum(total)} uds (${order.items.length} ref.)`} />
          </div>

          {/* desglose por proceso */}
          <div className="mt-2.5 rounded-lg border border-line bg-raise/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
                Unidades por proceso
              </span>
              <span className="font-mono text-[10.5px] tabular text-mut">
                {fmtNum(assigned)} / {fmtNum(total)} agendadas
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {rows
                .filter((r) => r.units > 0)
                .map((r) => (
                  <div key={r.key} className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.hex }} />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-mut">{r.label}</span>
                    <div className="h-[5px] w-16 overflow-hidden rounded-full bg-paper">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(r.units / total) * 100}%`, background: r.hex }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-[11px] font-semibold tabular">
                      {fmtNum(r.units)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* avance */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Avance general
          </h3>
          <div className="mt-1.5 rounded-lg border border-line bg-raise/50 p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[26px] font-bold leading-none tabular text-accent">
                {progress}%
              </span>
              <span className="font-mono text-[10.5px] tabular text-mut">
                {fmtNum(qaUnits)} uds en QA / {fmtNum(total)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-faint">
              Calculado automáticamente: unidades en Control de Calidad ÷ unidades
              totales del pedido.
            </p>
          </div>
        </section>

        {/* flujo / checklist */}
        <section className="px-4 pt-3">
          <h3 className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            <ListChecks size={12} />
            Flujo operativo · clic para resaltar en tablero
          </h3>
          <div className="mt-1.5 flex flex-col gap-1">
            {rows.map((r, i) => {
              const active = highlight && highlight.orderId === order.id && highlight.status === r.key;
              const isLast = i === rows.length - 1;
              return (
                <button
                  key={r.key}
                  onClick={() => onHighlight(active ? null : r.key)}
                  className={`group flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                    active
                      ? "border-accent/60 bg-accent/[0.07]"
                      : "border-transparent hover:border-line hover:bg-raise"
                  }`}
                >
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10.5px] font-bold"
                    style={{
                      borderColor: r.units > 0 ? r.hex : "var(--sf-line)",
                      color: r.units > 0 ? r.hex : "var(--sf-faint)",
                      background: r.units > 0 ? `color-mix(in srgb, ${r.hex} 12%, transparent)` : "transparent",
                    }}
                  >
                    {isLast ? <Inbox size={11} /> : i + 1}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[12.5px] font-medium ${r.units > 0 ? "" : "text-faint"}`}>
                    {r.label}
                  </span>
                  <span className="font-mono text-[11.5px] font-semibold tabular" style={{ color: r.units > 0 ? r.hex : "var(--sf-faint)" }}>
                    {fmtNum(r.units)} uds
                  </span>
                  <ChevronRight
                    size={12}
                    className={`text-faint transition ${active ? "rotate-90 text-accent" : ""}`}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* tarjetas del pedido */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Tarjetas en calendario ({own.length})
          </h3>
          {own.length === 0 ? (
            <p className="mt-1.5 rounded-lg border border-dashed border-line px-3 py-2.5 text-[11.5px] text-faint">
              Aún no hay unidades agendadas — arrastra el pedido desde el backlog a
              un día del tablero.
            </p>
          ) : (
            <div className="mt-1.5 flex flex-col gap-1">
              {own.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onFocusChunk(focusChunkId === c.id ? null : c.id)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                    focusChunkId === c.id
                      ? "border-accent/60 bg-accent/[0.07]"
                      : "border-line bg-raise/40 hover:border-line2 hover:bg-raise"
                  }`}
                >
                  <span className="flex items-center gap-1 font-mono text-[11px] tabular text-mut">
                    <CalendarDays size={11} />
                    {fmtMedium(c.date)}
                  </span>
                  <span className="font-mono text-[11.5px] font-bold tabular">{c.units} uds</span>
                  <span className="ml-auto">
                    <Badge status={c.status} size="sm" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* bitácora */}
        <section className="px-4 pb-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Bitácora y observaciones
          </h3>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNote()}
              placeholder="Documentar novedad o requerimiento…"
              className="min-w-0 flex-1 rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] outline-none transition focus:border-accent focus:bg-panel placeholder:text-faint"
            />
            <button
              onClick={submitNote}
              disabled={!note.trim()}
              aria-label="Agregar nota"
              className="grid h-8 w-9 shrink-0 place-items-center rounded-md bg-accent text-white transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:opacity-40 dark:text-[#0d1512]"
            >
              <Send size={13} />
            </button>
          </div>
          <div className="mt-2 flex flex-col-reverse gap-1.5">
            {order.logs.map((l) => (
              <div
                key={l.id}
                className={`rounded-md border px-2.5 py-1.5 ${
                  l.auto ? "border-line/70 bg-raise/40" : "border-accent/25 bg-accent/[0.05]"
                }`}
              >
                <p className="text-[12px] leading-snug">{l.text}</p>
                <p className="mt-0.5 font-mono text-[9.5px] tabular text-faint">
                  {fmtDateTime(l.at)} {l.auto ? "· automático" : "· nota manual"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* pie */}
      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        <span className="font-mono text-[10px] tabular text-faint">
          Última actualización: {fmtDateTime(order.updatedAt)}
        </span>
        <button
          onClick={() => onEditOrder(order.id)}
          className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-semibold text-mut transition hover:border-accent/50 hover:text-accent"
        >
          <Pencil size={12} />
          Editar pedido
        </button>
      </div>
      {remaining === 0 && assigned > 0 && (
        <div className="flex items-center gap-1.5 border-t border-line/70 bg-ok/[0.06] px-4 py-1.5 text-[10.5px] font-semibold text-ok">
          <Truck size={12} />
          Todas las unidades del pedido están en calendario.
        </div>
      )}
    </aside>
  );
}
