import { useState } from "react";
import { AlertTriangle, CalendarDays, Pencil, Send, Unlock, X } from "lucide-react";
import type { Chunk, ChunkStatus, Order } from "../types";
import { ORDER_COLORS, STATUS_FLOW, STATUS_META } from "../types";
import { fmtDateTime, fmtMedium, fmtNum } from "../lib";
import type { PlannerApi } from "../store";
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
  onClose,
  onEditOrder,
  notify,
}: {
  order: Order;
  chunks: Chunk[];
  api: PlannerApi;
  onClose: () => void;
  onEditOrder: (id: string) => void;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
}) {
  const [note, setNote] = useState("");
  const accent = ORDER_COLORS[order.color];
  const assigned = chunks.reduce((a, c) => a + c.units, 0);
  const blockedChunks = chunks.filter((c) => c.status === "bloqueado");

  const byStatus = (s: ChunkStatus) =>
    chunks.filter((c) => c.status === s).reduce((a, c) => a + c.units, 0);

  const submitNote = () => {
    const t = note.trim();
    if (!t) return;
    api.addNote(order.id, t);
    setNote("");
    notify("Observación registrada.");
  };

  return (
    <aside className="flex w-[350px] shrink-0 flex-col border-l border-line bg-panel animate-slide-r">
      {/* header */}
      <div className="flex items-start gap-2.5 border-b border-line px-4 py-3">
        <span className="mt-1 h-9 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="font-display text-[17px] font-bold uppercase leading-tight tracking-wide">
              {order.code}
            </h2>
            {order.archived && (
              <span className="rounded-full bg-ok/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider text-ok">
                Finalizado
              </span>
            )}
          </div>
          <p className="truncate text-[13.5px] font-semibold">{order.product}</p>
          <p className="mt-0.5 truncate text-[11px] text-mut">
            {order.client} · {order.channel} · {order.category}
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
        {/* banner de tarjetas bloqueadas */}
        {blockedChunks.length > 0 && (
          <div className="mx-4 mt-3 rounded-lg border border-danger/45 bg-danger/[0.07] p-3">
            <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-danger">
              <AlertTriangle size={13} />
              {blockedChunks.length} tarjeta{blockedChunks.length > 1 ? "s" : ""} bloqueada
              {blockedChunks.length > 1 ? "s" : ""}
            </div>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {blockedChunks.map((c) => (
                <div key={c.id} className="rounded-md bg-panel/70 px-2.5 py-1.5">
                  <p className="text-[12px] font-medium leading-snug">
                    Motivo: {c.blockReason || "—"}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] tabular text-danger/80">
                      {c.blockedAt ? fmtDateTime(c.blockedAt) : ""} · {fmtMedium(c.date)} ·{" "}
                      {fmtNum(c.units)} uds
                    </p>
                    <button
                      onClick={() => {
                        api.unblockChunk(c.id);
                        notify("Bloqueo liberado.", "ok");
                      }}
                      className="flex shrink-0 items-center gap-1 rounded border border-ok/40 bg-ok/10 px-1.5 py-[2px] text-[10px] font-bold text-ok transition hover:bg-ok/20"
                    >
                      <Unlock size={10} />
                      Liberar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* detalles generales */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Detalles generales
          </h3>
          <div className="mt-1 divide-y divide-line/70 rounded-lg border border-line bg-raise/50 px-3">
            <Detail k="Cliente" v={order.client} />
            <Detail k="Canal" v={order.channel} />
            <Detail k="Subcanal" v={order.subchannel || "—"} />
            <Detail k="F. solicitud" v={fmtMedium(order.requestDate)} />
            <Detail k="F. entrega tent." v={fmtMedium(order.deliveryDate)} />
            <Detail
              k="Unidades"
              v={`${fmtNum(assigned)} agendadas / ${fmtNum(order.totalUnits)} totales`}
            />
          </div>
        </section>

        {/* unidades por proceso */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Unidades por proceso
          </h3>
          <p className="mt-0.5 text-[10px] leading-snug text-faint">
            Cada tarjeta del calendario avanza con su propio estado.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[...STATUS_FLOW, "bloqueado" as ChunkStatus].map((s) => {
              const u = byStatus(s);
              if (u === 0) return null;
              const m = STATUS_META[s];
              return (
                <span
                  key={s}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] font-semibold tabular"
                  style={{
                    color: m.hex,
                    borderColor: `color-mix(in srgb, ${m.hex} 35%, transparent)`,
                    background: `color-mix(in srgb, ${m.hex} 10%, transparent)`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.hex }} />
                  {m.label}: {fmtNum(u)} uds
                </span>
              );
            })}
            {assigned === 0 && (
              <span className="rounded-md border border-dashed border-line px-2 py-1 text-[11px] text-faint">
                Sin unidades agendadas todavía
              </span>
            )}
          </div>
        </section>

        {/* avance general */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Resumen de avance
          </h3>
          <div className="mt-1.5 rounded-lg border border-line bg-raise/50 p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[26px] font-bold leading-none tabular text-accent">
                {Math.round(order.progress)}%
              </span>
              <span className="font-mono text-[10.5px] tabular text-mut">completado</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${order.progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                Ajuste rápido
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={order.progress}
                disabled={order.archived}
                onChange={(e) =>
                  api.updateOrder(order.id, { progress: Number(e.target.value) }, `Avance actualizado a ${e.target.value}%.`)
                }
                className="w-full disabled:opacity-40"
              />
            </div>
          </div>
        </section>

        {/* tarjetas en calendario */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Tarjetas en calendario ({chunks.length})
          </h3>
          {chunks.length === 0 ? (
            <p className="mt-1.5 rounded-lg border border-dashed border-line px-3 py-2.5 text-[11.5px] text-faint">
              Sin unidades agendadas — arrastra el pedido desde el backlog al tablero.
            </p>
          ) : (
            <div className="mt-1.5 flex flex-col gap-1">
              {chunks.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-md border border-line bg-raise/40 px-2 py-1.5"
                >
                  <span className="flex items-center gap-1 font-mono text-[11px] tabular text-mut">
                    <CalendarDays size={11} />
                    {fmtMedium(c.date)}
                  </span>
                  <span className="font-mono text-[11.5px] font-bold tabular">
                    {fmtNum(c.units)} uds
                  </span>
                  <span className="ml-auto">
                    <Badge status={c.status} size="sm" />
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-[10px] leading-snug text-faint">
            El estado, bloqueo y despacho se gestionan por tarjeta desde su menú de
            edición rápida en el calendario.
          </p>
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
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-semibold text-mut transition hover:border-accent/50 hover:text-accent"
        >
          <Pencil size={12} />
          Editar
        </button>
      </div>
    </aside>
  );
}
