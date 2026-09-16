# Site Ops Dashboard

React + Express + PostgreSQL dashboard for managing **Sites** and **Installations**, with a summary overview.

**Live (Azure)**

| Service | URL |
|---|---|
| Frontend (Static Web Apps) | https://ambitious-grass-056b49800.6.azurestaticapps.net |
| API (App Service) | https://siteops-api-a75f.azurewebsites.net |
| Health check | https://siteops-api-a75f.azurewebsites.net/health |

Resource group: `siteops-rg` · Region: `centralindia` (SWA in `eastasia`)

---

## Stack

- **Client:** Vite + React (`/client`)
- **Server:** Express + `pg` (`/server`)
- **Database:** PostgreSQL (`Sites`, `Installations`)

---

## Local setup

### Prerequisites

- Node.js 20+ (22 recommended)
- PostgreSQL running locally (default port `5432`)

### 1. Database

Create a database (example name: `sitedashboard`), then apply the schema:

```bash
psql -U postgres -d sitedashboard -f server/db/schema.sql
```

Or from `/server` with Node (set `PG*` env vars first):

```bash
node db/runAzureSchema.js
```

### 2. Backend

```bash
cd server
cp .env.example .env
# edit DB_* values
npm install
npm run dev
```

API listens on `http://localhost:5000` by default.

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Vite proxies `/api` and `/health` to the local API (`vite.config.js`). Leave `VITE_API_BASE_URL` empty for local proxy use.

---

## Environment variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | API port (default `5000`) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Postgres connection |
| `DB_SSL` | `true` for Azure Postgres |
| `CORS_ORIGINS` | Comma-separated allowed origins (production) |
| `NODE_ENV` | `development` / `production` |

### Client

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Absolute API base URL in production builds (empty locally) |

---

## API endpoints

Base: `http://localhost:5000` (local) or the Azure API URL above.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health + DB time |
| `GET` | `/api/summary` | Aggregated metrics |
| `GET` | `/api/sites` | List sites (`q`, `status`, pagination) |
| `GET` | `/api/sites/:id` | Get one site |
| `POST` | `/api/sites` | Create site |
| `PUT` | `/api/sites/:id` | Update site |
| `DELETE` | `/api/sites/:id` | Delete site |
| `POST` | `/api/sites/import` | Bulk import sites |
| `GET` | `/api/installations` | List installations (joined to site) |
| `GET` | `/api/installations/:id` | Get one installation |
| `POST` | `/api/installations` | Create installation |
| `PUT` | `/api/installations/:id` | Update installation |
| `DELETE` | `/api/installations/:id` | Delete installation |
| `POST` | `/api/installations/import` | Bulk import installations |

Errors return a consistent JSON shape from the Express error middleware.

---

## Azure resources (this deploy)

| Resource | Name |
|---|---|
| Resource group | `siteops-rg` |
| PostgreSQL Flexible Server | `siteops-pg-a75f` |
| Database | `sitedashboard` |
| App Service plan | `siteops-plan` (Linux B1) |
| Web app (API) | `siteops-api-a75f` |
| Static Web App | `siteops-web-a75f` |

Secrets and local deploy config live in `.azure-deploy/` (gitignored). Do not commit DB passwords.

To tear down everything:

```bash
az group delete --name siteops-rg --yes
```

---

## Project layout

```
/client   React UI
/server   Express API
PROJECT_CHECKLIST.md
```
