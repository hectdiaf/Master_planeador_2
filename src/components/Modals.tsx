import { useMemo, useState } from "react";
import { AlertTriangle, Lock, Split, Trash2 } from "lucide-react";
import type { Chunk, ColorKey, Order } from "../types";
import {
  BLOCK_REASONS,
  CATEGORIES,
  CHANNELS,
  COLOR_KEYS,
  ORDER_COLORS,
  clamp,
} from "../types";
import { buildWindow, ensureBiz, fmtLong, fmtMedium, shiftDays, todayISO } from "../lib";
import {
  Modal,
  Stepper,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
  labelCls,
} from "./ui";

/* ── Dividir fracción ─────────────────────────────────────── */

export function SplitModal({
  chunk,
  order,
  onConfirm,
  onClose,
}: {
  chunk: Chunk;
  order: Order;
  onConfirm: (parts: { date: string; units: number }[]) => void;
  onClose: () => void;
}) {
  const [parts, setParts] = useState(2);
  const days = useMemo(() => buildWindow(chunk.date, parts), [chunk.date, parts]);

  const balanced = (n: number, total: number) => {
    const base = Math.floor(total / n);
    const rem = total - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
  };

  const [units, setUnits] = useState<number[]>(() => balanced(2, chunk.units));

  const changeParts = (n: number) => {
    setParts(n);
    setUnits(balanced(n, chunk.units));
  };

  const sum = units.reduce((a, b) => a + b, 0);
  const missing = chunk.units - sum;
  const valid = units.every((u) => u >= 1) && missing === 0;

  return (
    <Modal
      title="Dividir fracción"
      subtitle={`${order.code} · ${chunk.units} uds programadas el ${fmtLong(chunk.date)}`}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className={labelCls}>Jornadas consecutivas</span>
          <Stepper value={parts} min={2} max={6} step={1} onChange={changeParts} />
        </div>
        <p className="max-w-[220px] text-[11.5px] leading-snug text-mut">
          La fracción se reparte en días operativos seguidos (domingos excluidos), empezando el{" "}
          <strong className="text-ink">{fmtMedium(chunk.date)}</strong>.
        </p>
      </div>

      <div className="mt-3 space-y-1.5">
        {days.map((d, i) => (
          <div key={d} className="flex items-center gap-2.5 rounded-lg border border-line bg-paper px-3 py-2">
            <span className="w-8 font-mono text-[11px] font-bold text-accent">#{i + 1}</span>
            <span className="flex-1 text-[12.5px] font-medium capitalize">{fmtMedium(d)}</span>
            <Stepper
              value={units[i] ?? 0}
              min={1}
              max={chunk.units}
              step={5}
              unit="uds"
              onChange={(v) =>
                setUnits((u) => u.map((x, j) => (j === i ? v : x)))
              }
            />
          </div>
        ))}
      </div>

      <div
        className={`mt-3 flex items-center gap-2 rounded-md px-2.5 py-2 text-[12px] font-semibold ${
          valid ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"
        }`}
      >
        <Split size={14} />
        {valid
          ? `Reparto completo: ${sum}/${chunk.units} unidades.`
          : missing > 0
            ? `Faltan ${missing} unidades por repartir.`
            : `Sobran ${-missing} unidades; cada jornada necesita al menos 1 ud.`}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>Cancelar</button>
        <button
          disabled={!valid}
          onClick={() => onConfirm(days.map((d, i) => ({ date: d, units: units[i] })))}
          className={btnPrimary}
          style={!valid ? { opacity: 0.5, pointerEvents: "none" } : undefined}
        >
          <Split size={13.5} /> Dividir en {parts} jornadas
        </button>
      </div>
    </Modal>
  );
}

/* ── Bloqueo con motivo obligatorio ───────────────────────── */

