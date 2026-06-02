-- Migration: adiciona score de prioridade da IA aos tickets
-- Aplicar manualmente se TypeORM synchronize estiver desativado (DB_SYNC=false)

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS priority_score  integer,
  ADD COLUMN IF NOT EXISTS priority_reason text;

-- Validação: checar que as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
  AND column_name IN ('priority_score', 'priority_reason');
