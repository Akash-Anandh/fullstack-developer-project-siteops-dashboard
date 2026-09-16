# Site Ops Dashboard — Technical Flow

Beginner-friendly walkthrough of **this exact repository**: React UI → Express APIs → PostgreSQL.

Audience: comfortable with React; learning Node.js, Express, PostgreSQL, and SQL through this project.

---

## 1. Project Overview

**What it does:** A small operations dashboard called **Site Ops**. You can view summary metrics, manage **sites** (locations), and manage **installations** (equipment work at those sites).

**What it does not do (yet):**
- No login / authentication
- Azure deployment is planned, not implemented in code yet

**Recent polish (in code):** server-side list pagination (max 20), Sites name search debounced then sent as `?q=`, status/equipment filters via query params, Sites/Installations XLSX import (upsert) + export.

### Architecture

```text
User (browser)
  ↓
React UI  (/client — Vite + React Router)
  ↓
HTTP / REST (axios → /api/... ; Vite proxies to port 5000 in dev)
  ↓
Node.js + Express.js  (/server — server.js)
  ↓
Route handlers (+ validation middleware)
  ↓
PostgreSQL via pg Pool  (database: sitedashboard)
  ↓
JSON response ({ items, total, limit, skip } for lists)
  ↓
React state → UI re-render + Pagination
```

| Layer | Responsibility in this project |
|---|---|
| React UI | Pages, forms, tables, debounced search, pagination, XLSX import/export, loading/error UI |
| HTTP / REST | JSON to `/api/sites`, `/api/installations`, `/api/summary` (+ `/import`); list query params |
| Express | Match URL + method, validate, paginate/filter SQL, upsert import, return JSON |
| PostgreSQL | Store Sites, Installations; enforce FKs, CHECKs, indexes |
| Business logic | Mostly **inside route files** (+ `sitesImport` / `installationsImport` helpers) |

---

## 2. Project Structure

```text
Enabl/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── main.jsx        # React entry — mounts <App />
│   │   ├── App.jsx         # Routes
│   │   ├── api.js          # axios helpers (list params, CRUD, import)
│   │   ├── constants.js    # PAGE_SIZE, debounce ms, import/export headers
│   │   ├── components/     # Layout, Pagination, ImportExportButtons, dialogs
│   │   ├── utils/xlsxIo.js # Read/write XLSX + header matching
│   │   └── pages/          # Dashboard, Sites, Installations
│   └── vite.config.js      # Dev proxy /api → localhost:5000
└── server/                 # Express API
    ├── server.js           # App entry — middleware, routes, listen
    ├── db.js               # pg Pool from .env
    ├── db/
    │   ├── schema.sql      # Tables + indexes
    │   └── installationsQueries.js  # Shared JOIN SQL + helpers
    ├── routes/             # sites, installations, summary (+ *Import helpers)
    ├── validation/         # express-validator rules
    ├── middleware/         # validateRequest, errorHandler
    └── utils/              # emptyToNull, pagination, duplicates
```

### Important files (flow role)

| File | What / why | Who calls it | What it calls |
|---|---|---|---|
| `client/src/main.jsx` | Browser entry | Vite / index.html | `App` |
| `client/src/App.jsx` | Routing shell | `main.jsx` | `Layout`, page components |
| `client/src/api.js` | All HTTP calls + list query params | Page hooks | axios → Express |
| `client/src/constants.js` | `PAGE_SIZE` (20), `SEARCH_DEBOUNCE_MS` (500) | Hooks / api | — |
| `client/src/utils/xlsxIo.js` | Spreadsheet parse/download | Import/export handlers | `xlsx` |
| `client/src/pages/sites/useSitesPage.js` | Sites state, debounce, CRUD, import/export | `Sites.jsx` | `api.js`, `xlsxIo` |
| `client/src/pages/installations/useInstallationsPage.js` | Installations state + CRUD + import/export | `Installations.jsx` | `api.js`, `xlsxIo` |
| `server/server.js` | Starts API server | `npm start` / `node server.js` | routers, pool, middleware |
| `server/db.js` | DB connection pool | Routes / queries / health | `pg` |
| `server/utils/pagination.js` | Cap `limit` at 20; `all=1` for export | List routes | — |
| `server/routes/sites.js` | Sites CRUD + list filters + `/import` | `/api/sites` | pool, validators, `sitesImport` |
| `server/routes/installations.js` | Installations CRUD + filters + `/import` | `/api/installations` | pool + queries + `installationsImport` |
| `server/routes/sitesImport.js` | Upsert sites by name (CI) | `POST /api/sites/import` | pool, `duplicates` |
| `server/routes/installationsImport.js` | Upsert by site+equipment (CI) | `POST /api/installations/import` | pool, ensure site |
| `server/routes/summary.js` | Aggregations | `/api/summary` | parallel `pool.query` |
| `server/middleware/errorHandler.js` | 404 + central errors | End of Express stack | — |
| `server/db/schema.sql` | Schema definition | Manual DB setup | PostgreSQL |

