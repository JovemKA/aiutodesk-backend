-- Tabela de chunks vetorizados de COMENTÁRIOS PÚBLICOS de chamados (RAG escopado por chamado).
-- Carrega proveniência (ticket_id) e escopo (department_id/category_id) para isolamento no SQL.
-- Notas internas (internal_note=true) NUNCA são indexadas aqui.
-- Aplicar manualmente no Supabase (SQL Editor) ou via psql. Requer a extensão pgvector (migration-pgvector-kb-embeddings.sql).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ticket_comment_chunks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id      uuid NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
    ticket_id       uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    department_id   uuid,
    category_id     uuid,
    chunk_index     int  NOT NULL,
    content         text NOT NULL,
    token_count     int  NOT NULL,
    embedding       vector(768) NOT NULL,
    embedding_model varchar(64) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_ticket_comment_chunk_idx UNIQUE (comment_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_ticket_comment_chunks_comment_id
    ON ticket_comment_chunks (comment_id);

CREATE INDEX IF NOT EXISTS idx_ticket_comment_chunks_ticket_id
    ON ticket_comment_chunks (ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_comment_chunks_department_id
    ON ticket_comment_chunks (department_id);

CREATE INDEX IF NOT EXISTS idx_ticket_comment_chunks_embedding_hnsw
    ON ticket_comment_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Validação
SELECT table_name FROM information_schema.tables
WHERE table_name = 'ticket_comment_chunks';
