import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AppProvider, useApp, type OrderInput } from "./store";
import type { ChunkStatus, Filters, Order } from "./types";
import {
  buildWindow,
  ensureBiz,
  fmtMedium,
  orderRemaining,
  shiftBiz,
  todayISO,
} from "./lib";
import { PRODUCTS, productName } from "./data";
import { Navbar } from "./components/Navbar";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { Board } from "./components/Board";
import { Drawer } from "./components/Drawer";
import {
  AssignModal,
  BlockModal,
  ConfirmModal,
  DespachoModal,
  OrderFormModal,
  SplitModal,
} from "./components/Modals";
import { Toasts, type Toast } from "./components/ui";

type ModalState =
  | { type: "order"; orderId: string | null }
  | { type: "split"; chunkId: string }
  | { type: "block"; chunkId: string }
  | { type: "despacho"; chunkId: string }
  | { type: "assign"; orderId: string | null; date: string }
  | { type: "delete-chunk"; chunkId: string }
  | null;

function loadTheme(): "light" | "dark" {
  try {
    return localStorage.getItem("po-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function Planner() {
  const { state, api, canUndo, undo } = useApp();
  const { orders, chunks, dayConfigs } = state;

  const [theme, setTheme] = useState<"light" | "dark">(loadTheme);
  const [anchor, setAnchor] = useState(() => ensureBiz(todayISO()));
  const [filters, setFilters] = useState<Filters>({
    client: "all",
    status: "all",
    product: "all",
  });
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"backlog" | "capacidad">("backlog");
  const [collapsed, setCollapsed] = useState(false);
  const [capacityDate, setCapacityDate] = useState(() => ensureBiz(todayISO()));
  const [drawer, setDrawer] = useState<{ orderId: string; chunkId: string | null } | null>(null);
  const [highlight, setHighlight] = useState<{
    orderId: string;
    status: ChunkStatus | "sinAgendar";
  } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragging, setDragging] = useState<{ kind: "order" | "chunk"; label: string } | null>(null);
  const toastTimers = useRef<number[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem("po-theme", theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  const notify = useCallback(
    (text: string, tone: "ok" | "warn" | "danger" = "ok") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, text, tone }]);
      const timer = window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 2800);
      toastTimers.current.push(timer);
    },
    []
  );
  useEffect(() => () => toastTimers.current.forEach(clearTimeout), []);

  /* deshacer (Ctrl/Cmd+Z) fuera de campos de texto */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const el = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable) return;
      e.preventDefault();
      if (canUndo) {
        undo();
        notify("Último cambio deshecho.", "warn");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [canUndo, undo, notify]);

  const ordersById = useMemo(
    () => new Map(orders.map((o) => [o.id, o])),
    [orders]
  );
  const dates = useMemo(() => buildWindow(anchor, 8), [anchor]);
  const today = todayISO();

  const clients = useMemo(
    () => [...new Set(orders.map((o) => o.client))].sort(),
    [orders]
  );
  const clientCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) m[o.client] = (m[o.client] ?? 0) + 1;
    return m;
  }, [orders]);
  const productsInUse = useMemo(
    () =>
      [...new Set(orders.flatMap((o) => o.items.map((i) => productName(i.productId))))].sort(),
    [orders]
  );

  const nextCode = useMemo(() => {
    const max = orders.reduce((m, o) => {
      const n = parseInt(o.code.replace(/\D/g, ""), 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }, 100);
    return `PED-${max + 1}`;
  }, [orders]);

  const remainingOf = useCallback(
    (orderId: string) => {
      const o = ordersById.get(orderId);
      return o ? orderRemaining(o, chunks) : 0;
    },
    [ordersById, chunks]
  );

  const matchOrder = useCallback(
    (o: Order) => {
      if (filters.client !== "all" && o.client !== filters.client) return false;
      if (
        filters.product !== "all" &&
        !o.items.some((i) => productName(i.productId) === filters.product)
      )
        return false;
      return true;
    },
    [filters]
  );

  /* si el pedido del drawer desaparece (undo / borrado), cerrar */
  useEffect(() => {
    if (drawer && !ordersById.has(drawer.orderId)) setDrawer(null);
  }, [drawer, ordersById]);

  /* ── acciones ── */

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith("o:")) {
      const o = ordersById.get(id.slice(2));
      if (o) setDragging({ kind: "order", label: `${o.code} · ${o.client}` });
    } else if (id.startsWith("c:")) {
      const c = chunks.find((x) => x.id === id.slice(2));
      if (c) setDragging({ kind: "chunk", label: `${c.units} uds · ${fmtMedium(c.date)}` });
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || !overId.startsWith("day:")) return;
    const date = overId.slice(4);
    const activeId = String(e.active.id);
    if (activeId.startsWith("c:")) {
      const chunkId = activeId.slice(2);
      const c = chunks.find((x) => x.id === chunkId);
      if (c && c.date !== date) {
        api.moveChunk(chunkId, date);
        notify(`Tarjeta de ${c.units} uds movida al ${fmtMedium(date)}.`);
      }
    } else if (activeId.startsWith("o:")) {
      const orderId = activeId.slice(2);
      if (remainingOf(orderId) > 0) setModal({ type: "assign", orderId, date });
      else notify("Ese pedido no tiene unidades pendientes por agendar.", "warn");
    }
  };

  const handleChunkStatus = (chunkId: string, status: ChunkStatus) => {
    const c = chunks.find((x) => x.id === chunkId);
    if (!c) return;
    if (status === "bloqueado") {
      setModal({ type: "block", chunkId });
    } else if (status === "despacho") {
      setModal({ type: "despacho", chunkId });
    } else {
      api.setChunkStatus(chunkId, status);
      notify(`Tarjeta de ${c.units} uds → ${status === "qa" ? "QA y Limpieza" : status}.`);
    }
  };

  const saveOrderForm = (input: OrderInput) => {
    if (modal?.type !== "order") return;
    if (modal.orderId) {
      api.updateOrder(modal.orderId, input);
      notify("Pedido actualizado — totales recalculados.");
    } else {
      const id = api.createOrder(input, nextCode, orders.length % 8);
      notify(`Pedido ${nextCode} creado.`);
      setDrawer({ orderId: id, chunkId: null });
    }
    setModal(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const drawerOrder = drawer ? ordersById.get(drawer.orderId) ?? null : null;

  const chunkOf = (id: string) => chunks.find((c) => c.id === id) ?? null;
  const modalChunk =
    modal && "chunkId" in modal ? chunkOf(modal.chunkId) : null;
  const modalChunkOrder = modalChunk ? ordersById.get(modalChunk.orderId) ?? null : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <Navbar
        query={query}
        setQuery={setQuery}
        orders={orders}
        productName={productName}
        onPick={(o) => setDrawer({ orderId: o.id, chunkId: null })}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        canUndo={canUndo}
        onUndo={() => {
          undo();
          notify("Último cambio deshecho.", "warn");
        }}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pb-1 pt-3">
          <h1 className="font-display text-[22px] font-bold uppercase leading-none tracking-wide">
            Próximos pedidos.
          </h1>
        </div>

        <Toolbar
          rangeLabel={`${fmtMedium(dates[0])} → ${fmtMedium(dates[dates.length - 1])}`}
          isToday={anchor === today}
          onPrev={() => setAnchor((a) => shiftBiz(a, -1))}
          onNext={() => setAnchor((a) => shiftBiz(a, 1))}
          onToday={() => setAnchor(today)}
          filters={filters}
          setFilters={setFilters}
          clients={clients}
          clientCounts={clientCounts}
          products={productsInUse}
          onClearFilters={() =>
            setFilters({ client: "all", status: "all", product: "all" })
          }
          onNewOrder={() => setModal({ type: "order", orderId: null })}
        />

        <div className="flex min-h-0 flex-1">
          <Sidebar
            tab={tab}
            onTab={setTab}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            orders={orders}
            chunks={chunks}
            dayConfigs={dayConfigs}
            api={api}
            productName={productName}
            capacityDate={capacityDate}
            setCapacityDate={setCapacityDate}
            onEditOrder={(id) => setModal({ type: "order", orderId: id })}
            onOpenOrder={(id) => setDrawer({ orderId: id, chunkId: null })}
            onNewOrder={() => setModal({ type: "order", orderId: null })}
            notify={notify}
          />

          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <Board
              dates={dates}
              chunks={chunks}
              ordersById={ordersById}
              dayConfigs={dayConfigs}
              filters={filters}
              matchOrder={matchOrder}
              highlight={highlight}
              focusChunkId={drawer?.chunkId ?? null}
              remainingOf={remainingOf}
              onCardClick={(c) =>
                setDrawer({ orderId: c.orderId, chunkId: c.id })
              }
              onChunkUnits={(id, u) => api.setChunkUnits(id, u)}
              onChunkStatus={handleChunkStatus}
              onBlockChunk={(id) => setModal({ type: "block", chunkId: id })}
              onUnblockChunk={(id) => {
                api.unblockChunk(id);
                notify("Bloqueo liberado.");
              }}
              onSplitChunk={(id) => setModal({ type: "split", chunkId: id })}
              onRemoveChunk={(id) => setModal({ type: "delete-chunk", chunkId: id })}
              onDropChunk={(id, date) => {
                api.moveChunk(id, date);
                notify(`Tarjeta movida al ${fmtMedium(date)}.`);
              }}
              onDropOrder={(orderId, date) => {
                if (remainingOf(orderId) > 0) setModal({ type: "assign", orderId, date });
                else notify("Ese pedido no tiene unidades pendientes.", "warn");
              }}
              onAdd={(date) => setModal({ type: "assign", orderId: null, date })}
              onGearDay={(date) => {
                setCapacityDate(date);
                setTab("capacidad");
                setCollapsed(false);
              }}
            />
            <DragOverlay>
              {dragging && (
                <div className="flex rotate-2 items-center gap-2 rounded-lg border border-accent/60 bg-panel px-3 py-2 text-[12px] font-semibold shadow-pop">
                  <span
                    className={`rounded px-1 py-[1px] font-mono text-[9px] uppercase tracking-wider ${
                      dragging.kind === "order"
                        ? "bg-accent/12 text-accent"
                        : "bg-warn/15 text-warn"
                    }`}
                  >
                    {dragging.kind === "order" ? "Pedido" : "Tarjeta"}
                  </span>
                  {dragging.label}
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {drawerOrder && drawer && (
            <Drawer
              order={drawerOrder}
              chunks={chunks}
              api={api}
              productName={productName}
              focusChunkId={drawer.chunkId}
              onFocusChunk={(chunkId) => setDrawer({ ...drawer, chunkId })}
              highlight={highlight}
              onHighlight={(status) =>
                setHighlight(status ? { orderId: drawer.orderId, status } : null)
              }
              onClose={() => {
                setDrawer(null);
                setHighlight(null);
              }}
              onEditOrder={(id) => setModal({ type: "order", orderId: id })}
              onBlockChunk={(id) => setModal({ type: "block", chunkId: id })}
              onUnblockChunk={(id) => {
                api.unblockChunk(id);
                notify("Bloqueo liberado.");
              }}
              notify={notify}
            />
          )}
        </div>
      </main>

      {/* ── modales ── */}
      {modal?.type === "order" &&
        (() => {
          const editingId = modal.orderId;
          const editing = editingId ? ordersById.get(editingId) ?? null : null;
          return (
            <OrderFormModal
              order={editing}
              nextCode={nextCode}
              products={PRODUCTS}
              assignedUnits={editingId ? chunks.filter((c) => c.orderId === editingId).reduce((a, c) => a + c.units, 0) : 0}
              onClose={() => setModal(null)}
              onConfirm={saveOrderForm}
              onDelete={
                editingId
                  ? () => {
                      api.removeOrder(editingId);
                      if (drawer?.orderId === editingId) setDrawer(null);
                      setModal(null);
                      notify("Pedido eliminado del plan.", "danger");
                    }
                  : undefined
              }
            />
          );
        })()}

      {modal?.type === "split" && modalChunk && modalChunkOrder && (
        <SplitModal
          chunk={modalChunk}
          orderCode={modalChunkOrder.code}
          onClose={() => setModal(null)}
          onConfirm={(parts) => {
            api.splitChunk(modalChunk.id, parts);
            setModal(null);
            notify(`Tarjeta fraccionada en ${parts.length} jornadas.`);
          }}
        />
      )}

      {modal?.type === "block" && modalChunk && modalChunkOrder && (
        <BlockModal
          chunk={modalChunk}
          orderCode={modalChunkOrder.code}
          onClose={() => setModal(null)}
          onConfirm={(reason) => {
            api.blockChunk(modalChunk.id, reason);
            setModal(null);
            notify(`Tarjeta bloqueada: ${reason}.`, "danger");
          }}
        />
      )}

      {modal?.type === "despacho" && modalChunk && modalChunkOrder && (
        <DespachoModal
          chunk={modalChunk}
          orderCode={modalChunkOrder.code}
          onClose={() => setModal(null)}
          onConfirm={() => {
            api.setChunkStatus(modalChunk.id, "despacho");
            setModal(null);
            notify(`${modalChunk.units} uds marcadas como despachadas.`);
          }}
        />
      )}

      {modal?.type === "delete-chunk" && modalChunk && (
        <ConfirmModal
          title="Quitar tarjeta del día"
          body={`Las ${modalChunk.units} uds del ${fmtMedium(modalChunk.date)} volverán al backlog del pedido y podrán reasignarse.`}
          confirmLabel="Quitar del calendario"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => {
            api.removeChunk(modalChunk.id);
            setModal(null);
            notify("Tarjeta devuelta al backlog.", "warn");
          }}
        />
      )}

      {modal?.type === "assign" && (
        <AssignModal
          orders={orders}
          chunks={chunks}
          date={modal.date}
          presetOrderId={modal.orderId ?? undefined}
          productName={productName}
          onClose={() => setModal(null)}
          onConfirm={(orderId, units) => {
            api.assignUnits(orderId, modal.date, units);
            setModal(null);
            notify(`${units} uds asignadas al ${fmtMedium(modal.date)}.`);
          }}
        />
      )}

      <Toasts items={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Planner />
    </AppProvider>
  );
}
