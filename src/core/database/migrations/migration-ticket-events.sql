-- Migration: cria tabela de eventos de auditoria dos tickets e coluna score_confidence
-- Aplicar manualmente se TypeORM synchronize estiver desativado (DB_SYNC=false)

-- 1. Coluna score_confidence nos tickets (se ainda não aplicou migration-priority-score.sql)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS score_confidence varchar(6);

-- 2. Tabela de eventos
CREATE TYPE ticket_event_type_enum AS ENUM (
  'STATUS_CHANGE',
  'PRIORITY_CHANGE',
  'ASSIGNED',
  'NOTE'
);

CREATE TABLE IF NOT EXISTS ticket_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type        ticket_event_type_enum NOT NULL,
  actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_id ON ticket_events (ticket_id);

-- Validação
SELECT table_name FROM information_schema.tables
WHERE table_name = 'ticket_events';
