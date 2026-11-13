CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"department" varchar(50) NOT NULL,
	"level" varchar(10) NOT NULL,
	"country" char(2) NOT NULL,
	"local_currency" char(3) NOT NULL,
	"local_base_salary" numeric(14, 2) NOT NULL,
	"local_bonus_target" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"base_salary_usd" numeric(14, 2) NOT NULL,
	"bonus_target_usd" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"employment_status" varchar(20) DEFAULT 'active' NOT NULL,
	"hire_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"currency_code" char(3) PRIMARY KEY NOT NULL,
	"rate_to_usd" numeric(12, 6) NOT NULL,
	"effective_date" date NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_employees_dept_level_salary" ON "employees" USING btree ("department","level","base_salary_usd" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_employees_country_salary" ON "employees" USING btree ("country","base_salary_usd" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_employees_status_hire_date" ON "employees" USING btree ("employment_status","hire_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_employees_search_trgm" ON "employees" USING gin ("full_name" gin_trgm_ops, "email" gin_trgm_ops);