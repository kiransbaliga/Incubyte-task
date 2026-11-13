import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { executeAIQuery } from '../ai/queryEngine.js';
import { SqlValidationError } from '../ai/types.js';

const AIQueryBodySchema = z.object({
  question: z.string().trim().min(3, 'Question must be at least 3 characters').max(500),
});

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/ai/query
   * Translates natural language compensation questions into safely validated,
   * read-only SQL queries executed against the PostgreSQL database.
   */
  fastify.post('/query', async (request, reply) => {
    const parseResult = AIQueryBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const { question } = parseResult.data;

    try {
      const result = await executeAIQuery(question);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof SqlValidationError) {
        request.log.warn({ reason: error.reason, sql: error.rawSql }, 'AI query rejected by security guardrail');
        return reply.status(400).send({
          success: false,
          error: 'Query rejected by security guardrail',
          reason: error.reason,
          attemptedSql: error.rawSql,
        });
      }

      request.log.error(error, 'Error executing AI query');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Failed to process AI query',
      });
    }
  });
};
