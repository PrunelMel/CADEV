ALTER TABLE "problems" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "problems" SET "closed_at" = "updated_at" WHERE "status" = 'closed';
