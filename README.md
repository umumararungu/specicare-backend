
# Specicare Backend

Lightweight Express + Sequelize backend for the Specicare application.

This README documents how to run the project locally and on Railway (or similar providers), and lists the environment variables the project expects. It also includes troubleshooting tips and deployment notes.

## Table of contents

- Quick start (local)
- Environment variables (local & Railway)
- Running locally
- Run tests / validation
- Deployment notes (Railway)
- Troubleshooting
- Next steps / improvements

## Quick start (local)

1. Clone the repo and install dependencies:

```powershell
cd specicare-backend
npm install
```

2. Create a `.env` file in the repository root (see `Environment variables` below for required keys).

3. Start the app in development:

```powershell
# Specicare Backend

Lightweight Express + Sequelize backend for the SpeciCare medical test booking platform.

This repository contains the API server and supporting scripts. The instructions below explain how to install dependencies, configure environment variables, initialize the database, and run the server locally or in production-like environments (Railway, Heroku, etc.).

## Quick links

- Code: `server.js`, `routes/`, `controllers/`, `models/`
- Init DB script: `scripts/initDatabase.js` (exposed as `npm run init-db`)
- Start (production): `npm start`
- Dev (watch): `npm run dev`

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm (comes with Node) or yarn
- PostgreSQL for local development (or use a hosted provider and `DATABASE_URL`)

## Install dependencies

Open PowerShell in the project root and run:

```powershell
npm install
```

Dev dependency `nodemon` is included and used by `npm run dev`.

## Environment configuration

Copy the example file and edit values for your environment:

```powershell
copy .env.example .env
notepad .env
```

Supported database configuration styles:

- Single URL (recommended for hosts like Railway/Heroku): `DATABASE_URL=postgres://user:pass@host:port/dbname`
- Individual values: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

Required application env vars (at minimum):

- `JWT_SECRET` — secret used to sign JWT tokens
- `PORT` — optional, defaults to `3000`

Optional but recommended:

- `NODE_ENV` — `development` or `production`
- `JWT_EXPIRES_IN` — e.g. `7d`, `1h`
- `FRONTEND_URL` — used to construct links in emails
- `DB_SSL` — `true` to enable SSL for individual DB settings (when not using `DATABASE_URL`)

See `.env.example` for a ready-to-use template.

## Initialize the database

Create a Postgres database locally and run the initialization script (if you prefer automated setup):

```powershell
# create DB (example using psql)
psql -U postgres -c "CREATE DATABASE specicare;"

# run the repo init script which seeds tables (if present)
npm run init-db
```

`npm run init-db` runs `node scripts/initDatabase.js` and may create tables / seed default data depending on the script.

## Run the server

Development (auto-restart on change):

```powershell
npm run dev
```

Production (start the process):

```powershell
npm start
```

By default the server listens on `PORT` or `3000`.

## Available npm scripts

- `npm start` — runs `node server.js` (production)
- `npm run dev` — runs `nodemon server.js` (development)
- `npm run init-db` — runs `node scripts/initDatabase.js`

These are defined in `package.json`.

## Health and API endpoints

Check the server root for a health response (if implemented):

GET http://localhost:3000/

Common API routes available under `/api` (examples):

- `POST /api/users/register` — register a user
- `POST /api/users/login` — login
- `GET  /api/users/me` — current user (requires auth)
- `POST /api/appointments` — create appointment (example)

Refer to `routes/` and `controllers/` for full endpoint details.

## Troubleshooting

- Database connection refused: check `DATABASE_URL` or `DB_*` vars, and ensure Postgres is running and reachable.
- Missing `JWT_SECRET`: authentication will fail; set a secure secret in `.env`.
- SSL errors with hosted Postgres: if using `DATABASE_URL` the code enables SSL with relaxed verification by default; set `DB_STRICT_SSL=true` (if supported) and adjust the DB client options if you need strict CA checks.

To quickly validate module loading (sanity check):

```powershell
node -e "require('./config/database.js') && console.log('db config ok')"
```

## Deployment notes (Railway / Heroku)

- Provide `DATABASE_URL` via the hosting platform environment variables.
- Provide `JWT_SECRET` and any other secrets in the project's environment settings.
- Ensure `package.json` contains `start` script (this repo does).

Railway will run `npm install` and `npm start` automatically if the repository is connected.

## Recommended next steps (optional)

- Add a `.github/workflows/ci.yml` to run lint/tests on PRs.
- Add a `GET /health` endpoint for readiness checks.
- Add a `.env.production` sample or secrets guidance for team members.

## Contributing

Feel free to open issues or pull requests. When contributing, run `npm run dev` locally and follow existing code style.