---

## 3. Application Startup Flow

### Frontend

1. Vite serves `client/index.html`.
2. `main.jsx` calls `createRoot(...).render(<App />)`.
3. `App.jsx` wraps routes in `BrowserRouter`:
   - `/` → `Dashboard`
   - `/sites` → `Sites`
   - `/installations` → `Installations`
   - unknown → redirect to `/`
4. `Layout` renders nav + `<Outlet />` for the active page.
5. On Dashboard mount, `useEffect` calls `fetchSummary()` → `GET /api/summary`.
6. On Sites mount, `useSitesPage` loads a **page** of sites (`limit=20`, `skip=0`) with optional `q` / `status`.
7. On Installations mount, loads a page of installations **and** site options (`GET /api/sites?options=1`) in parallel.

**Dev networking:** `vite.config.js` proxies `/api` and `/health` to `http://localhost:5000`. `VITE_API_BASE_URL` can override the axios base URL (empty in local `.env.example`).

### Backend

Entry: `server/server.js` (`package.json` `"main": "server.js"`, `"start": "node server.js"`).

What happens:

1. `import 'dotenv/config'` loads `server/.env` into `process.env`.
2. `import pool from './db.js'` creates a **pg `Pool`** (connection settings from env).
3. `const app = express()` — `app` is the Express application object (router + middleware stack).
4. Middleware (order matters):
   - `cors()` — allow browser calls from another origin (Vite `:5173`)
   - `express.json()` — parse JSON body into `req.body`
   - `morgan('dev')` — log each HTTP request
5. Routes registered:
   - `GET /health` — test DB with `SELECT NOW()`
   - `/api/sites` → `sitesRouter`
   - `/api/installations` → `installationsRouter`
   - `/api/summary` → `summaryRouter`
6. Then `notFoundHandler`, then `errorHandler` (must be last).
7. `start()` runs a connectivity query; on success `app.listen(PORT)` (default **5000**). On DB failure: `process.exit(1)`.

**Syntax notes for React folks:**
- `import ... from '...'` — ES modules (`"type": "module"` in `package.json`). Same idea as frontend imports.
- `async (_req, res, next) => { ... }` — async route handler; `await` SQL; `next(err)` forwards failures to error middleware.
- `_req` — unused `req` (underscore = “intentionally unused”).

---

## 4. Node.js Explained Through This Project

```text
React runs JavaScript in the browser.

Node.js runs JavaScript on the server for /server.

Express is a library that runs inside Node and turns
HTTP requests into route-handler functions.
```

In this project Node is used for:
- Loading env (`dotenv`)
- Listening on a TCP port (`app.listen`)
- Talking to Postgres (`pg`)
- Running async I/O (`async`/`await` around `pool.query`)

**Concepts you actually touch here:**

| Concept | Where |
|---|---|
| ES modules | Every `.js` file under `/server` |
| `process.env` | `db.js`, `server.js` (`PORT`, `DB_*`, `NODE_ENV`) |
| Promises / async-await | Every route that awaits `pool.query` |
| Request processing | Middleware → route → `res.json(...)` |

This project does **not** use: TypeScript on the server, ORM (Prisma/Sequelize), WebSockets, Redis, or a separate worker process.

---

## 5. Express.js Explained Through This Project

From a React view: Express is like a big `switch` on `(method, URL)` that runs a function and returns JSON.

Example from `routes/sites.js`:

