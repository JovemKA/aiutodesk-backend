-- Adiciona suporte a arquivamento de conversas de chat
-- Fase 2: Histórico de Conversas + Arquivamento

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Índice composto para listagem eficiente (ativas e arquivadas por usuário)
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_archived
  ON chat_conversations (user_id, archived_at, last_message_at DESC NULLS LAST);
