# Festive Vendor Locator API

NestJS REST API for the Festive Vendor Locator app.

## Local Development

```bash
npm install
npm run start:dev
```

API base URL: `http://localhost:3000/v1`

Health check: `GET /v1/health`

## Scripts

```bash
npm run build
npm run start:prod
npm test
npm run test:e2e
```

## Vercel Deployment

This repository is ready to deploy as a standalone Vercel project. Vercel uses `api/index.ts` as the serverless entrypoint and routes all requests through the Nest app.

Recommended Vercel project settings:

- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave empty

Set these environment variables in Vercel:

```bash
JWT_SECRET=<strong-production-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
QR_HMAC_SECRET=<strong-production-secret>
PUBLIC_API_ORIGIN=https://<your-vercel-domain>
```

## Serverless Notes

The current API uses SQLite and local uploads. On Vercel, they default to `/tmp/fvl.db` and `/tmp/uploads` because that is the writable serverless filesystem. These writes are ephemeral, so this is suitable for demo deployments but not durable production data.

For production, move persistence to a hosted database and object storage before relying on this API for real user data.
