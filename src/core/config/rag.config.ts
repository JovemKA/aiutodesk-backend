import { registerAs } from '@nestjs/config';

export default registerAs('rag', () => ({
    enabled: (process.env.RAG_ENABLED ?? 'true').toLowerCase() === 'true',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
    embeddingDimensions: process.env.RAG_EMBEDDING_DIMENSIONS
        ? Number(process.env.RAG_EMBEDDING_DIMENSIONS)
        : 768,
    topK: process.env.RAG_TOP_K ? Number(process.env.RAG_TOP_K) : 4,
    minSimilarity: process.env.RAG_MIN_SIMILARITY
        ? Number(process.env.RAG_MIN_SIMILARITY)
        : 0.6,
    filterByDepartment: (process.env.RAG_FILTER_BY_DEPARTMENT ?? 'false').toLowerCase() === 'true',
}));
