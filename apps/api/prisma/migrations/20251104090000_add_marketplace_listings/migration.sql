-- CreateEnum
CREATE TYPE "MarketplaceListingType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MarketplaceListingType" NOT NULL,
    "cardId" TEXT,
    "cardName" TEXT NOT NULL,
    "setCode" TEXT,
    "condition" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceListing_type_idx" ON "MarketplaceListing"("type");

-- CreateIndex
CREATE INDEX "MarketplaceListing_cardName_idx" ON "MarketplaceListing"("cardName");

-- CreateIndex
CREATE INDEX "MarketplaceListing_setCode_idx" ON "MarketplaceListing"("setCode");

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
