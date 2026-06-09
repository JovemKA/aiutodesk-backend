# Migrations (SQL manual)

Estas migrations são aplicadas **manualmente** no PostgreSQL/Supabase (SQL Editor ou `psql`),
pois o projeto roda com `synchronize` desativado (`DB_SYNC=false`). Não há runner automático —
o `DatabaseService` apenas conecta; ele não executa estes arquivos.

## Ordem de aplicação

Algumas migrations dependem de outras (FKs, extensão, `ALTER TYPE`). Aplique nesta ordem:

1. `migration-pgvector-kb-embeddings.sql` — extensão `vector` + `kb_article_chunks` (RAG da KB).
2. `migration-user-departments-primary-access-requests.sql` — vínculos usuário↔departamento e access requests.
3. `migration-priority-score.sql` — colunas de score de prioridade no ticket.
4. `migration-chat-conversation-archived.sql` — arquivamento de conversas do chat.
5. `migration-ticket-events.sql` — enum `ticket_event_type_enum` + tabela `ticket_events`.
6. `migration-ticket-messages.sql` — tabela `ticket_messages` + valor `REPLY` no enum (requer a #5).
7. `migration-ticket-comment-embeddings.sql` — `ticket_comment_chunks` (requer `vector` da #1 e `ticket_messages` da #6).

> Todas usam `IF NOT EXISTS` / `ADD VALUE IF NOT EXISTS` quando possível, então reaplicar é seguro.

## Seeds

O arquivo de seed da Base de Conhecimento (`seed-kb-articles.sql`) **não** é uma migration e vive
na raiz do backend. Para popular/indexar a KB de forma programática, prefira os scripts
`npm run seed:articles` e `npm run reindex:articles`.
