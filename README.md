```markdown
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
# development
set NODE_ENV=development; node server.js

# or using nodemon if you have it installed
npx nodemon server.js
```

The API will be available at http://localhost:3000 by default (or a port set in your env).

## Environment variables (local & Railway)

The app supports two common deployment styles:

- A single `DATABASE_URL` (typical on Railway)
- Individual Postgres variables (DB_HOST/DB_USER/DB_NAME/DB_PASSWORD/DB_PORT) or provider names (PGHOST/PGUSER/PGDATABASE/PGPASSWORD/PGPORT or POSTGRES_*).

The code auto-normalizes the common variants so you can rely on either style.

Required environment variables (one of these sets must be present):

- Option A (single URL, recommended on Railway):
  - `DATABASE_URL`  (postgres://user:pass@host:port/dbname)

- Option B (individual values):
  - `DB_HOST` (or `PGHOST`)
  - `DB_USER` (or `PGUSER` / `POSTGRES_USER`)
  - `DB_NAME` (or `PGDATABASE` / `POSTGRES_DB`)
  - `DB_PASSWORD` (or `PGPASSWORD` / `POSTGRES_PASSWORD`) — optional if your DB has no password
  - `DB_PORT` (or `PGPORT`) — default 5432

Other recommended environment variables:

- `NODE_ENV` — `development` | `production` (affects logging and .env loading)
- `JWT_SECRET` — secret used to sign JWT tokens (required)
- `JWT_EXPIRES_IN` — token expiry string (e.g. `7d`, `1h`) (recommended)
- `FRONTEND_URL` — used when building reset password links (defaults to `http://localhost:3000`)
- `DB_SSL` — set to `true` to enable SSL in non-DATABASE_URL mode (defaults to enabled in production)

Railway-specific environment variables you might see (we handle them):

- `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` — mapped to DB_* equivalents
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — mapped to DB_* equivalents
- `RAILWAY_ENV`, `RAILWAY_STATIC_URL`, `RAILWAY_DEPLOYMENT_*` — informational, not required

Notes about SSL and hosted Postgres

- When `DATABASE_URL` is used (Railway/Heroku), the code enables SSL with `rejectUnauthorized: false` by default because many hosted providers use certificates that are not validated by a local CA bundle. If you need stricter verification, make this configurable via an env var (e.g. `DB_STRICT_SSL=true`) and remove `rejectUnauthorized: false`.

## Running locally

1. Prepare `.env` (example below):

```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=specicare
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

2. Create the database (Postgres) and run any initialization scripts (if present):

```powershell
# Example using psql - replace with your DB client
psql -U postgres -c "CREATE DATABASE specicare;"

# If there is an init script in scripts/initDatabase.js you can run it with node
node scripts/initDatabase.js
```

3. Start the server

```powershell
set NODE_ENV=development; node server.js
```

4. Try the health/endpoints

GET http://localhost:3000/ should show the API home (if implemented). The users routes are under:

GET  /api/users       -> returns a small index of user endpoints
POST /api/users/register
POST /api/users/login
GET  /api/users/me    -> requires auth cookie

Adjust port with `PORT` env var.

## Run tests / validation

This project does not ship with a test suite by default. To validate basic startup you can require key modules from node:

```powershell
node -e "require('./config/database.js')"  # verifies db config loads without syntax errors
node -e "require('./routes/users.js')"     # verifies users routes load without syntax errors
```

## Deployment notes (Railway)

1. In Railway, create a new project and link your repository.
2. Add environment variables in the Railway project settings. The easiest option is to add `DATABASE_URL` provided by Railway (you'll see it in the plugin that provisions a Postgres database).
3. Add any other required secrets: `JWT_SECRET`, `FRONTEND_URL`, etc.
4. Railway will detect Node.js and run `npm install` and `npm start` (ensure `start` script exists in `package.json`). If your `package.json` doesn't have a `start` script, consider adding:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

5. If using a single `DATABASE_URL`, the app will use that and enable SSL appropriately. If you prefer to provide PGHOST/PGUSER/PPASSWORD instead, the code normalizes those names to `DB_*` equivalents.

Railway-specific tips

- Prefer the provided `DATABASE_URL` variable — it's simplest.
- If you see connection errors in production, check `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` to see if a deployment is rolling and the DB is being rotated. Inspect Railway logs.

## Troubleshooting

- 404 /api/users when deployed: Ensure your server is mounting the routes correctly and that the base path `/api` is configured. The project mounts routes in `routes/*.js` (for example `routes/users.js` provides handlers under `/api/users` when mounted properly in `server.js`).
- Database connection refused: verify `DATABASE_URL` or DB_HOST/DB_* values, ensure Postgres is running and accessible from your environment.
- SSL errors: set `DB_SSL=true` in env for non-URL mode or use a strict SSL toggle if you have a valid CA chain.
- Missing JWT_SECRET: the app requires `JWT_SECRET` to sign tokens. Without it, authentication will fail.

## Tech Stack

This backend is built with the following technologies:

- **Runtime:** Node.js
- **Web framework:** Express (`express`) for routing and HTTP handling
- **ORM / Database:** Sequelize (`sequelize`) with `pg`/`pg-hstore` for PostgreSQL (uses `JSONB` fields)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`)
- **Password hashing:** `bcrypt` / `bcryptjs`
- **File uploads:** `multer`
- **Real-time / sockets:** `socket.io`
- **Email & SMS:** `nodemailer` and `twilio` (plus project-specific services in `services/`)
- **Validation & security:** `express-validator`, `helmet`, `express-rate-limit`, `cors`
- **Utilities:** `dotenv`, `libphonenumber-js`
- **Dev tooling:** `nodemon` for local development

Example quick commands

```powershell
# install deps
npm install

# run dev (nodemon)
npm run dev

# run production
npm start
```

Environment variables (high level)

- `DATABASE_URL` (preferred on Railway) OR `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `PORT`, `NODE_ENV`, `FRONTEND_URL`, `DB_SSL` (optional)

If you'd like, I can add a short `README` subsection with explicit example `DATABASE_URL` formats and a `.env.example` file.

---
Generated on: 2025-11-15

```

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
# development
set NODE_ENV=development; node server.js

# or using nodemon if you have it installed
npx nodemon server.js
```

The API will be available at http://localhost:3000 by default (or a port set in your env).

## Environment variables (local & Railway)

The app supports two common deployment styles:

- A single `DATABASE_URL` (typical on Railway)
- Individual Postgres variables (DB_HOST/DB_USER/DB_NAME/DB_PASSWORD/DB_PORT) or provider names (PGHOST/PGUSER/PGDATABASE/PGPASSWORD/PGPORT or POSTGRES_*).

The code auto-normalizes the common variants so you can rely on either style.

Required environment variables (one of these sets must be present):

- Option A (single URL, recommended on Railway):
  - `DATABASE_URL`  (postgres://user:pass@host:port/dbname)

- Option B (individual values):
  - `DB_HOST` (or `PGHOST`)
  - `DB_USER` (or `PGUSER` / `POSTGRES_USER`)
  - `DB_NAME` (or `PGDATABASE` / `POSTGRES_DB`)
  - `DB_PASSWORD` (or `PGPASSWORD` / `POSTGRES_PASSWORD`) — optional if your DB has no password
  - `DB_PORT` (or `PGPORT`) — default 5432

Other recommended environment variables:

- `NODE_ENV` — `development` | `production` (affects logging and .env loading)
- `JWT_SECRET` — secret used to sign JWT tokens (required)
- `JWT_EXPIRES_IN` — token expiry string (e.g. `7d`, `1h`) (recommended)
- `FRONTEND_URL` — used when building reset password links (defaults to `http://localhost:3000`)
- `DB_SSL` — set to `true` to enable SSL in non-DATABASE_URL mode (defaults to enabled in production)

Railway-specific environment variables you might see (we handle them):

- `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` — mapped to DB_* equivalents
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — mapped to DB_* equivalents
- `RAILWAY_ENV`, `RAILWAY_STATIC_URL`, `RAILWAY_DEPLOYMENT_*` — informational, not required

Notes about SSL and hosted Postgres

- When `DATABASE_URL` is used (Railway/Heroku), the code enables SSL with `rejectUnauthorized: false` by default because many hosted providers use certificates that are not validated by a local CA bundle. If you need stricter verification, make this configurable via an env var (e.g. `DB_STRICT_SSL=true`) and remove `rejectUnauthorized: false`.

## Running locally

1. Prepare `.env` (example below):

```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=specicare
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

2. Create the database (Postgres) and run any initialization scripts (if present):

```powershell
# Example using psql - replace with your DB client
psql -U postgres -c "CREATE DATABASE specicare;"

# If there is an init script in scripts/initDatabase.js you can run it with node
node scripts/initDatabase.js
```

3. Start the server

```powershell
set NODE_ENV=development; node server.js
```

4. Try the health/endpoints

GET http://localhost:3000/ should show the API home (if implemented). The users routes are under:

GET  /api/users       -> returns a small index of user endpoints
POST /api/users/register
POST /api/users/login
GET  /api/users/me    -> requires auth cookie

Adjust port with `PORT` env var.

## Run tests / validation

This project does not ship with a test suite by default. To validate basic startup you can require key modules from node:

```powershell
node -e "require('./config/database.js')"  # verifies db config loads without syntax errors
node -e "require('./routes/users.js')"     # verifies users routes load without syntax errors
```

## Deployment notes (Railway)

1. In Railway, create a new project and link your repository.
2. Add environment variables in the Railway project settings. The easiest option is to add `DATABASE_URL` provided by Railway (you'll see it in the plugin that provisions a Postgres database).
3. Add any other required secrets: `JWT_SECRET`, `FRONTEND_URL`, etc.
4. Railway will detect Node.js and run `npm install` and `npm start` (ensure `start` script exists in `package.json`). If your `package.json` doesn't have a `start` script, consider adding:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

5. If using a single `DATABASE_URL`, the app will use that and enable SSL appropriately. If you prefer to provide PGHOST/PGUSER/PGPASSWORD instead, the code normalizes those names to `DB_*` equivalents.

Railway-specific tips

- Prefer the provided `DATABASE_URL` variable — it's simplest.
- If you see connection errors in production, check `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` to see if a deployment is rolling and the DB is being rotated. Inspect Railway logs.

## Troubleshooting

- 404 /api/users when deployed: Ensure your server is mounting the routes correctly and that the base path `/api` is configured. The project mounts routes in `routes/*.js` (for example `routes/users.js` provides handlers under `/api/users` when mounted properly in `server.js`).
- Database connection refused: verify `DATABASE_URL` or DB_HOST/DB_* values, ensure Postgres is running and accessible from your environment.
- SSL errors: set `DB_SSL=true` in env for non-URL mode or use a strict SSL toggle if you have a valid CA chain.
- Missing JWT_SECRET: the app requires `JWT_SECRET` to sign tokens. Without it, authentication will fail.

## Next steps / improvements

- Add a `.env.example` file with the minimal example variables (copy the block above).
- Add automated tests (Jest / Supertest) for API endpoints.
- Add a simple healthcheck endpoint (e.g., `GET /health`) and a basic Kubernetes/Platform readiness probe.
- Add CI pipeline to lint and run tests on PRs.

## Contact

If you need help configuring Railway or want me to add a `.env.example`, CI config, or tests, tell me which and I can add them.

---
Generated on: 2025-11-15
