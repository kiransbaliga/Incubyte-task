CREATE TABLE "salary_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"local_base_salary" numeric(14, 2) NOT NULL,
	"local_bonus_target" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"local_currency" char(3) NOT NULL,
	"fx_rate_snapshot" numeric(12, 6) NOT NULL,
	"base_salary_usd" numeric(14, 2) NOT NULL,
	"bonus_target_usd" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"reason" varchar(255) DEFAULT 'Initial Calibration' NOT NULL,
	"changed_by" varchar(255) DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_salary_revisions_emp_dates" ON "salary_revisions" USING btree ("employee_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_salary_revisions_timeline" ON "salary_revisions" USING btree ("effective_from","effective_to");