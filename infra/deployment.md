# GitHub to Azure Deployment

This repo is set up to deploy in two parts:

- Backend API to Azure Container Apps with GitHub Actions OIDC
- Frontend console to Azure Static Web Apps

The workflows are:

- [.github/workflows/azure-container-apps-api.yml](/home/wtc/Music/Decision-Gate/.github/workflows/azure-container-apps-api.yml)
- [.github/workflows/azure-static-web-apps-console.yml](/home/wtc/Music/Decision-Gate/.github/workflows/azure-static-web-apps-console.yml)
- [.github/workflows/ci.yml](/home/wtc/Music/Decision-Gate/.github/workflows/ci.yml)

## Target Architecture

- Azure Container Registry stores the backend image
- Azure Container Apps runs the Rust API on port `8080`
- Azure Static Web Apps serves the static Next.js console
- Optional Azure Cosmos DB stores audit/state instead of in-memory state
- Optional Azure Functions provides MCP tool endpoints

## 1. Create Azure resources

Create or reuse:

- Resource group
- Azure Container Registry
- Azure Container Apps environment
- Azure Container App
- Azure Static Web App

You can keep the backend and frontend in the same resource group.

## 2. Configure GitHub OIDC for Azure

Create a Microsoft Entra application / service principal with a federated credential for this GitHub repository and environment. The backend workflow uses OIDC via `azure/login`, so it does not require a stored Azure client secret.

Required GitHub `Secrets`:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `TENANT_ENCRYPTION_KEY`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`

Optional GitHub `Secrets`:

- `NEXT_PUBLIC_API_URL`
- `MCP_BASE_URL`
- `SENTRY_DSN`
- `COSMOS_ENDPOINT`
- `COSMOS_DATABASE`
- `COSMOS_CONTAINER`
- `COSMOS_KEY`

Required GitHub `Variables`:

- `ACR_NAME`
- `AZURE_RESOURCE_GROUP`
- `AZURE_CONTAINER_APP_NAME`
- `AZURE_CONTAINERAPPS_ENVIRONMENT`

Optional GitHub `Variables`:

- `CONTAINER_APP_MIN_REPLICAS`
- `CONTAINER_APP_MAX_REPLICAS`
- `RUNTIME_MONITOR_INTERVAL_SECS`
- `SENTRY_ENVIRONMENT`
- `SENTRY_TRACES_SAMPLE_RATE`
- `SENTRY_CPU_ALERT_THRESHOLD`
- `SENTRY_MEMORY_ALERT_MB`

## 3. Backend deployment flow

On push to `main`, the API workflow:

1. Runs `cargo test`
2. Logs into Azure with OIDC
3. Builds the container image from [Dockerfile](/home/wtc/Music/Decision-Gate/Dockerfile)
4. Pushes the image to ACR
5. Deploys or updates the Azure Container App
6. Applies runtime secrets and environment variables

The container now exposes:

- `GET /`
- `GET /healthz`
- `GET /readyz`

These are suitable for Azure health checks and smoke tests.

## 4. Frontend deployment flow

On push to `main`, the console workflow:

1. Runs `npm ci`
2. Builds the static export from `console/`
3. Uploads `console/out` to Azure Static Web Apps

Set `NEXT_PUBLIC_API_URL` to your Container App HTTPS endpoint, for example:

```text
https://decision-gate-api.<region>.azurecontainerapps.io
```

## 5. First production bootstrap

After the first deployment:

1. Confirm the API health endpoint returns `200`
2. Open the Static Web App URL
3. Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`, or create the first admin via `/signup` if you intentionally deploy without bootstrap credentials
4. Configure integrations in `/settings`

## 6. Persistence and monitoring

Recommended production settings:

- Set Cosmos DB secrets if you want persistent state across restarts
- Set `SENTRY_DSN` for runtime visibility
- Set `MCP_BASE_URL` if Azure Functions is deployed for MCP tool logging

Without Cosmos DB, audit/state stays in the Container App filesystem and should be treated as ephemeral.

## 7. Manual fallback

If you need to deploy without GitHub Actions, use:

```bash
az acr login --name <ACR_NAME>
docker build -t <ACR_NAME>.azurecr.io/agent-decision-gate:latest .
docker push <ACR_NAME>.azurecr.io/agent-decision-gate:latest
```

Then update the Container App image and environment variables manually or with `az containerapp update`.
