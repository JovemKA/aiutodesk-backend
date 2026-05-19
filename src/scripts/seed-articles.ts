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

    const sampleArticles = [
        {
            title: 'Como redefinir sua senha',
            content: 'Passo a passo para redefinir sua senha via portal interno...',
            isPublished: true,
        },
        {
            title: 'Configurando VPN no Windows',
            content: 'Instrucoes para configurar a VPN corporativa no Windows 10/11...',
            isPublished: true,
        },
        {
            title: 'Politica de ferias',
            content: 'Resumo da politica de ferias da empresa e procedimentos para requisicao...',
            isPublished: true,
        },
        {
            title: 'Conexao Wi-Fi corporativa',
            content: 'Como conectar-se ao Wi-Fi da empresa: SSID, metodo de autenticacao e certificacao...',
            isPublished: true,
        },
        {
            title: 'Solicitacao de equipamento',
            content: 'Procedimentos para solicitar notebooks, monitores e demais perifericos...',
            isPublished: true,
        },
        {
            title: 'Como acessar o e-mail corporativo',
            content: 'Guia de configuracao do e-mail em mobile e desktop...',
            isPublished: true,
        },
        {
            title: 'Política de home office',
            content: 'Regras e orientacoes para trabalho remoto...',
            isPublished: true,
        },
        {
            title: 'Recuperacao de conta',
            content: 'Fluxo de recuperacao de contas e autenticacao multifator...',
            isPublished: true,
        },
        {
            title: 'Como solicitar acesso a sistemas',
            content: 'Passos para requisitar acesso via gestor e SAC interno...',
            isPublished: true,
        },
        {
            title: 'Reset de token de acesso',
            content: 'Como resetar tokens e chaves de API usadas internamente...',
            isPublished: true,
        },
        {
            title: 'Configurar impressora de rede',
            content: 'Instrucoes para adicionar e configurar impressoras de rede no Windows e Mac...',
            isPublished: true,
        },
        {
            title: 'Boas praticas de seguranca',
            content: 'Recomendacoes sobre senhas, phishing e uso seguro de recursos corporativos...',
            isPublished: true,
        },
    ];

    for (const a of sampleArticles) {
        const exists = await repo.findOne({ where: { title: a.title } });
        if (!exists) {
            const entity = repo.create(a as any);
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
