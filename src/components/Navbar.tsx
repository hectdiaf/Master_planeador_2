import { useMemo, useRef, useState, useEffect } from "react";
import { Moon, Search, Sun } from "lucide-react";
import type { Order } from "../types";
import { ORDER_COLORS } from "../types";
import { fmtLong, todayISO } from "../lib";
import { Badge } from "./ui";

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="var(--sf-accent)" opacity="0.14" />
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="none" stroke="var(--sf-accent)" strokeWidth="1.6" />
      <path d="M10 11.5h9M10 16h12M10 20.5h6.5" stroke="var(--sf-accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22.5" cy="20.5" r="2.6" fill="var(--sf-accent)" />
    </svg>
  );
}

export function Navbar({
  query,
  setQuery,
  orders,
  onPick,
  theme,
  onToggleTheme,
}: {
  query: string;
  setQuery: (q: string) => void;
  orders: Order[];
  onPick: (order: Order) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return orders
      .filter((o) =>
        [o.code, o.product, o.client, o.channel, o.category]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 6);
  }, [query, orders]);

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-panel px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark />
        <div className="leading-none">
          <div className="font-display text-[17px] font-bold uppercase tracking-[0.06em]">
            Planificador <span className="text-accent">Operaciones</span>
          </div>
          <div className="mt-[3px] font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            Reacondicionamiento · Celulares
          </div>
        </div>
      </div>

      <div ref={boxRef} className="relative mx-auto w-full max-w-md">
        <Search
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por pedido, producto o cliente…"
          className="w-full rounded-lg border border-line bg-paper py-1.5 pl-8 pr-9 text-[13px] outline-none transition focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/20 placeholder:text-faint"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-raise px-1.5 py-[1px] font-mono text-[10px] text-faint">
          /
        </kbd>

        {open && query.trim() && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] overflow-hidden rounded-lg border border-line bg-panel shadow-pop animate-pop">
            {results.length === 0 ? (
              <p className="px-3.5 py-3 text-[12.5px] text-mut">
                Sin coincidencias para «{query.trim()}».
              </p>
            ) : (
              results.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    onPick(o);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-2 text-left transition last:border-0 hover:bg-raise"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ background: ORDER_COLORS[o.color] }}
                  />
                  <span className="font-mono text-[11px] text-mut">{o.code}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                    {o.product}
                    <span className="text-mut"> · {o.client}</span>
                  </span>
                  <Badge status={o.status} size="sm" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden font-mono text-[11px] uppercase tracking-wider text-mut md:block">
          {fmtLong(todayISO())}
        </span>
        <button
          onClick={onToggleTheme}
          role="switch"
          aria-checked={theme === "dark"}
          aria-label="Alternar tema claro u oscuro"
          className="relative flex h-7 w-[52px] items-center rounded-full border border-line bg-paper px-1 transition hover:border-line2"
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          <Sun
            size={13}
            className={`absolute left-1.5 transition-opacity ${theme === "dark" ? "opacity-30" : "opacity-0"}`}
            style={{ color: "var(--sf-warn)" }}
          />
          <Moon
            size={13}
            className={`absolute right-1.5 transition-opacity ${theme === "dark" ? "opacity-0" : "opacity-30"}`}
            style={{ color: "var(--sf-accent)" }}
          />
          <span
            className="grid h-5 w-5 place-items-center rounded-full bg-accent text-white shadow-sm transition-transform duration-300 dark:text-[#0d1512]"
            style={{ transform: theme === "dark" ? "translateX(24px)" : "translateX(0)" }}
          >
            {theme === "dark" ? <Moon size={11} /> : <Sun size={11} />}
          </span>
        </button>
      </div>
    </header>
  );
}
