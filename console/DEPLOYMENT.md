# Azure Static Web Apps Deployment

The console is a static Next.js export and deploys through:

- [.github/workflows/azure-static-web-apps-console.yml](/home/wtc/Music/Decision-Gate/.github/workflows/azure-static-web-apps-console.yml)

## Required GitHub configuration

GitHub `Secrets`:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `NEXT_PUBLIC_API_URL`

`NEXT_PUBLIC_API_URL` must point to the deployed backend API, for example:

```text
https://decision-gate-api.<region>.azurecontainerapps.io
```

## Azure Static Web Apps settings

When creating the Static Web App, use:

- App location: `console`
- Output location: `out`
- API location: leave empty
- Build command: `npm run build`

## What the workflow does

1. Installs dependencies with `npm ci`
2. Builds the static export
3. Uploads `console/out` to Azure Static Web Apps
4. Manages preview environments for pull requests

## Routing and headers

Routing and browser security headers are defined in:

- [console/staticwebapp.config.json](/home/wtc/Music/Decision-Gate/console/staticwebapp.config.json)

## Local verification

```bash
cd console
npm ci
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build
```
