-- Extensão pgvector e tabela de chunks vetorizados dos artigos da KB.
-- Aplicar manualmente no Supabase (SQL Editor) ou via psql.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS kb_article_chunks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      uuid NOT NULL REFERENCES "KBArticles"(id) ON DELETE CASCADE,
    chunk_index     int  NOT NULL,
    content         text NOT NULL,
    token_count     int  NOT NULL,
    embedding       vector(768) NOT NULL,
    embedding_model varchar(64) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_article_chunk_idx UNIQUE (article_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_kb_article_chunks_article_id
    ON kb_article_chunks (article_id);

CREATE INDEX IF NOT EXISTS idx_kb_article_chunks_embedding_hnsw
    ON kb_article_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
