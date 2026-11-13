-- Initialize ACME Compensation Hub Database
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create read-only role for AI Text-to-SQL execution isolation
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'acme_readonly') THEN
      CREATE ROLE acme_readonly LOGIN PASSWORD 'readonly_secret';
   END IF;
END
$do$;

-- Permissions for acme_readonly
GRANT CONNECT ON DATABASE acme_compensation TO acme_readonly;
GRANT USAGE ON SCHEMA public TO acme_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO acme_readonly;
ALTER ROLE acme_readonly SET statement_timeout = '3000ms';
