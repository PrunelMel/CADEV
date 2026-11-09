CREATE TYPE "public"."notification_kind" AS ENUM('problem_closed', 'problem_reopened');
--> statement-breakpoint
CREATE TYPE "public"."repo_stage" AS ENUM('under_construction', 'solution');
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"problem_id" uuid,
	"repo_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "featured_repo_id" uuid;
--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "problem_id" uuid;
--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "stage" "repo_stage" DEFAULT 'under_construction' NOT NULL;
--> statement-breakpoint
-- Chaque dépôt proposé comme solution est rattaché à son problème (la proposition acceptée
-- d'abord, sinon la plus ancienne) et passe au statut « solution ». Le résumé et les résultats
-- terrain de la proposition rejoignent la fin du README : la proposition disparaît, son texte non.
UPDATE "repositories" r SET
  "problem_id" = s."problem_id",
  "stage" = 'solution',
  "readme" = r."readme"
    || E'\n\n## Proposition de solution\n\n' || s."summary"
    || CASE WHEN s."field_results" <> '' THEN E'\n\n## Résultats terrain\n\n' || s."field_results" ELSE '' END
FROM (
  SELECT DISTINCT ON ("repo_id") "repo_id", "problem_id", "summary", "field_results"
  FROM "solutions"
  ORDER BY "repo_id", ("status" = 'accepted') DESC, "created_at"
) s
WHERE s."repo_id" = r."id";
--> statement-breakpoint
-- La solution acceptée devient la solution mise en avant par l'auteur du problème.
UPDATE "problems" p SET "featured_repo_id" = s."repo_id"
FROM (
  SELECT DISTINCT ON (so."problem_id") so."problem_id", so."repo_id"
  FROM "solutions" so JOIN "repositories" r ON r."id" = so."repo_id" AND r."problem_id" = so."problem_id"
  WHERE so."status" = 'accepted'
  ORDER BY so."problem_id", so."created_at"
) s
WHERE s."problem_id" = p."id";
--> statement-breakpoint
-- Un dépôt n'existe plus sans problème : ceux qui n'en ont pas sont supprimés, avec leurs discussions.
DELETE FROM "discussions" WHERE "target_type" = 'pull' AND "target_id" IN (
  SELECT pr."id" FROM "pull_requests" pr JOIN "repositories" r ON r."id" = pr."repo_id" WHERE r."problem_id" IS NULL
);
--> statement-breakpoint
DELETE FROM "discussions" WHERE "target_type" = 'repo' AND "target_id" IN (
  SELECT "id" FROM "repositories" WHERE "problem_id" IS NULL
);
--> statement-breakpoint
DELETE FROM "repositories" WHERE "problem_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "repositories" ALTER COLUMN "problem_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "solutions" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "validations" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP TABLE "solutions" CASCADE;
--> statement-breakpoint
DROP TABLE "validations" CASCADE;
--> statement-breakpoint
ALTER TABLE "contribution_reviews" DROP CONSTRAINT "contribution_reviews_decided_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "notifications" USING btree ("user_id","created_at");
--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_featured_repo_id_repositories_id_fk" FOREIGN KEY ("featured_repo_id") REFERENCES "public"."repositories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "repositories_problem_id_index" ON "repositories" USING btree ("problem_id");
--> statement-breakpoint
ALTER TABLE "contribution_reviews" DROP COLUMN "decision";
--> statement-breakpoint
ALTER TABLE "contribution_reviews" DROP COLUMN "decided_by";
--> statement-breakpoint
ALTER TABLE "contribution_reviews" DROP COLUMN "decided_at";
--> statement-breakpoint
ALTER TABLE "data_contributions" DROP COLUMN "status";
--> statement-breakpoint
DROP TYPE "public"."decision";
--> statement-breakpoint
DROP TYPE "public"."review_status";
--> statement-breakpoint
DROP TYPE "public"."validation_target";
