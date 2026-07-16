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
- Build command: `npm run ci:check`
- Output directory: leave empty

The repository also includes a GitHub Actions workflow that runs the same CI gate on pushes to `main`/`master` and on pull requests.

Production Vercel deployment is part of the GitHub Actions pipeline. It runs only after all checks pass on `main`/`master`.

Add these repository secrets in GitHub:

```bash
VERCEL_TOKEN=<vercel-token>
VERCEL_ORG_ID=<vercel-org-or-team-id>
VERCEL_PROJECT_ID=<vercel-project-id>
```

Recommended Vercel setting: disable the default Git integration auto-deploy for this project, or keep it only if you intentionally want Vercel to create deployments outside GitHub Actions. The GitHub Actions `Deploy to Vercel` job is now the controlled deployment path.

## Branch Protection

Protect `main` in GitHub so changes must come from a feature/bugfix branch through a pull request. The required status check is the GitHub Actions job named `Lint, test, and build`.

Run this once with a GitHub token that has `Administration: write` permission for the repository:

```bash
GITHUB_TOKEN=<admin-token> node scripts/apply-github-branch-protection.mjs
```

or:

```bash
GITHUB_TOKEN=<admin-token> npm run github:protect-main
```

This enables:

- pull requests before merging into `main`
- required passing status check: `Lint, test, and build`
- branch must be up to date before merge
- one approving review
- stale review dismissal after new commits
- no admin bypass
- no force pushes or branch deletion

Pull requests must also come from a branch with one of these prefixes:

- `feature/`
- `bugfix/`
- `fix/`
- `hotfix/`
- `chore/`
- `docs/`
- `test/`
- `refactor/`
- `release/`

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
