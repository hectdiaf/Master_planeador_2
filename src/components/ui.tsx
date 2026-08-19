import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import type { OrderStatus } from "../types";
import { STATUS_META } from "../types";

export const inputCls =
  "w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25 placeholder:text-faint";

export const labelCls =
  "block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut mb-1";

export const btnGhost =
  "inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-[12.5px] font-medium text-ink transition hover:border-line2 hover:bg-raise active:scale-[0.98]";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] dark:text-[#0d1512]";

export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-[12.5px] font-semibold text-danger transition hover:bg-danger/20 active:scale-[0.98]";

export function Badge({
  status,
  size = "md",
}: {
  status: OrderStatus;
  size?: "sm" | "md";
}) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${
        size === "sm" ? "px-1.5 py-[1px] text-[10px]" : "px-2 py-[2px] text-[11px]"
      }`}
      style={{
        color: m.hex,
        background: `color-mix(in srgb, ${m.hex} 13%, transparent)`,
        border: `1px solid color-mix(in srgb, ${m.hex} 32%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: m.hex }}
      />
      {size === "sm" ? m.short : m.label}
    </span>
  );
}

export function Ring({
  value,
  size = 34,
  stroke = 3.5,
  color = "var(--sf-accent)",
  label = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      className="relative grid place-items-center shrink-0"
      style={{ width: size, height: size }}
      title={`${Math.round(v)}% de avance`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--sf-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {label && (
        <span
          className="absolute font-mono font-semibold tabular"
          style={{ fontSize: size * 0.27, color: "var(--sf-mut)" }}
        >
          {Math.round(v)}%
        </span>
      )}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 5000,
  step = 5,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(Math.max(min, value - step))}
        className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-mut transition hover:bg-raise hover:text-ink active:scale-95"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="w-16 rounded-md border border-line bg-panel px-1 py-1 text-center font-mono text-[13px] font-semibold tabular outline-none focus:border-accent"
      />
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(Math.min(max, value + step))}
        className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-mut transition hover:bg-raise hover:text-ink active:scale-95"
      >
        +
      </button>
      {unit && <span className="ml-0.5 text-[11px] text-mut">{unit}</span>}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = 440,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-black/45 animate-fade"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full overflow-hidden rounded-xl border border-line bg-panel shadow-pop animate-pop"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="font-display text-[19px] font-semibold tracking-wide uppercase">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-[12px] text-mut">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-mut transition hover:bg-raise hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export interface Toast {
  id: string;
  text: string;
  tone: "ok" | "warn" | "danger";
}

export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-line bg-panel py-2.5 pl-3 pr-4 text-[12.5px] font-medium shadow-pop animate-toast"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              background:
                t.tone === "ok"
                  ? "var(--sf-ok)"
                  : t.tone === "warn"
                    ? "var(--sf-warn)"
                    : "var(--sf-danger)",
            }}
          />
          {t.text}
        </div>
      ))}
    </div>
  );
}
