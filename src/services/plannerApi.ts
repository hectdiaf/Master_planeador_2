/**
 * Cliente del backend (/api/planner).
 *
 * Estrategia local-first: la app escribe siempre primero en localStorage
 * (respuesta inmediata, funciona sin conexión) y, si el backend está
 * disponible (despliegue en Vercel), sincroniza el plan con la nube.
 */

export interface CloudSnapshot {
  orders: unknown[];
  chunks: unknown[];
  dayConfigs: Record<string, unknown>;
}

export type SyncMode = "off" | "on";
export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface SyncInfo {
  mode: SyncMode;
  status: SyncStatus;
  lastSyncAt: string | null;
}

export type CloudProbe =
  | { kind: "data"; state: CloudSnapshot }
  | { kind: "empty" }
  | { kind: "off" };

function isSnapshot(v: unknown): v is CloudSnapshot {
  const s = v as CloudSnapshot | null;
  return (
    !!s &&
    Array.isArray(s.orders) &&
    Array.isArray(s.chunks) &&
    typeof s.dayConfigs === "object" &&
    s.dayConfigs !== null
  );
}

/**
 * Consulta el backend al arranque.
 * - `data`:  hay estado guardado en la nube → se adopta como verdad.
 * - `empty`: backend disponible pero sin datos aún (se sembrará al primer cambio).
 * - `off`:   backend no disponible (entorno local) → modo 100% local.
 */
export async function probeCloud(): Promise<CloudProbe> {
  try {
    const r = await fetch("/api/planner", { headers: { Accept: "application/json" } });
    if (!r.ok) return { kind: "off" };
    const body: unknown = await r.json();
    if (isSnapshot(body)) return { kind: "data", state: body };
    return { kind: "empty" };
  } catch {
    return { kind: "off" };
  }
}

/** Envía el estado completo al backend. Devuelve true si se guardó. */
export async function pushCloudState(state: CloudSnapshot): Promise<boolean> {
  try {
    const r = await fetch("/api/planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    return r.ok;
  } catch {
    return false;
  }
}
