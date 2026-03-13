# Agent Decision Gate

Agent Decision Gate is an AI governance gateway and monitoring dashboard.
It sits between agent output (Copilot, autonomous bots, IDE/devops automations) and execution, then decides whether to `APPROVE`, `REVISE`, or `BLOCK`.

## What The Application Does

- Accepts proposed AI actions through an API.
- Runs a multi-stage decision pipeline (planner, execution analysis, governance policy checks, critic).
- Produces a decision with reasoning, policy violations, confidence, and risk scores.
- Tracks integrations (Copilot, agent gateways, enterprise tools) and shows monitoring metrics.
- Captures audit records for traceability.
- Supports Sentry telemetry and runtime resource alerting (CPU/memory thresholds).

## Core Features

- Decision gate for risky AI actions (`/proposed-action`)
- Audit log (`/audit`)
- Integration registry (`/monitor/integrations`)
- Monitoring overview (`/monitor/overview`)
- Admin auth + tenant settings (`/auth/*`, `/admin/*`)
- Bot dashboard in UI (`/bots`)

## Architecture

### Backend (Rust)

- Framework: `axum` + `tokio`
- Entry point: `src/main.rs`
- Domain modules:
  - `agents/` multi-agent stages
  - `governance/` policy engine
  - `api/` handlers, models, monitoring, auth/admin settings
  - `mcp/` MCP adapters for tool integrations
- Persistence:
  - Local encrypted tenant settings file
  - Local admin users file (argon2 password hashes)
  - Optional Cosmos integration hooks

### Frontend (Next.js)

- Framework: Next.js App Router (`console/`)
- Primary pages:
  - `/` decision console
  - `/login` admin login
  - `/settings` tenant + integration controls
  - `/bots` bot/integration tracking dashboard
  - `/audit` audit viewer
- Frontend API client: `console/lib/api.ts`

## How It Was Built

This project is implemented as a policy-first control plane:

1. Externalized policies in `config/policies.yaml` instead of hardcoding rule logic in handlers.
2. Layered decision pipeline to separate planning, execution analysis, governance checks, and final critique.
3. Monitoring model added on top of decisions so every integration has operational visibility.
4. Tenant/admin settings modeled separately from action flow to support enterprise controls.
5. UI built as an operator console for real-time decisions, auditability, and integration management.
6. Observability added with Sentry hooks and runtime metric thresholds for safety operations.

## Security And Login

There is no exposed default password in the UI/docs.
Admin login is controlled by environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

On startup, if these are set, the backend upserts that admin user (useful for rotating credentials or fixing stale local hashes).

## Quick Start

From repo root:

```bash
export ADMIN_USERNAME='your_admin_user'
export ADMIN_PASSWORD='your_strong_password'
cargo run
```

In another terminal:

```bash
cd console
npm install
npm run dev
```

Open:

- Console: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- API: `http://localhost:8080`
- Health: `http://localhost:8080/healthz`

## Key API Endpoints

- `POST /proposed-action`
- `GET /audit`
- `GET /monitor/overview`
- `POST /monitor/integrations`
- `GET /monitor/integrations`
- `POST /auth/login`
- `GET /admin/tenants`
- `GET/POST /admin/settings/:tenant_id`

## Connect Copilot / Agents

1. Login as admin in `/login`.
2. Go to `/settings` and configure `Agent Link Settings`:
   - Active + Connected
   - Integration name (for example `vscode-copilot` or `clawbot`)
   - Agent ID and autonomous flag
   - GitHub repo and Azure MCP endpoint
3. Save settings.
4. Confirm integration appears in `/bots` and `/monitor/integrations`.
5. Submit actions with integration metadata so monitoring attributes decisions correctly.

## Sentry And Runtime Monitoring

Set these environment variables on backend:

- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT` (optional, default `development`)
- `SENTRY_TRACES_SAMPLE_RATE` (optional)
- `RUNTIME_MONITOR_INTERVAL_SECS` (optional)
- `SENTRY_CPU_ALERT_THRESHOLD` (optional)
- `SENTRY_MEMORY_ALERT_MB` (optional)

## Project Structure

- `src/main.rs` API bootstrap + routes
- `api/` admin/auth/settings/monitoring/engine wiring
- `agents/` decision stages
- `governance/` policy evaluation
- `mcp/` integration adapter contracts
- `config/` policies + model router
- `console/` Next.js operator dashboard
- `infra/` deployment manifests/docs

## GitHub to Azure

The repo includes deployment workflows for Azure:

- Backend API to Azure Container Apps:
  [.github/workflows/azure-container-apps-api.yml](/home/wtc/Music/Decision-Gate/.github/workflows/azure-container-apps-api.yml)
- Frontend console to Azure Static Web Apps:
  [.github/workflows/azure-static-web-apps-console.yml](/home/wtc/Music/Decision-Gate/.github/workflows/azure-static-web-apps-console.yml)
- CI validation:
  [.github/workflows/ci.yml](/home/wtc/Music/Decision-Gate/.github/workflows/ci.yml)

For setup details, see [infra/deployment.md](/home/wtc/Music/Decision-Gate/infra/deployment.md) and [console/DEPLOYMENT.md](/home/wtc/Music/Decision-Gate/console/DEPLOYMENT.md).

## Additional Runbook

For a step-by-step local run guide, see `RUNNING.md`.
