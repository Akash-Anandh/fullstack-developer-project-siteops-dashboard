# Site Operations Dashboard — Project Checklist

> Instructions for Cursor: Work through phases in order. When a task is completed and verified, change `- [ ]` to `- [x]`. Do not skip ahead to a new phase until all tasks in the current phase are checked. When starting a new chat, read this file first to see what's done and resume from the first unchecked task.
>
> **Chat plan:** Keep each chat scoped to one section below so context stays focused. After finishing a Chat section, commit progress, then start a **new chat** and point it at this file.

---

## Chat A — Environment + Backend Scaffold
> **DONE.** Phase 0–1 complete. Start a **new chat** for Chat B.

### Phase 0: Environment Setup
- [x] Azure account created ($200 credit active)
- [x] PostgreSQL installed locally
- [x] Database `sitedashboard` created
- [x] Tables created: Sites, Installations (with FK relationships)

### Phase 1: Backend Scaffolding
- [x] Create `/server` folder, run `npm init -y`
- [x] Install dependencies: `express pg dotenv cors express-validator morgan`
- [x] Create `.env` with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- [x] Create `db.js` — pg Pool connection using `.env` values
- [x] Create `server.js` — Express app, cors, json middleware, morgan logging
- [x] Confirm server starts and connects to Postgres (test query on boot)

---

## Chat B — Backend APIs + Testing
> **Start a new chat** when Chat A Phase 1 is fully checked. Prompt: *"Read PROJECT_CHECKLIST.md and continue from the first unchecked task (Chat B)."*

### Phase 2: Backend APIs — Sites
- [x] GET /api/sites — list all sites
- [x] GET /api/sites/:id — get one site
- [x] POST /api/sites — create site (with validation)
- [x] PUT /api/sites/:id — update site
- [x] DELETE /api/sites/:id — delete site
- [x] Error handling middleware returns consistent JSON error shape

### Phase 3: Backend APIs — Installations
- [x] GET /api/installations — list all (with site join)
- [x] GET /api/installations/:id — get one
- [x] POST /api/installations — create (validate site_id exists)
- [x] PUT /api/installations/:id — update
- [x] DELETE /api/installations/:id — delete

### Phase 4: Summary API
- [x] GET /api/summary — aggregated metrics (total sites, total installations, counts by status, etc.) using SQL GROUP BY / aggregation

### Phase 5: Backend Testing
- [x] Test all endpoints manually (Postman/curl/Thunder Client)
- [x] Confirm validation errors return proper 4xx responses
- [x] Confirm server logs requests correctly

---

## Chat C — Frontend Scaffold + Dashboard
> **DONE.** Phase 6–7 complete. Start a **new chat** for Chat D.

### Phase 6: Frontend Scaffolding
- [x] Create `/client` with Vite or Create React App
- [x] Install axios (or use fetch), set up base API URL config
- [x] Set up basic routing/page structure (Dashboard, Sites, Installations)

### Phase 7: Frontend — Dashboard
- [x] Summary cards fetching from GET /api/summary
- [x] Loading and error states for the cards

---

## Chat D — Frontend Sites + Installations
> **DONE.** Phase 8–9 complete. Start a **new chat** for Chat E.

### Phase 8: Frontend — Sites Page
- [x] Site listing table/grid, data from GET /api/sites
- [x] Search bar (filter by name)
- [x] Filter by status
- [x] Add/Edit site form (POST/PUT)
- [x] Delete site with confirmation

### Phase 9: Frontend — Installations Page
- [x] Installation listing, data from GET /api/installations
- [x] Add/Edit installation form (POST/PUT), linked to a site
- [x] Delete installation with confirmation

---

## Chat E — Polish + Azure Deploy + Docs
> **DONE.** Phase 10–11 complete. Phase 12 Git push pending remote.

### Phase 10: Polish
- [x] Responsive layout check (mobile/tablet/desktop)
- [x] Basic loading/error UI across all pages
- [x] Remove console logs / dead code
- [x] Server + UI pagination for sites/installations (max 20 per page)
- [x] Sites name search debounced 1s before API call
- [x] Sites + Installations Import/Export XLSX (header match; upsert by site name; export respects filters, not pagination)

### Phase 11: Deployment
- [x] Create Azure Database for PostgreSQL (Flexible Server, free tier)
- [x] Migrate local schema to Azure Postgres
- [x] Deploy backend to Azure App Service, set env vars in Azure portal
- [x] Deploy frontend to Azure Static Web Apps
- [x] Confirm frontend can reach deployed backend (CORS configured)
- [x] Full smoke test on deployed app

### Phase 12: Documentation & Git
- [x] README.md: setup steps, how to run locally, API endpoint list
- [ ] Confirm Git history has clear, incremental commits (not one giant commit)
- [ ] Final push to main branch
