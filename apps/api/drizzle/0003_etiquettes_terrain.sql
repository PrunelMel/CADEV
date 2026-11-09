-- Contraintes terrain : texte libre séparé par des virgules vers une liste d'étiquettes.
ALTER TABLE "problems" ALTER COLUMN "connectivity_constraint" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "connectivity_constraint" SET DATA TYPE text[] USING CASE WHEN btrim("connectivity_constraint") = '' THEN '{}'::text[] ELSE regexp_split_to_array(btrim("connectivity_constraint"), '\s*,\s*') END;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "connectivity_constraint" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "hardware_constraint" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "hardware_constraint" SET DATA TYPE text[] USING CASE WHEN btrim("hardware_constraint") = '' THEN '{}'::text[] ELSE regexp_split_to_array(btrim("hardware_constraint"), '\s*,\s*') END;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "hardware_constraint" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "language_constraint" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "language_constraint" SET DATA TYPE text[] USING CASE WHEN btrim("language_constraint") = '' THEN '{}'::text[] ELSE regexp_split_to_array(btrim("language_constraint"), '\s*,\s*') END;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "language_constraint" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "evaluation_criteria" SET DEFAULT '';
