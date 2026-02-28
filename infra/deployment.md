# Azure Deployment Instructions

## 1. Build and Push Container Image

```bash
az acr login --name <ACR_NAME>
docker build -t <ACR_NAME>.azurecr.io/agent-decision-gate:latest .
docker push <ACR_NAME>.azurecr.io/agent-decision-gate:latest
```

## 2. Deploy to Azure Container Apps

```bash
az deployment group create \
  --resource-group <RG> \
  --template-file infra/containerapp.yaml
```

## 3. Azure Functions as Tool Layer

Deploy tool functions (preflight checks, permission validation) to Azure Functions. Ensure each function accepts `x-trace-id` and returns structured JSON.

## 4. State Persistence

Replace in-memory store with either:

1. Azure Cosmos DB (recommended for global scale and low-latency reads).
2. Azure Table Storage (cost-optimized audit trail).

## 5. Observability

Set App Service / Container App environment variables for OpenTelemetry exporter:

- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_SERVICE_NAME=agent-decision-gate`
- `RUST_LOG=info`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT` (for example `production`)
- `SENTRY_TRACES_SAMPLE_RATE` (for example `0.2`)
- `RUNTIME_MONITOR_INTERVAL_SECS` (for example `15`)
- `SENTRY_CPU_ALERT_THRESHOLD` (for example `85`)
- `SENTRY_MEMORY_ALERT_MB` (for example `2048`)

Connect to Azure Monitor via OpenTelemetry exporter and enable distributed tracing in Azure Monitor Application Insights.

## 6. Foundry Model Router

Set model credentials and route requests through Microsoft Foundry model routing endpoint (wired by stage name from `config/model-router.yaml`).

## 7. App Service Alternative

If deploying to Azure App Service:

```bash
az webapp create \
  --resource-group <RG> \
  --plan <PLAN_NAME> \
  --name <APP_NAME> \
  --deployment-container-image-name <ACR_NAME>.azurecr.io/agent-decision-gate:latest
```

Configure the same environment variables used for Container Apps.
