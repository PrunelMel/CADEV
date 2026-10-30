CREATE TYPE "public"."problem_status" AS ENUM('open', 'solved', 'closed');--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "status" "problem_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "task" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "languages" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "works_offline" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "target_hardware" text DEFAULT '' NOT NULL;