```js
router.get('/', async (req, res, next) => {
  // parsePagination + optional WHERE from req.query
  const { rows: items } = await pool.query(/* SELECT ... LIMIT/OFFSET */);
  res.json({ items, total, limit, skip });
});
```

| Piece | Meaning |
|---|---|
| `router` | Mini Express app mounted at `/api/sites` |
| `.get('/')` | Handle HTTP GET for exact collection path |
| Full URL | `GET http://localhost:5000/api/sites` |
| Handler | The async function |
| `req` | Incoming request (`params`, `body`, `query`) |
| `res` | Outgoing response (`res.json`, `res.status`) |
| `next` | Pass control (or `next(err)` for errors) |

Mounting in `server.js`:

```js
app.use('/api/sites', sitesRouter);
```

So `router.get('/:id')` becomes `GET /api/sites/:id`.

**Routing architecture here:** flat route modules with handlers inline. Shared SQL helpers only for installations (`db/installationsQueries.js`). No separate controller/service layers.

Middleware chain example for create site:

```text
POST /api/sites
  → createSiteRules (express-validator)
  → validateRequest
  → async handler (INSERT)
```

---

## 6. Complete API Request Lifecycle

### 6.1 GET list — Sites (paginated + filtered)

```text
1. User opens /sites
2. useSitesPage useEffect runs (AbortController)
3. fetchSites({ q, status, skip }) → GET /api/sites?limit=20&skip=…&q=…&status=…
4. Express: parsePagination + optional WHERE (name ILIKE, status =)
5. Parallel COUNT(*) + SELECT … LIMIT/OFFSET
6. res.json({ items, total, limit, skip })
7. setSites(items); setTotal(total)
8. SitesTable + Pagination render
```

Name search is **debounced** (`SEARCH_DEBOUNCE_MS` = 500) before `q` is sent. Changing search/status resets `skip` to 0.

### 6.2 POST create — Site

```text
1. User submits SiteFormDialog
2. handleSubmit in useSitesPage.js
3. createSite(siteFields) → POST /api/sites + JSON body
4. createSiteRules + validateRequest
5. Handler INSERT ... RETURNING ...
6. res.status(201).json(createdSites[0])
7. setSites([...current, createdSite]); close form
```

### 6.3 PUT update — Site

```text
1. Edit form submit → updateSite(id, fields)
2. PUT /api/sites/:id
3. idParam + updateSiteRules + validateRequest
4. Dynamic SET clause for provided fields only
5. UPDATE ... WHERE id = $n RETURNING ...
6. 404 if no row; else res.json(updated)
7. React maps updated row into local state
```

### 6.4 DELETE — Site

```text
1. ConfirmDialog → confirmDelete
2. deleteSite(id) → DELETE /api/sites/:id
3. DELETE FROM Sites WHERE id = $1 RETURNING ...
4. DB CASCADE removes linked Installations (schema FK ON DELETE CASCADE)
5. React filters site out of local state
```

### 6.5 Summary aggregation

```text
1. Dashboard mounts → fetchSummary()
2. GET /api/summary
3. Promise.all of 4 SQL queries (totals, sites by status, installations by status, by equipment)
4. Handler shapes JSON for cards/panels
5. setSummaryMetrics → SummaryCards / StatusList / EquipmentBreakdown
```

### 6.6 Installations (create path highlights)

```text
POST /api/installations
  → createInstallationRules + validateRequest
  → siteExists(site_id)
  → INSERT ... RETURNING id
  → fetchInstallationById(id)  // JOIN Sites for site_name etc.
  → 201 + joined row
```

List filters: `?status=` and `?equipment=` (plus same `limit`/`skip`/`all` pagination).

### 6.7 Import XLSX (Sites)

```text
1. User picks .xlsx → xlsxIo readSheetRows + requireAllHeadersMatched
2. Map rows → POST /api/sites/import { rows }
3. sitesImport: upsert by site name (case-insensitive)
4. Response: { inserted, updated, skipped, failed, errors, … }
5. UI shows summary; refresh list
```

Installations import: upsert by **site name + equipment type** (CI); missing site name can create a site. Max **5000** rows per request.

### 6.8 Export XLSX

