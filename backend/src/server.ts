import 'dotenv/config';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { employeeRoutes } from './api/employees.js';
import { fxRatesRoutes } from './api/fx-rates.js';
import { aiRoutes } from './api/ai.js';

/**
 * Builds and configures the Fastify server instance
 */
export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // Enable CORS for frontend integration
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Health check endpoint
  server.get('/health', async () => ({
    status: 'ok',
    service: 'acme-compensation-backend',
    timestamp: new Date().toISOString(),
  }));

  // API Routes
  await server.register(employeeRoutes, { prefix: '/api/employees' });
  await server.register(fxRatesRoutes, { prefix: '/api/fx-rates' });
  await server.register(aiRoutes, { prefix: '/api/ai' });

  // Custom 404 handler
  server.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      success: false,
      error: `Route ${request.method}:${request.url} not found`,
    });
  });

  // Global error handler
  server.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return reply.status(statusCode).send({
      success: false,
      error: error?.message || 'Internal Server Error',
    });
  });

  return server;
}

/**
 * Start the HTTP server
 */
export async function startServer() {
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    const server = await buildServer();
    await server.listen({ port, host });
    console.log(`🚀 ACME Compensation Hub API running at http://${host}:${port}`);
    console.log(`📊 Health check: http://${host}:${port}/health`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer();
}
