# Testing Guide

The MTG Collection API ships with a comprehensive Jest test suite that covers
domain logic, infrastructure adapters, and REST flows. Tests are organised into
two layers:

- **Unit tests** (`apps/api/test/unit`) exercise pure domain code and framework
  integrations in isolation using mocks.
- **End-to-end tests** (`apps/api/test/e2e`) boot a full Nest application with an
  ephemeral PostgreSQL database (created per suite) and a fake Scryfall client to
  verify HTTP contracts.

## Running the suite

```bash
npm test --prefix apps/api
```

To run the API locally in a production-like container:

```bash
docker compose up --build
```

Ensure a PostgreSQL instance is available (the provided compose stack exposes one on
`localhost:5432`). Update `DATABASE_URL` as needed for production deployments.

The Jest configuration automatically transpiles TypeScript via `ts-jest`. The
e2e harness provisions a dedicated PostgreSQL database per suite (using the
connection string from `DATABASE_URL`) and tears it down after tests finish.
Run `docker compose up db -d` before running the suite locally, or point to an
existing Postgres instance.

## Coverage highlights

- **Auth:** registration/login flows and JWT-protected profile checks are
  exercised end-to-end with bcrypt + Prisma integration.
- **Decks:** CRUD operations and collection diffing logic have e2e coverage,
  verifying deck updates and comparison summaries.
- **Shared infrastructure:** `LruCache` eviction, Scryfall client caching and
  retry logic, environment validation, and the global problem-details filter now
  have direct unit coverage.
- **Collection domain:** entity invariants, update command normalisation, import
  parser, exporter formats, and Prisma-backed flows are exercised through both
  unit and e2e suites.
- **Alerts domain:** baseline watch generation, manual CRUD flows, validation,
  and price spike monitoring behaviour are covered end-to-end.
- **REST layer:** e2e tests validate happy paths and bad inputs for catalog
  search/lookup, collection CRUD/import/export, decks, and alerts operations,
  ensuring the API emits consistent problem responses.

## Authoring new tests

- Place domain or service unit tests alongside the existing folders under
  `test/unit/**`. Prefer mocking external interfaces (Prisma, Scryfall) and
  assert on observable side effects.
- For new HTTP contracts, add supertest-based suites under `test/e2e`. Reuse
  `createTestApp` to obtain an application instance and fake Scryfall client.
- Keep assertions focused on behaviour (status codes, payload shape, domain
  state) instead of implementation details.

Run `npm run build --prefix apps/api` before committing to verify type safety.
