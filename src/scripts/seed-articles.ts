import 'reflect-metadata';
import { DataSource } from 'typeorm';
import databaseConfig from '@core/config/database.config';
import { Article } from '@modules/article/entities/article.entity';

async function run() {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
        console.error('SUPABASE_DB_URL not set');
        process.exit(1);
    }

    const dataSource = new DataSource({
        type: 'postgres',
        url: connectionString,
        entities: [Article],
        synchronize: false,
    });

    await dataSource.initialize();

    const repo = dataSource.getRepository(Article);

    const slugify = (value: string) => {
        const normalized = value
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        const slug = normalized
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')
            .trim();

        return slug || 'article';
    };

    const ensureUniqueSlug = async (baseSlug: string) => {
        let slug = baseSlug;
        let suffix = 2;

        while (true) {
            const existing = await repo.findOne({ where: { slug } });
            if (!existing) {
                return slug;
            }
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
    };

    const sampleArticles = [
        {
            title: 'Como redefinir sua senha',
            summary: 'Recupere o acesso com um passo a passo rapido.',
            content: `## Quando usar

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

Caso o problema persista, abra um chamado na categoria **Acesso**.`,
            isPublished: true,
            tags: ['senha', 'acesso', 'autenticacao'],
        },
        {
            title: 'Configurando VPN no Windows',
            summary: 'Guia simples para configurar VPN corporativa no Windows.',
            content: `## Pré-requisitos

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
- **timeout**: você pode estar atrás de um proxy não compatível com a VPN.`,
            isPublished: true,
            tags: ['vpn', 'windows', 'rede'],
        },
        {
            title: 'Politica de ferias',
            summary: 'Resumo das regras e prazos para solicitar ferias.',
            content: `A política de férias define o período aquisitivo e concessivo, critérios para agendamento e regras para acumulação.

- Período aquisitivo: 12 meses após contratação.
- Concessão: depende da operação da equipe e aprovação do gestor.
- Solicitação: abra um pedido no portal de RH com antecedência mínima de 30 dias.

Para casos excepcionais, contate RH diretamente.`,
            isPublished: true,
            tags: ['rh', 'ferias'],
        },
        {
            title: 'Conexao Wi-Fi corporativa',
            summary: 'Como se conectar ao Wi-Fi corporativo com seguranca.',
            content: `## Como conectar-se

1. Abra a lista de redes Wi‑Fi no seu dispositivo e selecione o SSID corporativo.
2. Escolha o método de autenticação **WPA2-Enterprise** com EAP.
3. Informe seu usuário de domínio e senha ou selecione o certificado pessoal quando solicitado.

## Certificados

Se sua empresa usa certificados, instale-os em **Certificados Pessoais** antes de conectar. Caso tenha problemas, verifique se o horário do dispositivo está correto (sincronize com NTP).`,
            isPublished: true,
            tags: ['wifi', 'rede'],
        },
        {
            title: 'Solicitacao de equipamento',
            summary: 'Procedimento para solicitar equipamentos de TI.',
            content: `1. Acesse o portal administrativo → Solicitar equipamentos.
2. Selecione o tipo de equipamento e justifique a necessidade.
3. Aguarde aprovação do gestor e do setor de TI.
4. Após aprovação, acompanhe o status na mesma página.

Equipamentos padrão ficam sujeitos à disponibilidade de estoque.`,
            isPublished: true,
            tags: ['equipamentos', 'ti'],
        },
        {
            title: 'Como acessar o e-mail corporativo',
            summary: 'Configuracao do e-mail corporativo no mobile e desktop.',
            content: `## Configuração no Mobile

1. Abra o app de e-mail.
2. Adicione nova conta e escolha Exchange.
3. Informe seu e-mail corporativo e senha.
4. Se solicitado, informe o servidor: mail.empresa.com.br.

## Configuração no Desktop

Use o Outlook e adicione a conta via auto-config. Se houver erro, configure manualmente com o servidor IMAP/SMTP indicado pelo time de infraestrutura.`,
            isPublished: true,
            tags: ['email', 'acesso'],
        },
        {
            title: 'Política de home office',
            summary: 'Regras e orientacoes para trabalho remoto.',
            content: `- Limite de dias remoto por semana: ver política interna.
- Comunicação: mantenha disponibilidade no Slack e calendário atualizado.
- Segurança: use VPN e não compartilhe credenciais.

Consulte o RH para exceções.`,
            isPublished: true,
            tags: ['home-office', 'rh'],
        },
        {
            title: 'Recuperacao de conta',
            summary: 'Fluxo de recuperacao com autenticacao multifator.',
            content: `## Fluxo de recuperação

1. Tente resetar sua senha via tela de login.
2. Se tiver 2FA, use o mecanismo de recuperação (backup codes ou suporte).
3. Caso não consiga, abra chamado em Acesso com documento de identificação.

Mantenha métodos de recuperação atualizados em Perfil → Segurança.`,
            isPublished: true,
            tags: ['conta', 'seguranca'],
        },
        {
            title: 'Como solicitar acesso a sistemas',
            summary: 'Passos para requisitar acesso com aprovacao.',
            content: `1. Abra o formulário de acesso no portal.
2. Informe o sistema e a justificativa.
3. Selecione o gestor responsável para aprovação.
4. Acompanhe o status até a concessão.

A concessão depende da aprovação do gestor e da área de segurança.`,
            isPublished: true,
            tags: ['acesso', 'sistemas'],
        },
        {
            title: 'Reset de token de acesso',
            summary: 'Como resetar tokens e chaves de API internas.',
            content: `1. Acesse a área de desenvolvedor → Tokens.
2. Revogue o token comprometido.
3. Gere um novo token e atualize as integrações.

Lembre-se de armazenar tokens em gerenciadores seguros (ex: Vault).`,
            isPublished: true,
            tags: ['token', 'api'],
        },
        {
            title: 'Configurar impressora de rede',
            summary: 'Adicionar impressoras de rede em Windows e Mac.',
            content: `## Windows

1. Abra Configurações → Dispositivos → Impressoras e scanners.
2. Clique em Adicionar impressora e aguarde a busca.
3. Se não encontrar, selecione "A impressora que eu quero não está na lista" e adicione pelo endereço IP.

## Mac

1. Abra Preferências do Sistema → Impressoras e Scanners.
2. Clique em + e adicione pela rede usando IP ou protocolo compartilhado.`,
            isPublished: true,
            tags: ['impressora', 'rede'],
        },
        {
            title: 'Boas praticas de seguranca',
            summary: 'Recomendacoes para proteger contas e dispositivos.',
            content: `- Use senhas únicas para cada serviço.
- Habilite 2FA sempre que possível.
- Fique atento a e-mails de phishing: nunca clique em links suspeitos.

Reporte incidentes ao time de segurança imediatamente.`,
            isPublished: true,
            tags: ['seguranca', 'boas-praticas'],
        },
    ];

    for (const a of sampleArticles) {
        const exists = await repo.findOne({ where: { title: a.title } });
        if (!exists) {
            const baseSlug = slugify(a.title);
            const slug = await ensureUniqueSlug(baseSlug);
            const entity = repo.create({ ...a, slug } as any);
            await repo.save(entity);
            console.log('Seeded:', a.title);
        } else {
            console.log('Already exists:', a.title);
        }
    }

    await dataSource.destroy();
    console.log('Seed finished');
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