export function BlockModal({
  order,
  onConfirm,
  onClose,
}: {
  order: Order;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [preset, setPreset] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const needsDetail = preset === "Otro";
  const valid = preset !== null && (!needsDetail || detail.trim().length > 0);

  return (
    <Modal
      title="Bloquear / pausar pedido"
      subtitle={`${order.code} · ${order.product} — el motivo es obligatorio`}
      onClose={onClose}
    >
      <span className={labelCls}>Motivo del bloqueo</span>
      <div className="grid grid-cols-2 gap-1.5">
        {BLOCK_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setPreset(r)}
            className={`rounded-lg border px-3 py-2.5 text-left text-[12.5px] font-semibold transition active:scale-[0.98] ${
              preset === r
                ? "border-danger bg-danger/10 text-danger"
                : "border-line bg-paper text-mut hover:border-line2 hover:text-ink"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <span className={labelCls}>
          Detalle {needsDetail ? "(obligatorio)" : "(opcional)"}
        </span>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={2}
          placeholder={
            needsDetail
              ? "Describe el motivo del bloqueo…"
              : "Ej. pantallas en espera de proveedor, ETA 5 días…"
          }
          className={`${inputCls} resize-none`}
        />
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 rounded-md bg-warn/10 px-2.5 py-2 text-[11.5px] leading-snug text-warn">
        <AlertTriangle size={13} className="mt-px shrink-0" />
        El pedido se mostrará con alerta en el calendario y no podrá avanzar de etapa hasta liberarlo.
      </p>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>Cancelar</button>
        <button
          disabled={!valid}
          onClick={() =>
            onConfirm(detail.trim() ? `${preset} — ${detail.trim()}` : (preset as string))
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          style={!valid ? { opacity: 0.5, pointerEvents: "none" } : undefined}
        >
          <Lock size={13} /> Bloquear pedido
        </button>
      </div>
    </Modal>
  );
}

/* ── Asignar unidades a un día ────────────────────────────── */

export function AssignModal({
  orders,
  orderId,
  date,
  remaining,
  freeCap,
  onConfirm,
  onClose,
}: {
  orders: Order[];
  orderId: string | null;
  date: string;
  remaining: (orderId: string) => number;
  freeCap: number | null;
  onConfirm: (orderId: string, units: number, date: string) => void;
  onClose: () => void;
}) {
  const candidates = useMemo(
    () => orders.filter((o) => !o.archived && remaining(o.id) > 0),
    [orders, remaining]
  );
  const initialId =
    orderId && remaining(orderId) > 0 ? orderId : (candidates[0]?.id ?? "");
  const [selId, setSelId] = useState<string>(initialId);
  const [units, setUnits] = useState<number>(() =>
    Math.max(1, remaining(initialId))
  );
  const [day, setDay] = useState(ensureBiz(date));

  const sel = candidates.find((o) => o.id === selId) ?? null;
  const rem = sel ? remaining(sel.id) : 0;

  return (
    <Modal
      title="Asignar unidades al calendario"
      subtitle="Agenda una fracción del pedido en una jornada operativa"
      onClose={onClose}
      width={420}
    >
      {candidates.length === 0 ? (
        <p className="py-4 text-center text-[12.5px] text-mut">
          No hay pedidos con unidades pendientes por agendar.
        </p>
      ) : (
        <>
          <span className={labelCls}>Pedido</span>
          <select
            value={selId}
            onChange={(e) => {
              setSelId(e.target.value);
              setUnits(Math.max(1, remaining(e.target.value)));
            }}
            className={inputCls}
          >
            {candidates.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} · {o.product} — {o.client} ({remaining(o.id)} uds libres)
              </option>
            ))}
          </select>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <span className={labelCls}>Jornada</span>
              <input
                type="date"
                value={day}
                onChange={(e) => e.target.value && setDay(ensureBiz(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <span className={labelCls}>Unidades</span>
              <Stepper
                value={units}
                min={1}
                max={Math.max(1, rem)}
                step={10}
                unit="uds"
                onChange={(v) => setUnits(v)}
              />
            </div>
          </div>

          <p className="mt-2.5 text-[11.5px] text-mut">
            {sel && (
              <>
                Pendientes de agendar:{" "}
                <strong className="font-mono text-ink tabular">{rem} uds</strong>
                {" · "}
              </>
            )}
            {freeCap !== null && (
              <>
                capacidad libre ese día:{" "}
                <strong
                  className="font-mono tabular"
                  style={{ color: freeCap <= 0 ? "var(--sf-danger)" : "var(--sf-ink)" }}
                >
                  {Math.max(0, freeCap)} uds
                </strong>
              </>
            )}
          </p>
          {freeCap !== null && units > freeCap && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-warn">
              <AlertTriangle size={13} /> Superarás la capacidad del día (quedará en sobrecarga).
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>Cancelar</button>
            <button
              onClick={() => sel && onConfirm(sel.id, clamp(units, 1, Math.max(1, rem)), day)}
              className={btnPrimary}
            >
              Agendar {units} uds
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ── Crear / editar pedido ────────────────────────────────── */

export interface OrderDraft {
  code: string;
  product: string;
  client: string;
  channel: string;
  subchannel: string;
  category: string;
  color: ColorKey;
  totalUnits: number;
  requestDate: string;
  deliveryDate: string;
}

export function OrderFormModal({
  order,
  nextCode,
  onConfirm,
  onDelete,
  onClose,
}: {
  order: Order | null;
  nextCode: string;
  onConfirm: (draft: OrderDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<OrderDraft>(() =>
    order
      ? {
          code: order.code,
          product: order.product,
          client: order.client,
          channel: order.channel,
          subchannel: order.subchannel,
          category: order.category,
          color: order.color,
          totalUnits: order.totalUnits,
          requestDate: order.requestDate,
          deliveryDate: order.deliveryDate,
        }
      : {
          code: nextCode,
          product: "",
          client: "",
          channel: CHANNELS[0],
          subchannel: "",
          category: CATEGORIES[0],
          color: COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
          totalUnits: 50,
          requestDate: todayISO(),
          deliveryDate: shiftDays(todayISO(), 10),
        }
  );
  const [armed, setArmed] = useState(false);

  const valid = d.product.trim() && d.client.trim() && d.totalUnits >= 1 && d.code.trim();
  const set = (patch: Partial<OrderDraft>) => setD((x) => ({ ...x, ...patch }));

  return (
    <Modal
      title={order ? `Editar ${order.code}` : "Nuevo pedido"}
      subtitle={order ? "Información general del pedido" : "Ingresa al backlog, pendiente de agendar"}
      onClose={onClose}
      width={480}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={labelCls}>Código</span>
          <input value={d.code} onChange={(e) => set({ code: e.target.value })} className={inputCls} />
        </div>
        <div>
          <span className={labelCls}>Unidades totales</span>
          <Stepper value={d.totalUnits} min={1} step={10} onChange={(v) => set({ totalUnits: v })} />
        </div>
        <div className="col-span-2">
          <span className={labelCls}>Producto</span>
          <input
            value={d.product}
            onChange={(e) => set({ product: e.target.value })}
            placeholder="Ej. iPhone 11 64GB"
            className={inputCls}
          />
        </div>
        <div>
          <span className={labelCls}>Cliente</span>
          <input
            value={d.client}
            onChange={(e) => set({ client: e.target.value })}
            placeholder="Ej. Mercado Libre"
            className={inputCls}
          />
        </div>
        <div>
          <span className={labelCls}>Canal de venta</span>
          <select value={d.channel} onChange={(e) => set({ channel: e.target.value })} className={inputCls}>
            {CHANNELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <span className={labelCls}>Subcanal</span>
          <input
            value={d.subchannel}
            onChange={(e) => set({ subchannel: e.target.value })}
            placeholder="Ej. Online, postpago…"
            className={inputCls}
          />
        </div>
        <div>
          <span className={labelCls}>Tipo / Categoría</span>
          <select value={d.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <span className={labelCls}>Fecha de solicitud</span>
          <input
            type="date"
            value={d.requestDate}
            onChange={(e) => e.target.value && set({ requestDate: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <span className={labelCls}>Entrega tentativa</span>
          <input
            type="date"
            value={d.deliveryDate}
            onChange={(e) => e.target.value && set({ deliveryDate: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <span className={labelCls}>Color de acento del lote</span>
          <div className="flex gap-1.5">
            {COLOR_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => set({ color: k })}
                aria-label={`Color ${k}`}
                className="h-7 w-7 rounded-md transition active:scale-90"
                style={{
                  background: ORDER_COLORS[k],
                  outline: d.color === k ? "2px solid var(--sf-ink)" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {order && onDelete && (
          <button
            onClick={() => (armed ? onDelete() : setArmed(true))}
            className={btnDanger}
          >
            <Trash2 size={13} /> {armed ? "¿Confirmar eliminación?" : "Eliminar"}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={onClose} className={btnGhost}>Cancelar</button>
          <button
            disabled={!valid}
            onClick={() => onConfirm({ ...d, code: d.code.trim() })}
            className={btnPrimary}
            style={!valid ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          >
            {order ? "Guardar cambios" : "Crear pedido"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Confirmación genérica ────────────────────────────────── */

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} width={400}>
      <p className="text-[13px] leading-relaxed text-mut">{body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>No, volver</button>
        <button onClick={onConfirm} className={btnPrimary}>
          Sí, {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
