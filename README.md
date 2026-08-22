# Planificador Operaciones REFURBI

Tablero de control de alta densidad para planear la capacidad operativa de
reacondicionamiento de celulares: calendario de 8 días hábiles (sin domingos),
backlog con drag & drop, estados independientes por tarjeta, bloqueo con motivo,
despacho con confirmación, historial del flujo por lote, capacidad Lean por día
y sincronización en la nube.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + dnd-kit.
- **Backend:** Vercel Serverless Function (`api/planner.ts`) — persistencia en
  **Vercel KV (Upstash)** con respaldo en memoria; el cliente es *local-first*
  (localStorage + sincronización en segundo plano).
- **Despliegue:** Vercel (CI/CD automático desde GitHub).

## Desarrollo local

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # compila a dist/
```

En local la app funciona 100% contra `localStorage` (la barra superior muestra
la píldora **Local**).

## 1 · Subir el código a GitHub

```bash
git init
git add .
git commit -m "Planificador Operaciones REFURBI"

# Crea un repositorio vacío en https://github.com/new (sin README) y luego:
git branch -M main
git remote add origin https://github.com/TU_USUARIO/planificador-operaciones.git
git push -u origin main
```

## 2 · Desplegar en Vercel

1. Entra en [vercel.com](https://vercel.com) → **Add New… → Project**.
2. Importa el repositorio `planificador-operaciones` de GitHub.
3. Vercel detecta el framework **Vite** automáticamente
   (`buildCommand: npm run build`, `outputDirectory: dist` — ya declarados en
   `vercel.json`). Pulsa **Deploy**.
4. Cada `git push` a `main` genera un nuevo despliegue automático; las pull
   requests generan *preview deployments*.

## 3 · Activar la persistencia en la nube (Vercel KV)

Sin este paso la función de API guarda en memoria (modo demo) y el cliente se
queda en modo local. Para tener estado compartido entre dispositivos:

1. En el panel del proyecto en Vercel: **Storage → Create → KV (Upstash)**.
2. Dale un nombre (ej. `planificador-kv`) y **conéctalo al proyecto**: Vercel
   inyecta automáticamente las variables de entorno
   `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. Redeploy (o espera al siguiente push). La píldora de la barra superior pasa
   a mostrar **Sincronizado · hh:mm** y cada cambio del plan se guarda en la
   nube con rebote de ~1 s.

## API

| Método | Ruta           | Descripción                                                        |
| ------ | -------------- | ------------------------------------------------------------------ |
| `GET`  | `/api/planner` | Devuelve el estado completo o `{ empty: true }` si no existe.      |
| `PUT`  | `/api/planner` | Guarda el estado completo (`orders`, `chunks`, `dayConfigs`).      |

Validaciones: cuerpo con las tres colecciones (400 si falta alguna), tamaño
máximo ~4 MB (413), errores de almacenamiento (503/500).

## Arquitectura de sincronización

```
UI ── acción ──▶ store (commit + historial undo)
                    │
                    ├─▶ localStorage        (inmediato, siempre)
                    └─▶ PUT /api/planner    (debounce 900 ms, si hay backend)
```

- **Local-first:** la UI nunca espera a la red; sin backend no se pierde nada.
- **Hidratación:** al arrancar, si la nube responde con datos, la nube gana.
- **Indicador vivo:** la navbar muestra Local / Sincronizando… / Sincronizado /
  Sin nube en tiempo real.

## Estructura

```
api/planner.ts          Serverless function (GET/PUT del plan)
src/
  types.ts              Modelo de dominio (Chunk con trail, Order multi-producto)
  lib.ts                Fechas hábiles, fórmulas de avance y ocupación
  data.ts               Datos semilla
  store.ts              Estado, API de acciones, undo (40 niveles), sync cloud
  services/plannerApi.ts  Cliente del backend (probe + push)
  components/           Navbar · Toolbar · Sidebar · Board · Drawer · Modals · ui
```
