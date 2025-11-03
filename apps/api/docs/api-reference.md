# MTG Collection API Reference

Base URL: `http://localhost:8080/api`

All responses are JSON unless noted. Status codes follow standard REST conventions (2xx success, 4xx client error, 5xx server error). Errors follow the shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description",
    "details": {}
  }
}
```

Authenticated endpoints require `Authorization: Bearer <accessToken>`.

## Auth

### `POST /auth/register`
Creates a user account and returns an access token.

**Body**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response**
```json
{
  "accessToken": "jwt",
  "user": { "id": "user-id", "email": "user@example.com" }
}
```

### `POST /auth/login`
Authenticates an existing user. Body/response matches register.

### `GET /auth/me`
Returns the authenticated profile.

**Response**
```json
{
  "user": { "id": "user-id", "email": "user@example.com" }
}
```

## Catalog

### `GET /catalog/search`
Searches the Scryfall catalog by name prefix.

| Query | Type | Description |
|-------|------|-------------|
| `q` | string (required) | Prefix or fuzzy query (e.g. `light`) |
| `page` | number (optional, default 1) | Pagination page |
| `pageSize` | number (optional, default 24) | Results per page |

**Response**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Lightning Bolt",
      "set": "2ED",
      "collector_number": "150",
      "lang": "en",
      "rarity": "common",
      "image_uris": {"small": "...", "normal": "..."},
      "prices": {"usd": 3.25, "usd_foil": 9.5}
    }
  ],
  "total": 240,
  "has_more": true
}
```

### `GET /catalog/:id`
Fetches a single printing by Scryfall UUID. Returns the same structure as a single search item.

## Collection

### `GET /collection`
Lists collection entries with catalog data.

| Query | Type | Description |
|-------|------|-------------|
| `q` | string | Filter by name substring (case-insensitive) |
| `set` | string | Filter by set code |
| `page` | number (default 1) |
| `pageSize` | number (default 24, max 100) |

**Response**
```json
{
  "items": [
    {
      "id": "entry-id",
      "cardId": "scryfall-uuid",
      "quantity": 3,
      "finish": "FOIL",
      "condition": "NM",
      "language": "en",
      "location": "Binder",
      "name": "Lightning Bolt",
      "setCode": "2ED",
      "collectorNumber": "150",
      "imageSmall": "https://...",
      "usd": 3.25,
      "usdFoil": 9.5
    }
  ],
  "page": 1,
  "pageSize": 24,
  "total": 12
}
```

### `POST /collection`
Adds an entry to the collection.

**Body**
```json
{
  "cardId": "scryfall-uuid",
  "quantity": 2,
  "finish": "NONFOIL",
  "condition": "NM",
  "language": "en",
  "location": "Binder A",
  "acquiredPrice": 3.0,
  "acquiredDate": "2024-11-03",
  "notes": "Signed"
}
```

Returns `{ "id": "entry-id" }` with status 201. Quantities must be ≥ 1; finish/condition must be valid enums.

### `PATCH /collection/:id`
Partial update of an entry. Same fields as POST but all optional. Returns `{ "ok": true }`.

### `DELETE /collection/:id`
Removes the entry. Returns `{ "ok": true }`.

### `GET /collection/export`
Exports the collection.

| Query | Type | Description |
|-------|------|-------------|
| `format` | `csv` or `moxfield` (default `csv`) |
| `includePrices` | boolean (optional) |

Responds with a downloadable file (`text/csv` or `text/plain`).

### `POST /collection/import`
Bulk-imports entries from pasted text.

**Body**
```json
{
  "payload": "4 Lightning Bolt\n1 Lose Focus (mh2) 75",
  "format": "auto" // optional: auto, moxfield, plain
}
```

**Response**
```json
{
  "imported": 2,
  "failures": []
}
```

Each line supports basic Moxfield syntax (`qty Name (SET) number [FINISH] {CONDITION} <language> @location`). The importer performs fuzzy lookup via Scryfall.

## Alerts

### `GET /alerts`
Lists price watches. When invoked, the server ensures baseline watches exist for every collection entry (100% spike, plus 30% spike for cards priced above $2).

**Response**
```json
{
  "items": [
    {
      "id": "watch-id",
      "cardId": "scryfall-uuid",
      "direction": "UP",
      "priceType": "USD",
      "thresholdPercent": 30,
      "contact": "auto@local",
      "lastPrice": 1.23,
      "lastNotifiedAt": null,
      "createdAt": "2025-11-03T07:00:00.000Z",
      "updatedAt": "2025-11-03T07:00:00.000Z"
    }
  ]
}
```

`contact = auto@local` indicates an automatically managed baseline watch.

### `POST /alerts`
Creates a manual watch.

**Body**
```json
{
  "cardId": "scryfall-uuid",
  "thresholdPercent": 20,
  "direction": "UP", // or DOWN
  "priceType": "USD",
  "contact": "user@example.com" // email or webhook identifier
}
```

Returns `{ "id": "watch-id" }`.

### `DELETE /alerts/:id`
Deletes a manual watch (auto watches will remain). Accepts cuid/uuid IDs.

## Decks

### `POST /decks`
Creates a decklist for the authenticated user.

**Body**
```json
{
  "name": "Izzet Tempo",
  "format": "Modern",
  "description": "League testing list",
  "cards": [
    { "cardId": "stormchaser-talent-001", "quantity": 4, "board": "MAIN" },
    { "cardId": "lose-focus-001", "quantity": 2, "board": "SIDE" }
  ]
}
```

**Response** – deck object with generated card entry IDs.

### `GET /decks`
Lists decks for the current user: `{ "items": [ deck, ... ] }`.

### `GET /decks/:id`
Returns the deck with its cards.

### `PATCH /decks/:id`
Updates deck metadata and optionally replaces the card list. Use `null` to clear optional fields.

### `DELETE /decks/:id`
Deletes a deck.

### `GET /decks/:id/compare`
Returns a diff between deck requirements and the user’s collection.

**Response**
```json
{
  "deck": { "id": "deck-id", "name": "Izzet Tempo" },
  "main": [
    { "cardId": "stormchaser-talent-001", "required": 3, "owned": 2, "missing": 1 }
  ],
  "side": []
}
```

## Notifications

- **Email:** Enabled when `SMTP_*` env vars are provided. Uses Nodemailer.
- **Discord:** Enabled when `DISCORD_WEBHOOK_URL` is set. Discord takes precedence over email; logging is the final fallback.

## Health / Admin

No dedicated health endpoint yet. Run scheduled price checks manually via `npx ts-node scripts/run-price-monitor.ts`.
