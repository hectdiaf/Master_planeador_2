import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Chunk, Filters, Order } from "./types";
import { uid } from "./types";
import { buildWindow, fmtMedium, fmtNum, fmtRange, nextBiz, prevBiz, todayISO } from "./lib";
import { loadTheme, saveTheme, usePlanner, type OrderInput } from "./store";
import { Navbar } from "./components/Navbar";
import { Toolbar } from "./components/Toolbar";
import { Sidebar, type Tab } from "./components/Sidebar";
import { Board } from "./components/Board";
import { Drawer } from "./components/Drawer";
import {
  AssignModal,
  BlockModal,
  ConfirmModal,
  OrderFormModal,
  SplitModal,
} from "./components/Modals";
import { Toasts, type Toast } from "./components/ui";

type ModalState =
  | { type: "split"; chunkId: string }
  | { type: "block"; chunkId: string }
  | { type: "despacho"; chunkId: string }
  | { type: "assign"; orderId?: string; date: string }
  | { type: "order"; orderId: string | null }
  | null;

export default function App() {
  const { orders, chunks, dayConfigs, api } = usePlanner();
  const [theme, setTheme] = useState<"light" | "dark">(loadTheme);
  const [anchor, setAnchor] = useState(todayISO());
  const [filters, setFilters] = useState<Filters>({
    client: "all",
    status: "all",
    product: "all",
  });
  const [tab, setTab] = useState<Tab>("backlog");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragLabel, setDragLabel] = useState<{ kind: "order" | "chunk"; text: string } | null>(null);
  const [query, setQuery] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const today = todayISO();
  const dates = useMemo(() => buildWindow(anchor, 8), [anchor]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    saveTheme(theme);
  }, [theme]);

  const notify = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = uid();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const ordersById = useMemo(() => {
    const m = new Map<string, Order>();
    for (const o of orders) m.set(o.id, o);
    return m;
  }, [orders]);

  // el filtro de estado aplica a las tarjetas (el estado vive en cada asignación)
  const statusChunks = useMemo(
    () => (filters.status === "all" ? chunks : chunks.filter((c) => c.status === filters.status)),
    [chunks, filters.status]
  );
  const statusOrderIds = useMemo(
    () => new Set(statusChunks.map((c) => c.orderId)),
    [statusChunks]
  );

  const visibleOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (filters.client !== "all" && o.client !== filters.client) return false;
        if (filters.status !== "all" && !statusOrderIds.has(o.id)) return false;
        if (filters.product !== "all" && !o.products.some((p) => p.name === filters.product))
          return false;
        return true;
      }),
    [orders, filters, statusOrderIds]
  );

  const visibleIds = useMemo(() => new Set(visibleOrders.map((o) => o.id)), [visibleOrders]);
  const visibleChunks = useMemo(
    () => statusChunks.filter((c) => visibleIds.has(c.orderId)),
    [statusChunks, visibleIds]
  );

  // ocupación real por día (independiente de filtros) para la barra de capacidad
  const assignedByDate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of chunks) m[c.date] = (m[c.date] ?? 0) + c.units;
    return m;
  }, [chunks]);

  const activeOrders = useMemo(() => orders.filter((o) => !o.archived), [orders]);
  const finalizedCount = orders.length - activeOrders.length;

  const drawerOrder = drawerId ? (ordersById.get(drawerId) ?? null) : null;
  const drawerChunks = useMemo(
    () =>
      drawerId
        ? chunks.filter((c) => c.orderId === drawerId).sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [chunks, drawerId]
  );

  const nextCode = `PED-${2400 + orders.length + 1}`;
  const scheduledOf = useCallback(
    (orderId: string) =>
      chunks.filter((c) => c.orderId === orderId).reduce((a, c) => a + c.units, 0),
    [chunks]
  );

  /* ── drag & drop ── */
  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith("order:")) {
      const o = ordersById.get(id.slice(6));
      setDragLabel(o ? { kind: "order", text: `${o.code} · ${o.product}` } : null);
    } else if (id.startsWith("chunk:")) {
      const c = chunks.find((x) => x.id === id.slice(6));
      const o = c ? ordersById.get(c.orderId) : undefined;
      setDragLabel(c ? { kind: "chunk", text: `${o?.code ?? ""} · ${c.units} uds` } : null);
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragLabel(null);
    const overId = e.over ? String(e.over.id) : null;
    const activeId = String(e.active.id);
    if (!overId?.startsWith("day:")) return;
    const date = overId.slice(4);

    if (activeId.startsWith("chunk:")) {
      const chunkId = activeId.slice(6);
      const c = chunks.find((x) => x.id === chunkId);
      if (c && c.date !== date) {
        api.moveChunk(chunkId, date);
        notify("Tarjeta movida de día.");
      }
    } else if (activeId.startsWith("order:")) {
      setModal({ type: "assign", orderId: activeId.slice(6), date });
    }
  };

  /* ── acciones ── */
  const saveOrderForm = (input: OrderInput) => {
    if (modal?.type !== "order") return;
    const editingId = modal.orderId;
    if (editingId) {
      api.updateOrder(editingId, { ...input }, "Información general del pedido actualizada.");
      notify("Pedido actualizado.");
    } else {
      api.createOrder(input);
      notify(`Pedido ${input.code} creado en backlog.`);
    }
    setModal(null);
  };

  const confirmDespacho = () => {
    if (modal?.type !== "despacho") return;
    const c = chunks.find((x) => x.id === modal.chunkId);
    api.confirmDespachoChunk(modal.chunkId);
    notify(`Tarjeta de ${c ? fmtNum(c.units) : ""} uds marcada como despachada.`, "ok");
    setModal(null);
  };

  const modalOrder =
    modal?.type === "order" && modal.orderId ? (ordersById.get(modal.orderId) ?? null) : null;
  const modalChunk =
    modal && "chunkId" in modal ? (chunks.find((c) => c.id === modal.chunkId) ?? null) : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <Navbar
        query={query}
        setQuery={setQuery}
        orders={orders}
        onPick={(o) => setDrawerId(o.id)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pb-1 pt-3">
          <h1 className="font-display text-[23px] font-bold uppercase leading-none tracking-wide">
            Próximos pedidos.
          </h1>
        </div>

        <Toolbar
          rangeLabel={fmtRange(dates[0], dates[dates.length - 1])}
          isToday={dates.includes(today)}
          onPrev={() => setAnchor((a) => prevBiz(a))}
          onNext={() => setAnchor((a) => nextBiz(a))}
          onToday={() => setAnchor(todayISO())}
          filters={filters}
          setFilters={setFilters}
          orders={activeOrders}
          hiddenFinalized={finalizedCount}
          onNewOrder={() => setModal({ type: "order", orderId: null })}
        />

        <div className="flex min-h-0 flex-1">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <Sidebar
              tab={tab}
              onTab={setTab}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed((v) => !v)}
              orders={orders}
              chunks={chunks}
              dayConfigs={dayConfigs}
              api={api}
              notify={notify}
              dates={dates}
              onEditOrder={(id) => setModal({ type: "order", orderId: id })}
              onNewOrder={() => setModal({ type: "order", orderId: null })}
              onAssign={(orderId, date) => setModal({ type: "assign", orderId, date })}
            />

            <main className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden p-3">
              <Board
                dates={dates}
                chunks={visibleChunks}
                ordersById={ordersById}
                dayConfigs={dayConfigs}
                assigned={assignedByDate}
                today={today}
                api={api}
                notify={notify}
                onCardClick={(id) => setDrawerId(id)}
                onSplit={(chunkId) => setModal({ type: "split", chunkId })}
                onBlockChunk={(chunkId) => setModal({ type: "block", chunkId })}
                onDespachoChunk={(chunkId) => setModal({ type: "despacho", chunkId })}
                onRemoveChunk={(chunkId) => {
                  api.removeChunk(chunkId);
                  notify("Tarjeta retirada del día.", "warn");
                }}
                onGear={() => {
                  setTab("capacidad");
                  setCollapsed(false);
                }}
                onAssignOrder={(orderId, date) =>
                  setModal({ type: "assign", orderId: orderId || undefined, date })
                }
              />
            </main>

            <DragOverlay>
              {dragLabel && (
                <div className="flex rotate-2 items-center gap-2 rounded-lg border border-accent/60 bg-panel px-3 py-2 text-[12px] font-semibold shadow-pop">
                  <span
                    className={`rounded px-1 py-[1px] font-mono text-[9px] uppercase tracking-wider ${
                      dragLabel.kind === "order"
                        ? "bg-accent/12 text-accent"
                        : "bg-warn/15 text-warn"
                    }`}
                  >
                    {dragLabel.kind === "order" ? "Pedido" : "Tarjeta"}
                  </span>
                  {dragLabel.text}
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {drawerOrder && (
            <Drawer
              order={drawerOrder}
              chunks={drawerChunks}
              api={api}
              onClose={() => setDrawerId(null)}
              onEditOrder={(id) => setModal({ type: "order", orderId: id })}
              notify={notify}
            />
          )}
        </div>
      </div>

      {/* ── modales ── */}
      {modal?.type === "order" &&
        (() => {
          const editingId = modal.orderId;
          const editing = editingId ? (ordersById.get(editingId) ?? null) : null;
          return (
            <OrderFormModal
              order={editing}
              nextCode={nextCode}
              scheduledUnits={editingId ? scheduledOf(editingId) : 0}
              onClose={() => setModal(null)}
              onConfirm={saveOrderForm}
              onDelete={
                editingId
                  ? () => {
                      api.removeOrder(editingId);
                      if (drawerId === editingId) setDrawerId(null);
                      setModal(null);
                      notify("Pedido eliminado del plan.", "danger");
                    }
                  : undefined
              }
            />
          );
        })()}

      {modal?.type === "split" && modalChunk && (
        <SplitModal
          chunk={modalChunk}
          orderCode={ordersById.get(modalChunk.orderId)?.code ?? ""}
          onClose={() => setModal(null)}
          onConfirm={(parts) => {
            api.splitChunk(modalChunk.id, parts);
            notify(`Tarjeta dividida en ${parts.length} fracciones.`);
            setModal(null);
          }}
        />
      )}

      {modal?.type === "block" && modalChunk && (
        <BlockModal
          chunk={modalChunk}
          orderCode={ordersById.get(modalChunk.orderId)?.code ?? ""}
          onClose={() => setModal(null)}
          onConfirm={(reason) => {
            api.blockChunk(modalChunk.id, reason);
            notify(`Tarjeta bloqueada — ${reason}.`, "warn");
            setModal(null);
          }}
        />
      )}

      {modal?.type === "despacho" &&
        modalChunk &&
        (() => {
          const o = ordersById.get(modalChunk.orderId);
          const pendientes = chunks.filter(
            (c) => c.orderId === modalChunk.orderId && c.id !== modalChunk.id && c.status !== "despacho"
          ).length;
          return (
            <ConfirmModal
              title="Confirmar despacho de la tarjeta"
              body={`¿Estás seguro de que ya finalizó esta parte del pedido ${o?.code ?? ""}? Se marcarán ${fmtNum(
                modalChunk.units
              )} uds del ${fmtMedium(modalChunk.date)} como despachadas. Las demás tarjetas del pedido conservan su propio estado.${
                pendientes === 0
                  ? " Como es la última tarjeta pendiente, el pedido saldrá del backlog (seguirá visible en el calendario)."
                  : ""
              }`}
              confirmLabel="Sí, despachar esta tarjeta"
              onClose={() => setModal(null)}
              onConfirm={confirmDespacho}
            />
          );
        })()}

      {modal?.type === "assign" && (
        <AssignModal
          orders={orders}
          chunks={chunks}
          date={modal.date}
          presetOrderId={modal.orderId}
          onClose={() => setModal(null)}
          onConfirm={(orderId, units) => {
            api.assign(orderId, modal.date, units);
            notify(`${units} uds asignadas al plan.`);
            setModal(null);
          }}
        />
      )}

      <Toasts items={toasts} />
    </div>
  );
}
