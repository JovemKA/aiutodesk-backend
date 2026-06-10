import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketTriageService } from './ticket-triage.service';

const CATEGORIES = [
    { id: 'cat-1', name: 'Rede' },
    { id: 'cat-2', name: 'Software' },
];
const DEPARTMENTS = [{ id: 'dep-1', name: 'TI' }];

function makeService(generateContent: jest.Mock | null) {
    const client =
        generateContent === null
            ? null
            : { models: { generateContent } };

    const clientProvider = { getClient: jest.fn().mockReturnValue(client) };
    const categoryService = { findAll: jest.fn().mockResolvedValue(CATEGORIES) };
    const departmentService = { findAll: jest.fn().mockResolvedValue(DEPARTMENTS) };
    const configService = { get: jest.fn().mockReturnValue(undefined) };

    const service = new TicketTriageService(
        clientProvider as any,
        categoryService as any,
        departmentService as any,
        configService as any,
    );
    return { service, clientProvider, generateContent };
}

function respond(json: unknown) {
    return jest.fn().mockResolvedValue({ text: JSON.stringify(json) });
}

const INPUT = { title: 'Servidor caiu', description: 'Produção fora do ar.' };

describe('TicketTriageService', () => {
    it('mapeia nomes válidos para IDs e converte score em prioridade', async () => {
        const { service } = makeService(
            respond({
                priorityScore: 80,
                priorityReason: 'Produção fora do ar',
                confidence: 'high',
                category: 'Rede',
                department: 'TI',
            }),
        );

        const result = await service.triage(INPUT);

        expect(result.priorityScore).toBe(80);
        expect(result.priority).toBe(TicketPriority.CRITICAL);
        expect(result.confidence).toBe('high');
        expect(result).toMatchObject({
            categoryId: 'cat-1',
            categoryName: 'Rede',
            departmentId: 'dep-1',
            departmentName: 'TI',
        });
    });

    it('resolve para null quando o modelo devolve nome fora da lista ou INDEFINIDO', async () => {
        const { service } = makeService(
            respond({
                priorityScore: 40,
                priorityReason: 'Impacto moderado',
                confidence: 'medium',
                category: 'Categoria Inventada',
                department: 'INDEFINIDO',
            }),
        );

        const result = await service.triage(INPUT);

        expect(result.priorityScore).toBe(40);
        expect(result.priority).toBe(TicketPriority.MEDIUM);
        expect(result.categoryId).toBeNull();
        expect(result.categoryName).toBeNull();
        expect(result.departmentId).toBeNull();
        expect(result.departmentName).toBeNull();
    });

    it('ignora score fora de 0–100', async () => {
        const { service } = makeService(
            respond({
                priorityScore: 150,
                priorityReason: 'x',
                confidence: 'low',
                category: 'INDEFINIDO',
                department: 'INDEFINIDO',
            }),
        );

        const result = await service.triage(INPUT);

        expect(result.priorityScore).toBeNull();
        expect(result.priority).toBeNull();
    });

    it('devolve triagem vazia quando o cliente Gemini está ausente', async () => {
        const { service } = makeService(null);

        const result = await service.triage(INPUT);

        expect(result.priorityScore).toBeNull();
        expect(result.categoryId).toBeNull();
        expect(result.departmentId).toBeNull();
    });

    it('devolve triagem vazia (sem lançar) quando a resposta não é JSON válido', async () => {
        const { service } = makeService(jest.fn().mockResolvedValue({ text: 'desculpe, não consegui' }));

        const result = await service.triage(INPUT);

        expect(result.priorityScore).toBeNull();
        expect(result.confidence).toBeNull();
    });

    it('devolve triagem vazia (sem lançar) quando o Gemini falha', async () => {
        const { service } = makeService(jest.fn().mockRejectedValue(new Error('timeout')));

        const result = await service.triage(INPUT);

        expect(result.priorityScore).toBeNull();
    });

    describe('isEnabledOnCreate', () => {
        it('habilitado por padrão (env ausente)', () => {
            const { service } = makeService(respond({}));
            expect(service.isEnabledOnCreate()).toBe(true);
        });

        it('desabilitado quando TRIAGE_ON_CREATE_ENABLED=false', () => {
            const clientProvider = { getClient: jest.fn().mockReturnValue(null) };
            const configService = {
                get: jest.fn((key: string) =>
                    key === 'TRIAGE_ON_CREATE_ENABLED' ? 'false' : undefined,
                ),
            };
            const service = new TicketTriageService(
                clientProvider as any,
                { findAll: jest.fn() } as any,
                { findAll: jest.fn() } as any,
                configService as any,
            );
            expect(service.isEnabledOnCreate()).toBe(false);
        });
    });
});
