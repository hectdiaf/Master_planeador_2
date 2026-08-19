import { useState } from "react";
import {
  AlertTriangle,
  Check,
  PencilLine,
  Send,
  Unlock,
  X,
} from "lucide-react";
import type { Chunk, Order, OrderStatus } from "../types";
import { FLOW_LABELS, ORDER_COLORS, STATUS_FLOW } from "../types";
import type { PlannerApi } from "../store";
import { fmtDateTime, fmtLong } from "../lib";
import type { Toast } from "./ui";
import { Badge, btnGhost, inputCls, labelCls } from "./ui";

export function Drawer({
  order,
  chunks,
  onClose,
  api,
  notify,
  onConfirmDespacho,
  onBlock,
  onEditOrder,
}: {
  order: Order;
  chunks: Chunk[];
  onClose: () => void;
  api: PlannerApi;
  notify: (text: string, tone?: Toast["tone"]) => void;
  onConfirmDespacho: (id: string) => void;
  onBlock: (id: string) => void;
  onEditOrder: (id: string) => void;
}) {
  const [note, setNote] = useState("");
  const hex = ORDER_COLORS[order.color];
  const sched = chunks.reduce((a, c) => a + c.units, 0);
  const currentIdx = STATUS_FLOW.indexOf(
    order.status === "bloqueado" ? (order.prevStatus ?? "backlog") : order.status
  );

  const pickStage = (s: OrderStatus) => {
    if (order.status === "bloqueado") {
      notify("Libera el bloqueo para retomar el flujo.", "warn");
      return;
    }
    if (s === "despacho") {
      onConfirmDespacho(order.id);
      return;
    }
    api.setStatus(order.id, s);
    notify(`Etapa actualizada → ${FLOW_LABELS[s]}`);
  };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/25 animate-fade" onClick={onClose} />
      <aside className="fixed bottom-0 right-0 top-14 z-40 flex w-full max-w-[396px] flex-col border-l border-line bg-panel shadow-pop animate-slide-r">
        {/* header */}
        <div className="shrink-0 border-b border-line px-4 pb-3 pt-3.5" style={{ boxShadow: `inset 3px 0 0 ${hex}` }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                {order.code} · {order.category}
              </p>
              <h2 className="mt-0.5 truncate font-display text-[23px] font-bold leading-tight tracking-wide">
                {order.product}
              </h2>
              <p className="text-[12px] text-mut">{order.client}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar panel"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-mut transition hover:bg-raise hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge status={order.status} />
            <button onClick={() => onEditOrder(order.id)} className={`${btnGhost} ml-auto !py-1`}>
              <PencilLine size={12.5} /> Editar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* banner de bloqueo */}
          {order.status === "bloqueado" && (
            <div className="mx-4 mt-3 rounded-lg border border-danger/35 bg-danger/10 p-3 animate-fade">
              <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-danger">
                <AlertTriangle size={14} /> Pedido bloqueado
              </p>
              <p className="mt-1 text-[12.5px] font-medium leading-snug text-ink">
                Motivo: {order.blockReason}
              </p>
              {order.blockedAt && (
                <p className="mt-0.5 font-mono text-[10.5px] text-mut">
                  {fmtDateTime(order.blockedAt)}
                </p>
              )}
              <button
                onClick={() => {
                  api.unblockOrder(order.id);
                  notify("Bloqueo liberado, el pedido retoma su etapa.");
                }}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-ok/40 bg-ok/10 px-2.5 py-1 text-[11.5px] font-semibold text-ok transition hover:bg-ok/20 active:scale-95"
              >
                <Unlock size={12.5} /> Liberar bloqueo
              </button>
            </div>
          )}

          {/* detalles generales */}
          <section className="px-4 pt-3.5">
            <h3 className={labelCls}>Detalles generales</h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-line bg-paper p-3 text-[12.5px]">
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-faint">Cliente</dt>
                <dd className="font-semibold">{order.client}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-faint">Canal</dt>
                <dd className="font-semibold">{order.channel}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-faint">Subcanal</dt>
                <dd className="font-semibold">{order.subchannel}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-faint">Unidades</dt>
                <dd className="font-mono font-semibold tabular">
                  {sched}/{order.totalUnits} agend.
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-faint">F. solicitud</dt>
                <dd className="font-mono text-[12px] font-semibold">{fmtLong(order.requestDate)}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-faint">Entrega tent.</dt>
                <dd className="font-mono text-[12px] font-semibold">{fmtLong(order.deliveryDate)}</dd>
              </div>
            </dl>
          </section>

          {/* avance */}
          <section className="px-4 pt-4">
            <div className="flex items-baseline justify-between">
              <h3 className={labelCls} style={{ marginBottom: 0 }}>Resumen de avance</h3>
              <span className="font-mono text-[15px] font-bold tabular" style={{ color: hex }}>
                {order.progress}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunk">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${order.progress}%`, background: hex }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={order.progress}
                onChange={(e) =>
                  api.patchOrder(order.id, { progress: Number(e.target.value) })
                }
                className="w-full"
                aria-label="Ajustar porcentaje de avance"
              />
              <span className="w-14 shrink-0 text-right text-[10.5px] text-faint">
                ajuste rápido
              </span>
            </div>
          </section>

          {/* checklist de flujo */}
          <section className="px-4 pt-4">
            <h3 className={labelCls}>Flujo operativo</h3>
            <ol className="space-y-1">
              {STATUS_FLOW.map((s, i) => {
                const done = i < currentIdx || order.status === "despacho";
                const current = i === currentIdx && order.status !== "despacho";
                const m = s === "despacho" ? "#188a4c" : hex;
                return (
                  <li key={s}>
                    <button
                      onClick={() => pickStage(s)}
                      disabled={done && !current}
                      className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                        current
                          ? "border-accent/50 bg-accent-soft/60"
                          : done
                            ? "border-transparent opacity-75 hover:opacity-100"
                            : "border-transparent hover:border-line hover:bg-raise"
                      }`}
                      title={done ? "Etapa completada" : `Marcar en: ${FLOW_LABELS[s]}`}
                    >
                      <span
                        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border text-white transition ${current ? "animate-ping-dot" : ""}`}
                        style={{
                          background: done || current ? m : "transparent",
                          borderColor: done || current ? m : "var(--sf-line2)",
                          color: done || current ? "#fff" : "var(--sf-faint)",
                        }}
                      >
                        {done ? (
                          <Check size={11} strokeWidth={3} />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span
                        className={`text-[12.5px] ${
                          done ? "text-mut line-through decoration-line2" : current ? "font-semibold" : "text-mut"
                        }`}
                      >
                        {FLOW_LABELS[s]}
                      </span>
                      {s === "despacho" && !done && (
                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-faint">
                          requiere confirmación
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* bitácora */}
          <section className="px-4 pb-5 pt-4">
            <h3 className={labelCls}>Bitácora y observaciones</h3>
            <div className="flex gap-1.5">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && note.trim()) {
                    api.addLog(order.id, note.trim());
                    setNote("");
                    notify("Observación registrada.");
                  }
                }}
                placeholder="Documentar novedad o requerimiento…"
                className={inputCls}
              />
              <button
                onClick={() => {
                  if (!note.trim()) return;
                  api.addLog(order.id, note.trim());
                  setNote("");
                  notify("Observación registrada.");
                }}
                aria-label="Agregar nota"
                className="grid h-8 w-9 shrink-0 place-items-center rounded-md bg-accent text-white transition hover:brightness-110 active:scale-95 dark:text-[#0d1512]"
              >
                <Send size={14} />
              </button>
            </div>
            <ul className="mt-2.5 space-y-2">
              {order.logs.map((l) => (
                <li key={l.id} className="rounded-md border border-line bg-paper px-2.5 py-2 animate-fade">
                  <p className="text-[12px] leading-snug">{l.text}</p>
                  <p className="mt-1 font-mono text-[10px] text-faint">
                    {fmtDateTime(l.at)}
                    {l.auto && <span className="ml-1.5 rounded bg-sunk px-1 py-px text-[9px] uppercase tracking-wide text-mut">auto</span>}
                  </p>
                </li>
              ))}
              {order.logs.length === 0 && (
                <li className="text-[11.5px] text-faint">Sin observaciones registradas.</li>
              )}
            </ul>
          </section>
        </div>

        {/* pie */}
        <footer className="shrink-0 border-t border-line bg-raise/60 px-4 py-2">
          <p className="font-mono text-[10.5px] text-mut">
            Última actualización del registro: {fmtDateTime(order.updatedAt)}
          </p>
        </footer>
      </aside>
    </>
  );
}