```text
1. Export button → fetchSites/fetchInstallations with same filters + all=1
2. Server returns all matching rows (no LIMIT)
3. Client builds sheet (SITE_EXPORT_HEADERS / INSTALLATION_EXPORT_HEADERS)
4. downloadXlsx(…)
```

Export respects **filters**, not the current page.
---

## 7. HTTP and REST Concepts Used Here

| Method | Used for | Example |
|---|---|---|
| GET | Read (paginated lists / one / summary) | `GET /api/sites?limit=20&skip=0&q=acme` |
| POST | Create or bulk import | `POST /api/sites`, `POST /api/sites/import` |
| PUT | Update (partial fields allowed by validators) | `PUT /api/sites/:id` |
| DELETE | Remove | `DELETE /api/installations/:id` |

**PATCH:** not used.

| Concept | In this project |
|---|---|
| Request body | JSON from forms / import (`name`, `status`, `site_id`, `rows`, …) via `express.json()` |
| Path params | `:id` → `req.params.id` |
| Query params | List: `q`, `status`, `equipment`, `limit`, `skip`/`offset`, `all`, `options`, `include_equipment_types` |
| Response body | Lists: `{ items, total, limit, skip }`; CRUD: row objects; errors: `{ error: { message, status } }` |
| Status codes | `200` ok, `201` created, `400` validation/bad FK, `404` missing, `409` unique conflict, `500` server |

---

## 8. PostgreSQL From a Beginner's Perspective

**PostgreSQL** = relational database (data in tables with rows/columns and rules).

| Term | Simple meaning | Here |
|---|---|---|
| Database | Named data container | `sitedashboard` |
| Table | Spreadsheet-like entity | `Sites`, `Installations` |
| Row | One record | One site |
| Column | One field | `name`, `status` |
| Primary key | Unique row id | `id SERIAL PRIMARY KEY` |
| Foreign key | Pointer to another table | `Installations.site_id → Sites.id` |
| Constraint | Rule DB enforces | `CHECK`, `UNIQUE`, `NOT NULL` |
| Index | Faster lookup | `idx_installations_site_id`, etc. |
| JOIN | Combine related rows | Installations + Sites |
| Aggregation | Count/group | Summary `COUNT` + `GROUP BY` |

### Tables

| Table | Purpose | Important columns | Relationships |
|---|---|---|---|
| Sites | Physical / logical locations | `id`, `name`, `location`, `status` | Parent of Installations |
| Installations | Equipment work at a site | `id`, `site_id`, `equipment_type`, `status`, `notes` | FK → Sites (CASCADE) |

```text
Sites
  ↑ site_id (required, ON DELETE CASCADE)
  |
Installations
```

Status CHECKs:
- Sites: `active` | `inactive` | `maintenance`
- Installations: `pending` | `in_progress` | `completed` | `cancelled`

---

## 9. SQL Queries Used in This Project

### List sites (paginated)

```sql
SELECT COUNT(*)::int AS total FROM Sites
-- optional: WHERE name ILIKE $1 AND status = $2

SELECT id, name, location, status, created_at
FROM Sites
-- same WHERE
ORDER BY id ASC
LIMIT $n OFFSET $m
```

Returns `{ items, total, limit, skip }` as JSON. `all=1` omits LIMIT/OFFSET (export).

`GET /api/sites?options=1` returns `[{ id, name }, …]` for installation dropdowns (no pagination wrapper).

### Site by id (parameterized)

```sql
SELECT ... FROM Sites WHERE id = $1
```

`$1` is filled from `[req.params.id]` — **not** string-concatenated (helps prevent SQL injection).

### Create site

```sql
INSERT INTO Sites (name, location, status)
VALUES ($1, $2, $3)
RETURNING id, name, location, status, created_at
```

`RETURNING` gives the new row back without a second SELECT.

### Update site (dynamic SET)

Built in JS, e.g. `SET name = $1, status = $2 WHERE id = $3 RETURNING ...`

### Delete site

```sql
DELETE FROM Sites WHERE id = $1 RETURNING ...
```

Cascade deletes child installations at DB level.

### Installations with site (JOIN)

From `SELECT_INSTALLATION_WITH_SITE`:

```sql
SELECT i.*, s.name AS site_name, s.location AS site_location, s.status AS site_status
FROM Installations i
JOIN Sites s ON s.id = i.site_id
```

