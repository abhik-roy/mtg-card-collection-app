# Codex Context Packet

Use this document as seed context when spinning up a coding assistant for the MTG Collection project.

## Repository Layout

```
apps/
  api/
    src/
      app.module.ts            # Wires Config, Catalog, Collection, Alerts modules
      config/env.validation.ts # Zod-based env validation
      shared/
        domain/core            # Entity/Result patterns
        infra/
          cache/lru.cache.ts   # In-memory cache used by Scryfall client
          http/scryfall.client.ts
          prisma/prisma.service.ts
          presentation/problem.filter.ts
      modules/
        catalog/               # Read-only search
        collection/            # Binder domain, import/export
        alerts/                # Price watches, scheduled monitor
    prisma/
      schema.prisma
      migrations/
    scripts/
      run-price-monitor.ts     # Manually trigger price check
    test/
      unit/
      e2e/
      utils/
    docs/
      api-reference.md
      system-overview.md
      codex-context.md (this file)
```

The old frontend (`apps/web`) has been removed pending a rewrite.

## External Integrations

- **Scryfall API** via `undici` requests (search, name lookup, by-id).
- **Prisma** with SQLite (file-based) storage.
- **Notifications**
  - Discord webhook (preferred when `DISCORD_WEBHOOK_URL` is set).
  - Nodemailer SMTP (fallback when configured).
  - Logging (final fallback).

## Testing

- `npm test` runs ts-jest suites (unit + e2e). E2E harness copies `dev.sqlite` per test and overrides `ScryfallClient` with a deterministic mock.
- `npm run build` compiles TypeScript to ensure type safety.

## Common Commands

```bash
# Install deps
npm install --prefix apps/api

# Run tests
npm test --prefix apps/api

# Type-check
npm run build --prefix apps/api

# Manually trigger price spike evaluation
npx ts-node scripts/run-price-monitor.ts --prefix apps/api
```

## Key Environment Variables

See `.env.example`. At minimum set:
- `DATABASE_URL="file:./dev.sqlite"`
- Optional `DISCORD_WEBHOOK_URL`, `SMTP_*` for notifications.

## Implementation Notes

- Controllers perform DTO validation using `nestjs-zod`.
- Domain entities (`collection/domain/entities/collection-entry.ts`) guard business invariants (quantity ≥ 0, enum checks).
- `collection/importers/collection.importer.ts` parses Moxfield/plain text lines.
- Alerts baseline service auto-generates watches (`auto@local`) for every collection entry.
- Exporters (`collection/app/exporters/collection.exporter.ts`) support CSV and Moxfield formats.

## Outstanding Work

- Build new decoupled frontend.
- Expand price monitor scheduling (currently cron every hour).
- Metrics/logging for notification delivery.
- Additional test coverage for error conditions (invalid import lines, Scryfall failures, etc.).

