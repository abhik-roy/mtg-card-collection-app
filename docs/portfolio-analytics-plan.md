# Portfolio Analytics Enhancements Plan

## Objectives
- Surface richer market insights across the collection dashboard: trend chart with overlays, allocation pie with multiple metrics, heatmap breakdowns, movers tables, volatility/liquidity scores, and watchlist highlights.
- Expose supporting analytics data from the API in a single `GET /portfolio/summary` payload backed by Prisma models (`PriceSnapshot`, `PortfolioValueSnapshot`, `CardLiquiditySnapshot`, `PriceWatch`).
- Ensure collection rows reflect card-level trend direction/percentage derived from recent price history.
- Maintain a repeatable development cadence with automated tests after each milestone.

## Architecture Overview

### Backend (NestJS + Prisma)
- `PortfolioService` aggregates collection holdings (from `CollectionRepository.findAll`) with analytics tables.
- Trend data: combine per-card `PriceSnapshot`s plus `PortfolioValueSnapshot` history, generating value/cost basis/cash flow/benchmark overlays.
- Distributions & heatmaps: reuse `aggregateDistribution` helper to bucket holdings by set, finish, color, format, rarity; heatmaps built from predefined axes (format × color, rarity × finish).
- Movers: compute rolling returns (1/7/30-day windows) using price snapshots; attach direction indicators (`resolveTrendDirection`) for reuse in the UI.
- Volatility: calculate standard deviation on rolling windows (default 30 days) and enrich with liquidity metadata from `CardLiquiditySnapshot`.
- Watchlist: join `PriceWatch` subscriptions against holdings and recent prices, split into `upcoming` and `triggered`.
- Output cached via `PortfolioSummary` DTO consumed by controller.

### Frontend (React + Recharts)
- `PortfolioDashboard` component renders:
  - Trend area chart with overlaid cost basis & benchmark lines.
  - Distribution pie (set/finish/color/format/rarity) with metric toggle (value/quantity/average price).
  - Heatmap toggle (format×color, rarity×finish) with metric toggle (value/quantity).
  - Movers table with timeframe switch (daily/weekly/monthly).
  - Volatility list with classification badges and sparkline.
  - Watchlist grid highlighting approaching/triggered alerts.
- Collection table consumes `trendIndicators` to display inline trend badges.
- Shared formatting helpers in `shared/utils/format.ts`.

## Implementation Roadmap

1. **Backend validation**
   - [ ] Add targeted unit tests for helpers (`aggregateDistribution`, volatility classifier, trend indicator).
   - [ ] Extend e2e coverage if required (seed additional snapshots for edge cases).
   - **Tests:** `npm run test --prefix apps/api`.

2. **Frontend modularisation & resiliency**
   - [ ] Extract `PortfolioDashboard` into dedicated component directory (`features/portfolio`).
   - [ ] Guard trend chart against empty series and display placeholder state.
   - [ ] Improve responsive layout for watchlist & heatmap sections (≤640px).
   - [ ] Surface trend percentage via `formatPercent` helper everywhere.
   - **Tests:** `npm run build --prefix apps/web` (compiles `tsc` + Vite).

3. **Integration pass**
   - [ ] Manually verify trend badges within collection table using seeded data.
   - [ ] Document analytics usage (README snippet or dedicated guide if needed).
   - **Tests:** rerun both suites above.

## Risks & Mitigations
- **Sparse price history:** default to last known unit price and mark trend as `FLAT` when history < 2 points.
- **Large collections:** heatmap/distribution aggregations run in-memory; consider pagination or streaming if dataset grows (future work).
- **Watchlist spam:** clamp progress percentage and cap triggered list at 10 items.

## Deliverables
- Updated backend tests covering analytics helpers.
- Refactored frontend files under `apps/web/src/features/portfolio/`.
- Passing API unit/e2e and web build steps run after each milestone.
- Documentation summarising the analytics stack.