`JOIN ... ON` means: only installations that have a matching site (required FK, so all should match).

### Summary totals

```sql
SELECT
  (SELECT COUNT(*)::int FROM Sites) AS total_sites,
  (SELECT COUNT(*)::int FROM Installations) AS total_installations
```

### Grouped counts

```sql
SELECT status, COUNT(*)::int AS count
FROM Sites
GROUP BY status
ORDER BY status
```

Same pattern for installations by `status` and by `equipment_type`.

---

## 10. Database Connection Flow

```text
Route handler
  ↓
pool.query(sql, params?)     // from db.js
  ↓
pg Pool borrows a connection
  ↓
PostgreSQL runs SQL
  ↓
result.rows → handler
  ↓
res.json(...)
```

| Topic | This project |
|---|---|
| Library | `pg` (`import pg from 'pg'`; `Pool`) |
| Config | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env` |
| Why pool | Reuse connections across requests instead of connecting per query |
| Safe params | `$1, $2, ...` + values array |
| Errors | `pool.on('error')` logs; query errors go to `next(err)` → `errorHandler` |

There is **no** ORM. SQL is written as strings in route/query files.

---

## 11. Validation Flow

Example: create site.

```text
React form submit
  ↓
POST /api/sites  { name, location, status }
  ↓
createSiteRules (express-validator) — trim, required name, max lengths, status enum
  ↓
validateRequest — if errors → 400 { error: { message, status, errors } }
  ↓
else → INSERT
```

Files:
- Rules: `server/validation/sites.js`, `server/validation/installations.js`
- Gate: `server/middleware/validateRequest.js` (`validationResult`)
- Path id: `idParam` — `param('id').isInt({ min: 1 })`

Extra DB existence checks (installations): `siteExists` in `installationsQueries.js` (not only FK reliance).

**Frontend also validates lightly** (HTML `required`, trim, “Select a site”). Backend validation is the real gate.

**Not implemented:** schema validation libraries like Zod/Joi; auth-based validation.

---

## 12. Error Handling

### Backend

1. Handlers: `try/catch` → `next(err)`.
2. Explicit 404/400 responses in handlers (not found, bad `site_id`).
3. `validateRequest` returns 400 with `errors` array.
4. `errorHandler` maps Postgres codes:
   - `23503` FK → 400
   - `23514` CHECK → 400
   - `23505` UNIQUE → 409
5. In production (`NODE_ENV === 'production'`), 500 messages are generic.
6. `morgan` logs requests; `console.error` for 5xx.

Shape:

```json
{ "error": { "message": "...", "status": 400, "errors": [] } }
```

### Frontend

- `apiErrorMessage(err)` reads `err.response.data.error.message`.
- Load failures → `LoadErrorMessage` + Retry (`refreshToken`).
- Save failures → `formError` in dialog.
- Delete failures → `ActionErrorMessage`.

### Failure trace example

```text
INSERT fails CHECK constraint
→ pg throws code 23514
→ catch → next(err)
→ errorHandler → 400 “Value violates a database constraint”
→ axios rejects
→ setFormError(apiErrorMessage(...))
→ dialog shows message
```

---

## 13. React-to-Backend Mapping

Conceptual learning comparisons (not identical technologies):

| React concept | Backend related idea |
|---|---|
| Component / page | Route module responsibility |
| Event handler (`handleSubmit`) | Triggers axios → Express handler |
| axios (`api.js`) | HTTP client |
| `useState` list | Cached API result in UI |
| Props | Data passed between React components |
| API response JSON | What Express `res.json` sent |
| Form values | Request body |
| `useEffect` load | Initial GET with `skip=0` |
| Debounced search | Wait 500ms → send `?q=` (Sites) |
| Server filters | SQL `WHERE` from query params |
| Pagination UI | `skip` += `PAGE_SIZE` (20) |

---

## 14. Feature-by-Feature Technical Flow

### Dashboard summary

```text
Dashboard.jsx mount
→ fetchSummary (api.js)
→ GET /api/summary (routes/summary.js)
→ 4 parallel SQL aggregations
→ SummaryCards + StatusList + EquipmentBreakdown
```

### Site listing

```text
useSitesPage → fetchSites({ q, status, skip })
→ GET /api/sites?limit=20&skip=… → { items, total }
→ SitesTable + Pagination
```

### Site search / status filter

```text
SiteToolbar updates siteSearchTerm / status
→ debounce search 500ms → debouncedSearch
→ API refetch with ?q= / ?status= (SQL ILIKE / equality)
→ status also synced to URL ?status= for deep links
```

### Site create / edit / delete

```text
SiteFormDialog / ConfirmDialog
→ createSite | updateSite | deleteSite
→ POST | PUT | DELETE /api/sites[...]
→ SQL INSERT | UPDATE | DELETE
→ local state update (respects current filters/page)
```

### Installation list / CRUD

```text
useInstallationsPage loads fetchInstallations({ status, equipment, skip })
  + fetchSiteOptions (?options=1)
