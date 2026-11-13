/*
  Warnings:

  - Added the required column `updated_at` to the `tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tokens" ADD COLUMN     "experience" INTEGER,
ADD COLUMN     "is_main" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_online" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "tokens_owner_id_idx" ON "tokens"("owner_id");
