import { useMemo, useState } from "react";
import { AlertTriangle, PackagePlus, Plus, Trash2 } from "lucide-react";
import type { Chunk, ChunkStatus, Order } from "../types";
import { BLOCK_REASONS, CHANNELS, FLOW_LABELS, clamp } from "../types";
import {
  businessDaysFrom,
  colDate,
  ensureBiz,
  fmtMedium,
  fmtNum,
  todayISO,
} from "../lib";
import type { OrderInput } from "../store";
import { Modal, Stepper, btnDanger, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

interface ProductRow {
  name: string;
  qty: number;
}

const INITIAL_STAGES: ChunkStatus[] = ["revision", "reacondicionamiento", "qa", "empaque"];

/* ── Nuevo pedido / edición (multi-producto) ────────────────────── */

export function OrderFormModal({
  order,
  nextCode,
  scheduledUnits,
  onClose,
  onConfirm,
  onDelete,
}: {
  order: Order | null;
  nextCode: string;
  scheduledUnits: number;
  onClose: () => void;
  onConfirm: (input: OrderInput) => void;
  onDelete?: () => void;
}) {
  const [client, setClient] = useState(order?.client ?? "");
  const [channel, setChannel] = useState(order?.channel ?? CHANNELS[0]);
  const [requestDate, setRequestDate] = useState(order?.requestDate ?? ensureBiz(todayISO()));
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? ensureBiz(todayISO()));
  const [products, setProducts] = useState<ProductRow[]>(
    order && order.products.length > 0
      ? order.products.map((p) => ({ name: p.name, qty: p.qty }))
      : [{ name: "", qty: 10 }]
  );
  const [touched, setTouched] = useState(false);
  const [armed, setArmed] = useState(false);

  const total = products.reduce((a, p) => a + (p.qty > 0 ? p.qty : 0), 0);
  const belowScheduled = total < Math.max(1, scheduledUnits);
  const productsOk =
    products.length > 0 && products.every((p) => p.name.trim().length > 0 && p.qty >= 1);
  const valid = client.trim().length > 0 && productsOk && !belowScheduled;

  const setName = (i: number, name: string) =>
    setProducts((xs) => xs.map((x, k) => (k === i ? { ...x, name } : x)));
  const setQty = (i: number, qty: number) =>
    setProducts((xs) =>
      xs.map((x, k) => (k === i ? { ...x, qty: clamp(Math.round(qty), 0, 99999) } : x))
    );
  const addRow = () => setProducts((xs) => [...xs, { name: "", qty: 10 }]);
  const removeRow = (i: number) => setProducts((xs) => xs.filter((_, k) => k !== i));

  return (
    <Modal
      title={order ? `Editar ${order.code}` : "Nuevo pedido"}
      subtitle={
        order
          ? "Las unidades totales se recalculan a partir de los productos"
          : `Se creará con el código ${nextCode} · entrará al backlog`
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
              onChange={(e) => setChannel(e.target.value as (typeof CHANNELS)[number])}
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
            <input
              type="date"
              value={requestDate}
              onChange={(e) => e.target.value && setRequestDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <span className={labelCls}>Entrega tentativa</span>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => e.target.value && setDeliveryDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className={labelCls + " mb-0"}>Productos / referencias *</span>
            <button
              onClick={addRow}
              className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-mut transition hover:border-accent/50 hover:text-accent active:scale-[0.97]"
            >
              <Plus size={11} />
              Agregar producto
            </button>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-raise/50 p-2.5">
            {products.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={p.name}
                  onChange={(e) => {
                    setName(i, e.target.value);
                    setTouched(true);
                  }}
                  placeholder={`Producto ${String.fromCharCode(65 + i)} (ej. iPhone 12 64GB)`}
                  className="min-w-0 flex-1 rounded-md border border-line bg-panel px-2.5 py-1.5 text-[12.5px] outline-none transition focus:border-accent placeholder:text-faint"
                />
                <input
                  type="number"
                  value={p.qty}
                  min={1}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) setQty(i, n);
                  }}
                  className="w-20 shrink-0 rounded-md border border-line bg-panel px-2 py-1.5 text-center font-mono text-[12.5px] font-semibold tabular outline-none focus:border-accent"
                />
                <span className="shrink-0 text-[10.5px] text-faint">uds</span>
                <button
                  onClick={() => removeRow(i)}
                  disabled={products.length <= 1}
                  aria-label="Quitar producto"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-faint transition enabled:hover:bg-danger/12 enabled:hover:text-danger disabled:opacity-30"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

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

          {touched && !productsOk && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-danger">
              <AlertTriangle size={12} />
              Cada producto necesita nombre y cantidad mínima de 1 ud.
            </p>
          )}
          {belowScheduled && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-danger">
              <AlertTriangle size={12} />
              Hay {fmtNum(scheduledUnits)} uds ya asignadas al calendario — el total no
              puede ser menor.
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
                valid &&
                onConfirm({
                  code: order?.code ?? nextCode,
                  client: client.trim(),
                  channel,
                  requestDate,
                  deliveryDate,
                  products: products.map((p) => ({ name: p.name.trim(), qty: p.qty })),
                })
              }
              disabled={!valid}
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
  const [rows, setRows] = useState<number[]>(() =>
    distribute(chunk.units, Math.min(4, chunk.units))
  );

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
  const applyStart = (i: number) => setStartIdx(clamp(i, 0, dates.length - count));
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
          <div>
            <span className={labelCls}>Tarjetas</span>
            <Stepper value={count} onChange={applyCount} min={2} max={Math.min(8, chunk.units)} step={1} />
          </div>
          <div className="col-span-2">
            <span className={labelCls}>Inicio</span>
            <select
              value={startIdx}
              onChange={(e) => applyStart(Number(e.target.value))}
              className={inputCls}
            >
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

/* ── Asignar unidades a un día ──────────────────────────────────── */

export function AssignModal({
  orders,
  chunks,
  date,
  presetOrderId,
  onClose,
  onConfirm,
}: {
  orders: Order[];
  chunks: Chunk[];
  date: string;
  presetOrderId?: string;
  onClose: () => void;
  onConfirm: (orderId: string, units: number, initialStatus: ChunkStatus) => void;
}) {
  const remaining = (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return 0;
    const used = chunks.filter((c) => c.orderId === orderId).reduce((a, c) => a + c.units, 0);
    return Math.max(0, o.totalUnits - used);
  };

  const candidates = useMemo(
    () => orders.filter((o) => remaining(o.id) > 0 && !o.archived),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, chunks]
  );

  const initialId =
    presetOrderId && candidates.some((o) => o.id === presetOrderId)
      ? presetOrderId
      : (candidates[0]?.id ?? "");
  const [orderId, setOrderId] = useState(initialId);
  const [units, setUnits] = useState(() => Math.max(1, remaining(initialId)));
  const [initialStatus, setInitialStatus] = useState<ChunkStatus>("revision");

  const c = colDate(date);
  const sel = candidates.find((o) => o.id === orderId);
  const rem = sel ? remaining(sel.id) : 0;
  const ok = !!sel && units >= 1 && units <= rem;

  return (
    <Modal
      title="Asignar unidades"
      subtitle={`${c.dowLong} ${c.dnum} ${c.mon} · define la etapa con la que inicia la tarjeta`}
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
                setUnits(Math.max(1, remaining(e.target.value)));
              }}
              className={inputCls}
            >
              {candidates.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {o.client} — {o.product} ({remaining(o.id)} pend.)
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className={labelCls}>Unidades a asignar</span>
              <Stepper value={units} onChange={setUnits} min={1} max={Math.max(1, rem)} step={5} unit="uds" />
            </div>
            {sel && (
              <span className="pb-1 font-mono text-[11px] tabular text-mut">
                disponibles: {fmtNum(rem)} / {fmtNum(sel.totalUnits)}
              </span>
            )}
          </div>
          <div>
            <span className={labelCls}>Etapa inicial</span>
            <select value={initialStatus} onChange={(e) => setInitialStatus(e.target.value as ChunkStatus)} className={inputCls}>
              {INITIAL_STAGES.map((stage) => (
                <option key={stage} value={stage}>{FLOW_LABELS[stage]}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button
              onClick={() => ok && onConfirm(orderId, units, initialStatus)}
              disabled={!ok}
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
