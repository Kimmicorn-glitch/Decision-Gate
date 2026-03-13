# Running The Application

This guide runs the full application locally:

- Rust backend (`Agent Decision Gate API`)
- Next.js frontend (`Decision Review Console`)

## Prerequisites

- Rust toolchain installed (`rustup`, `cargo`)
- Node.js 20+ and npm
- `curl` for API checks

## 1. Start the Backend API

From repo root:

```bash
cargo run
```

Backend defaults:

- Base URL: `http://localhost:8080`
- Health: `GET /healthz`
- Ready: `GET /readyz`
- Decision endpoint: `POST /proposed-action`
- Audit endpoint: `GET /audit`
- Monitor endpoint: `GET /monitor/overview`
- Integration register endpoint: `POST /monitor/integrations`
- Integration list endpoint: `GET /monitor/integrations`

Optional backend environment variables:

- `BIND_ADDR` (default `0.0.0.0:8080`)
- `MCP_BASE_URL` (default `http://localhost:7071`)
- `MCP_LOGGING_PATH` (default `/api/mcp/log-decision`)
- `COSMOS_ENDPOINT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`, `COSMOS_KEY` (if using Cosmos DB)
- `SENTRY_DSN` (enables Sentry monitoring for decision/patch workflows)
- `SENTRY_ENVIRONMENT` (default `development`)
- `SENTRY_TRACES_SAMPLE_RATE` (default `0.2`)
- `RUNTIME_MONITOR_INTERVAL_SECS` (default `15`)
- `SENTRY_CPU_ALERT_THRESHOLD` (default `85`)
- `SENTRY_MEMORY_ALERT_MB` (default `2048`)
- `ADMIN_USERNAME` (required for bootstrap or credential override)
- `ADMIN_PASSWORD` (required for bootstrap or credential override)

Set secure admin credentials before starting backend:

```bash
export ADMIN_USERNAME='your_admin_user'
export ADMIN_PASSWORD='your_strong_password'
cargo run
```

If login fails due to an older local user hash, set these env vars and restart. The backend will upsert the configured admin account.

## 2. Start the Frontend Console

Open a second terminal:

```bash
cd console
cp .env.example .env.local
npm install
npm run dev
```

Frontend defaults:

- URL: `http://localhost:3000`
- Backend target comes from `NEXT_PUBLIC_API_URL` in `console/.env.local`

Example `console/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 3. Quick Verification

### API check

```bash
curl -sS -X POST http://localhost:8080/proposed-action \
  -H 'content-type: application/json' \
  -d '{
    "action_type":"deploy",
    "description":"Deploy service X to production with elevated permissions.",
    "metadata":{"service":"service-x","environment":"production"},
    "risk_level":"high"
  }'
```

Then check audit summaries:

```bash
curl -sS http://localhost:8080/audit
```

### UI check

- Open `http://localhost:3000`
- Submit the default action
- Confirm gate stages progress (`Planner -> Execution -> Governance -> Critic`)
- Confirm decision card shows `decision`, `reasoning`, `policy_violations`, `confidence_score`, `audit_id`
- Open `http://localhost:3000/audit` and confirm new row appears

## Troubleshooting

- If frontend cannot call backend, verify `NEXT_PUBLIC_API_URL` and backend is running on port `8080`.
- If API requests fail from browser, add CORS support on the Rust API for `http://localhost:3000`.
- If Cargo cannot fetch crates, verify internet/DNS access to `crates.io`.
