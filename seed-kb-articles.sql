-- Seed dos 12 artigos da KB (espelha src/scripts/seed-articles.ts).
-- Idempotente: ON CONFLICT (slug) DO NOTHING.
-- Apos rodar, execute `npm run reindex:articles` para gerar os embeddings.

INSERT INTO "KBArticles" (
    id, title, slug, summary, content, tags, is_published,
    view_count, helpful_count, not_helpful_count, created_at, updated_at
) VALUES
(
    gen_random_uuid(),
    'Como redefinir sua senha',
    'como-redefinir-sua-senha',
    $sum$Recupere o acesso com um passo a passo rapido.$sum$,
    $body$## Quando usar

Você esqueceu sua senha de acesso ao AiutoDesk e quer resetar sem abrir um chamado.

## Passo a passo

1. Acesse a tela de **Login** do AiutoDesk.
2. Clique em **Esqueci minha senha** abaixo do botão Entrar.
3. Informe seu e-mail corporativo e clique em **Enviar**.
4. Verifique sua caixa de entrada (e a pasta de spam) por um e-mail com o link de redefinição.
5. Clique no link e cadastre uma nova senha com no mínimo 8 caracteres, contendo letra e número.

## Dicas de segurança

- Use uma senha exclusiva para cada sistema.
- Considere usar um gerenciador de senhas (1Password, Bitwarden, KeePass).
- Habilite o 2FA em **Perfil → Segurança**.

## Não funcionou?

Se o link de redefinição não chegar em até 5 minutos, verifique:

- O domínio do seu e-mail está registrado como corporativo (terminação @empresa.com.br).
- Sua conta não está bloqueada (após 5 tentativas erradas).

Caso o problema persista, abra um chamado na categoria **Acesso**.$body$,
    'senha,acesso,autenticacao',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Configurando VPN no Windows',
    'configurando-vpn-no-windows',
    $sum$Guia simples para configurar VPN corporativa no Windows.$sum$,
    $body$## Pré-requisitos

- Notebook corporativo com Windows 10 ou 11.
- Permissão de instalação (peça ao administrador se não tiver).
- Certificado digital instalado em **Certificados Pessoais**.

## Instalação

1. Baixe o instalador da VPN no portal de software interno.
2. Execute como administrador.
3. Ao final, abra o **AiutoDesk VPN Client**.

## Configuração

| Campo | Valor |
|---|---|
| Servidor | vpn.empresa.com.br |
| Tipo de autenticação | Certificado + Senha |
| Domínio | empresa.local |

## Conectando

Insira seu usuário de domínio e clique em **Conectar**. Caso o status fique "Verificando credenciais" por mais de 30 segundos, reinicie o cliente e tente novamente.

## Erros comuns

- **credentials rejected**: senha de domínio expirada — troque pela rede local primeiro.
- **certificate not found**: o certificado digital não está instalado no usuário correto.
- **timeout**: você pode estar atrás de um proxy não compatível com a VPN.$body$,
    'vpn,windows,rede',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Politica de ferias',
    'politica-de-ferias',
    $sum$Resumo das regras e prazos para solicitar ferias.$sum$,
    $body$A política de férias define o período aquisitivo e concessivo, critérios para agendamento e regras para acumulação.

- Período aquisitivo: 12 meses após contratação.
- Concessão: depende da operação da equipe e aprovação do gestor.
- Solicitação: abra um pedido no portal de RH com antecedência mínima de 30 dias.

Para casos excepcionais, contate RH diretamente.$body$,
    'rh,ferias',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Conexao Wi-Fi corporativa',
    'conexao-wi-fi-corporativa',
    $sum$Como se conectar ao Wi-Fi corporativo com seguranca.$sum$,
    $body$## Como conectar-se

1. Abra a lista de redes Wi‑Fi no seu dispositivo e selecione o SSID corporativo.
2. Escolha o método de autenticação **WPA2-Enterprise** com EAP.
3. Informe seu usuário de domínio e senha ou selecione o certificado pessoal quando solicitado.

## Certificados

Se sua empresa usa certificados, instale-os em **Certificados Pessoais** antes de conectar. Caso tenha problemas, verifique se o horário do dispositivo está correto (sincronize com NTP).$body$,
    'wifi,rede',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Solicitacao de equipamento',
    'solicitacao-de-equipamento',
    $sum$Procedimento para solicitar equipamentos de TI.$sum$,
    $body$1. Acesse o portal administrativo → Solicitar equipamentos.
2. Selecione o tipo de equipamento e justifique a necessidade.
3. Aguarde aprovação do gestor e do setor de TI.
4. Após aprovação, acompanhe o status na mesma página.

Equipamentos padrão ficam sujeitos à disponibilidade de estoque.$body$,
    'equipamentos,ti',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Como acessar o e-mail corporativo',
    'como-acessar-o-e-mail-corporativo',
    $sum$Configuracao do e-mail corporativo no mobile e desktop.$sum$,
    $body$## Configuração no Mobile

1. Abra o app de e-mail.
2. Adicione nova conta e escolha Exchange.
3. Informe seu e-mail corporativo e senha.
4. Se solicitado, informe o servidor: mail.empresa.com.br.

## Configuração no Desktop

Use o Outlook e adicione a conta via auto-config. Se houver erro, configure manualmente com o servidor IMAP/SMTP indicado pelo time de infraestrutura.$body$,
    'email,acesso',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Política de home office',
    'politica-de-home-office',
    $sum$Regras e orientacoes para trabalho remoto.$sum$,
    $body$- Limite de dias remoto por semana: ver política interna.
- Comunicação: mantenha disponibilidade no Slack e calendário atualizado.
- Segurança: use VPN e não compartilhe credenciais.

Consulte o RH para exceções.$body$,
    'home-office,rh',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Recuperacao de conta',
    'recuperacao-de-conta',
    $sum$Fluxo de recuperacao com autenticacao multifator.$sum$,
    $body$## Fluxo de recuperação

1. Tente resetar sua senha via tela de login.
2. Se tiver 2FA, use o mecanismo de recuperação (backup codes ou suporte).
3. Caso não consiga, abra chamado em Acesso com documento de identificação.

Mantenha métodos de recuperação atualizados em Perfil → Segurança.$body$,
    'conta,seguranca',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Como solicitar acesso a sistemas',
    'como-solicitar-acesso-a-sistemas',
    $sum$Passos para requisitar acesso com aprovacao.$sum$,
    $body$1. Abra o formulário de acesso no portal.
2. Informe o sistema e a justificativa.
3. Selecione o gestor responsável para aprovação.
4. Acompanhe o status até a concessão.

A concessão depende da aprovação do gestor e da área de segurança.$body$,
    'acesso,sistemas',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Reset de token de acesso',
    'reset-de-token-de-acesso',
    $sum$Como resetar tokens e chaves de API internas.$sum$,
    $body$1. Acesse a área de desenvolvedor → Tokens.
2. Revogue o token comprometido.
3. Gere um novo token e atualize as integrações.

Lembre-se de armazenar tokens em gerenciadores seguros (ex: Vault).$body$,
    'token,api',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Configurar impressora de rede',
    'configurar-impressora-de-rede',
    $sum$Adicionar impressoras de rede em Windows e Mac.$sum$,
    $body$## Windows

1. Abra Configurações → Dispositivos → Impressoras e scanners.
2. Clique em Adicionar impressora e aguarde a busca.
3. Se não encontrar, selecione "A impressora que eu quero não está na lista" e adicione pelo endereço IP.

## Mac

1. Abra Preferências do Sistema → Impressoras e Scanners.
2. Clique em + e adicione pela rede usando IP ou protocolo compartilhado.$body$,
    'impressora,rede',
    true, 0, 0, 0, now(), now()
),
(
    gen_random_uuid(),
    'Boas praticas de seguranca',
    'boas-praticas-de-seguranca',
    $sum$Recomendacoes para proteger contas e dispositivos.$sum$,
    $body$- Use senhas únicas para cada serviço.
- Habilite 2FA sempre que possível.
- Fique atento a e-mails de phishing: nunca clique em links suspeitos.

Reporte incidentes ao time de segurança imediatamente.$body$,
    'seguranca,boas-praticas',
    true, 0, 0, 0, now(), now()
)
ON CONFLICT (slug) DO NOTHING;

-- Validacao rapida apos rodar:
-- SELECT title, slug, array_length(string_to_array(tags, ','), 1) AS tags_count
-- FROM "KBArticles" ORDER BY title;
