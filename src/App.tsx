import { useEffect, useMemo, useState } from "react";
import { Navbar } from "./components/Navbar";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { Board } from "./components/Board";
import { Drawer } from "./components/Drawer";
import {
  AssignModal,
  BlockModal,
  ConfirmModal,
  OrderFormModal,
  SplitModal,
  type OrderDraft,
} from "./components/Modals";
import { Toasts, type Toast } from "./components/ui";
import {
  DEFAULT_DAY_CONFIG,
  capacityOf,
  loadTheme,
  saveTheme,
  usePlanner,
} from "./store";
import {
  buildWindow,
  ensureBiz,
  fmtMedium,
  nextBiz,
  prevBiz,
  todayISO,
} from "./lib";
import type { Filters, Order } from "./types";
import { uid } from "./types";

type ModalState =
  | { type: "split"; chunkId: string }
  | { type: "block"; orderId: string }
  | { type: "assign"; orderId: string | null; date: string }
  | { type: "order"; orderId: string | null }
  | { type: "despacho"; orderId: string }
  | null;

export default function App() {
  const { state, api } = usePlanner();
  const [theme, setTheme] = useState<"light" | "dark">(loadTheme);
  const [anchor, setAnchor] = useState(todayISO());
  const [filters, setFilters] = useState<Filters>({
    client: "all",
    status: "all",
    product: "all",
  });
  const [query, setQuery] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [tab, setTab] = useState<"backlog" | "capacidad">("backlog");
  const [collapsed, setCollapsed] = useState(false);
  const [capDate, setCapDate] = useState(ensureBiz(todayISO()));
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !modal) setDrawerId(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal]);

  const notify = (text: string, tone: Toast["tone"] = "ok") => {
    const id = uid();
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  const dates = useMemo(() => buildWindow(anchor, 8), [anchor]);

  const ordersById = useMemo(
    () => new Map(state.orders.map((o) => [o.id, o])),
    [state.orders]
  );

  const matches = (o: Order) => {
    const q = query.trim().toLowerCase();
    const okQ =
      !q ||
      [o.code, o.product, o.client, o.channel, o.category]
        .join(" ")
        .toLowerCase()
        .includes(q);
    const okC =
      filters.client === "all" ||
      o.client === filters.client ||
      o.channel === filters.client;
    const okS = filters.status === "all" || o.status === filters.status;
    const okP = filters.product === "all" || o.product === filters.product;
    return okQ && okC && okS && okP;
  };

  const backlogOrders = useMemo(
    () => state.orders.filter((o) => !o.archived && matches(o)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.orders, filters, query]
  );

  const boardChunks = useMemo(() => {
    const ids = new Set(state.orders.filter(matches).map((o) => o.id));
    return state.chunks.filter((c) => ids.has(c.orderId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.orders, state.chunks, filters, query]);

  const scheduled = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of state.chunks) m[c.orderId] = (m[c.orderId] ?? 0) + c.units;
    return m;
  }, [state.chunks]);

  const assigned = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of state.chunks) m[c.date] = (m[c.date] ?? 0) + c.units;
    return m;
  }, [state.chunks]);

  const hiddenFinalized = state.orders.filter((o) => o.archived).length;
  const drawerOrder = drawerId ? (ordersById.get(drawerId) ?? null) : null;
  const drawerChunks = drawerId
    ? state.chunks
        .filter((c) => c.orderId === drawerId)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const remaining = (orderId: string) => {
    const o = ordersById.get(orderId);
    if (!o) return 0;
    return Math.max(0, o.totalUnits - (scheduled[orderId] ?? 0));
  };

  const nextCode = useMemo(() => {
    let max = 2481;
    for (const o of state.orders) {
      const m = /(\d+)\s*$/.exec(o.code);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `OP-${max + 1}`;
  }, [state.orders]);

  /* ── acciones ── */

  const confirmAssign = (orderId: string, units: number, date: string) => {
    const day = ensureBiz(date);
    api.addChunk(orderId, day, units);
    const o = ordersById.get(orderId);
    notify(`${units} uds de ${o?.code ?? "pedido"} agendadas el ${fmtMedium(day)}.`);
    setModal(null);
  };

  const confirmDespacho = (orderId: string) => {
    const o = ordersById.get(orderId);
    api.confirmDespacho(orderId);
    notify(`${o?.code ?? "Pedido"} finalizado — salió del backlog, sigue en calendario.`);
    setModal(null);
  };

  const saveOrderForm = (draft: OrderDraft) => {
    if (modal?.type === "order" && modal.orderId) {
      api.patchOrder(modal.orderId, { ...draft }, "Información general del pedido actualizada.");
      notify("Cambios guardados.");
    } else {
      api.addOrder({
        ...draft,
        status: "backlog",
        progress: 0,
      });
      notify(`Pedido ${draft.code} creado en backlog.`);
    }
    setModal(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Navbar
        query={query}
        setQuery={setQuery}
        orders={state.orders}
        onPick={(o) => setDrawerId(o.id)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-5 pb-1 pt-4">
          <h1 className="font-display text-[36px] font-bold leading-none tracking-wide">
            Próximos pedidos<span className="text-accent">.</span>
          </h1>
        </div>

        <Toolbar
          dates={dates}
          onPrev={() => setAnchor((a) => prevBiz(a))}
          onNext={() => setAnchor((a) => nextBiz(a))}
          onToday={() => setAnchor(todayISO())}
          filters={filters}
          setFilters={setFilters}
          orders={state.orders.filter((o) => !o.archived)}
        />

        <div className="flex min-h-0 flex-1">
          <Sidebar
            tab={tab}
            onTab={setTab}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            orders={backlogOrders}
            hiddenFinalized={hiddenFinalized}
            scheduled={scheduled}
            api={api}
            notify={notify}
            onEditOrder={(id) => setModal({ type: "order", orderId: id })}
            onNewOrder={() => setModal({ type: "order", orderId: null })}
            onBlock={(id) => setModal({ type: "block", orderId: id })}
            onDespacho={(id) => setModal({ type: "despacho", orderId: id })}
            onAssign={(orderId, date) => setModal({ type: "assign", orderId, date })}
            dates={dates}
            capDate={capDate}
            setCapDate={setCapDate}
            dayConfigs={state.dayConfigs}
            assigned={assigned}
            setDayConfig={api.setDayConfig}
          />

          <main className="min-h-0 min-w-0 flex-1">
            <Board
              dates={dates}
              chunks={boardChunks}
              ordersById={ordersById}
              dayConfigs={state.dayConfigs}
              assigned={assigned}
              api={api}
              notify={notify}
              onCardClick={(c) => setDrawerId(c.orderId)}
              onSplit={(c) => setModal({ type: "split", chunkId: c.id })}
              onBlock={(id) => setModal({ type: "block", orderId: id })}
              onUnblock={(id) => {
                api.unblockOrder(id);
                notify("Bloqueo liberado.");
              }}
              onAssignToDay={(date) => setModal({ type: "assign", orderId: null, date })}
              onAssignOrder={(orderId, date) =>
                setModal({ type: "assign", orderId, date })
              }
              onDespacho={(id) => setModal({ type: "despacho", orderId: id })}
              onGear={(date) => {
                setTab("capacidad");
                setCapDate(date);
                setCollapsed(false);
              }}
            />
          </main>
        </div>
      </div>

      {drawerOrder && (
        <Drawer
          order={drawerOrder}
          chunks={drawerChunks}
          onClose={() => setDrawerId(null)}
          api={api}
          notify={notify}
          onConfirmDespacho={(id) => setModal({ type: "despacho", orderId: id })}
          onBlock={(id) => setModal({ type: "block", orderId: id })}
          onEditOrder={(id) => setModal({ type: "order", orderId: id })}
        />
      )}

      {modal?.type === "split" &&
        (() => {
          const chunk = state.chunks.find((c) => c.id === modal.chunkId);
          const order = chunk ? ordersById.get(chunk.orderId) : undefined;
          if (!chunk || !order) return null;
          return (
            <SplitModal
              chunk={chunk}
              order={order}
              onClose={() => setModal(null)}
              onConfirm={(parts) => {
                api.splitChunk(chunk.id, parts);
                notify(`Fracción dividida en ${parts.length} jornadas.`);
                setModal(null);
              }}
            />
          );
        })()}

      {modal?.type === "block" &&
        (() => {
          const order = ordersById.get(modal.orderId);
          if (!order) return null;
          return (
            <BlockModal
              order={order}
              onClose={() => setModal(null)}
              onConfirm={(reason) => {
                api.blockOrder(order.id, reason);
                notify(`Pedido bloqueado: ${reason}`, "warn");
                setModal(null);
              }}
            />
          );
        })()}

      {modal?.type === "assign" && (
        <AssignModal
          orders={state.orders}
          orderId={modal.orderId}
          date={modal.date}
          remaining={remaining}
          freeCap={
            capacityOf(state.dayConfigs[ensureBiz(modal.date)] ?? DEFAULT_DAY_CONFIG).cap -
            (assigned[ensureBiz(modal.date)] ?? 0)
          }
          onClose={() => setModal(null)}
          onConfirm={confirmAssign}
        />
      )}

      {modal?.type === "order" &&
        (() => {
          const editingId = modal.orderId;
          return (
            <OrderFormModal
              order={editingId ? (ordersById.get(editingId) ?? null) : null}
              nextCode={nextCode}
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

      {modal?.type === "despacho" && (
        <ConfirmModal
          title="Confirmar finalización"
          body={`¿Estás seguro de que ya finalizó el pedido ${
            ordersById.get(modal.orderId)?.code ?? ""
          }? Se marcará como despachado al 100%, desaparecerá del backlog y quedará registrado en el calendario.`}
          confirmLabel="finalizar pedido"
          onClose={() => setModal(null)}
          onConfirm={() => confirmDespacho(modal.orderId)}
        />
      )}

      <Toasts items={toasts} />
    </div>
  );
}
