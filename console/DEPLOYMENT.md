# Azure Static Web Apps Deployment

## 1. Install and run locally

```bash
cd console
npm install
npm run dev
```

Generate static artifacts:

```bash
npm run build
```

## 2. Configure environment variable

In Azure Static Web Apps application settings, set:

- `NEXT_PUBLIC_API_URL` = `https://<decision-gate-api-host>`

## 3. GitHub Action deployment (recommended)

Create an Azure Static Web App and set:

- App location: `console`
- Output location: `out`
- API location: empty (use external Rust backend)
- App build command: `npm run build`
- Workflow file: `.github/workflows/azure-static-web-apps-console.yml`

Required GitHub repository secrets:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `NEXT_PUBLIC_API_URL`

## 4. Static Web App routing config

`console/staticwebapp.config.json` is included for headers and fallback behavior.

## 5. Backend CORS

Allow your Static Web App origin on the Rust API so `POST /proposed-action` and `GET /audit` can be called from browser clients.
