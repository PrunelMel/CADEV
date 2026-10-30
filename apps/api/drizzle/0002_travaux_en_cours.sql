CREATE TABLE "problem_workers" (
	"problem_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_workers_problem_id_user_id_pk" PRIMARY KEY("problem_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "problem_workers" ADD CONSTRAINT "problem_workers_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_workers" ADD CONSTRAINT "problem_workers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;