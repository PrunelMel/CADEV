CREATE TYPE "public"."contribution_media_kind" AS ENUM('image', 'gif', 'audio', 'video');--> statement-breakpoint
CREATE TYPE "public"."contribution_review_verdict" AS ENUM('agree', 'correct');--> statement-breakpoint
CREATE TABLE "contribution_form_revisions" (
	"problem_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contribution_form_revisions_problem_id_revision_pk" PRIMARY KEY("problem_id","revision")
);
--> statement-breakpoint
CREATE TABLE "contribution_forms" (
	"problem_id" uuid PRIMARY KEY NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"code_draft" text,
	"code_published" text,
	"views_dirty" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"problem_id" uuid NOT NULL,
	"kind" "contribution_media_kind" NOT NULL,
	"name" text NOT NULL,
	"file" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contribution_resources_problem_id_kind_sha256_unique" UNIQUE("problem_id","kind","sha256")
);
--> statement-breakpoint
CREATE TABLE "contribution_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"block_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"field" text NOT NULL,
	"verdict" "contribution_review_verdict" NOT NULL,
	"proposed_value" jsonb,
	"comment" text DEFAULT '' NOT NULL,
	"reviewer_id" text,
	"form_revision" integer NOT NULL,
	"decision" "review_status" DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contribution_reviews_problem_id_submission_id_field_reviewer_id_unique" UNIQUE("problem_id","submission_id","field","reviewer_id")
);
--> statement-breakpoint
CREATE TABLE "contribution_submissions" (
	"problem_id" uuid NOT NULL,
	"id" text NOT NULL,
	"contributor_id" text,
	"form_revision" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"media" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contribution_submissions_problem_id_id_pk" PRIMARY KEY("problem_id","id")
);
--> statement-breakpoint
ALTER TABLE "contribution_form_revisions" ADD CONSTRAINT "contribution_form_revisions_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_forms" ADD CONSTRAINT "contribution_forms_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_resources" ADD CONSTRAINT "contribution_resources_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_reviews" ADD CONSTRAINT "contribution_reviews_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_reviews" ADD CONSTRAINT "contribution_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_reviews" ADD CONSTRAINT "contribution_reviews_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_submissions" ADD CONSTRAINT "contribution_submissions_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_submissions" ADD CONSTRAINT "contribution_submissions_contributor_id_users_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contribution_resources_problem_id_index" ON "contribution_resources" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "contribution_reviews_problem_id_index" ON "contribution_reviews" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "contribution_submissions_problem_id_created_at_index" ON "contribution_submissions" USING btree ("problem_id","created_at");