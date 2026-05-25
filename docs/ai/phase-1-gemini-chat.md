# Fase 1 - Chat com Gemini sem RAG

## Objetivo
Nesta etapa, o Chat deve usar Gemini apenas para responder às mensagens do usuário dentro do contexto do sistema AiutoDesk.

Ainda não entra RAG. A base de conhecimento fica para a fase seguinte, depois da estabilidade do chat.

## Decisão de Escopo
### O que entra agora
- integração do backend com Gemini
- resposta curta e objetiva para o chat
- tom de help desk profissional
- fallback para erro ou baixa confiança
- manutenção do fluxo de escalonamento para ticket quando necessário

### O que fica para depois
- busca vetorial
- recuperação de artigos da KB
- citation ranking
- contexto multi-documento
- memória longa baseada em histórico e embeddings

## Google AI Studio - Configuração Recomendada
### Modelo
- Modelo: `gemini-2.5-flash` (Gemini 2.5 Flash) para o chat principal
- usar `gemini-2.5-flash` no Google AI Studio, priorizando latência e custo

### Parâmetros
- Temperature: 0.2
- Top-p: 0.9
- Top-k: 40, se disponível
- Max output tokens: 256 a 384
- Candidate count: 1

### Safety
- manter os padrões de segurança ativos
- não relaxar proteções sem motivo operacional

### Response format
- texto curto no início da fase 1
- JSON somente se o backend realmente precisar estruturar melhor a resposta

## Prompt Base da Fase 1
### System prompt
Finalidade: fixar comportamento permanente.

Regras recomendadas:
- você é o assistente do AiutoDesk
- ajude com suporte, tickets e navegação do produto
- responda em português brasileiro
- seja curto, claro e profissional
- não invente políticas, preços, URLs ou integrações
- se faltar informação, diga que precisa de mais contexto
- se o caso parecer incidente ou pedido de atendimento humano, sugira escalonamento

### User prompt
Finalidade: conter apenas a pergunta atual do usuário.

### Contexto fixo curto
Finalidade: orientar o modelo sobre o domínio do produto sem gastar tokens.

Conteúdo sugerido:
- AiutoDesk é um help desk SaaS
- o sistema lida com tickets, usuários, departamentos, artigos e dashboards
- o chat serve para triagem e apoio ao usuário final

## Ajustes de Código Necessários
### 1. Criar um provider de IA no backend
- criar um service dedicado para Gemini
- esse service deve receber o `ConfigService`
- a API key deve ficar somente no backend via variável de ambiente

### 2. Centralizar configuração em `ConfigModule`
- adicionar `GEMINI_API_KEY`
- adicionar `GEMINI_MODEL`
- opcionalmente `GEMINI_TEMPERATURE` e `GEMINI_MAX_OUTPUT_TOKENS`

### 3. Manter `ChatService` como orquestrador
- `ChatService` decide fluxo, escalonamento e resposta
- o provider Gemini só gera a resposta final
- não colocar lógica de prompt diretamente no controller

### 4. Preservar fallback de negócio
- se o Gemini falhar, retornar resposta amigável
- se a mensagem indicar urgência, humano ou chamado, manter a abertura de ticket
- não depender de RAG nesta fase

### 5. Não expor chave no frontend
- o frontend só chama o backend
- nenhuma chave do Gemini deve existir em `environment.ts`

## Estrutura Recomendada de Resposta
Mesmo na fase 1, vale manter um contrato estável:
```json
{
  "answer": "...",
  "shouldEscalate": false,
  "conversationId": "...",
  "sources": []
}
```

Se houver escalonamento:
```json
{
  "answer": "...",
  "shouldEscalate": true,
  "escalatedTicketId": "...",
  "conversationId": "...",
  "sources": []
}
```

## Observações Práticas
- o primeiro sucesso aqui é o chat responder bem sem RAG
- a próxima evolução é injetar KB recuperada em poucos trechos
- o prompt deve continuar pequeno; a qualidade virá mais da orquestração que do tamanho do texto

## Convenções da Implementação Atual

### Organização dos prompts
Os prompts ficam separados em [src/modules/chat/prompts/](../../src/modules/chat/prompts/):
- `system-prompt.ts` — missão e regras permanentes do assistente
- `persona-prompt.ts` — tom e estilo (PT-BR, frases curtas, etc.)
- `product-context.ts` — contexto fixo do produto AiutoDesk
- `escalation-policy.ts` — quando escalar e o protocolo `[[META]]`
- `index.ts` — compõe `buildSystemInstruction({ hasHistory })` e expõe `parseLlmMeta`

### Histórico / multi-turno (fase 1 = vazio)
- O `ChatService` consulta `ConversationHistoryProvider.get(conversationId)` antes de chamar o Gemini.
- Nesta fase o provider sempre retorna `[]` — o chat é stateless por requisição.
- O sistema instruction só adiciona o bloco `[Histórico]` quando há turnos a usar.
- **Importante**: qualquer alteração que persista histórico (tabelas, cache em memória, sessão, etc.) precisa ser combinada antes de implementar. Persistência é assunto da fase 2 junto com RAG.

### Escalonamento híbrido
Dois sinais decidem escalar:
1. **Keywords pré-LLM** no `ChatService.hasEscalationHint` — ex.: "urgente", "preciso de humano", "abrir chamado". Quando bate, pula a chamada ao Gemini e abre o ticket direto.
2. **Sinal do LLM via tail-marker** — o modelo é instruído a terminar a resposta com a linha:
   ```
   [[META]]{"shouldEscalate":true,"reason":"<curto>"}[[/META]]
   ```
   apenas quando achar que deve escalar. O backend (`parseLlmMeta`) extrai o sinal, remove o bloco do texto exibido ao usuário e abre o ticket.

### Streaming SSE — contrato do `POST /chat/stream`
Resposta em `text/event-stream`. Eventos emitidos:
- `event: token` — `data: { "type":"token", "text":"..." }` — chunks do texto da resposta, já com `[[META]]` filtrado.
- `event: meta` — `data: { "type":"meta", "shouldEscalate":bool, "escalatedTicketId":"...", "conversationId":"..." }` — emitido uma vez ao final.
- `event: done` — fim do stream.
- `event: error` — erros inesperados, com `message`.

O endpoint `POST /chat/ask` continua disponível como fallback síncrono (mesmo contrato `ChatAnswer`).

### Variáveis de ambiente (backend `.env`)
```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TEMPERATURE=0.2
GEMINI_TOP_P=0.9
GEMINI_TOP_K=40
GEMINI_MAX_OUTPUT_TOKENS=384
GEMINI_REQUEST_TIMEOUT_MS=20000
```
Sem chave configurada, o serviço cai num fallback local — não quebra o app.
