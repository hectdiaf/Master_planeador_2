import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Pencil,
  Send,
  X,
} from "lucide-react";
import type { Chunk, Order, OrderStatus } from "../types";
import {
  FLOW_LABELS,
  ORDER_COLORS,
  STATUS_FLOW,
  STATUS_META,
} from "../types";
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
  onBlockOrder,
  onDespacho,
  notify,
}: {
  order: Order;
  chunks: Chunk[];
  api: PlannerApi;
  onClose: () => void;
  onEditOrder: (id: string) => void;
  onBlockOrder: (id: string) => void;
  onDespacho: (id: string) => void;
  notify: (t: string, tone?: "ok" | "warn" | "danger") => void;
}) {
  const [note, setNote] = useState("");
  const accent = ORDER_COLORS[order.color];
  const blocked = order.status === "bloqueado";
  const curIdx = STATUS_FLOW.indexOf(order.status);
  const assigned = chunks.reduce((a, c) => a + c.units, 0);

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
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[17px] font-bold uppercase leading-tight tracking-wide">
              {order.code}
            </h2>
            <Badge status={order.status} size="sm" />
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
        {/* banner de bloqueo */}
        {blocked && (
          <div className="mx-4 mt-3 rounded-lg border border-danger/45 bg-danger/[0.07] p-3">
            <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-danger">
              <AlertTriangle size={13} />
              Pedido bloqueado / en pausa
            </div>
            <p className="mt-1 text-[12.5px] font-medium leading-snug">
              Motivo: {order.blockReason || "—"}
            </p>
            {order.blockedAt && (
              <p className="mt-0.5 font-mono text-[10.5px] tabular text-danger/80">
                {fmtDateTime(order.blockedAt)}
              </p>
            )}
            <button
              onClick={() => {
                api.unblockOrder(order.id);
                notify("Bloqueo liberado.", "ok");
              }}
              className="mt-2 rounded-md border border-ok/40 bg-ok/10 px-2.5 py-1 text-[11.5px] font-semibold text-ok transition hover:bg-ok/20"
            >
              Liberar bloqueo
            </button>
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

        {/* avance */}
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

        {/* checklist del flujo */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Checklist del flujo operativo
          </h3>
          {blocked && (
            <p className="mt-1 text-[10.5px] font-medium text-danger">
              Flujo congelado mientras el pedido esté bloqueado.
            </p>
          )}
          <div className="mt-1.5 flex flex-col gap-1">
            {STATUS_FLOW.map((s, i) => {
              const done = order.status === "despacho" ? true : i < curIdx;
              const current = !blocked && i === curIdx && order.status !== "despacho";
              const hex = STATUS_META[s].hex;
              return (
                <button
                  key={s}
                  disabled={blocked}
                  onClick={() => {
                    if (s === "despacho") {
                      onDespacho(order.id);
                    } else if (s !== order.status) {
                      api.setStatus(order.id, s);
                      notify(`Estado → ${STATUS_META[s].label}`);
                    }
                  }}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                    current
                      ? "border-accent/60 bg-accent/[0.07]"
                      : "border-transparent hover:border-line hover:bg-raise"
                  } ${blocked ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold ${
                      current ? "animate-ping-dot" : ""
                    }`}
                    style={{
                      borderColor: done || current ? hex : "var(--sf-line)",
                      color: done || current ? hex : "var(--sf-faint)",
                      background:
                        done || current
                          ? `color-mix(in srgb, ${hex} 12%, transparent)`
                          : "transparent",
                    }}
                  >
                    {done ? <Check size={12} /> : i + 1}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[12.5px] font-medium ${done || current ? "" : "text-faint"}`}>
                    {FLOW_LABELS[s]}
                  </span>
                  {current && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider text-accent">
                      Actual
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* tarjetas en calendario */}
        <section className="px-4 pt-3">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
            Asignaciones en calendario ({chunks.length})
          </h3>
          {chunks.length === 0 ? (
            <p className="mt-1.5 rounded-lg border border-dashed border-line px-3 py-2.5 text-[11.5px] text-faint">
              Sin unidades agendadas — arrastra el pedido desde el backlog al tablero.
            </p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {chunks.map((c) => (
                <span
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-md border border-line bg-raise/60 px-2 py-1 font-mono text-[11px] tabular"
                >
                  <CalendarDays size={11} className="text-faint" />
                  {fmtMedium(c.date)} · <b>{fmtNum(c.units)} uds</b>
                </span>
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
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-semibold text-mut transition hover:border-accent/50 hover:text-accent"
        >
          <Pencil size={12} />
          Editar
        </button>
      </div>
    </aside>
  );
}
