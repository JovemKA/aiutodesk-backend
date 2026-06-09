import { UserRole } from '@common/enums/user-role.enum';
import { TicketEventType } from '@common/enums/ticket-event-type.enum';
import { TicketService } from './ticket.service';

function repoMock() {
    return {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn((value) => value),
        save: jest.fn((value) => Promise.resolve({ id: 'msg-1', createdAt: new Date(), ...value })),
        remove: jest.fn(),
        createQueryBuilder: jest.fn(),
    };
}

/** Query builder encadeável cujo getOne/getMany resolve o valor configurado. */
function queryBuilderMock(result: unknown, many = false) {
    const qb: Record<string, jest.Mock> = {};
    for (const method of ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy']) {
        qb[method] = jest.fn(() => qb);
    }
    qb.getOne = jest.fn().mockResolvedValue(many ? undefined : result);
    qb.getMany = jest.fn().mockResolvedValue(many ? result : []);
    return qb;
}

const ACTOR = { userId: 'agent-1', role: UserRole.MASTER };

function makeService(ticket: Record<string, unknown>) {
    const ticketRepo = repoMock();
    const eventRepo = repoMock();
    const messageRepo = repoMock();
    const userDepartmentRepo = repoMock();
    const userRepo = repoMock();

    // findOne() usa createQueryBuilder().getOne()
    ticketRepo.createQueryBuilder.mockReturnValue(queryBuilderMock(ticket));

    const commentIndexer = { indexComment: jest.fn().mockResolvedValue({ chunksWritten: 1 }) };

    const service = new TicketService(
        ticketRepo as any,
        eventRepo as any,
        messageRepo as any,
        userDepartmentRepo as any,
        userRepo as any,
        commentIndexer as any,
    );

    return { service, ticketRepo, eventRepo, messageRepo, commentIndexer };
}

describe('TicketService — thread de mensagens', () => {
    const ticket = { id: 'tkt-1', requester: { id: 'requester-1' } };

    it('createMessage cria mensagem pública e registra evento REPLY', async () => {
        const { service, eventRepo, messageRepo } = makeService(ticket);
        messageRepo.findOne.mockResolvedValue({
            id: 'msg-1',
            body: 'Olá',
            internalNote: false,
            attachments: null,
            createdAt: new Date('2026-06-03T12:00:00Z'),
            author: { id: 'agent-1' },
        });

        const dto = await service.createMessage('tkt-1', { body: 'Olá', internalNote: false }, ACTOR);

        expect(dto.authorRole).toBe('agent');
        expect(dto.internalNote).toBe(false);
        expect(eventRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: TicketEventType.REPLY }),
        );
    });

    it('createMessage com nota interna registra evento NOTE', async () => {
        const { service, eventRepo, messageRepo } = makeService(ticket);
        messageRepo.findOne.mockResolvedValue({
            id: 'msg-2',
            body: 'nota',
            internalNote: true,
            attachments: null,
            createdAt: new Date(),
            author: { id: 'agent-1' },
        });

        const dto = await service.createMessage('tkt-1', { body: 'nota', internalNote: true }, ACTOR);

        expect(dto.internalNote).toBe(true);
        expect(eventRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: TicketEventType.NOTE }),
        );
    });

    it('listMessages deriva authorRole "requester" quando o autor é o solicitante', async () => {
        const { service, messageRepo } = makeService(ticket);
        messageRepo.find.mockResolvedValue([
            {
                id: 'msg-3',
                body: 'mensagem do solicitante',
                internalNote: false,
                attachments: null,
                createdAt: new Date(),
                author: { id: 'requester-1' },
            },
        ]);

        const [dto] = await service.listMessages('tkt-1', ACTOR);

        expect(dto.authorRole).toBe('requester');
    });

    it('createMessage propaga negação de acesso de findOne (porteiro)', async () => {
        // ticket inexistente para o ator => findOne lança NotFoundException
        const { service } = makeService(undefined as any);
        await expect(
            service.createMessage('tkt-x', { body: 'x' }, { userId: 'dev-1', role: UserRole.DEV }),
        ).rejects.toBeDefined();
    });
});
