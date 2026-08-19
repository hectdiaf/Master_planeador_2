import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Chunk, ColorKey, Order } from "../types";
import {
  BLOCK_REASONS,
  CATEGORIES,
  CHANNELS,
  COLOR_KEYS,
  ORDER_COLORS,
  STATUS_META,
  clamp,
} from "../types";
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

/* ── Nuevo pedido / edición ─────────────────────────────────────── */

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
  const [product, setProduct] = useState(order?.product ?? "");
  const [client, setClient] = useState(order?.client ?? "");
  const [channel, setChannel] = useState(order?.channel ?? CHANNELS[0]);
  const [subchannel, setSubchannel] = useState(order?.subchannel ?? "");
  const [category, setCategory] = useState(order?.category ?? CATEGORIES[0]);
  const [color, setColor] = useState<ColorKey>(order?.color ?? "teal");
  const [totalUnits, setTotalUnits] = useState(order?.totalUnits ?? 100);
  const [requestDate, setRequestDate] = useState(order?.requestDate ?? ensureBiz(todayISO()));
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? ensureBiz(todayISO()));
  const [touched, setTouched] = useState(false);
  const [armed, setArmed] = useState(false);

  const valid =
    product.trim().length > 0 &&
    client.trim().length > 0 &&
    totalUnits >= Math.max(1, scheduledUnits);

  return (
    <Modal
      title={order ? `Editar ${order.code}` : "Nuevo pedido"}
      subtitle={order ? undefined : `Se creará con el código ${nextCode} · entrará al backlog`}
      onClose={onClose}
      width={470}
    >
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={labelCls}>Producto *</span>
            <input
              value={product}
              onChange={(e) => {
                setProduct(e.target.value);
                setTouched(true);
              }}
              placeholder="Ej. iPhone 12 64GB"
              className={inputCls}
            />
            {touched && !product.trim() && (
              <p className="mt-1 text-[10.5px] font-medium text-danger">Requerido.</p>
            )}
          </div>
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={labelCls}>Canal de venta</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Subcanal</span>
            <input
              value={subchannel}
              onChange={(e) => setSubchannel(e.target.value)}
              placeholder="Ej. Postpago"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={labelCls}>Tipo / categoría</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Unidades totales</span>
            <Stepper
              value={totalUnits}
              onChange={setTotalUnits}
              min={Math.max(1, scheduledUnits)}
              max={9999}
              step={10}
              unit="uds"
            />
            {scheduledUnits > 0 && (
              <p className="mt-1 text-[10px] text-faint">
                Mínimo {scheduledUnits}: ya hay unidades en calendario.
              </p>
            )}
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
          <span className={labelCls}>Color del lote</span>
          <div className="flex gap-1.5">
            {COLOR_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setColor(k)}
                aria-label={`Color ${k}`}
                className={`h-7 w-7 rounded-full border-2 transition active:scale-90 ${
                  color === k ? "border-ink" : "border-transparent hover:scale-105"
                }`}
                style={{ background: ORDER_COLORS[k] }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {order && onDelete ? (
            armed ? (
              <button onClick={onDelete} onMouseLeave={() => setArmed(false)} className={btnDanger}>
                ¿Confirmar eliminación?
              </button>
            ) : (
              <button onClick={() => setArmed(true)} className={btnDanger}>
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
                  product: product.trim(),
                  client: client.trim(),
                  channel,
                  subchannel: subchannel.trim(),
                  category,
                  color,
                  totalUnits,
                  requestDate,
                  deliveryDate,
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

/* ── Bloqueo de pedido (motivo obligatorio) ─────────────────────── */

export function BlockModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [preset, setPreset] = useState<string>(order.blockReason ?? "");
  const [detail, setDetail] = useState(
    order.blockReason && !(BLOCK_REASONS as readonly string[]).includes(order.blockReason)
      ? order.blockReason
      : ""
  );
  const reason = preset === "Otro" ? detail.trim() : preset;
  const ok = reason.length > 0;

  return (
    <Modal
      title="Bloquear pedido"
      subtitle={`${order.code} · ${order.product} — el motivo es obligatorio`}
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
            Bloquear pedido
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
  onConfirm: (orderId: string, units: number) => void;
}) {
  const remaining = (o: Order) =>
    Math.max(0, o.totalUnits - chunks.filter((c) => c.orderId === o.id).reduce((a, c) => a + c.units, 0));

  const candidates = useMemo(
    () => orders.filter((o) => !o.archived && remaining(o) > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, chunks]
  );

  const initial =
    presetOrderId && candidates.some((o) => o.id === presetOrderId)
      ? presetOrderId
      : (candidates[0]?.id ?? "");
  const [orderId, setOrderId] = useState(initial);
  const sel = candidates.find((o) => o.id === orderId);
  const rem = sel ? remaining(sel) : 0;
  const [units, setUnits] = useState(Math.max(1, rem));
  const valid = !!sel && units >= 1 && units <= rem;
  const c = colDate(date);

  return (
    <Modal
      title="Asignar unidades"
      subtitle={`${c.dowLong} ${c.dnum} ${c.mon} · entrarán al plan del día`}
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
                if (o) setUnits(remaining(o));
              }}
              className={inputCls}
            >
              {candidates.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {o.client} — {o.product} ({remaining(o)} pend.)
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
                disponibles: {fmtNum(rem)} / {fmtNum(sel.totalUnits)}
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

export function despachoBody(order: Order): string {
  return `¿Estás seguro de que ya finalizó el pedido ${order.code} (${order.product} · ${fmtNum(
    order.totalUnits
  )} uds)? El pedido desaparecerá del listado del backlog, pero permanecerá visible en el calendario como ${STATUS_META.despacho.label}.`;
}
