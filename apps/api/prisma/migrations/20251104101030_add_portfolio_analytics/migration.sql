-- AlterTable
ALTER TABLE "CatalogCache" ADD COLUMN     "colorIdentity" TEXT,
ADD COLUMN     "formats" JSONB,
ADD COLUMN     "manaValue" DOUBLE PRECISION,
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "setType" TEXT,
ADD COLUMN     "typeLine" TEXT;

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "cardId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "usd" DOUBLE PRECISION,
    "usdFoil" DOUBLE PRECISION,
    "listingsCount" INTEGER,
    "buylistPrice" DOUBLE PRECISION,
    "demandScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("cardId","asOfDate")
);

-- CreateTable
CREATE TABLE "PortfolioValueSnapshot" (
    "userId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "costBasis" DOUBLE PRECISION NOT NULL,
    "cashIn" DOUBLE PRECISION,
    "cashOut" DOUBLE PRECISION,
    "benchmarkValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioValueSnapshot_pkey" PRIMARY KEY ("userId","asOfDate")
);

-- CreateTable
CREATE TABLE "CardLiquiditySnapshot" (
    "cardId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "listingsCount" INTEGER NOT NULL,
    "buylistCount" INTEGER,
    "buylistHigh" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardLiquiditySnapshot_pkey" PRIMARY KEY ("cardId","asOfDate")
);

-- CreateIndex
CREATE INDEX "PriceSnapshot_asOfDate_idx" ON "PriceSnapshot"("asOfDate");

-- CreateIndex
CREATE INDEX "PortfolioValueSnapshot_asOfDate_idx" ON "PortfolioValueSnapshot"("asOfDate");

-- CreateIndex
CREATE INDEX "CardLiquiditySnapshot_asOfDate_idx" ON "CardLiquiditySnapshot"("asOfDate");

-- AddForeignKey
ALTER TABLE "PortfolioValueSnapshot" ADD CONSTRAINT "PortfolioValueSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
