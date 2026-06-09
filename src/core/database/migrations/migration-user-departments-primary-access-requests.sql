-- Adds persisted primary department support and typed access requests.
-- Run this once against the PostgreSQL/Supabase database before deploying the updated code.

DO $$
BEGIN
    CREATE TYPE access_request_type_enum AS ENUM (
        'ROLE_CHANGE',
        'DEPARTMENT_INCLUSION',
        'PRIMARY_DEPARTMENT_CHANGE'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE user_departments
    ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY "userId"
            ORDER BY is_primary DESC, id ASC
        ) AS rn
    FROM user_departments
)
UPDATE user_departments ud
SET is_primary = ranked.rn = 1
FROM ranked
WHERE ud.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_departments_one_primary
    ON user_departments ("userId")
    WHERE is_primary;

ALTER TABLE access_requests
    ADD COLUMN IF NOT EXISTS type access_request_type_enum NOT NULL DEFAULT 'ROLE_CHANGE';

ALTER TABLE access_requests
    ALTER COLUMN requested_role DROP NOT NULL;

ALTER TABLE access_requests
    ADD COLUMN IF NOT EXISTS requested_department_id uuid NULL;

DO $$
BEGIN
    ALTER TABLE access_requests
        ADD CONSTRAINT fk_access_requests_requested_department
        FOREIGN KEY (requested_department_id)
        REFERENCES departments(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS ix_access_requests_type ON access_requests (type);
CREATE INDEX IF NOT EXISTS ix_access_requests_requested_department
    ON access_requests (requested_department_id);