→ InstallationsTable (site_name from JOIN)
→ InstallationFormDialog (site dropdown)
→ create/update/deleteInstallation APIs
```

**UI note:** Form fields are `site_id`, `equipment_type`, `status`, `notes`. Filters: status + equipment. URL can carry `?status=` / `?equipment=`.

### Import / Export XLSX

```text
ImportExportButtons → xlsxIo (header match) → POST …/import
Export → list API with same filters + all=1 → downloadXlsx
```

Sites upsert by **name**; installations upsert by **site + equipment** (may create site by name).

### Auth / Azure deploy

**Not currently implemented** in application code (Azure is next checklist step).

---

## 15. Important Functions Cheat Sheet

| Function | File | Layer | Purpose | Called by | Calls |
|---|---|---|---|---|---|
| `start` | `server/server.js` | Express | Connect DB + listen | Module load | `pool.query`, `app.listen` |
| `errorHandler` | `middleware/errorHandler.js` | Middleware | Map/send errors | Express | — |
| `validateRequest` | `middleware/validateRequest.js` | Middleware | Fail validation early | Routers | `validationResult` |
| `emptyToNull` | `utils/emptyToNull.js` | Util | Blank string → SQL NULL | Site/installation writes | — |
| `fetchInstallationById` | `db/installationsQueries.js` | Data | JOIN fetch one | Installations routes | `pool.query` |
| `siteExists` | same | Data | Existence checks | Installations POST/PUT | `pool.query` |
| `parsePagination` | `utils/pagination.js` | Util | Cap limit 20; `all=1` | List routes | — |
| `importSites` | `routes/sitesImport.js` | Data | Upsert sites by name | `POST /sites/import` | pool |
| `importInstallations` | `routes/installationsImport.js` | Data | Upsert by site+equipment | `POST /installations/import` | pool |
| `fetchSummary` / `fetchSites` / … | `client/src/api.js` | React API | HTTP wrappers + list params | Hooks/pages | axios |
| `apiErrorMessage` | `api.js` | React | Parse API errors | Hooks | — |
| `withListParams` | `api.js` | React | Build `q`/`status`/`skip`/`limit`/`all` | fetchSites/Installations | — |
| `useSitesPage` | `pages/sites/useSitesPage.js` | React | Sites state machine | `Sites.jsx` | api + xlsxIo |
| `useInstallationsPage` | `pages/installations/useInstallationsPage.js` | React | Installations state | `Installations.jsx` | api + xlsxIo |
| `downloadXlsx` / `readSheetRows` | `utils/xlsxIo.js` | React | Spreadsheet I/O | Import/export | `xlsx` |
| `formatStatusLabel` | `utils/formatStatusLabel.js` | React | `in_progress` → readable | Tables/lists | — |

---

## 16. Important Files Cheat Sheet

| File | Layer | Why it exists |
|---|---|---|
| `client/src/main.jsx` | React | Boot React |
| `client/src/App.jsx` | React | Routes |
| `client/src/api.js` | React | Single place for HTTP |
| `client/src/constants.js` | React | Page size, debounce, import headers |
| `client/src/utils/xlsxIo.js` | React | XLSX read/write + header checks |
| `client/src/components/Pagination.jsx` | React | Prev/Next + page label |
| `client/src/components/ImportExportButtons.jsx` | React | Import file + Export xlsx |
| `client/src/pages/Dashboard.jsx` | React | Summary UI |
| `client/src/pages/Sites.jsx` | React | Sites page shell |
| `client/src/pages/Installations.jsx` | React | Installations page shell |
| `client/vite.config.js` | React/tooling | Dev proxy to API |
| `server/server.js` | Express | Entry + middleware + mounts |
| `server/db.js` | Database | Pool singleton |
| `server/db/schema.sql` | Database | Canonical schema |
| `server/utils/pagination.js` | Express | List skip/limit/`all` |
| `server/routes/sites.js` | Express | Sites CRUD + list + import route |
| `server/routes/installations.js` | Express | Installations CRUD + list + import |
| `server/routes/sitesImport.js` | Express | Sites upsert logic |
| `server/routes/installationsImport.js` | Express | Installations upsert logic |
| `server/routes/summary.js` | Express | Aggregations |
| `server/validation/*.js` | Express | Input rules |
| `server/middleware/errorHandler.js` | Express | Consistent errors |
| `server/.env.example` | Config | Required env keys template |

---

## 17. Interview Preparation

### How I Would Explain This Project in an Interview

> I built a **Site Operations Dashboard** — a full-stack app with a React frontend and a Node/Express API backed by PostgreSQL.
>
> The UI has three pages: a **Dashboard** that shows totals and breakdowns from `GET /api/summary`, a **Sites** page with **server-side** search/filter, **pagination** (20 rows), and full CRUD plus XLSX import/export, and an **Installations** page with status/equipment filters, pagination, CRUD, and the same import/export pattern.
>
> On the backend, Express mounts three routers under `/api`. List endpoints accept query params (`q`, `status`, `equipment`, `limit`, `skip`, `all`), return `{ items, total, limit, skip }`, and cap page size at 20. Route handlers validate input with **express-validator**, run **parameterized SQL** through a **pg connection pool**, and return JSON. Installations are selected with a **JOIN** to Sites so the UI gets `site_name` without a second call. Deleting a site **cascades** to its installations at the database level. Import endpoints upsert Sites by name and Installations by site+equipment.
>
> Errors funnel through a shared **error middleware** that also maps common Postgres constraint codes to 4xx responses. The React client uses **axios** helpers, debounces Sites search (500ms), and shows loading, retry, and form/action errors.
>
> There is no auth yet. Deployment to Azure is the next step; locally Vite proxies `/api` to the Express server on port 5000.

---

## 18. Likely Interview Questions

**Why Node.js?**  
Same language as React on the server; good fit for I/O-bound JSON APIs with `async/await` and `pg`.

**Why Express?**  
Minimal HTTP framework: middleware, routers, `req`/`res`. We mount `/api/sites`, `/api/installations`, `/api/summary`.

**How does React talk to Express?**  
`axios` in `api.js` calls `/api/...`. In dev, Vite proxies to `localhost:5000`.

**Explain one API end-to-end (create site).**  
Form → `createSite` → `POST /api/sites` → `createSiteRules` + `validateRequest` → `INSERT ... RETURNING` → `201` JSON → React appends to state.

**How is PostgreSQL connected?**  
`db.js` creates `new Pool({ host, port, user, password, database })` from env; imported wherever queries run.

**What is a connection pool?**  
A set of reusable DB connections so each request doesn’t open/close a new TCP connection.

**Primary key?**  
`id SERIAL PRIMARY KEY` on each table — unique identifier for a row.

**Foreign key?**  
`Installations.site_id REFERENCES Sites(id) ON DELETE CASCADE`.

**What joins are used?**  
`JOIN Sites s ON s.id = i.site_id` when listing/fetching installations.

**SQL injection prevention?**  
Parameterized queries (`$1`, `$2`, …) with a values array via `pg` — user input is not concatenated into SQL strings for values. (Dynamic column *names* in UPDATE are whitelisted from a fixed array.)

**Validation?**  
`express-validator` rule arrays + `validateRequest`; plus `siteExists` for installations.

**Backend errors?**  
`try/catch` → `next(err)` → `errorHandler`; explicit 404/400 in handlers; Postgres codes mapped.

**Why this backend structure?**  
Small app: routes hold handlers; shared query helpers only where JOIN logic repeats. Clear and easy to follow without over-layering.

**How does summary work?**  
`Promise.all` of COUNT queries and `GROUP BY` queries; handler reshapes into one JSON object for the dashboard.

**More data later?**  
List endpoints already use **pagination** (max 20) and SQL filters. Next scale steps: richer indexes, cursor pagination, or full-text search beyond `ILIKE`.

**Configuration?**  
`dotenv` + `.env` for `PORT` and `DB_*`; client optional `VITE_API_BASE_URL`.

**Azure deployment?**  
**Not implemented in repo yet.** Planned: Azure Postgres + App Service (API) + Static Web Apps (React). You’d point `DB_*` at Azure Postgres and set the client API base URL to the deployed API.

**How does pagination work?**  
Client always sends `limit=20` and `skip`. Server `parsePagination` caps limit at 20. Response includes `total` so the UI can show page N of M. Export uses `all=1` to skip LIMIT.

**How does import/export work?**  
Client parses XLSX headers (must match expected set) → `POST /api/.../import` with `{ rows }`. Server upserts. Export refetches with current filters + `all=1`, then downloads `.xlsx`.

---

## 19. "Why Did We Do It This Way?"

**What:** Parameterized SQL (`$1` …) with `pg`.  
**Why:** Keeps values separate from SQL text and reduces SQL injection risk.

**What:** `express-validator` before handlers.  
**Why:** Reject bad input early with consistent 400s before hitting the database.

**What:** Connection `Pool` in `db.js`.  
**Why:** Efficient concurrent request handling without reconnecting every time.

**What:** Installations `JOIN` Sites in one query.  
**Why:** UI needs site name/location without N+1 client calls.

**What:** `ON DELETE CASCADE` from Sites → Installations.  
**Why:** Prevent orphan installations when a site is removed (UI also warns the user).

**What:** Central `errorHandler` + Postgres code mapping.  
**Why:** One JSON error shape; constraint failures become client-safe 4xx instead of raw 500s.

**What:** Server-side list filters + pagination (`parsePagination`, max 20).  
**Why:** Scales past loading every row into the browser; consistent page size.  
**Current implementation:** `LIMIT`/`OFFSET` + `COUNT`; Sites `q` → `ILIKE`; status/equipment equality filters.  
**Export escape hatch:** `all=1` returns all matching rows for XLSX export.

**What:** Debounced Sites search (500ms) before API call.  
**Why:** Avoid a request per keystroke while still filtering on the server.

**What:** XLSX import upsert + export.  
**Why:** Bulk load/edit without hand-entering every row; headers must match so columns stay reliable.  
**Upsert keys:** Sites by name (CI); Installations by site name + equipment (CI).

**What:** Route-file handlers (no separate service layer).  
**Why:** Matches project size and checklist scope; easy to trace.  
**Common production approach:** controller/service/repository split as the API grows.

**What:** Vite proxy in development.  
**Why:** Same-origin `/api` paths locally without CORS pain; production can set absolute `VITE_API_BASE_URL`.

**What:** No authentication.  
**Why:** Out of current build scope.  
**Common production approach:** auth middleware (JWT/session) before mutating routes.

---

## 20. Final Revision Sheet

# 10 Things I Must Remember Before the Interview

1. **Stack:** React (Vite) + Express (Node) + PostgreSQL (`sitedashboard`) via `pg` Pool.  
2. **APIs:** `/api/sites`, `/api/installations`, `/api/summary` (+ `/health`, `…/import`).  
3. **Flow:** UI → axios (`api.js`) → Express route → `pool.query` → JSON → React state.  
4. **Lists:** `{ items, total, limit, skip }`; max **20** per page; filters via query params.  
5. **Schema:** Installations → required Sites; site delete cascades.  
6. **Validation:** `express-validator` + `validateRequest`; installation also checks `siteExists`.  
7. **SQL safety:** parameterized `$1` placeholders, not string concatenation for values.  
8. **Installations list:** `JOIN Sites` for `site_name` / location / site status.  
9. **Import/export:** XLSX upsert (sites by name; installations by site+equipment); export uses `all=1`.  
10. **Honest gaps:** no auth; Azure not wired yet.

---

*Generated from the implemented codebase under `/client` and `/server`. If the code changes, update this document to match.*
