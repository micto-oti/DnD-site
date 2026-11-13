-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#3498db',
ADD COLUMN     "experience" INTEGER,
ADD COLUMN     "hp_current" INTEGER,
ADD COLUMN     "hp_max" INTEGER,
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "size" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "sp_current" INTEGER,
ADD COLUMN     "sp_max" INTEGER;

-- AlterTable
ALTER TABLE "tokens" ADD COLUMN     "asset_id" UUID;

-- CreateIndex
CREATE INDEX "tokens_asset_id_idx" ON "tokens"("asset_id");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
