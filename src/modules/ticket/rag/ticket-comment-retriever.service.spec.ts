import { TicketCommentRetrieverService } from './ticket-comment-retriever.service';

function makeService() {
    const dataSource = { query: jest.fn().mockResolvedValue([]) };
    const embedder = { embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };
    const configService = { get: jest.fn().mockReturnValue(undefined) };

    const service = new TicketCommentRetrieverService(
        dataSource as any,
        embedder as any,
        configService as any,
    );

    return { service, dataSource, embedder };
}

describe('TicketCommentRetrieverService — isolamento de escopo', () => {
    it('o WHERE SEMPRE amarra ao ticket_id (escopo 1:1, sem departamento)', async () => {
        const { service, dataSource } = makeService();
        await service.retrieve({ query: 'erro de vpn', ticketId: 'tkt-A' });

        const [sql, params] = dataSource.query.mock.calls[0];
        expect(sql).toContain('cc.ticket_id = $2');
        expect(sql).not.toContain('department_id'); // sem escopo maior → nunca amplia
        expect(params).toContain('tkt-A');
    });

    it('com escopo maior, amplia apenas para o MESMO department_id (nunca global)', async () => {
        const { service, dataSource } = makeService();
        await service.retrieve({ query: 'erro de vpn', ticketId: 'tkt-A', departmentId: 'dept-1' });

        const [sql, params] = dataSource.query.mock.calls[0];
        expect(sql).toContain('cc.ticket_id = $2');
        expect(sql).toContain('cc.department_id = $3');
        expect(params).toEqual(expect.arrayContaining(['tkt-A', 'dept-1']));
        // Garante que não há cláusula que traga tudo: o WHERE depende de ticket_id OU mesmo depto.
        expect(sql).not.toMatch(/WHERE\s+1\s*=\s*1/i);
    });

    it('retorna vazio sem ticketId (nunca consulta o banco sem escopo)', async () => {
        const { service, dataSource } = makeService();
        const result = await service.retrieve({ query: 'x', ticketId: '' });
        expect(result).toEqual([]);
        expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('marca sameTicket e filtra abaixo do minSimilarity', async () => {
        const { service, dataSource } = makeService();
        dataSource.query.mockResolvedValue([
            { ticket_id: 'tkt-A', ticket_title: 'A', content: 'mesmo', same_ticket: true, similarity: 0.9 },
            { ticket_id: 'tkt-B', ticket_title: 'B', content: 'outro', same_ticket: false, similarity: 0.8 },
            { ticket_id: 'tkt-C', ticket_title: 'C', content: 'fraco', same_ticket: false, similarity: 0.1 },
        ]);

        const result = await service.retrieve({ query: 'q', ticketId: 'tkt-A', departmentId: 'dept-1' });

        expect(result).toHaveLength(2); // 0.1 cai pelo minSimilarity (0.6)
        expect(result[0].sameTicket).toBe(true); // próprio chamado vem primeiro
        expect(result.map((r) => r.ticketId)).toEqual(['tkt-A', 'tkt-B']);
    });
});
