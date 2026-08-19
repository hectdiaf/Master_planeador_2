import { useMemo, useState } from "react";
import { AlertTriangle, PackagePlus, Plus, Trash2 } from "lucide-react";
import type { Channel, Chunk, Order, OrderItem, Product } from "../types";
import { BLOCK_REASONS, CHANNELS, STATUS_META, clamp } from "../types";
import {
  businessDaysFrom,
  colDate,
  ensureBiz,
  fmtMedium,
  fmtNum,
  orderRemaining,
  orderUnits,
  todayISO,
} from "../lib";
import { Modal, Stepper, btnDanger, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";
import type { OrderInput } from "../store";

/* ── Nuevo pedido / edición (multi-producto) ────────────────────── */

export function OrderFormModal({
  order,
  nextCode,
  products,
  assignedUnits,
  onClose,
  onConfirm,
  onDelete,
}: {
  order: Order | null;
  nextCode: string;
  products: Product[];
  assignedUnits: number;
  onClose: () => void;
  onConfirm: (input: OrderInput) => void;
  onDelete?: () => void;
}) {
  const [client, setClient] = useState(order?.client ?? "");
  const [channel, setChannel] = useState<Channel>(order?.channel ?? "Retail");
  const [requestDate, setRequestDate] = useState(
    order?.requestDate ?? ensureBiz(todayISO())
  );
  const [deliveryDate, setDeliveryDate] = useState(
    order?.deliveryDate ?? ensureBiz(todayISO())
  );
  const [items, setItems] = useState<OrderItem[]>(
    order ? order.items.map((i) => ({ ...i })) : [{ productId: products[0]?.id ?? "", qty: 10 }]
  );
  const [touched, setTouched] = useState(false);
  const [armed, setArmed] = useState(false);

  const total = items.reduce((a, i) => a + i.qty, 0);
  const invalidQty = total <= 0 || items.some((i) => i.qty <= 0);
  const belowAssigned = order !== null && total < assignedUnits;
  const canSave = client.trim().length > 0 && !invalidQty && !belowAssigned && items.every((i) => i.productId);

  const setQty = (idx: number, qty: number) =>
    setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, qty: clamp(Math.round(qty), 1, 99999) } : x)));
  const setProduct = (idx: number, productId: string) =>
    setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, productId } : x)));
  const addRow = () => {
    const used = new Set(items.map((i) => i.productId));
    const next = products.find((p) => !used.has(p.id));
    if (!next) return;
    setItems((xs) => [...xs, { productId: next.id, qty: 10 }]);
  };

  return (
    <Modal
      title={order ? `Editar ${order.code}` : "Nuevo pedido"}
      subtitle={
        order
          ? undefined
          : `Se creará con el código ${nextCode} · las unidades totales se calculan automáticamente`
      }
      onClose={onClose}
      width={480}
    >
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={labelCls}>Cliente *</span>
            <input
              value={client}
              onChange={(e) => {
                setClient(e.target.value);
                setTouched(true);
              }}
              placeholder="Ej. Claro Colombia"
              className={inputCls}
            />
            {touched && !client.trim() && (
              <p className="mt-1 text-[10.5px] font-medium text-danger">Requerido.</p>
            )}
          </div>
          <div>
            <span className={labelCls}>Canal de venta</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
              className={inputCls}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={labelCls}>Fecha de solicitud</span>
            <input type="date" value={requestDate} onChange={(e) => e.target.value && setRequestDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>Entrega tentativa</span>
            <input type="date" value={deliveryDate} onChange={(e) => e.target.value && setDeliveryDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className={labelCls + " mb-0"}>Productos / referencias *</span>
            <button
              onClick={addRow}
              disabled={items.length >= products.length}
              className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-mut transition enabled:hover:border-accent/50 enabled:hover:text-accent disabled:opacity-40"
            >
              <Plus size={11} />
              Agregar producto
            </button>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-raise/50 p-2.5">
            {items.map((it, idx) => {
              const usedElsewhere = new Set(
                items.filter((_, i) => i !== idx).map((x) => x.productId)
              );
              return (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={it.productId}
                    onChange={(e) => setProduct(idx, e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-line bg-panel px-2 py-1.5 text-[12.5px] outline-none focus:border-accent"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id} disabled={usedElsewhere.has(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={it.qty}
                    min={1}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n)) setQty(idx, n);
                    }}
                    className="w-20 rounded-md border border-line bg-panel px-2 py-1.5 text-center font-mono text-[12.5px] font-semibold tabular outline-none focus:border-accent"
                  />
                  <span className="text-[10.5px] text-faint">uds</span>
                  <button
                    onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))}
                    disabled={items.length <= 1}
                    aria-label="Quitar producto"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-faint transition enabled:hover:bg-danger/12 enabled:hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}

            <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-mut">
                <PackagePlus size={13} />
                Unidades totales (calculadas)
              </span>
              <span className="rounded-md bg-accent/12 px-2.5 py-1 font-mono text-[14px] font-bold tabular text-accent">
                {fmtNum(total)} uds
              </span>
            </div>
          </div>

          {belowAssigned && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-danger">
              <AlertTriangle size={12} />
              Hay {fmtNum(assignedUnits)} uds ya asignadas al calendario — el total no
              puede ser menor. Reduce tarjetas primero.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {order && onDelete ? (
            armed ? (
              <button onClick={onDelete} onMouseLeave={() => setArmed(false)} className={btnDanger}>
                ¿Confirmar eliminación?
              </button>
            ) : (
              <button onClick={() => setArmed(true)} className={btnDanger}>
                <Trash2 size={13} />
                Eliminar
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button
              onClick={() =>
                canSave &&
                onConfirm({
                  client: client.trim(),
                  channel,
                  requestDate,
                  deliveryDate,
                  items: items.map((i) => ({ ...i })),
                })
              }
              disabled={!canSave}
              className={btnPrimary + " disabled:opacity-40"}
            >
              {order ? "Guardar cambios" : "Crear pedido"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Dividir tarjeta ────────────────────────────────────────────── */

export function SplitModal({
  chunk,
  orderCode,
  onClose,
  onConfirm,
}: {
  chunk: Chunk;
  orderCode: string;
  onClose: () => void;
  onConfirm: (parts: { date: string; units: number }[]) => void;
}) {
  const dates = useMemo(() => businessDaysFrom(chunk.date, 8), [chunk.date]);
  const [count, setCount] = useState(Math.min(4, chunk.units));
  const [startIdx, setStartIdx] = useState(0);
  const [rows, setRows] = useState<number[]>(() => {
    const n = Math.min(4, chunk.units);
    return distribute(chunk.units, n);
  });

  function distribute(total: number, n: number): number[] {
    const base = Math.floor(total / n);
    const rem = total - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
  }

  const applyCount = (n: number) => {
    const c = clamp(n, 2, Math.min(8, chunk.units, dates.length));
    setCount(c);
    setRows(distribute(chunk.units, c));
  };
  const applyStart = (i: number) => {
    const s = clamp(i, 0, dates.length - count);
    setStartIdx(s);
  };
  const setRow = (i: number, v: number) =>
    setRows((r) => r.map((x, k) => (k === i ? clamp(Math.round(v), 0, chunk.units) : x)));
  const auto = () => setRows(distribute(chunk.units, count));

  const sum = rows.reduce((a, b) => a + b, 0);
  const ok = sum === chunk.units && rows.every((r) => r > 0);
  const parts = rows.map((units, i) => ({ date: dates[startIdx + i], units }));

  return (
    <Modal
      title="Dividir tarjeta"
      subtitle={`${orderCode} · fraccionar ${chunk.units} uds en jornadas consecutivas`}
      onClose={onClose}
      width={430}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="col-span-1">
            <span className={labelCls}>Tarjetas</span>
            <Stepper value={count} onChange={applyCount} min={2} max={Math.min(8, chunk.units)} step={1} />
          </div>
          <div className="col-span-2">
            <span className={labelCls}>Inicio</span>
            <select value={startIdx} onChange={(e) => applyStart(Number(e.target.value))} className={inputCls}>
              {dates.slice(0, dates.length - count + 1).map((d, i) => (
                <option key={d} value={i}>
                  {fmtMedium(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-raise/50 p-2.5">
          {parts.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-20 font-mono text-[11.5px] tabular text-mut">{fmtMedium(p.date)}</span>
              <input
                type="number"
                value={rows[i]}
                min={0}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) setRow(i, n);
                }}
                className="w-20 rounded-md border border-line bg-panel px-2 py-1 text-center font-mono text-[12.5px] font-semibold tabular outline-none focus:border-accent"
              />
              <span className="text-[10.5px] text-faint">uds</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className={`font-mono text-[12px] font-semibold tabular ${ok ? "text-ok" : "text-danger"}`}>
            Suma: {sum} / {chunk.units}
          </span>
          <button onClick={auto} className="text-[11.5px] font-semibold text-accent underline-offset-2 hover:underline">
            Reparto balanceado
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button
            onClick={() => ok && onConfirm(parts)}
            disabled={!ok}
            className={btnPrimary + " disabled:opacity-40"}
          >
            Fraccionar
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Bloqueo de tarjeta (motivo obligatorio) ────────────────────── */

export function BlockModal({
  chunk,
  orderCode,
  onClose,
  onConfirm,
}: {
  chunk: Chunk;
  orderCode: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [preset, setPreset] = useState<string>(chunk.blockReason ?? "");
  const [detail, setDetail] = useState(
    chunk.blockReason && !(BLOCK_REASONS as readonly string[]).includes(chunk.blockReason)
      ? chunk.blockReason
      : ""
  );
  const reason = preset === "Otro" ? detail.trim() : preset;
  const ok = reason.length > 0;

  return (
    <Modal
      title="Bloquear tarjeta"
      subtitle={`${orderCode} · ${chunk.units} uds del ${fmtMedium(chunk.date)} — el motivo es obligatorio`}
      onClose={onClose}
      width={420}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-1.5">
          {BLOCK_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setPreset(r)}
              className={`rounded-md border px-2.5 py-2 text-left text-[12px] font-medium transition ${
                preset === r
                  ? "border-danger/60 bg-danger/10 text-danger"
                  : "border-line bg-panel text-mut hover:border-line2 hover:text-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {preset === "Otro" && (
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Describe el motivo del bloqueo…"
            rows={3}
            className={inputCls + " resize-none"}
          />
        )}
        {!ok && (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-danger">
            <AlertTriangle size={12} />
            Selecciona o escribe el motivo para continuar.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button
            onClick={() => ok && onConfirm(reason)}
            disabled={!ok}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-[12.5px] font-semibold text-white transition enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:opacity-40"
          >
            Bloquear tarjeta
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Confirmación de despacho (por tarjeta) ─────────────────────── */

export function DespachoModal({
  chunk,
  orderCode,
  onClose,
  onConfirm,
}: {
  chunk: Chunk;
  orderCode: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title="Confirmar despacho"
      subtitle="Esta acción aplica solo a la tarjeta seleccionada"
      onClose={onClose}
      width={420}
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-ok/40 bg-ok/[0.07] p-3">
          <p className="text-[13px] leading-snug">
            ¿Estás seguro de que ya finalizó esta parte del pedido{" "}
            <b className="font-mono">{orderCode}</b>?
          </p>
          <p className="mt-1 font-mono text-[11.5px] tabular text-mut">
            {chunk.units} uds · {fmtMedium(chunk.date)} →{" "}
            {STATUS_META.despacho.label}
          </p>
        </div>
        <p className="text-[11.5px] leading-snug text-faint">
          La tarjeta se marcará como despachada/terminada y permanecerá visible en el
          calendario. Las demás tarjetas del pedido conservan su propio estado.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-ok px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            Sí, despachar {chunk.units} uds
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Asignar unidades a un día ──────────────────────────────────── */

export function AssignModal({
  orders,
  chunks,
  date,
  presetOrderId,
  productName,
  onClose,
  onConfirm,
}: {
  orders: Order[];
  chunks: Chunk[];
  date: string;
  presetOrderId?: string;
  productName: (id: string) => string;
  onClose: () => void;
  onConfirm: (orderId: string, units: number) => void;
}) {
  const candidates = useMemo(
    () => orders.filter((o) => orderRemaining(o, chunks) > 0),
    [orders, chunks]
  );
  const initial =
    presetOrderId && candidates.some((o) => o.id === presetOrderId)
      ? presetOrderId
      : (candidates[0]?.id ?? "");
  const [orderId, setOrderId] = useState(initial);
  const sel = candidates.find((o) => o.id === orderId);
  const rem = sel ? orderRemaining(sel, chunks) : 0;
  const [units, setUnits] = useState(Math.max(1, rem));
  const valid = !!sel && units >= 1 && units <= rem;
  const c = colDate(date);

  return (
    <Modal
      title="Asignar unidades"
      subtitle={`${c.dowLong} ${c.dnum} ${c.mon} · entrarán en Primera Revisión`}
      onClose={onClose}
      width={430}
    >
      {candidates.length === 0 ? (
        <p className="py-2 text-[12.5px] text-mut">
          No hay pedidos con unidades pendientes por agendar.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <span className={labelCls}>Pedido</span>
            <select
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                const o = candidates.find((x) => x.id === e.target.value);
                if (o) setUnits(orderRemaining(o, chunks));
              }}
              className={inputCls}
            >
              {candidates.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {o.client} — {o.items.map((i) => productName(i.productId)).join(" + ")} (
                  {orderRemaining(o, chunks)} pend.)
                </option>
              ))}
            </select>
          </div>
          {sel && (
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className={labelCls}>Unidades a asignar</span>
                <Stepper value={units} onChange={setUnits} min={1} max={rem} step={5} unit="uds" />
              </div>
              <span className="pb-1 font-mono text-[11px] tabular text-mut">
                disponibles: {fmtNum(rem)} / {fmtNum(orderUnits(sel))}
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button
              onClick={() => valid && onConfirm(orderId, units)}
              disabled={!valid}
              className={btnPrimary + " disabled:opacity-40"}
            >
              Asignar al {fmtMedium(date)}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Confirmación genérica ──────────────────────────────────────── */

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} width={400}>
      <div className="flex flex-col gap-3">
        <p className="text-[13px] leading-snug text-mut">{body}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] ${
              danger ? "bg-danger" : "bg-accent dark:text-[#0d1512]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
