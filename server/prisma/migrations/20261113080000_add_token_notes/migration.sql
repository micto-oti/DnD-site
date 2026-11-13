-- CreateTable
CREATE TABLE "token_notes" (
    "id" UUID NOT NULL,
    "token_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "token_notes_token_id_author_id_updated_at_idx"
ON "token_notes"("token_id", "author_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "token_notes_author_id_idx" ON "token_notes"("author_id");

-- AddForeignKey
ALTER TABLE "token_notes" ADD CONSTRAINT "token_notes_token_id_fkey"
FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_notes" ADD CONSTRAINT "token_notes_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
