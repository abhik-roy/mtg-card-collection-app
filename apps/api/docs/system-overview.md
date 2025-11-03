# System Overview

## Architecture

- **Framework:** NestJS (Node 20)
- **Database:** PostgreSQL via Prisma ORM
- **Domain Modules:**
  - `catalog` – read-only Scryfall integration
  - `collection` – user-owned inventory, import/export
  - `alerts` – price watch automation, Scryfall polling
  - `auth` – JWT issuance/validation and user provisioning
  - `decks` – decklist CRUD and collection comparison
- **Shared Infrastructure:**
  - Prisma service (`shared/infra/prisma`)
  - Scryfall client with in-memory LRU cache (`shared/infra/http`)
  - Standardized error filter & DTO validation via Zod
  - Global Helmet middleware + configurable CORS allowlist
  - Throttler guard enforcing rate limits (defaults: 60 req/min)
- **Presentation Layer:** REST controllers under `modules/*/rest`

## Key Flows

1. **Authentication** → controller → auth service (bcrypt hashing + Prisma) → JWT issued via `@nestjs/jwt`.
2. **Catalog Search** → controller → query handler → repository → Scryfall client → mapper → DTO.
3. **Collection Mutations** → controller DTO validation → command (domain invariants) → Prisma repository → cache hydration (Scryfall `getById`).
4. **Import** → text parser → per-line Scryfall fuzzy lookup → collection command.
5. **Export** → repository bulk fetch → CSV/Moxfield formatter → streamed response.
6. **Price Watches** → baseline service ensures auto watches for every binder card; manual watches stored via Prisma. Scheduler (`PriceSpikeMonitorService`) polls Scryfall, compares against `lastPrice`, triggers notification gateway (Discord > email > logging).
7. **Deck Comparison** → controller → decks service (Prisma) → collection aggregate query → diff summary returned per board.

## Notifications

- **Email:** Nodemailer transporter built from `SMTP_*` env vars.
- **Discord:** Simple webhook integration using `fetch`. Takes precedence when `DISCORD_WEBHOOK_URL` is defined.
- **Logging:** Always available fallback.

## Testing Strategy

- Unit tests for import parser, importer command, price monitor service.
- Integration/e2e tests using Nest testing module (`test/e2e/*`) against an ephemeral PostgreSQL database and mocked Scryfall client.
- Run via `npm test` (ts-jest) and `npm run build` for type-checks.

## Scripts

- `scripts/run-price-monitor.ts` – bootstraps the app and executes a single price spike check. Useful for manual simulations.

## Environment Variables

See `.env.example`.

Essential:
- `DATABASE_URL` – PostgreSQL connection URL (`postgresql://user:pass@host:5432/db`).
- `SCRYFALL_CACHE_TTL_MS` – in-memory cache TTL.
- `JWT_SECRET` – signing key for API tokens.
- `JWT_EXPIRES_IN` – token lifetime (e.g. `1h`).
- `BCRYPT_SALT_ROUNDS` – hashing cost (lowered to 4 in tests).
- `SMTP_*` – optional for email.
- `DISCORD_WEBHOOK_URL` – optional for Discord alerts.

## Future Work

- Frontend rewrite (current directory removed per plan).
- Expand integration tests (alerts scheduling, export content verification).
- Consider background job queue for spike processing when scaling.
- Flesh out deck analytics (hand smoothing, archetype tags).
- Extend auth to support refresh tokens and OAuth providers.
