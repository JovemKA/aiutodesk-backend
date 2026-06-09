-- Migration: cria a tabela de mensagens (thread) dos tickets e adiciona o tipo de evento REPLY
-- Aplicar manualmente se TypeORM synchronize estiver desativado (DB_SYNC=false)

-- 1. Novo valor no enum de eventos (resposta pública na thread)
ALTER TYPE ticket_event_type_enum ADD VALUE IF NOT EXISTS 'REPLY';

-- 2. Tabela de mensagens da thread
CREATE TABLE IF NOT EXISTS ticket_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  body          text NOT NULL,
  internal_note boolean NOT NULL DEFAULT false,
  attachments   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages (ticket_id);

-- Validação
SELECT table_name FROM information_schema.tables
WHERE table_name = 'ticket_messages';
