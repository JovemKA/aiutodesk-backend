import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface InventoryEntry {
    title: string;
    slug: string;
}

@Injectable()
export class KnowledgeBaseInventoryService {
    private readonly logger = new Logger(KnowledgeBaseInventoryService.name);

    constructor(private readonly dataSource: DataSource) {}

    async listPublished(limit = 200): Promise<InventoryEntry[]> {
        try {
            return await this.dataSource.query<InventoryEntry[]>(
                `SELECT title, slug
                 FROM "KBArticles"
                 WHERE is_published = true
                 ORDER BY title
                 LIMIT $1`,
                [limit],
            );
        } catch (error) {
            this.logger.warn(
                `Falha ao listar inventario da KB: ${(error as Error).message}`,
            );
            return [];
        }
    }
}
