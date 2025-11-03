# System Overview

## Architecture

- **Framework:** NestJS (Node 20)
- **Database:** SQLite via Prisma ORM
- **Domain Modules:**
  - `catalog` – read-only Scryfall integration
  - `collection` – user-owned inventory, import/export
  - `alerts` – price watch automation, Scryfall polling
- **Shared Infrastructure:**
  - Prisma service (`shared/infra/prisma`)
  - Scryfall client with in-memory LRU cache (`shared/infra/http`)
  - Standardized error filter & DTO validation via Zod
- **Presentation Layer:** REST controllers under `modules/*/rest`

## Key Flows

1. **Catalog Search** → controller → query handler → repository → Scryfall client → mapper → DTO.
2. **Collection Mutations** → controller DTO validation → command (domain invariants) → Prisma repository → cache hydration (Scryfall `getById`).
3. **Import** → text parser → per-line Scryfall fuzzy lookup → collection command.
4. **Export** → repository bulk fetch → CSV/Moxfield formatter → streamed response.
5. **Price Watches** → baseline service ensures auto watches for every binder card; manual watches stored via Prisma. Scheduler (`PriceSpikeMonitorService`) polls Scryfall, compares against `lastPrice`, triggers notification gateway (Discord > email > logging).

## Notifications

- **Email:** Nodemailer transporter built from `SMTP_*` env vars.
- **Discord:** Simple webhook integration using `fetch`. Takes precedence when `DISCORD_WEBHOOK_URL` is defined.
- **Logging:** Always available fallback.

## Testing Strategy

- Unit tests for import parser, importer command, price monitor service.
- Integration/e2e tests using Nest testing module (`test/e2e/*`) with a copied SQLite database and mocked Scryfall client.
- Run via `npm test` (ts-jest) and `npm run build` for type-checks.

## Scripts

- `scripts/run-price-monitor.ts` – bootstraps the app and executes a single price spike check. Useful for manual simulations.

## Environment Variables

See `.env.example`.

Essential:
- `DATABASE_URL` – SQLite path (copied per test).
- `SCRYFALL_CACHE_TTL_MS` – in-memory cache TTL.
- `SMTP_*` – optional for email.
- `DISCORD_WEBHOOK_URL` – optional for Discord alerts.

## Future Work

- Frontend rewrite (current directory removed per plan).
- Expand integration tests (alerts scheduling, export content verification).
- Consider background job queue for spike processing when scaling.
- Add authentication if multi-user scope emerges.

