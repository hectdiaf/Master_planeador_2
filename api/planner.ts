/**
 * Vercel Serverless Function — persistencia del Planificador Operaciones REFURBI.
 *
 *   GET /api/planner  → devuelve el estado completo (o { empty: true } si no existe).
 *   PUT /api/planner  → guarda el estado completo del plan.
 *
 * Almacenamiento:
 *   - Vercel KV (Upstash) cuando existen KV_REST_API_URL y KV_REST_API_TOKEN.
 *     Se crea en: Vercel Dashboard → Storage → Create → KV → conectar al proyecto
 *     (las variables de entorno se inyectan automáticamente al conectar).
 *   - Sin KV: almacenamiento en memoria de la instancia (modo demo; el estado
 *     dura mientras la función esté caliente). El cliente siempre conserva una
 *     copia local, así que no hay pérdida de datos.
 *
 * Nota: Vercel parsea el cuerpo JSON automáticamente (req.body).
 */

const KEY = "po-planner:state";
const MAX_BODY = 4_000_000; // ~4 MB de estado máximo

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReq = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRes = any;

const memory = new Map<string, string>();

function cors(res: AnyRes) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function kv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kvCommand(cmd: unknown[]): Promise<{ result?: unknown }> {
  const k = kv();
  if (!k) throw new Error("KV no configurado");
  const r = await fetch(k.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${k.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`KV respondió ${r.status}`);
  return (await r.json()) as { result?: unknown };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validState(b: any): boolean {
  return (
    !!b &&
    Array.isArray(b.orders) &&
    Array.isArray(b.chunks) &&
    !!b.dayConfigs &&
    typeof b.dayConfigs === "object"
  );
}

export default async function handler(req: AnyReq, res: AnyRes) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    try {
      const k = kv();
      let raw: string | null = null;
      if (k) {
        const out = await kvCommand(["GET", KEY]);
        raw = typeof out.result === "string" ? out.result : null;
      } else {
        raw = memory.get(KEY) ?? null;
      }
      if (!raw) {
        return res.status(200).json({ empty: true, storage: k ? "kv" : "memory" });
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(raw);
    } catch {
      return res.status(500).json({ error: "storage_unavailable" });
    }
  }

  if (req.method === "PUT" || req.method === "POST") {
    const body = req.body;
    if (!validState(body)) return res.status(400).json({ error: "invalid_state" });
    const raw = JSON.stringify(body);
    if (raw.length > MAX_BODY) return res.status(413).json({ error: "state_too_large" });
    try {
      const k = kv();
      if (k) {
        await kvCommand(["SET", KEY, raw]);
      } else {
        memory.set(KEY, raw);
      }
      return res.status(200).json({
        ok: true,
        savedAt: new Date().toISOString(),
        storage: k ? "kv" : "memory",
      });
    } catch {
      return res.status(500).json({ error: "storage_unavailable" });
    }
  }

  res.setHeader("Allow", "GET,PUT,POST,OPTIONS");
  return res.status(405).json({ error: "method_not_allowed" });
}
