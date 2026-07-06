-- CreateTable
CREATE TABLE "ColorCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "rgbHex" TEXT NOT NULL,
    "labL" REAL NOT NULL,
    "labA" REAL NOT NULL,
    "labB" REAL NOT NULL,
    "source" TEXT,
    "isApproximate" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE INDEX "ColorCard_brand_idx" ON "ColorCard"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "ColorCard_brand_code_key" ON "ColorCard"("brand", "code");
